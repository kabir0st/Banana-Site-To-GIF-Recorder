# ScrollGif - Scrolling Website GIF Creator

A Chrome extension that automatically scrolls a webpage from top to bottom while capturing screenshots at intervals, then compiles these screenshots into an animated GIF.

## Features

- ✅ Automatic scrolling and capture
- ✅ Customizable scroll speed and quality
- ✅ Preview before downloading
- ✅ No account required
- ✅ 100% client-side processing (no data sent anywhere)
- ✅ Works on any website

## Installation

### From Source

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `gif-maker` directory

## Usage

1. Navigate to any webpage you want to capture
2. Click the ScrollGif icon in your Chrome toolbar
3. Adjust settings if needed (scroll speed, frame delay, quality, width, overlap)
4. Click "Start Capture"
5. Wait for the capture and GIF generation to complete
6. Preview the GIF and click "Download GIF" to save it

## Settings

- **Scroll Speed**: Controls how fast the page scrolls (Fast/Medium/Slow)
- **Frame Delay**: Time between frames in the GIF (in milliseconds)
- **GIF Quality**: Quality setting (High/Medium/Low) - affects file size
- **Width**: Width of the output GIF in pixels (default: 800px)
- **Overlap**: Pixel overlap between captured frames (helps with smooth scrolling)

## Technical Details

- Built with Manifest V3
- Uses `chrome.tabs.captureVisibleTab` API for screenshots
- Uses `gif.js` library for client-side GIF encoding
- All processing happens locally in your browser

## Limitations

- Maximum 100 frames per capture
- Maximum page height: ~50,000px (will warn if exceeded)
- Maximum GIF width: 1920px
- Cannot capture Chrome internal pages (chrome://, chrome-extension://)

## Development

### Project Structure

```
gif-maker/
├── manifest.json          # Extension configuration
├── background.js          # Service worker
├── popup/
│   ├── popup.html        # Popup UI
│   ├── popup.css         # Popup styling
│   └── popup.js          # Popup logic
├── content/
│   └── content.js        # Content script for scrolling
├── lib/
│   ├── gif.js            # GIF encoding library
│   └── gif.worker.js     # Web worker for GIF processing
└── icons/                # Extension icons
```

### Building

No build step required. The extension uses vanilla JavaScript.

### Dependencies

- `gif.js` - Client-side GIF encoding library

Install with:
```bash
npm install
```

## License

ISC

## Credits

- GIF encoding: [gif.js](https://github.com/jnordberg/gif.js) by Johan Nordberg

