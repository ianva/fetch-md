import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { ImageService } from './imageService'; // Assuming ImageService is in a separate file

export class PageService {
  private html: string = '';
  private baseUrl: string = '';
  private articleContent: string = '';
  private title: string = '';

  async initialize(): Promise<void> {
    // Nothing to initialize
  }

  async navigateToPage(url: string, options: { waitForSelector?: string; waitTime?: number } = {}): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
      }
      
      this.html = await response.text();
      this.baseUrl = url;

      // Parse the HTML
      const dom = new JSDOM(this.html, { url });
      const document = dom.window.document;

      // Extract title
      this.title = document.title || new URL(url).hostname;
      // Clean the title to be used as a directory name
      this.title = this.title
        .replace(/[^a-zA-Z0-9-_]/g, '-') // Replace invalid chars with dash
        .replace(/-+/g, '-')             // Replace multiple dashes with single dash
        .replace(/^-|-$/g, '')           // Remove leading/trailing dashes
        .toLowerCase();

      // For Org mode HTML documents, try to get the content div first
      const contentDiv = document.querySelector('#content');
      if (contentDiv) {
        // Remove the table of contents if present
        const toc = contentDiv.querySelector('#table-of-contents');
        if (toc) {
          toc.remove();
        }
        this.articleContent = contentDiv.innerHTML;
      } else {
        // Fall back to Readability if not an Org mode document
        const reader = new Readability(document);
        const article = reader.parse();
        
        if (article) {
          this.articleContent = article.content;
        } else {
          console.warn('Could not extract article content, falling back to full HTML');
          this.articleContent = this.html;
        }
      }

      if (options.waitTime) {
        await new Promise(resolve => setTimeout(resolve, options.waitTime));
      }
    } catch (error) {
      console.error('Failed to navigate to page:', error);
      throw error;
    }
  }

  getContent(): string {
    // Return the extracted article content instead of full HTML
    return this.articleContent || this.html;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getImageService(): ImageService {
    return new ImageService(this.html, this.baseUrl);
  }

  getTitle(): string {
    return this.title;
  }
}
