# Architecture — Nepali Voice

## Product goal

A single Nepali-first speech-to-text engine eventually powering Web, Android and a custom Android keyboard. The first milestone is a browser MVP with no paid API credentials.

## Current MVP architecture

```text
Microphone
  -> Browser SpeechRecognition (ne-NP / en-US / hi-IN)
  -> Raw transcript state
  -> deterministic cleanup (optional)
  -> output formatter (Devanagari / approximate Roman)
  -> editable transcript
  -> copy / TXT download / local history
```

## Key boundaries

- Raw transcript is preserved separately from cleaned output.
- Cleanup must never overwrite raw recognition output.
- Roman conversion is a presentation layer, not a speech-recognition language.
- The browser recognition provider is external to this repository and may process audio remotely.
- The current app has no backend, authentication, database, paid API, or server-side audio storage.

## Planned target architecture

```text
Web / Android / Android IME
       |
       v
Shared capture + chunk manager
       |
       v
ASR adapter interface
  |-- Browser SpeechRecognition (best-effort)
  |-- Local Whisper/ONNX (experimental)
  `-- Future self-hosted open model
       |
       v
Immutable raw transcript + timestamps
       |
       v
Correction pipeline
  |-- conservative filler removal
  |-- punctuation normalization
  |-- optional grammar rewrite (only when local model is feasible)
  `-- preserve names, dates, amounts and technical terms
       |
       v
Output renderer: Unicode / Roman / English
```

## Zero-budget constraints

“Zero budget” means no paid API calls or required paid hosted inference. It does not mean unlimited compute. Browser recognition may be online and vendor-operated. Fully local ASR requires downloading model weights and sufficient device CPU/RAM/storage; accuracy and performance must be measured on actual Nepali speech before promising it.

## Quality evaluation

Build a consented test set of at least 30–50 utterances across:
- standard Nepali, regional accents, fast/slow speech;
- Nepali-English code switching;
- names, places, dates, numbers, finance and technical vocabulary;
- quiet room and moderate background noise.

Track word error rate (WER), character error rate (CER), punctuation quality, code-switch preservation, latency, battery and memory. Compare browser ASR with a local multilingual Whisper baseline. Never silently replace uncertain names, amounts or dates during cleanup.

## Platform plan

- Web: responsive PWA shell; current implementation is web-first.
- Android: native audio capture and shared ASR adapter, background/notification controls.
- Android keyboard: InputMethodService; insert finalized text into the focused field. Keyboard microphone permission, privacy disclosure and Android IME lifecycle need dedicated implementation.
- iOS: PWA first; a native keyboard is a separate project with platform restrictions.

## Security and privacy

- Never put provider credentials in client code.
- Keep raw transcript and corrected transcript distinct.
- Local history is user-controlled and clearable.
- Any future server processing must use explicit consent, transport encryption, retention limits and deletion controls.
