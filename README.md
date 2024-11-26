# fetch-md

A CLI tool for fetching web pages and converting them to Markdown format while preserving images.

## Features

- 🚀 Fast and efficient web page fetching
- 📝 Clean Markdown conversion with proper formatting
- 🖼️ Automatically downloads and saves images
- 🎨 Supports background images (optional)
- ⏱️ Configurable wait times for dynamic content
- 🎯 Selector-based waiting for SPAs
- 📊 Progress bars and status indicators
- 📥 Pipe support for batch processing

## Installation

```bash
# Using npm
npm install -g fetch-md

# Or using bun
bun install -g fetch-md
```

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
# Wait for dynamic content
fetmd https://example.com -w 5000

# Wait for a specific element
fetmd https://example.com -s "#main-content"

# Include background images
fetmd https://example.com -b

# Quiet mode (only errors)
fetmd https://example.com -q
```

### Batch Processing

```bash
# Process multiple URLs from a file
cat urls.txt | fetmd

# Save batch results to a directory
cat urls.txt | fetmd - output

# Process multiple URLs directly
echo -e "https://example.com\\nhttps://github.com" | fetmd
```

## Command Line Options

| Option | Description |
|--------|-------------|
| [url] | URL to fetch (optional if using pipe) |
| [output] | Output directory (optional) |
| -w, --wait <ms> | Wait time in milliseconds (default: 2000) |
| -s, --selector <selector> | Wait for a specific CSS selector |
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

3. **Wait for dynamic content in a SPA:**
   ```bash
   fetmd https://app.example.com -w 5000 -s "#dynamic-content"
   ```

4. **Batch process multiple URLs:**
   ```bash
   # Create a file with URLs
   echo -e "https://example.com\\nhttps://github.com" > urls.txt
   
   # Process all URLs
   cat urls.txt | fetmd - website-backups
   ```

## Requirements

- [Bun](https://bun.sh) runtime (version 1.0.0 or higher)
- Node.js (version 14.17.0 or higher)
- macOS, Linux, or WSL for Windows users

## License

MIT

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.
