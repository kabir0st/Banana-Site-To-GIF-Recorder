// Offscreen script for recording and processing

let recorder = null;
let isRecording = false;
let capturedFrames = [];
const FPS = 15; // Reduced to 15 to save memory and processing time

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

    const media = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
            mandatory: {
                chromeMediaSource: 'tab',
                chromeMediaSourceId: streamId
            }
        }
    });

    // Create a canvas to capture frames
    const video = document.createElement('video');
    video.srcObject = media;
    await video.play();

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Set dimensions based on settings or video
    // Limit max width to 1200 to prevent memory crashes
    let width = settings.width || video.videoWidth;
    if (width > 1200) width = 1200;

    const height = (video.videoHeight / video.videoWidth) * width;

    canvas.width = width;
    canvas.height = height;

    capturedFrames = [];
    isRecording = true;

    // Capture loop
    const interval = 1000 / FPS;

    const captureLoop = () => {
        if (!isRecording) {
            // Cleanup
            media.getTracks().forEach(t => t.stop());
            return;
        }

        ctx.drawImage(video, 0, 0, width, height);
        const frameData = ctx.getImageData(0, 0, width, height);
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
            quality: 5, // Hardcoded quality
            width: settings.width,
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
