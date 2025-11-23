# Testing Guide for ScrollGif Extension

## Prerequisites

1. Chrome browser (version 88+)
2. Extension loaded in developer mode

## Installation Steps

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right corner)
3. Click "Load unpacked"
4. Select the `gif-maker` directory
5. The extension should appear in your extensions list

## Testing Checklist

### Basic Functionality

- [ ] Extension icon appears in Chrome toolbar
- [ ] Clicking icon opens popup
- [ ] Popup displays "Ready" status
- [ ] Settings panel can be toggled with ⚙️ button
- [ ] All settings controls are functional

### Capture Testing

1. **Short Page Test** (< 3 viewport heights)
   - Navigate to a simple webpage (e.g., Google homepage)
   - Open extension popup
   - Click "Start Capture"
   - Verify:
     - [ ] Status changes to "Capturing..."
     - [ ] Progress bar updates
     - [ ] Status changes to "Generating GIF..."
     - [ ] Status changes to "Complete!"
     - [ ] Preview image appears
     - [ ] Download button is available

2. **Medium Page Test** (5-10 viewport heights)
   - Navigate to a longer page (e.g., a blog post or documentation page)
   - Repeat capture process
   - Verify:
     - [ ] All frames captured correctly
     - [ ] GIF shows smooth scrolling
     - [ ] File size is reasonable

3. **Settings Test**
   - Change scroll speed to "Fast"
   - Change frame delay to 1000ms
   - Change quality to "High"
   - Change width to 1200px
   - Capture a page
   - Verify:
     - [ ] Settings are applied
     - [ ] GIF quality matches settings
     - [ ] Settings persist after popup close/reopen

### Error Handling

- [ ] Try capturing on `chrome://extensions` page
  - Should show error: "Cannot capture this page"
- [ ] Try capturing on a very long page (>100 frames)
  - Should show error about page being too long
- [ ] Cancel capture mid-process
  - Should stop capture and reset to idle state

### Download Test

- [ ] Click "Download GIF" button
- [ ] Verify:
  - [ ] Download dialog appears
  - [ ] Filename is in format: `scrollgif_YYYY-MM-DD_HH-MM-SS.gif`
  - [ ] File downloads successfully
  - [ ] GIF plays correctly when opened

### Edge Cases

- [ ] Page with sticky header
- [ ] Page with fixed sidebar
- [ ] Page with lazy-loading images
- [ ] Page with animations
- [ ] Very wide page (horizontal scroll)

## Known Limitations

- Maximum 100 frames per capture
- Cannot capture Chrome internal pages
- Popup must remain open during capture (for message passing)
- Large GIFs may take time to generate

## Troubleshooting

### Extension doesn't load
- Check browser console for errors
- Verify all files are present
- Check manifest.json syntax

### Capture fails
- Check if page allows screenshots
- Verify page is fully loaded
- Check browser console for errors

### GIF generation fails
- Verify gif.js and gif.worker.js are in lib/ directory
- Check browser console for errors
- Try reducing quality or width settings

### Download fails
- Check Chrome download permissions
- Verify downloads API permission in manifest
- Check browser console for errors

## Performance Notes

- Capture time depends on page length and scroll delay
- GIF generation time depends on number of frames and quality
- Large GIFs (>50MB) may take several minutes to generate

