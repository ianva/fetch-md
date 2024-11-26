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

  private async downloadImagesInBatches(images: ImageInfo[], outputDir: string, batchSize: number = 6): Promise<ImageInfo[]> {
    const results: ImageInfo[] = [];
    const totalBatches = Math.ceil(images.length / batchSize);
    
    // Process images in batches
    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize);
      const currentBatch = Math.floor(i/batchSize) + 1;
      console.log(`Processing batch ${currentBatch} of ${totalBatches} (${batch.length} images)`);
      
      const batchPromises = batch.map(async (image) => {
        try {
          const urlObj = new URL(image.url);
          const filename = urlObj.pathname.split('/').pop()?.split('?')[0] || `image-${Date.now()}.jpg`;
          const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
          const outputPath = join(outputDir, sanitizedFilename);
          
          const success = await this.saveImage(image.url, outputPath);
          if (success) {
            image.localPath = sanitizedFilename;
            console.log(`Successfully downloaded: ${sanitizedFilename}`);
          } else {
            console.warn(`Failed to download: ${image.url}`);
          }
          return image;
        } catch (error) {
          console.warn(`Failed to process image URL ${image.url}:`, error);
          return image;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add a small delay between batches to avoid overwhelming the server
      if (currentBatch < totalBatches) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return results;
  }

  async saveImages(images: ImageInfo[], outputDir: string): Promise<ImageInfo[]> {
    if (!outputDir) {
      throw new Error('Output directory is required');
    }

    // Group images by domain to respect per-domain connection limits
    const imagesByDomain = new Map<string, ImageInfo[]>();
    
    images.forEach(image => {
      try {
        const domain = new URL(image.url).hostname;
        const domainImages = imagesByDomain.get(domain) || [];
        domainImages.push(image);
        imagesByDomain.set(domain, domainImages);
      } catch (error) {
        console.warn(`Invalid URL for image: ${image.url}`);
      }
    });

    const results: ImageInfo[] = [];
    
    // Process each domain's images separately
    for (const [domain, domainImages] of imagesByDomain) {
      console.log(`Downloading ${domainImages.length} images from ${domain}`);
      const domainResults = await this.downloadImagesInBatches(domainImages, outputDir);
      results.push(...domainResults);
    }

    return results;
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
