# Nepali Voice — Voice to Text

Nepali-first, zero-paid-API voice transcription MVP. This initial version uses the browser Web Speech Recognition API when available. It provides Raw, lightweight Clean, Unicode Nepali and approximate Roman output, editable text, copy/download, and local history.

## Important limitations

- This is a prototype, not ChatGPT-level transcription.
- Browser speech recognition support and Nepali (`ne-NP`) availability vary by browser/device.
- In common browser implementations, recognition may send audio to the browser vendor's online service. This is not guaranteed offline or private processing.
- “Clean” currently uses conservative deterministic text cleanup, not a generative AI model. “Pure Nepali” is currently a label for the same conservative cleanup; it does not perform full grammar rewriting.
- Roman Nepali conversion is a basic phonetic approximation and needs user review.
- Continuous recording can stop/restart depending on browser behavior; test on target devices.

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

1. Device/browser compatibility and Nepali accuracy test matrix.
2. Offline local ASR experiment using a multilingual Whisper model through Transformers.js / ONNX; benchmark model size, memory, latency and Nepali word error rate before adopting it.
3. Real grammar-aware correction using a self-hosted open model only if it can run within practical free compute limits.
4. PWA installability, Android native wrapper, then Android IME keyboard.

## Privacy

History is stored in this browser's `localStorage`. Do not store sensitive speech in this MVP. Browser recognition may use a remote recognition service. No audio upload endpoint is implemented by this project.

## Install on your phone

### Android (Chrome)
1. Open the deployed site over HTTPS in Chrome.
2. Tap the **Install App** button in the page, or open Chrome's **⋮** menu.
3. Choose **Install app** (or **Add to Home screen**, depending on Chrome version).
4. Open Nepali Voice from the new home-screen icon. It launches in standalone app mode.

### iPhone / iPad (Safari)
1. Open the deployed site in Safari.
2. Tap **Share**.
3. Choose **Add to Home Screen**, then confirm.

The PWA caches the app shell after the first successful visit. This does **not** make speech recognition offline: the browser's recognition service may still require internet access.

## GitHub Pages

The repository includes a GitHub Actions workflow at `.github/workflows/deploy.yml`. On each push to `main`, it installs dependencies, builds the Vite app and deploys `dist` to GitHub Pages. In repository Settings → Pages, ensure the source is set to **GitHub Actions** if it is not already.
