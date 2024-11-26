import type { Options as TurndownOptions } from "turndown";

/**
 * Options for the fetch operation.
 */
export interface FetchOptions {
  /**
   * Output directory for all files.
   */
  outputDir?: string;
  /**
   * Subdirectory for downloaded images.
   */
  imageSubDir?: string;
  /**
   * Options for Turndown markdown converter.
   */
  turndownOptions?: TurndownOptions;
  /**
   * Wait time in milliseconds after page load.
   */
  waitTime?: number;
  /**
   * Selector to wait for before processing.
   */
  waitForSelector?: string;
  /**
   * Custom viewport settings.
   */
  viewport?: {
    /**
     * Viewport width.
     */
    width: number;
    /**
     * Viewport height.
     */
    height: number;
  };
  /**
   * Whether to save background images.
   */
  includeBackgroundImages?: boolean;
  /**
   * Callback function for progress updates.
   * 
   * @param phase - The current phase of the operation (e.g. "downloading", "processing")
   * @param current - The current progress (e.g. number of images downloaded)
   * @param total - The total number of items to process
   * @param item - Optional item being processed (e.g. image URL)
   */
  progressCallback?: (phase: string, current: number, total: number, item?: string) => void;
  /**
   * Whether to output markdown to stdout instead of a file.
   */
  stdoutMode?: boolean;
}

/**
 * Result of the fetch operation.
 */
export interface FetchResult {
  /**
   * The generated markdown content
   */
  markdown: string;
  /**
   * Path to the generated markdown file
   */
  outputPath?: string;
  /**
   * Path to the directory containing downloaded images
   */
  imagesDir?: string;
  /**
   * Number of successfully downloaded images
   */
  imageCount: number;
  /**
   * List of URLs of images that failed to download
   */
  failedImages: string[];
}

/**
 * Information about an image.
 */
export interface ImageInfo {
  /**
   * Image URL.
   */
  url: string;
  /**
   * Alt text for the image.
   */
  alt: string;
  /**
   * Type of image (img tag or background image).
   */
  type: 'img' | 'background';
  /**
   * CSS selector for background images.
   */
  selector?: string;
  /**
   * Local path to the image.
   */
  localPath?: string;
}
