import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ImageInfo } from '../types';
import { JSDOM } from 'jsdom';

export class ImageService {
  private dom: JSDOM;
  private baseUrl: string;

  constructor(html: string, baseUrl: string) {
    this.dom = new JSDOM(html);
    this.baseUrl = baseUrl;
  }

  async saveImage(imageUrl: string, outputPath: string): Promise<boolean> {
    try {
      if (!imageUrl) {
        console.warn('Empty image URL provided');
        return false;
      }

      const response = await fetch(imageUrl);
      
      if (!response.ok) {
        console.warn(`Invalid image response for ${imageUrl}: ${response.status}`);
        return false;
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('image/') && !contentType.includes('application/svg+xml')) {
        console.warn(`Invalid content type for ${imageUrl}: ${contentType}`);
        return false;
      }

      const buffer = await response.arrayBuffer();
      await writeFile(outputPath, Buffer.from(buffer));
      console.log(`Saved image to: ${outputPath}`);
      return true;
    } catch (error) {
      console.warn(`Failed to save image ${imageUrl}:`, error);
      return false;
    }
  }

  async getAllImages(includeBackgroundImages: boolean): Promise<ImageInfo[]> {
    const document = this.dom.window.document;
    const images: ImageInfo[] = [];

    // Get all <img> elements
    document.querySelectorAll('img').forEach((img) => {
      const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-original');
      if (src) {
        images.push({
          url: this.resolveUrl(src),
          alt: img.alt || '',
          type: 'img'
        });
      }
    });

    // Get background images if requested
    if (includeBackgroundImages) {
      document.querySelectorAll('*').forEach((element) => {
        const style = this.dom.window.getComputedStyle(element);
        const backgroundImage = style.backgroundImage;
        
        if (backgroundImage && backgroundImage !== 'none') {
          const match = backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
          if (match && match[1]) {
            images.push({
              url: this.resolveUrl(match[1]),
              alt: '',
              type: 'background',
              selector: this.generateSelector(element)
            });
          }
        }
      });
    }

    return images;
  }

  private resolveUrl(url: string): string {
    try {
      // Try to create a URL with the given string
      return new URL(url).href;
    } catch {
      // If that fails, try to resolve it against the base URL
      try {
        return new URL(url, this.baseUrl).href;
      } catch {
        console.warn(`Could not resolve URL: ${url}`);
        return '';
      }
    }
  }

  private generateSelector(element: Element): string {
    if (element.id) {
      return `#${element.id}`;
    }
    
    const path: string[] = [];
    let current: Element | null = element;
    
    while (current && current.tagName) {
      let selector = current.tagName.toLowerCase();
      if (current.className) {
        selector += `.${Array.from(current.classList).join('.')}`;
      }
      path.unshift(selector);
      current = current.parentElement;
    }
    
    return path.join(' > ');
  }

  async saveImages(
    images: ImageInfo[],
    outputDir: string,
    onProgress?: (current: number, total: number, image: string) => void
  ): Promise<ImageInfo[]> {
    const batchSize = 6;
    const batches = Math.ceil(images.length / batchSize);
    let processedCount = 0;

    for (let i = 0; i < batches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, images.length);
      const batch = images.slice(start, end);
      
      // Process batch in parallel
      const results = await Promise.all(
        batch.map(async (img) => {
          const ext = this.getImageExtension(img.url);
          if (!ext) {
            console.warn(`Could not determine extension for ${img.url}`);
            return { ...img, localPath: '' };
          }

          const filename = `${this.generateFilename(img.url)}.${ext}`;
          const outputPath = join(outputDir, filename);

          const success = await this.saveImage(img.url, outputPath);
          processedCount++;
          
          if (onProgress) {
            onProgress(processedCount, images.length, filename);
          }

          if (success) {
            console.log(`Successfully downloaded: ${filename}`);
            return { ...img, localPath: filename };
          } else {
            return { ...img, localPath: '' };
          }
        })
      );

      images.splice(start, batch.length, ...results);
    }

    return images;
  }

  private getImageExtension(url: string): string | undefined {
    const match = url.match(/\.(jpg|jpeg|png|gif|bmp|svg|webp)$/i);
    return match?.[1];
  }

  private generateFilename(url: string): string {
    const urlObj = new URL(url);
    const filename = urlObj.pathname.split('/').pop()?.split('?')[0] || `image-${Date.now()}`;
    return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  }

  async updateImageReferences(html: string, imageMap: Map<string, string>): Promise<string> {
    const tempDom = new JSDOM(html);
    const document = tempDom.window.document;

    // Update <img> tags
    document.querySelectorAll('img').forEach(img => {
      const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-original');
      if (src) {
        const newSrc = imageMap.get(this.resolveUrl(src));
        if (newSrc) {
          img.src = newSrc;
        }
      }
    });

    // Update background images
    document.querySelectorAll('*').forEach(element => {
      const style = tempDom.window.getComputedStyle(element);
      const backgroundImage = style.backgroundImage;
      
      if (backgroundImage && backgroundImage !== 'none') {
        const match = backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
        if (match && match[1]) {
          const newSrc = imageMap.get(this.resolveUrl(match[1]));
          if (newSrc) {
            element.setAttribute('style', `background-image: url('${newSrc}')`);
          }
        }
      }
    });

    return document.body.innerHTML;
  }
}
