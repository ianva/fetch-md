import fetchToMarkdown from './src';

async function main() {
  try {
    const url = 'https://files.spritely.institute/papers/petnames.html';
    const result = await fetchToMarkdown(url, {
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

    console.log('Conversion completed successfully!');
    console.log(`Markdown file saved to: ${result.outputPath}`);
    console.log(`Images saved to: ${result.imagesDir}`);
    console.log(`Total images downloaded: ${result.imageCount}`);
    
    if (result.failedImages.length > 0) {
      console.log('\nFailed to download the following images:');
      result.failedImages.forEach(url => console.log(`- ${url}`));
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('Unknown error occurred');
    }
  }
}

await main();
