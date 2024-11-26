import { mkdir, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { FetchOptions, FetchResult } from './types';
import { ImageService } from './services/imageService';
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
    includeBackgroundImages = false
  } = options;

  // Create output directories
  await mkdir(outputDir, { recursive: true });
  
  // Initialize services
  const pageService = new PageService();
  await pageService.initialize(viewport);
  
  try {
    // Fetch the page
    await pageService.navigateToPage(url, { waitForSelector, waitTime });
    const html = pageService.getContent();
    const baseUrl = pageService.getBaseUrl();
    const title = pageService.getTitle();

    // Create article-specific directory
    const articleDir = join(outputDir, title);
    const imagesDir = join(articleDir, imageSubDir);
    await mkdir(articleDir, { recursive: true });
    await mkdir(imagesDir, { recursive: true });

    // Process images
    const imageService = pageService.getImageService();
    const images = await imageService.getAllImages(includeBackgroundImages);
    
    // Download all images in parallel
    console.log(`Saving images to: ${imagesDir}`);
    const processedImages = await imageService.saveImages(images, imagesDir);
    const imageCount = processedImages.filter(img => img.localPath).length;
    const failedImages = processedImages.filter(img => !img.localPath).map(img => img.url);

    // Update HTML with new image references
    const updatedHtml = await imageService.updateImageReferences(html, processedImages.reduce((map, img) => {
      if (img.localPath) {
        map.set(img.url, join(imageSubDir, img.localPath));
      }
      return map;
    }, new Map<string, string>()));

    // Convert to markdown
    const markdownService = new MarkdownService(turndownOptions);
    const markdown = markdownService.convertToMarkdown(updatedHtml);

    // Save markdown file
    const outputPath = join(articleDir, `${title}.md`);
    await writeFile(outputPath, markdown, 'utf-8');
    console.log(`Documentation has been saved to ${outputPath}`);
    console.log(`Downloaded ${imageCount} images`);

    if (failedImages.length > 0) {
      console.warn('Failed to download some images:', failedImages);
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
