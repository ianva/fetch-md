# fetch-md

A CLI tool for fetching web pages and converting them to Markdown format while preserving images.

[![npm version](https://badge.fury.io/js/fetch-md.svg)](https://www.npmjs.com/package/fetch-md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🚀 Fast and efficient web page fetching
- 📝 Clean Markdown conversion with proper formatting
- 🖼️ Automatically downloads and saves images
- 🎨 Supports background images (optional)
- 📊 Progress bars and status indicators
- 📥 Pipe support for batch processing

## Installation

```bash
# Install globally with npm
npm install -g fetch-md

# Or install with bun if you prefer
bun install -g fetch-md

# Verify installation
fetmd --version
```

After installation, the `fetmd` command will be available globally in your terminal.

## Usage

### Basic Usage

```bash
# Output markdown to terminal
fetmd https://example.com

# Save to a directory (with images)
fetmd https://example.com output

# Save to a specific path
fetmd https://example.com ~/Documents/notes
```

### Advanced Options

```bash
# Include background images
fetmd https://example.com -b

# Quiet mode (only errors)
fetmd https://example.com -q
```

### Batch Processing

```bash
# Process multiple URLs from a file (output to terminal)
cat urls.txt | fetmd

# Process multiple URLs and save to directory
cat urls.txt | fetmd output

# Process multiple URLs directly
echo "https://example.com" | fetmd
echo "https://github.com" | fetmd output
```

## Command Line Options

| Option | Description |
|--------|-------------|
| [url] | URL to fetch (optional if using pipe) |
| [output] | Output directory (optional) |
| -b, --background | Include background images |
| -q, --quiet | Quiet mode - only show errors |
| -h, --help | Show help information |
| -V, --version | Show version number |

## Output Structure

When saving to a directory, the tool creates the following structure:

```
output/
├── [title]/
│   ├── [title].md    # Markdown content
│   └── images/       # Downloaded images
│       ├── image1.jpg
│       ├── image2.png
│       └── ...
```

## Examples

1. **Simple webpage to markdown:**
   ```bash
   fetmd https://example.com
   ```

2. **Save blog post with images:**
   ```bash
   fetmd https://blog.example.com/post-1 blog-posts
   ```

3. **Save with background images:**
   ```bash
   fetmd https://example.com output -b
   ```

4. **Batch process multiple URLs:**
   ```bash
   # Create a file with URLs
   echo "https://example.com
https://github.com" > urls.txt
   
   # Process all URLs and save to directory
   cat urls.txt | fetmd output
   ```

## Requirements

- Node.js 14.17.0 or higher
- Supported platforms:
  - macOS
  - Linux
  - Windows (via WSL)

## License

MIT
