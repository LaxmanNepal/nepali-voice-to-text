# Nepali Voice — Voice Workspace

Nepali-first, free voice workspace with editable live dictation, separate audio recording, text copy/download, local transcript history, and device text-to-speech playback.

## Current features

- Nepali-first speech dictation with English language selection.
- Live interim transcript and editable writing area.
- Raw and conservative rule-based Clean text modes.
- Separate microphone audio recording with pause/resume, playback and audio file download.
- Copy and download transcript as UTF-8 TXT.
- Device/browser Text-to-Speech playback with available voice selection.
- Browser-local transcript history and installable PWA shell.
- Advanced settings for speech language and available TTS voice.

## Important accuracy, privacy and audio limitations

- Speech recognition uses the browser Web Speech API. Recognition quality and Nepali support vary by browser/device/network; no system can guarantee zero mistakes.
- The current browser API does not provide reliable automatic Nepali-English language detection. Choose Nepali or English in Settings.
- Browser recognition may send audio to the browser vendor's online service. It is not guaranteed offline or end-to-end private.
- The separate audio recorder uses the device microphone and creates a downloadable recording (usually WebM/Opus, depending on browser).
- Text-to-Speech playback uses voices installed/provided by the device/browser. The browser SpeechSynthesis API does not expose generated audio as a downloadable file, so this version cannot export TTS-generated speech.
- “Clean” is deterministic punctuation/filler cleanup, not AI grammar correction.
- No paid API is used. The app code is open source; device/browser recognition and TTS engines are external platform capabilities.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL in a supported browser and allow microphone access. For production, deploy on HTTPS.

## Build

```bash
npm run build
npm run preview
```

## Roadmap

1. Test real Nepali and English word error rates across target Android devices.
2. Evaluate open-source local ASR models for Nepali/English, measuring model download size, RAM, latency and accuracy before replacing browser recognition.
3. Integrate a genuinely downloadable open-source TTS engine with Nepali voice support; this requires bundling or hosting a model and must be benchmarked for size and quality.
4. Add optional AI-assisted transcript correction using a self-hosted/open model only when practical free compute is available.

## Privacy

History is stored in this browser's `localStorage`. Do not store sensitive speech in this MVP. Browser recognition may use a remote recognition service. Audio recordings are created locally in the browser; no upload endpoint is implemented.

## Install on your phone

### Android (Chrome)
1. Open the deployed site over HTTPS in Chrome.
2. Tap **Install App** if available, or open Chrome's **⋮** menu.
3. Choose **Install app** (or **Add to Home screen**).

### iPhone / iPad (Safari)
1. Open the deployed site in Safari.
2. Tap **Share** → **Add to Home Screen**.

The PWA caches the app shell after first visit. This does not make recognition or TTS offline.
