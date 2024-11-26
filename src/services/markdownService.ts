import type { Options as TurndownOptions, Node as TurndownNode } from "turndown";
import TurndownService from "turndown";
import * as turndownPluginGfm from 'turndown-plugin-gfm';
import { JSDOM } from 'jsdom';

export class MarkdownService {
  private turndownService: TurndownService;

  constructor(options: TurndownOptions = {}) {
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      hr: '---',
      bulletListMarker: '*',
      codeBlockStyle: 'fenced',
      ...options
    });

    // Add GFM (GitHub Flavored Markdown) plugins
    this.turndownService.use([turndownPluginGfm.gfm]);
    this.turndownService.use([turndownPluginGfm.tables]);

    // Keep all HTML attributes for images
    this.turndownService.addRule('images', {
      filter: 'img',
      replacement: function (content, node) {
        const img = node as unknown as HTMLImageElement;
        const alt = img.alt || '';
        const src = img.getAttribute('src') || '';
        const title = img.title ? ` "${img.title}"` : '';
        return src ? `![${alt}](${src}${title})` : '';
      }
    });

    // Add custom table processing rules
    this.turndownService.addRule('customTables', {
      filter: ['table'],
      replacement: (content: string, node: TurndownNode): string => {
        const element = node as unknown as HTMLElement;
        return this.cleanupTableHtml(element.outerHTML);
      }
    });

    // Add custom formatting rules
    this.turndownService.addRule('inlineFormatting', {
      filter: ['strong', 'b', 'em', 'i', 'code', 'del', 's'],
      replacement: (content: string, node: TurndownNode): string => {
        const element = node as unknown as HTMLElement;
        switch (element.tagName.toLowerCase()) {
          case 'strong':
          case 'b':
            return `**${content}**`;
          case 'em':
          case 'i':
            return `_${content}_`;
          case 'code':
            return `\`${content}\``;
          case 'del':
          case 's':
            return `~~${content}~~`;
          default:
            return content;
        }
      }
    });
  }

  /**
   * Clean up table HTML and convert to Markdown format
   */
  private cleanupTableHtml(content: string): string {
    const dom = new JSDOM(content);
    const doc = dom.window.document;
    
    // Get table
    const table = doc.querySelector('table');
    if (!table) {
      return content;
    }

    // Get headers
    const headers = Array.from(table.querySelectorAll('th')).map(th => 
      th.textContent?.trim().replace(/\s+/g, ' ') || ''
    );

    // If no headers found, try using first row as header
    if (headers.length === 0) {
      const firstRow = table.querySelector('tr');
      if (firstRow) {
        headers.push(...Array.from(firstRow.querySelectorAll('td')).map(td =>
          td.textContent?.trim().replace(/\s+/g, ' ') || ''
        ));
      }
    }

    // Get table content (excluding header row if it was used as headers)
    const rows = Array.from(table.querySelectorAll('tr')).slice(headers.length ? 1 : 0)
      .map(tr => Array.from(tr.querySelectorAll('td')).map(td =>
        td.textContent?.trim().replace(/\s+/g, ' ') || ''
      ));

    // Build Markdown table
    let markdown = '';
    
    // Add headers
    if (headers.length > 0) {
      markdown += '| ' + headers.join(' | ') + ' |\n';
      // Add separator
      markdown += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
    }
    
    // Add data rows
    markdown += rows.map(row => '| ' + row.join(' | ') + ' |').join('\n');

    return markdown;
  }

  /**
   * Convert HTML content to Markdown
   */
  convertToMarkdown(html: string): string {
    // Remove script tags and their content
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove style tags and their content
    html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Convert HTML to Markdown
    return this.turndownService.turndown(html);
  }
}
