# fetch-md

A TypeScript library for fetching web pages and converting them to Markdown format while preserving images.

## Features

- Converts HTML content to clean Markdown format
- Downloads and saves images locally
- Supports background images
- Customizable viewport settings
- Configurable wait times for dynamic content
- Type-safe with full TypeScript support

## Installation

```bash
npm install fetch-md
```

## Usage

```typescript
import fetchToMarkdown from 'fetch-md';

async function main() {
  try {
    const result = await fetchToMarkdown('https://example.com', {
      outputDir: './output',
      waitForSelector: 'main',
      waitTime: 2000,
      includeBackgroundImages: true,
      viewport: {
        width: 1920,
        height: 1080
      },
      turndownOptions: {
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        bulletListMarker: '-'
      }
    });

    console.log(`Markdown file saved to: ${result.markdownFile}`);
    console.log(`Images saved to: ${result.imagesDir}`);
  } catch (error) {
    console.error('Error:', error);
  }
}
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| outputDir | string | './output' | Directory where markdown and images will be saved |
| waitForSelector | string | undefined | CSS selector to wait for before processing |
| waitTime | number | 0 | Additional time to wait in milliseconds |
| includeBackgroundImages | boolean | false | Whether to include CSS background images |
| viewport | Object | {width: 1920, height: 1080} | Browser viewport dimensions |
| turndownOptions | Object | {} | Options passed to Turndown for markdown conversion |

## Return Value

The function returns a Promise that resolves to an object with the following properties:

```typescript
{
  markdownFile: string;  // Path to the generated markdown file
  imagesDir: string;     // Path to the directory containing downloaded images
  imageCount: number;    // Number of successfully downloaded images
  failedImages: string[]; // Array of URLs of images that failed to download
}
```

## Requirements

- Node.js 14 or higher
- TypeScript 4.5 or higher

## License

MIT

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.
