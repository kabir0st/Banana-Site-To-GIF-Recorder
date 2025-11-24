// Offscreen script for recording and processing

let recorder = null;
let isRecording = false;
let capturedFrames = [];
let canvas = null; // Global canvas reference
const FPS = 60; // Increased to 60 for smoother playback

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_RECORDING') {
        startRecording(message.streamId, message.settings)
            .then(() => sendResponse({ success: true }))
            .catch((error) => sendResponse({ success: false, error: error.message }));
        return true;
    } else if (message.type === 'STOP_RECORDING') {
        // Acknowledge immediately to avoid timeout
        sendResponse({ success: true });
        // Start processing asynchronously
        stopRecordingAndGenerateGif(message.settings);
        return false;
    }
});

async function startRecording(streamId, settings) {
    if (isRecording) return;

    const dpr = settings.devicePixelRatio || 1;
    const targetWidth = (settings.viewportWidth || 1920) * dpr;
    const targetHeight = (settings.viewportHeight || 1080) * dpr;

    const media = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
            mandatory: {
                chromeMediaSource: 'tab',
                chromeMediaSourceId: streamId,
                maxWidth: targetWidth,
                maxHeight: targetHeight,
                minWidth: targetWidth,
                minHeight: targetHeight
            }
        }
    });

    // Create a canvas to capture frames
    const video = document.createElement('video');
    video.srcObject = media;
    await video.play();

    canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Set dimensions based on viewport settings
    // Limit max width to 800 to reduce file size while keeping 60 FPS
    const MAX_WIDTH = 800;

    // The actual viewport dimensions in CSS pixels
    const viewportWidth = settings.viewportWidth || settings.width || video.videoWidth;
    const viewportHeight = settings.viewportHeight || (video.videoHeight / video.videoWidth) * viewportWidth;

    // Calculate aspect ratio
    const aspectRatio = viewportWidth / viewportHeight;

    // Determine final output dimensions (downscaled if necessary)
    let outputWidth = viewportWidth;
    let outputHeight = viewportHeight;

    if (outputWidth > MAX_WIDTH) {
        outputWidth = MAX_WIDTH;
        outputHeight = outputWidth / aspectRatio;
    }

    // Ensure even numbers for dimensions (some encoders prefer this)
    outputWidth = Math.floor(outputWidth);
    outputHeight = Math.floor(outputHeight);

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    capturedFrames = [];
    isRecording = true;

    // Capture loop
    const interval = 1000 / FPS;

    // Calculate source dimensions (accounting for devicePixelRatio)
    // dpr is already defined at the top of the function
    const sourceWidth = viewportWidth * dpr;
    const sourceHeight = viewportHeight * dpr;

    const captureLoop = () => {
        if (!isRecording) {
            // Cleanup
            media.getTracks().forEach(t => t.stop());
            return;
        }

        // Calculate crop position (center if video is larger than source)
        // This handles potential letterboxing by the browser
        const sourceX = Math.max(0, (video.videoWidth - sourceWidth) / 2);
        const sourceY = Math.max(0, (video.videoHeight - sourceHeight) / 2);

        // Draw cropped video frame with scaling
        // source x, y, w, h -> dest x, y, w, h
        // We crop the source to the viewport * dpr, and draw it to the output canvas (downscaled)
        ctx.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, outputWidth, outputHeight);
        const frameData = ctx.getImageData(0, 0, outputWidth, outputHeight);
        capturedFrames.push(frameData);

        setTimeout(captureLoop, interval);
    };

    captureLoop();
}

async function stopRecordingAndGenerateGif(settings) {
    isRecording = false;

    if (capturedFrames.length === 0) {
        chrome.runtime.sendMessage({ type: 'ERROR', error: 'No frames captured' });
        return;
    }

    try {
        const gif = new GIF({
            workers: 2,
            quality: 25, // Reduced quality (higher number = worse quality) to save size
            width: canvas.width, // Use the actual canvas width (downscaled)
            height: canvas.height,
            workerScript: 'lib/gif.worker.js',
            dither: false
        });

        gif.on('finished', (blob) => {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = reader.result;
                const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
                const totalChunks = Math.ceil(base64.length / CHUNK_SIZE);

                for (let i = 0; i < totalChunks; i++) {
                    const chunk = base64.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
                    console.log(`Offscreen: Sending chunk ${i + 1}/${totalChunks}`);
                    await chrome.runtime.sendMessage({
                        type: 'GIF_DATA_CHUNK',
                        chunk: chunk,
                        index: i,
                        total: totalChunks
                    });
                }

                console.log('Offscreen: Sending GIF_COMPLETE');
                chrome.runtime.sendMessage({ type: 'GIF_COMPLETE' });
            };
            reader.readAsDataURL(blob);
        });

        gif.on('progress', (p) => {
            chrome.runtime.sendMessage({
                type: 'GIF_PROGRESS',
                progress: p * 100
            });
        });

        capturedFrames.forEach((frameData) => {
            gif.addFrame(frameData, { delay: 1000 / FPS });
        });

        gif.render();

    } catch (error) {
        chrome.runtime.sendMessage({ type: 'ERROR', error: error.message });
    }
}
