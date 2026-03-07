# Correctivity App

React + TypeScript front-end for the Correctivity MVP.

## Prerequisites

- Node.js ≥ 18 (or Bun)
- MediaPipe WASM assets (see below)

## Setup

```bash
npm install
```

### Download MediaPipe assets

The HandLandmarker WASM bundle and model file must be served locally (no CDN at runtime).
Run the helper script once after cloning:

```bash
node scripts/download-mediapipe.mjs
```

This downloads into `public/mediapipe/`:
- `wasm/` — WASM runtime files
- `hand_landmarker.task` — model file (~9 MB)

### Add a TF.js model (after training)

After training via `notebooks/Training.ipynb` and converting with `tensorflowjs_converter`,
copy the output to:

```
public/models/finger_extension_right/
  model.json
  group1-shard1of1.bin
```

Then update `src/data/movements.ts` if the path differs.

## Development

```bash
npm run dev        # starts at http://localhost:5173
npm run test       # run unit tests (Vitest)
npm run build      # production build
```

## Project structure

```
src/
  components/      LandmarkOverlay, DebugOverlay
  data/            movements.ts — movement library config
  hooks/           useCamera, useHandLandmarker, useMovementClassifier
  types/           shared TypeScript interfaces
  utils/           ringBuffer, motion helpers
public/
  mediapipe/       WASM bundle + hand_landmarker.task (downloaded separately)
  models/          TF.js model directories (one per movement)
  videos/          demo MP4s (one per movement)
```
