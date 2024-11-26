#!/usr/bin/env node

import { Command } from 'commander';
import fetchToMarkdown from './index';
import { createInterface } from 'readline';
import ora from 'ora';
import cliProgress from 'cli-progress';
import chalk from 'chalk';

const program = new Command();

program
  .name('fetmd')
  .description('Fetch web pages and convert them to markdown with images')
  .version('1.0.0')
  .option('-u, --url <url>', 'URL to fetch')
  .option('-o, --output <dir>', 'Output directory (if not specified, outputs to stdout)')
  .option('-w, --wait <ms>', 'Wait time in milliseconds', '2000')
  .option('-s, --selector <selector>', 'Wait for selector')
  .option('-b, --background', 'Include background images', false)
  .option('-p, --pipe', 'Read URL from stdin', false)
  .option('-q, --quiet', 'Quiet mode - only show errors', false);

program.parse();

const options = program.opts();

// Progress bar for batch image downloads
const multibar = new cliProgress.MultiBar({
  format: ' {bar} | {percentage}% | {value}/{total} | {filename}',
  barCompleteChar: '\u2588',
  barIncompleteChar: '\u2591',
  hideCursor: true,
  clearOnComplete: true,
  stopOnComplete: true,
}, cliProgress.Presets.shades_classic);

async function processUrl(url: string) {
  const spinner = ora();
  const stdoutMode = !options.output;
  
  if (!options.quiet && !stdoutMode) {
    spinner.start(`Fetching ${chalk.blue(url)}`);
  }

  try {
    const result = await fetchToMarkdown(url, {
      outputDir: options.output,
      waitTime: parseInt(options.wait),
      waitForSelector: options.selector,
      includeBackgroundImages: options.background,
      viewport: {
        width: 1920,
        height: 1080
      },
      stdoutMode,
      progressCallback: (phase: string, current: number, total: number, item?: string) => {
        if (options.quiet || stdoutMode) return;

        switch (phase) {
          case 'start':
            spinner.text = `Processing ${chalk.blue(url)}`;
            break;
          case 'fetch':
            spinner.text = `Fetching page content...`;
            break;
          case 'extract':
            spinner.text = 'Extracting content...';
            break;
          case 'convert':
            spinner.text = 'Converting to markdown...';
            break;
          case 'images_start':
            spinner.succeed('Content processed');
            console.log(chalk.cyan(`\nDownloading ${total} images:`));
            break;
          case 'image_progress':
            if (item) {
              const bar = multibar.create(total, current, { filename: item });
              bar.update(current);
              if (current === total) {
                bar.stop();
              }
            }
            break;
          case 'complete':
            multibar.stop();
            break;
        }
      }
    });

    if (stdoutMode) {
      // In stdout mode, just output the markdown
      console.log(result.markdown);
    } else if (!options.quiet) {
      spinner.succeed(chalk.green('Conversion completed successfully!'));
      console.log(chalk.cyan('\nOutput:'));
      console.log(`  Markdown: ${chalk.green(result.outputPath)}`);
      if (result.imagesDir) {
        console.log(`  Images: ${chalk.green(result.imagesDir)} (${chalk.yellow(result.imageCount)} files)`);
      }
      
      if (result.failedImages.length > 0) {
        console.log(chalk.yellow('\nWarning: Some images failed to download:'));
        result.failedImages.forEach(url => console.log(`  - ${url}`));
      }
    } else {
      // In quiet mode, just output the result paths as JSON
      console.log(JSON.stringify({
        status: 'success',
        url,
        markdown: result.outputPath,
        images: {
          directory: result.imagesDir,
          count: result.imageCount,
          failed: result.failedImages
        }
      }));
    }
  } catch (error) {
    if (!options.quiet && !stdoutMode) {
      spinner.fail(chalk.red('Error: ' + error.message));
    } else {
      console.error(JSON.stringify({
        status: 'error',
        url,
        error: error.message
      }));
    }
    process.exit(1);
  }
}

async function main() {
  if (options.pipe) {
    // Read URL from stdin
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    for await (const line of rl) {
      const url = line.trim();
      if (url) {
        await processUrl(url);
      }
    }
  } else if (options.url) {
    await processUrl(options.url);
  } else {
    console.error(chalk.red('Error: Please provide a URL using --url or pipe input'));
    process.exit(1);
  }
}

main().catch(error => {
  console.error(chalk.red('Fatal error:', error));
  process.exit(1);
});
