import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { FetchOptions, FetchResult } from './types';
import { MarkdownService } from './services/markdownService';
import { PageService } from './services/pageService';

export async function fetchToMarkdown(url: string, options: FetchOptions = {}): Promise<FetchResult> {
  const {
    outputDir = 'output',
    imageSubDir = 'images',
    turndownOptions = {},
    waitTime = 1000,
    waitForSelector,
    viewport = { width: 1920, height: 1080 },
    includeBackgroundImages = false,
    stdoutMode = false
  } = options;

  // Create output directories
  await mkdir(outputDir, { recursive: true });
  
  // Initialize services
  const pageService = new PageService();
  await pageService.initialize(viewport);
  
  try {
    // Fetch the page
    const progressCallback = options.progressCallback || (() => {});
    progressCallback('start', 0, 1);
    
    await pageService.navigateToPage(url, { waitForSelector, waitTime });
    progressCallback('fetch', 1, 1);
    
    const html = pageService.getContent();
    const baseUrl = pageService.getBaseUrl();
    const title = pageService.getTitle();

    let imagesDir: string | undefined;
    let outputPath: string | undefined;
    let processedImages: ImageInfo[] = [];
    let imageCount = 0;
    let failedImages: string[] = [];

    // Only create directories and process images if not in stdout mode
    if (!options.stdoutMode && options.outputDir) {
      // Create article-specific directory
      const articleDir = join(outputDir, title);
      imagesDir = join(articleDir, imageSubDir);
      await mkdir(articleDir, { recursive: true });
      await mkdir(imagesDir, { recursive: true });

      progressCallback('extract', 0, 1);
      // Process images
      const imageService = pageService.getImageService();
      const images = await imageService.getAllImages(includeBackgroundImages);
      progressCallback('extract', 1, 1);
      
      // Download all images in parallel
      progressCallback('images_start', 0, images.length);
      console.log(`Saving images to: ${imagesDir}`);
      processedImages = await imageService.saveImages(images, imagesDir, (current, total, image) => {
        progressCallback('image_progress', current, total, image);
      });
      imageCount = processedImages.filter(img => img.localPath).length;
      failedImages = processedImages.filter(img => !img.localPath).map(img => img.url);
    }

    // Update HTML with new image references if we have processed images
    progressCallback('convert', 0, 1);
    let updatedHtml = html;
    if (processedImages.length > 0) {
      const imageService = pageService.getImageService();
      updatedHtml = await imageService.updateImageReferences(html, processedImages.reduce((map, img) => {
        if (img.localPath) {
          map.set(img.url, join(imageSubDir, img.localPath));
        }
        return map;
      }, new Map<string, string>()));
    }

    // Convert to markdown
    const markdownService = new MarkdownService(turndownOptions);
    let markdown = markdownService.convertToMarkdown(updatedHtml);
    
    // Add title and clean up
    const cleanTitle = title.split('-').map(word => 
      word.trim().replace(/^\w/, c => c.toUpperCase())
    ).join(' ');
    
    markdown = `# ${cleanTitle}\n\n${markdown.trim()}`;
    progressCallback('convert', 1, 1);

    // Save markdown file or return content
    if (!options.stdoutMode && options.outputDir) {
      outputPath = join(outputDir, title, `${title}.md`);
      await writeFile(outputPath, markdown, 'utf-8');
      progressCallback('complete', 1, 1);
      console.log(`Documentation has been saved to ${outputPath}`);
      console.log(`Downloaded ${imageCount} images`);

      if (failedImages.length > 0) {
        console.warn('Failed to download some images:', failedImages);
      }
    }

    return {
      markdown,
      outputPath,
      imagesDir,
      imageCount,
      failedImages
    };
  } catch (error) {
    console.error('Failed to fetch and convert:', error);
    throw error;
  }
}

export default fetchToMarkdown;
