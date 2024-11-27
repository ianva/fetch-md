import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { FetchOptions, FetchResult } from './types';
import { MarkdownService } from './services/markdownService';
import { PageService } from './services/pageService';

export interface FetchToMarkdownOptions {
  outputDir?: string;
  imageSubDir?: string;
  waitTime?: number;
  waitForSelector?: string;
  includeBackgroundImages?: boolean;
  viewport?: {
    width: number;
    height: number;
  };
  stdoutMode?: boolean;
  quiet?: boolean;
  debug?: boolean;
  turndownOptions?: any;
  progressCallback?: (phase: string, current: number, total: number, item?: string) => void;
}

export async function fetchToMarkdown(url: string, options: FetchToMarkdownOptions = {}): Promise<FetchResult> {
  const {
    outputDir,
    imageSubDir = 'images',
    waitTime = 1000,
    waitForSelector,
    includeBackgroundImages = false,
    viewport = { width: 1920, height: 1080 },
    stdoutMode = !outputDir,
    quiet = stdoutMode,
    debug = false,
    turndownOptions = {},
    progressCallback = () => {}
  } = options;

  let imagesDir: string | undefined;
  let outputPath: string | undefined;
  let processedImages: any[] = [];
  let imageCount = 0;
  let failedImages: string[] = [];

  // Initialize services
  const pageService = new PageService();
  await pageService.initialize(viewport);
  
  if (debug) {
    process.stderr.write(`Debug: Fetching URL: ${url}\n`);
  }

  try {
    // Fetch the page
    progressCallback('start', 0, 1);
    
    await pageService.navigateToPage(url, { waitForSelector, waitTime });
    progressCallback('fetch', 1, 1);
    
    const html = pageService.getContent();
    const baseUrl = pageService.getBaseUrl();
    const title = pageService.getTitle();

    if (debug) {
      process.stderr.write(`Debug: Page title: ${title}\n`);
    }

    // Convert HTML to Markdown first
    progressCallback('convert', 0, 1);
    const markdownService = new MarkdownService(turndownOptions);
    let markdown = markdownService.convertToMarkdown(html);
    
    // Add title and clean up
    const cleanTitle = title.split('-').map(word => 
      word.trim().replace(/^\w/, c => c.toUpperCase())
    ).join(' ');
    
    markdown = `# ${cleanTitle}\n\n${markdown.trim()}`;
    progressCallback('convert', 1, 1);

    // Create output directories and set paths
    const baseOutputDir = outputDir || join(process.cwd(), 'output');
    const articleDir = join(baseOutputDir, title);
    outputPath = join(articleDir, `${title}.md`);
    imagesDir = join(articleDir, imageSubDir);

    if (debug) {
      process.stderr.write(`Debug: Base output directory: ${baseOutputDir}\n`);
      process.stderr.write(`Debug: Article directory: ${articleDir}\n`);
      process.stderr.write(`Debug: Markdown path: ${outputPath}\n`);
      process.stderr.write(`Debug: Images directory: ${imagesDir}\n`);
    }

    // Only process images and create directories if not in stdout mode
    if (!stdoutMode && outputDir) {
      // Create output directories
      if (debug) {
        process.stderr.write(`Debug: Creating output directory: ${outputDir}\n`);
      }
      await mkdir(outputDir, { recursive: true });
      
      // Create article-specific directory
      if (debug) {
        process.stderr.write(`Debug: Creating article directory: ${articleDir}\n`);
      }

      try {
        await mkdir(articleDir, { recursive: true });
        await mkdir(imagesDir, { recursive: true });
      } catch (error) {
        process.stderr.write(`Error creating directories: ${error}\n`);
        throw error;
      }

      progressCallback('extract', 0, 1);
      // Process images
      const imageService = pageService.getImageService();
      const images = await imageService.getAllImages(includeBackgroundImages);
      progressCallback('extract', 1, 1);
      
      // Download all images in parallel
      progressCallback('images_start', 0, images.length);
      if (!quiet) {
        process.stderr.write(`Saving images to: ${imagesDir}\n`);
      }
      processedImages = await imageService.saveImages(images, imagesDir, (current, total, image) => {
        progressCallback('image_progress', current, total, image);
      });
      imageCount = processedImages.filter(img => img.localPath).length;
      failedImages = processedImages.filter(img => !img.localPath).map(img => img.url);

      // Save markdown file
      if (debug) {
        process.stderr.write(`Debug: Saving markdown to: ${outputPath}\n`);
      }
      try {
        await writeFile(outputPath, markdown, 'utf-8');
      } catch (error) {
        process.stderr.write(`Error writing markdown file: ${error}\n`);
        throw error;
      }
      progressCallback('complete', 1, 1);
    }

    return {
      markdown,
      outputPath,
      imagesDir,
      imageCount,
      failedImages
    };
  } catch (error) {
    // Only log if not in quiet mode
    if (!options.quiet) {
      process.stderr.write('Failed to fetch and convert: ' + error.message + '\n');
    }
    throw error;
  }
}

export default fetchToMarkdown;
