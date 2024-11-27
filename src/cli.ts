#!/usr/bin/env node

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { createInterface } from 'readline';
import { join } from 'path';
import { fetchToMarkdown } from './index';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import cliProgress from 'cli-progress';

// Get package version
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));
const currentVersion = packageJson.version;

const program = new Command();

// Add update command
program
  .command('update')
  .description('Check for updates and update if available')
  .option('--no-install', 'Only check for updates without installing')
  .action(async (options) => {
    const spinner = ora('Checking for updates...').start();
    
    try {
      // Get latest version from npm
      const latestVersion = execSync('npm view fetch-md version', { encoding: 'utf-8' }).trim();
      
      if (latestVersion === currentVersion) {
        spinner.succeed(chalk.green(`You are using the latest version (${currentVersion})`));
      } else {
        spinner.info(chalk.yellow(`New version available: ${latestVersion} (current: ${currentVersion})`));
        
        if (!options.noInstall) {
          spinner.start('Installing update...');
          try {
            // Try bun first
            execSync('command -v bun >/dev/null 2>&1 && bun install -g fetch-md@latest || npm install -g fetch-md@latest', { 
              stdio: 'inherit'
            });
            spinner.succeed(chalk.green('Successfully updated to latest version'));
          } catch (error) {
            spinner.fail(chalk.red('Failed to install update. Please try manually:'));
            console.log(chalk.yellow('\nnpm install -g fetch-md@latest'));
            console.log(chalk.yellow('# or'));
            console.log(chalk.yellow('bun install -g fetch-md@latest\n'));
          }
        }
      }
    } catch (error) {
      spinner.fail(chalk.red('Failed to check for updates'));
      console.error(error.message);
    }
  });

// Check for piped input
const hasPipedInput = !process.stdin.isTTY;

program
  .name('fetch-md')
  .description('Fetch web pages and convert them to markdown')
  .version(currentVersion)
  .argument('<url>', 'URL to fetch')
  .argument('[output]', 'Output directory')
  .option('-w, --wait <ms>', 'Wait time in milliseconds before capturing', '0')
  .option('-s, --selector <selector>', 'Wait for a specific CSS selector')
  .option('-b, --background', 'Include background images')
  .option('-p, --path-only', 'Only output the path to the markdown file')
  .option('-d, --debug', 'Enable debug output')
  .option('-q, --quiet', 'Suppress progress output')
  .action(async (url: string, outputDir: string, options: any) => {
    const stdoutMode = !outputDir || process.stdout.isTTY === false;
    const isRedirected = !process.stdout.isTTY;
    const showProgress = !options.debug && !options.quiet && process.stderr.isTTY;
    
    let spinner: any = null;
    
    // Initialize spinner if we're showing progress
    if (showProgress) {
      spinner = ora({
        text: `Processing ${url}`,
        stream: process.stderr
      });
      spinner.start();
    }

    // Cleanup function to properly stop spinner
    const cleanup = () => {
      try {
        if (spinner && spinner.isSpinning) {
          spinner.stop();
          spinner = null;
        }
      } catch (e) {
        // Ignore any errors during cleanup
      }
    };

    // Ensure cleanup on process exit
    process.once('SIGINT', () => {
      cleanup();
      process.exit(1);
    });

    process.once('SIGTERM', () => {
      cleanup();
      process.exit(1);
    });

    try {
      const finalOutputDir = stdoutMode && outputDir ? outputDir : (outputDir ? (outputDir.startsWith('/') ? outputDir : join(process.cwd(), outputDir)) : undefined);
      
      if (options.debug) {
        process.stderr.write(`Debug: Output directory: ${finalOutputDir}\n`);
        process.stderr.write(`Debug: Current working directory: ${process.cwd()}\n`);
        process.stderr.write(`Debug: Stdout mode: ${stdoutMode}\n`);
        process.stderr.write(`Debug: Is redirected: ${isRedirected}\n`);
        process.stderr.write(`Debug: Show progress: ${showProgress}\n`);
      }

      const result = await fetchToMarkdown(url, {
        outputDir: finalOutputDir,
        waitTime: parseInt(options.wait),
        waitForSelector: options.selector,
        includeBackgroundImages: options.background,
        viewport: {
          width: 1920,
          height: 1080
        },
        stdoutMode,
        quiet: options.quiet,
        debug: options.debug,
        progressCallback: (phase: string, current: number, total: number, item?: string) => {
          if (options.debug) {
            process.stderr.write(`Debug: Progress - ${phase} (${current}/${total})\n`);
            if (item) {
              process.stderr.write(`Debug: Item - ${item}\n`);
            }
            return;
          }

          if (!spinner || !spinner.isSpinning) return;

          switch (phase) {
            case 'start':
              spinner.text = `Processing ${url}`;
              break;
            case 'fetch':
              spinner.text = `Fetched ${url}`;
              break;
            case 'extract':
              spinner.text = current === 0 ? 'Extracting images...' : 'Images extracted';
              break;
            case 'images_start':
              spinner.text = `Found ${total} images`;
              break;
            case 'image_progress':
              spinner.text = `Downloading image ${current}/${total}: ${item}`;
              break;
            case 'convert':
              spinner.text = current === 0 ? 'Converting to markdown...' : 'Conversion complete';
              break;
            case 'complete':
              spinner.text = 'All tasks completed';
              break;
          }
        }
      });

      // Stop spinner before any output
      cleanup();

      // Always check pathOnly first, regardless of redirection
      if (options.pathOnly && result.outputPath) {
        process.stdout.write(result.outputPath);
        process.stdout.write('\n');
      } else if (isRedirected || stdoutMode) {
        // If stdout is redirected or in stdout mode, output the markdown content
        process.stdout.write(result.markdown);
        process.stdout.write('\n');
      } else {
        if (showProgress) {
          const successSpinner = ora({
            text: 'Conversion completed successfully',
            stream: process.stderr
          }).succeed();
          successSpinner.stop();
        }
        
        process.stderr.write('\nOutput:\n');
        process.stderr.write(`  Markdown: ${result.outputPath}\n`);
        if (result.imagesDir) {
          process.stderr.write(`  Images: ${result.imagesDir} (${result.imageCount} files)\n`);
        }
        if (result.failedImages.length > 0) {
          process.stderr.write('\nWarning: Some images failed to download:\n');
          result.failedImages.forEach(url => process.stderr.write(`  - ${url}\n`));
        }
      }
    } catch (error) {
      cleanup();

      if (options.debug) {
        process.stderr.write(`Debug: Error - ${error}\n`);
      }
      
      if (showProgress) {
        const errorSpinner = ora({
          text: `Error: ${error.message}`,
          stream: process.stderr
        }).fail();
        errorSpinner.stop();
      } else {
        process.stderr.write(`Error: ${error.message}\n`);
      }
      process.exit(1);
    }
  });

async function main() {
  try {
    if (hasPipedInput) {
      // Read URLs from stdin
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
      });

      for await (const line of rl) {
        const url = line.trim();
        if (url) {
          // Parse with the URL from stdin
          await program.parseAsync([process.argv[0], process.argv[1], url, ...process.argv.slice(3)]);
        }
      }
    } else if (process.argv.length > 2) {
      // Parse with command line arguments
      await program.parseAsync(process.argv);
    } else {
      console.error(chalk.red('Error: Please provide a URL as argument or pipe URLs from stdin'));
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('Fatal error:', error));
    process.exit(1);
  }
}

const multibar = new cliProgress.MultiBar({
  format: ' {bar} | {percentage}% | {value}/{total} | {filename}',
  barCompleteChar: '\u2588',
  barIncompleteChar: '\u2591',
  hideCursor: true,
  clearOnComplete: true,
  stopOnComplete: true,
}, cliProgress.Presets.shades_classic);

// Only call main() once
main().catch(error => {
  console.error(chalk.red('Fatal error:', error));
  process.exit(1);
});
