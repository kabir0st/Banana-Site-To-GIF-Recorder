# 🍌 Banana Gif Recorder

[![Chrome Extension](https://img.shields.io/badge/Chrome%20Extension-Manual%20Install-4285f4?logo=google-chrome&logoColor=white)](#setup)
[![Made with JavaScript](https://img.shields.io/badge/Made%20with-JavaScript-f7df1e?logo=javascript&logoColor=000)](#features)
[![License: ISC](https://img.shields.io/badge/License-ISC-lightgrey.svg)](./package.json)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-kabir0st-ffdd00?logo=buy-me-a-coffee&logoColor=000)](https://www.buymeacoffee.com/kabir0st)

Banana Gif Recorder is a tiny, banana-yellow Chrome extension that records buttery-smooth tab captures directly into GIFs. It runs fully offline, so your pixels never leave your machine.

![Banana Gif Recorder screenshot](images/main_page.png)

## Why Banana Gif Recorder?
- **Replace shaky screen recorders**: Capture scroll-heavy demos, micro-interactions, or bug repros without motion blur.
- **Zero upload workflow**: Everything stays local, which is ideal for sensitive work or offline sessions.
- **GIF-native output**: Skip video-to-GIF conversions and keep file sizes shareable for chats, PRs, and docs.

## Features
- **Smooth Recording**: Captures high-FPS tab frames and stitches them into a GIF via `gif.js`.
- **Banana Theme**: Friendly UI with clear CTAs and animated states.
- **Local Privacy**: Recording, rendering, and downloads happen entirely in the browser.
- **Preview & Progress**: Live progress indicators while recording and rendering so you always know what's next.

## Setup
1. Clone the repo: `git clone https://github.com/<you>/gif-maker.git`.
2. Open Chrome and navigate to `chrome://extensions`.
3. Toggle **Developer mode** in the top-right.
4. Click **Load unpacked** and select `gif-maker/`.
5. PIN the banana icon so it's easy to find.

## How to Use
1. Click the banana icon to open the popup.
2. Press **Start Recording**. The extension captures the visible tab and smooth-scrolls if needed.
3. Let it process. You will see capture, rendering, and preview states.
4. Hit **Download GIF** to save the final animation.
5. Share it in docs, reviews, or drop it into your favorite chat.

## Support the Project
If this saves you time (or meetings), consider buying me a coffee:
[Buy me a coffee](https://www.buymeacoffee.com/kabir0st).

You can also star the repo or file issues with ideas you'd like to see.
