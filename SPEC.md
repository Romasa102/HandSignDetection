# Correctivity MVP — Product & Technical Specification

## 1. Product Overview

**App name:** Correctivity MVP

**Purpose:** Help children aged 4–8 with hand deformities perform corrective exercises, turning each session into a saved digital artwork. Each completed exercise session produces a unique, downloadable painting generated from the child's own hand movements.

**Not a medical device.** No clinical outcomes are claimed. The movement library is physio-curated. Personalization is survey-based, not diagnostic.

**Key success metrics:**
- Session completion rate (primary retention signal)
- Artwork download rate (engagement signal)

---

## 2. User Flow

1. **Onboarding survey** — Which hand is affected (Left / Right / Both) and which area (Fingers / Wrist / Both). Filters the movement library to relevant exercises. Persisted to localStorage; not repeated on return visits.

2. **Movement selection** — Child/parent picks a "brush" from 3–5 physio-vetted movements shown as large icon cards.

3. **Safety framing** — Full-screen prompt shown before demo: *"Stop immediately if you feel pain above 3 out of 10."* Requires explicit tap to continue.

4. **Demo video** — Looping MP4 pre-recorded by physiotherapist. Child watches the target movement before beginning.

5. **Camera setup screen** — Live camera feed with a bounding box overlay and the prompt *"Move your hand into the box."* Session begins only when MediaPipe detects a hand within the box.

6. **Session** — 10-rep target. Camera feed visible in background with live particle/sparkle art overlay. STOP button always visible (top-left, high contrast). Rep counter top-right. If hand leaves frame for > 1 second: session pauses, friendly banner appears (*"Move your hand into the box!"*); resumes automatically on re-detection.

7. **End of session** — Celebration animation → full artwork reveal → Download PNG button.

8. **Gallery** — Past session artworks viewable from the home screen (thumbnails from localStorage). Shows consecutive-day streak count.

---

## 3. Tech Stack

### Frontend

| Layer | Technology |
|---|---|
| Component framework | React + TypeScript |
| Hand detection | MediaPipe Tasks Vision (WASM) — `HandLandmarker`, 21 landmarks, runs entirely in-browser |
| Movement classification | TensorFlow.js — pre-trained LSTM model loaded from `/public/models/` |
| Art rendering | HTML5 Canvas API — dual-layer (camera feed + particle overlay) |
| Persistence | `localStorage` only |
| Deployment | TBD (Vercel recommended for static React hosting) |

### No backend for MVP

All processing runs in the browser. No video is transmitted or stored on any server. No accounts, no PII collected. COPPA-safe by design.

---

## 4. Movement Detection Architecture

### Why ML, not rule-based

Rule-based keypoint geometry requires writing and calibrating new geometric rules per movement — fragile for typical anatomy, more so for atypical anatomy. The ML approach scales cleanly:

- Collect ~500 labeled video sequences per new movement (producible in-house with a physiotherapist)
- Extract keypoint sequences using the existing MediaPipe + Python pipeline (`notebooks/CreateDataSet.ipynb`, `src/utils.py`)
- Train LSTM classifier (`notebooks/Training.ipynb` — existing infrastructure is fully reusable)
- Export to TF.js format and drop into `/public/models/`
- No detection logic changes required for new movements

### Per-frame detection pipeline

```
MediaPipe HandLandmarker (WASM, in-browser)
  → 21 landmarks × [x, y, z] = 63 floats/frame
  → Ring buffer: last 30 frames of landmarks
  → Motion energy gate: if avg landmark velocity < threshold → skip classifier (hand still)
  → TF.js LSTM: 30-frame window → softmax probability over [target_movement, other]
  → Confidence > 0.7 → advance rep state machine
```

### Rep state machine (per movement)

```
IDLE
  → ACTIVE       (motion energy above threshold AND classifier confidence > 0.7)
ACTIVE
  → PEAK         (confidence sustained for N frames; movement amplitude at maximum)
PEAK
  → RETURNING    (motion reversing toward start position)
RETURNING
  → IDLE         (landmark positions return near start) → rep_count++
```

State machine parameters (`threshold`, frame counts, amplitude criteria) are defined per movement in the movement library config (`src/data/movements.ts`).

At 10 reps: trigger end-of-session flow.

### Hand detection failure

If MediaPipe returns no landmarks for > 1 second:
- Pause session and rep counter
- Display *"Move your hand into the box!"* overlay (friendly tone, non-alarming)
- Resume automatically when hand is re-detected

---

## 5. Art Rendering

### Dual-layer canvas

| Layer | Content |
|---|---|
| Layer 1 (background) | Mirrored camera feed. MediaPipe processes the un-mirrored frame; the display canvas is flipped horizontally via CSS `transform: scaleX(-1)`. |
| Layer 2 (foreground) | Transparent particle/sparkle canvas composited over the video layer. |

### Real-time particles

Particles are spawned at wrist and fingertip landmark positions when classifier confidence exceeds the detection threshold.

Particle properties:
- **Spawn rate** proportional to motion energy (faster movement = denser sparkles)
- **Color/hue** cycles progressively over session duration (full rainbow arc per session)
- **Drift** upward with slight random spread; fade out over ~1.5 seconds
- **Result** a live sparkle trail that accumulates into a unique canvas image

### Final artwork capture

At session end: `canvas.toDataURL('image/png')` captures the cumulative particle layer at full resolution. This PNG is stored in localStorage and offered for download.

---

## 6. Movement Library Structure

Each movement is a config entry plus associated assets:

```typescript
interface RepConfig {
  motionEnergyThreshold: number;
  confidenceThreshold: number;   // default 0.7
  sustainFrames: number;         // frames confidence must be held for ACTIVE → PEAK
  returnProximity: number;       // landmark distance threshold for RETURNING → IDLE
}

interface Movement {
  id: string;                    // e.g. "finger_extension_right"
  name: string;                  // display name, child-facing
  targetHand: "left" | "right" | "both";
  targetJoint: string;           // e.g. "finger_flexion", "wrist_rotation"
  demoVideoUrl: string;          // path to looping MP4 in /public/videos/
  modelUrl: string;              // path to TF.js model dir in /public/models/<id>/
  repStateMachineConfig: RepConfig;
  artPalette: string[];          // seed hex colors for this movement's particle style
}
```

Movements are defined in `src/data/movements.ts`. MVP target: 3–5 movements, each reviewed by a qualified physiotherapist before inclusion.

### Adding a new movement (no code changes to detection logic)

1. Record ~500 video sequences (physiotherapist performs the movement; use `notebooks/CreateDataSet.ipynb`)
2. Train LSTM: open `notebooks/Training.ipynb`, set `ACTIONS = ['target_movement', 'other']`
3. Convert to TF.js:
   ```bash
   tensorflowjs_converter --input_format=keras models/<name>.h5 public/models/<id>/
   ```
4. Add an entry to `src/data/movements.ts`
5. Record demo MP4, place in `public/videos/<id>.mp4`

---

## 7. Onboarding & Personalization

### Survey (one-time, localStorage-persisted)

| Question | Options |
|---|---|
| Which hand is affected? | Left / Right / Both |
| Which area? | Fingers / Wrist / Both |

Survey result filters the `movements` list to show only entries whose `targetHand` and `targetJoint` match. If no survey exists in localStorage, survey is shown on first visit.

### UI/UX requirements for ages 4–8

- Minimum tap target size: 48 × 48 px
- Minimal text; every interactive element has an icon + label pair
- No time pressure during survey or camera setup
- Setup screens use parent-facing language; session screens use child-facing language
- Celebration animation at session end is mandatory (not skippable for the first 2 seconds)

---

## 8. Session UI Layout

```
┌─────────────────────────────────────┐
│  [STOP]           Rep: 0/10         │
│                                     │
│   ┌─────────────────────────────┐   │
│   │  [camera feed + art layer]  │   │
│   │                             │   │
│   │   * *  *    *  *            │   │
│   └─────────────────────────────┘   │
│                                     │
│   [Move your hand into the box!]    │  <- shown only when hand not detected
└─────────────────────────────────────┘
```

| Element | Spec |
|---|---|
| STOP button | Top-left, always visible, large (min 64 × 48 px), high contrast |
| Rep counter | Top-right, large text |
| Detection guide box | Center overlay during camera setup phase only |
| Hand not detected banner | Bottom of screen, friendly tone, non-alarming, auto-dismisses on re-detection |

---

## 9. Data Storage Schema (localStorage)

```typescript
// Key: "correctivity_profile"
interface UserProfile {
  affectedHand: "left" | "right" | "both";
  affectedArea: "fingers" | "wrist" | "both";
  createdAt: string; // ISO 8601 date string
}

// Key: "correctivity_sessions"
type SessionStore = Session[]; // array, newest first

interface Session {
  id: string;           // UUID
  date: string;         // ISO 8601 date string
  movementId: string;   // matches Movement.id
  repsCompleted: number;
  targetReps: number;   // 10 for MVP
  artworkDataUrl: string; // base64 PNG from canvas.toDataURL()
}
```

**Gallery view:** renders `artworkDataUrl` thumbnails in a grid sorted by date. Displays consecutive-day streak count derived from `Session[].date` values.

---

## 10. Safety & Compliance

| Concern | Mitigation |
|---|---|
| Medical device classification | No clinical outcomes claimed. Not marketed as diagnostic or therapeutic. Movement library is physio-curated. |
| Pain safety | STOP button always visible during session. Pre-session safety screen: *"Stop immediately if you feel pain above 3 out of 10."* |
| Video privacy | No video stored or transmitted. Only keypoint coordinates (21 landmarks × xyz) are processed; these are not persisted. |
| PII / COPPA | No accounts. No data transmitted off-device. No identifiable information collected. All state is local to the device. |
| Movement safety | Each movement in the library reviewed and approved by a qualified physiotherapist before app launch. |

---

## 11. Key Architectural Tradeoffs

| Decision | Choice | Rationale |
|---|---|---|
| Detection approach | ML (TF.js LSTM) | Extensible: adding a new movement requires retraining, not rewriting detection code |
| Backend | None for MVP | COPPA simplicity; no data transmission risk |
| Storage | localStorage | No accounts required; works offline; trivial implementation |
| Keypoint source | MediaPipe WASM in-browser | No server round-trip; real-time; no video leaves the device |
| Rep counting | State machine gated by classifier | More accurate than energy threshold alone; avoids double-counting |
| Art style | Particle overlay on live camera feed | Immediate visual magic for children; camera feed maintains sense of agency |
| Sharing | Download PNG only | Zero privacy risk; no hosting required |

---

## 12. Training Pipeline (Reusing Existing Repo Infrastructure)

The data collection and training pipeline in this repository is directly reusable for Correctivity movements. The primary difference from the existing gesture recognition pipeline is the feature vector: hand-only landmarks (63 features) rather than the full holistic vector (1662 features including face and pose).

### Feature vector for Correctivity

`extract_keypoints()` in `src/utils.py` currently extracts a 1662-element vector (pose + face + hands). For hand movement classification, only the 63 right-hand or 63 left-hand landmarks are required. A trimmed extractor function should be added for Correctivity training runs.

Input shape for the Correctivity LSTM: `(30 frames, 63 features)`.

For compound arm movements (e.g., wrist rotation with forearm involvement), pose landmarks (132 features) may optionally be included, giving `(30, 195)`.

### Reused files

| File | Role in Correctivity pipeline |
|---|---|
| `src/utils.py` | `media_pipe_detection()`, `extract_keypoints()` (trim to hand-only) |
| `notebooks/CreateDataSet.ipynb` | Record labeled movement sequences; set `ACTIONS = ['target_movement', 'other']` |
| `notebooks/Training.ipynb` | Train LSTM; set `input_shape=(30, 63)`; save to `models/<name>.h5` |

### Conversion to TF.js

After training:

```bash
pip install tensorflowjs
tensorflowjs_converter --input_format=keras \
  models/<name>.h5 \
  public/models/<movement_id>/
```

Place the output directory under the React app's `public/models/` so it is served as a static asset. The `modelUrl` field in the movement config points to this path.

### Dataset layout (Correctivity movements)

```
datasets/
  correctivity/
    <movement_id>/
      <sequence_index>/
        0.npy ... 29.npy   # 30 frames per sequence, 63 floats per frame
models/
  <movement_id>.h5
public/
  models/
    <movement_id>/         # TF.js model files (model.json + shards)
  videos/
    <movement_id>.mp4      # demo video for UI
```

---

## 13. Milestones

### M0 — Foundation (Week 1–2)
**Goal:** Prove the core detection loop works in-browser before building any UI.

Deliverables:
- React + TypeScript project scaffolded (Vite)
- MediaPipe `HandLandmarker` initialized; 21 landmarks rendered as overlay on live camera feed
- Ring buffer (30 frames) implemented in `useHandLandmarker`
- Motion energy gate implemented and tunable via a debug slider
- One trained LSTM model (single movement) converted to TF.js and loading successfully in-browser
- Console-logged softmax probabilities confirm inference is running at ~30fps

Exit criteria: Classifier outputs >0.7 confidence for the target movement when performed in front of the camera.

#### M0 Detailed Todo List

**1. Project scaffolding**
- [x] Initialise project with `npm create vite@latest correctivity -- --template react-ts`
- [x] Install dependencies: `@mediapipe/tasks-vision`, `@tensorflow/tfjs`, `@tensorflow/tfjs-backend-webgl`
- [x] Configure `vite.config.ts` to set `optimizeDeps.exclude: ['@mediapipe/tasks-vision']` (prevents Vite from pre-bundling the WASM module)
- [x] Add `public/` to `.gitignore` exceptions so model files are tracked if committed; add a `.gitkeep` in `public/models/` and `public/videos/`
- [x] Confirm `npm run dev` serves the app at `localhost:5173` with no console errors
- [x] Set up path aliases in `tsconfig.json` and `vite.config.ts`: `@/` → `src/`

**2. Camera access**
- [x] Create `useCamera` hook (`src/hooks/useCamera.ts`) that calls `navigator.mediaDevices.getUserMedia({ video: true })`
- [x] Attach the media stream to a `<video>` element via a `ref` (`video.srcObject = stream`)
- [x] Handle permission denied: surface a visible error message ("Camera access is required") — do not crash
- [x] Handle no camera found: separate error state with distinct message
- [x] Clean up stream tracks on component unmount (`stream.getTracks().forEach(t => t.stop())`)
- [x] Confirm video renders live in the browser at this point

**3. MediaPipe HandLandmarker initialisation**
- [x] Create `useHandLandmarker` hook (`src/hooks/useHandLandmarker.ts`)
- [x] Download the HandLandmarker WASM bundle and model asset (`hand_landmarker.task`) and place in `public/mediapipe/`
- [x] Initialise `HandLandmarker` with `runningMode: 'VIDEO'`, `numHands: 1`, loading from the local `public/mediapipe/` path (no CDN calls at runtime)
- [x] Expose `isReady: boolean` while the model asset is loading; render a loading state in the UI until ready
- [x] Run `handLandmarker.detectForVideo(videoElement, timestamp)` inside a `requestAnimationFrame` loop
- [x] Return `landmarks: NormalizedLandmark[] | null` (null when no hand detected) from the hook
- [x] Confirm landmarks log to the console when a hand is in frame

**4. Landmark overlay on canvas**
- [x] Add a `<canvas>` element sized to match the video element dimensions
- [x] On each frame where landmarks are non-null: draw a circle (radius 4px) at each of the 21 landmark positions, scaled by canvas width/height
- [x] Connect landmark points with lines to form the hand skeleton (use MediaPipe's standard connection list: `HAND_CONNECTIONS`)
- [x] Mirror the canvas display horizontally (`ctx.scale(-1, 1)` or CSS `transform: scaleX(-1)`) so it feels like a mirror
- [x] Confirm the skeleton tracks the hand smoothly with no visible lag at 30fps

**5. Ring buffer**
- [x] Implement `RingBuffer<T>` class in `src/utils/ringBuffer.ts`:
  - Constructor takes `capacity: number`
  - `push(item: T): void`
  - `toArray(): T[]` — returns items in chronological order
  - `isFull(): boolean`
  - `clear(): void`
- [x] Instantiate a `RingBuffer<NormalizedLandmark[]>` of capacity 30 inside `useHandLandmarker`
- [x] Push the current frame's landmarks on every `rAF` tick (push a zero-filled frame if no hand detected, to keep the buffer advancing)
- [x] Unit test `toArray()` wrap-around ordering and `isFull()` using Vitest (`npm run test`)

**6. Training a single-movement LSTM (Python — reuse existing pipeline)**
- [x] Choose one movement for M0/M1 testing (e.g. `finger_extension_right`)
- [x] Open `notebooks/CreateDataSet.ipynb`; set `ACTIONS = ['finger_extension_right', 'other']` and `SEQUENCE_LENGTH = 30`
- [x] Record ~500 sequences per class using the webcam (physiotherapist or stand-in performer)
- [x] Open `notebooks/Training.ipynb`; update `input_shape` to `(30, 63)` (hand landmarks only — right hand: 21 × 3)
- [x] Add a trimmed extractor alongside `extract_keypoints()` in `src/utils.py` that returns only the 63 right-hand floats (or left-hand); use this for the Correctivity training run
- [x] Train LSTM; confirm validation accuracy > 90% before proceeding
- [x] Save model to `models/finger_extension_right.h5`

**7. TF.js model conversion**
- [x] Install converter: `pip install tensorflowjs`
- [x] Run conversion:
  ```bash
  tensorflowjs_converter --input_format=keras \
    models/finger_extension_right.h5 \
    correctivity-app/public/models/finger_extension_right/
  ```
- [x] Confirm `model.json` and at least one `.bin` shard are present in the output directory
- [x] Verify file sizes are reasonable (expect < 5MB for a 3-layer LSTM of this size)

**8. TF.js inference in-browser**
- [x] Install `@tensorflow/tfjs` and `@tensorflow/tfjs-backend-webgl` in the React project
- [x] Call `tf.setBackend('webgl')` on app initialisation; fall back to `'cpu'` if WebGL is unavailable
- [x] Load the model: `tf.loadLayersModel('/models/finger_extension_right/model.json')` on app mount
- [x] When ring buffer `isFull()`: convert `buffer.toArray()` to a `tf.Tensor` of shape `[1, 30, 63]`
- [x] Run `model.predict(tensor)` and extract the softmax output as a plain JS array
- [x] Log confidence for `finger_extension_right` (index 0) to the console on every inference
- [x] Dispose input and output tensors immediately after reading values (`tensor.dispose()`)
- [x] Confirm inference runs without "tensor not disposed" warnings in the console

**9. Performance check**
- [ ] Open Chrome DevTools → Performance tab; record 10 seconds of live inference
- [ ] Confirm `rAF` callback completes in < 33ms (≥ 30fps) on a mid-range laptop
- [ ] If frame time exceeds budget: profile and identify bottleneck (likely tensor allocation — check disposal)
- [ ] Confirm no memory leak: `tf.memory().numTensors` should stay constant across frames

**10. Exit-criteria validation**
- [ ] Perform the target movement 10 times in front of the camera; confirm confidence consistently > 0.7 in the console logs
- [ ] Hold hand still for 5 seconds; confirm confidence drops below 0.5
- [ ] Perform an unrelated hand movement; confirm confidence stays below 0.5
- [ ] Document the tuned `motionEnergyThreshold` value observed during manual testing as a comment in the hook

---

### M1 — Rep Counter (Week 3)
**Goal:** End-to-end rep detection for one movement.

Deliverables:
- `useRepStateMachine` hook implemented (IDLE → ACTIVE → PEAK → RETURNING → IDLE)
- Rep count increments correctly; no double-counting
- Hand-loss detection: rep counter pauses after 1 second of no landmarks, resumes on re-detection
- Debug overlay showing current state machine state (dev only)

Exit criteria: 10 reps detected reliably in a 5-run test with <1 false positive per run.

#### M1 Detailed Todo List

**1. Motion energy gate**
- [ ] Define motion energy as mean Euclidean distance of each landmark from its position in the previous frame (averaged across all 21 landmarks)
- [ ] Implement `computeMotionEnergy(prevFrame, currFrame): number` as a pure utility function in `src/utils/motion.ts`
- [ ] Add `motionEnergyThreshold` to `RepConfig` (start with a hand-tuned default, e.g. `0.005` in normalized coords)
- [ ] Gate: if `motionEnergy < threshold` set classifier output to 0 without calling TF.js (saves inference cost)
- [ ] Expose threshold as a dev-mode slider in the debug overlay for manual tuning

**2. Ring buffer**
- [ ] Implement a fixed-length ring buffer class/hook (`src/utils/ringBuffer.ts`) that stores the last N landmark frames
- [ ] Buffer length configurable (default 30 frames to match LSTM input shape)
- [ ] Expose `isFull(): boolean` — classifier must not run until buffer has 30 frames
- [ ] Implement `toArray(): Float32Array` that returns frames in chronological order, flattened to shape `(30, 63)`
- [ ] Unit test: verify `toArray()` order is correct after buffer wraps around

**3. TF.js classifier hook (`useMovementClassifier`)**
- [ ] Load TF.js model from `movement.modelUrl` on hook mount using `tf.loadLayersModel()`
- [ ] Handle model load failure: log error and surface a recoverable error state (do not crash)
- [ ] On each frame (after ring buffer is full and motion gate passes): run `model.predict()` with the 30-frame window
- [ ] Parse softmax output: extract confidence for the `target_movement` class (index 0 by convention)
- [ ] Return `{ confidence: number, isReady: boolean }` from hook
- [ ] Dispose tensors after each inference to prevent memory leak (`tensor.dispose()`)
- [ ] Verify inference runs at ≥ 20fps on a mid-range laptop (Chrome DevTools Performance tab)

**4. Rep state machine (`useRepStateMachine`)**
- [ ] Define `RepState = 'IDLE' | 'ACTIVE' | 'PEAK' | 'RETURNING'` in `src/types/index.ts`
- [ ] Implement transitions:
  - `IDLE → ACTIVE`: `motionEnergy > threshold` AND `confidence > confidenceThreshold` (default 0.7)
  - `ACTIVE → PEAK`: `confidence` sustained above threshold for `sustainFrames` consecutive frames AND motion energy at local maximum (i.e. starts decreasing)
  - `PEAK → RETURNING`: motion direction reverses (motion energy drops below `peakMotionEnergy * 0.5`)
  - `RETURNING → IDLE`: mean landmark position within `returnProximity` of the position recorded at IDLE exit → increment `repCount`
- [ ] Capture start-position snapshot of landmarks when leaving IDLE (used for `returnProximity` check)
- [ ] Capture peak motion energy when entering PEAK (used for PEAK → RETURNING threshold)
- [ ] Prevent re-entering ACTIVE from RETURNING (must fully return to IDLE first — avoids double-counting)
- [ ] Hook returns `{ state: RepState, repCount: number, resetReps: () => void }`
- [ ] All config values (`sustainFrames`, `confidenceThreshold`, `returnProximity`, etc.) sourced from `movement.repStateMachineConfig`

**5. Hand-loss detection**
- [ ] Track timestamp of last frame where MediaPipe returned ≥ 1 landmark
- [ ] If elapsed time since last detected frame > 1000ms: set `handPresent = false`
- [ ] When `handPresent` is false: freeze rep state machine (do not process new frames through classifier or state machine)
- [ ] When landmarks are detected again: set `handPresent = true`, resume state machine from its current state (do not reset rep count)
- [ ] Expose `handPresent: boolean` from the hook for the UI to show/hide the "Move your hand into the box!" banner

**6. Wiring (top-level session component)**
- [ ] Connect `useHandLandmarker` → ring buffer → motion gate → `useMovementClassifier` → `useRepStateMachine` in the correct data flow order
- [ ] Ensure per-frame processing runs inside `requestAnimationFrame` loop (not `setInterval`)
- [ ] Rep count displayed live in the UI (top-right, large text)
- [ ] "Move your hand into the box!" banner conditionally rendered based on `handPresent`
- [ ] At `repCount === 10`: call `onSessionComplete()` callback and stop the animation loop

**7. Debug overlay (dev only)**
- [ ] Render current `RepState` as text overlay on canvas (hidden in production via `import.meta.env.DEV`)
- [ ] Show current `confidence` value (2 decimal places)
- [ ] Show current `motionEnergy` value (4 decimal places)
- [ ] Show `handPresent` status
- [ ] Motion energy threshold slider (range 0–0.05, step 0.001) that writes back to a dev config store
- [ ] Confidence threshold slider (range 0.5–0.99, step 0.01)

**8. Testing & tuning**
- [ ] Run 5 consecutive sets of 10 reps of the target movement; record rep counts
- [ ] Run 5 "false positive" tests: hold hand still, move hand in non-target ways; verify rep count stays at 0
- [ ] Tune `motionEnergyThreshold`, `sustainFrames`, and `returnProximity` until exit criteria are met (<1 false positive per run)
- [ ] Test hand-loss recovery: remove hand mid-session, reintroduce; verify rep count is preserved and session continues
- [ ] Record final tuned config values in `src/data/movements.ts` for the test movement

---

### M2 — Art Rendering (Week 4)
**Goal:** Live sparkle art accumulates on canvas during a session.

Deliverables:
- Dual-layer canvas: mirrored camera feed (Layer 1) + transparent particle canvas (Layer 2)
- Particles spawn at wrist + fingertip landmarks when confidence > threshold
- Spawn rate scales with motion energy; hue cycles over session duration
- `canvas.toDataURL('image/png')` captures the particle layer correctly at session end
- PNG is visually appealing on a range of backgrounds

Exit criteria: A completed 10-rep session produces a non-blank, downloadable PNG.

---

### M3 — Full Session Flow (Week 5–6)
**Goal:** A child can complete a session from launch to artwork download without guidance.

Deliverables:
- All screens implemented: Survey → Movement Picker → Safety Screen → Demo Video → Camera Setup → Session → End of Session
- STOP button always visible and functional during session
- "Move your hand into the box!" pause banner shown/dismissed correctly
- Celebration animation at session end
- Download PNG button functional
- localStorage persistence for `UserProfile` and `Session[]`

Exit criteria: Usability walkthrough with one non-technical adult completed without confusion.

---

### M4 — Gallery & Streak (Week 7)
**Goal:** Returning users can see their history and are motivated to come back.

Deliverables:
- Gallery screen: thumbnail grid of past artworks sorted by date
- Consecutive-day streak count displayed on home screen
- Survey skipped on return visits (profile loaded from localStorage)
- Empty state for first-time users

Exit criteria: Gallery renders correctly after 3 simulated sessions on different dates.

---

### M5 — Movement Library Expansion (Week 8–9)
**Goal:** 3–5 physio-approved movements available at launch.

Deliverables:
- Data collection completed for each movement (~500 sequences each)
- LSTM trained and converted to TF.js for each movement
- Demo MP4 recorded for each movement
- All movements added to `src/data/movements.ts`
- Survey filter correctly surfaces relevant movements per hand/area selection
- Each movement sign-off documented from physiotherapist

Exit criteria: All movements pass the M1 rep-counting exit criteria independently.

---

### M6 — Polish & Launch Readiness (Week 10)
**Goal:** App is safe, accessible, and ready for real children to use.

Deliverables:
- Accessibility pass: all tap targets ≥ 48 × 48 px; icon + label pairs verified
- Safety screen copy reviewed by physiotherapist
- Cross-browser test: Chrome, Safari, Firefox on desktop; Chrome on Android; Safari on iOS
- Camera permission denial handled gracefully (clear error message, no crash)
- localStorage quota exceeded handled gracefully (oldest artwork pruned)
- Deployed to Vercel (or agreed hosting); shareable URL confirmed working

Exit criteria: Two children aged 4–8 complete a session on the deployed URL without adult intervention beyond initial camera permission grant.

---

### Milestone Summary

| Milestone | Focus | Target Week |
|---|---|---|
| M0 | In-browser detection proof of concept | 1–2 |
| M1 | Rep counter for one movement | 3 |
| M2 | Art rendering + PNG capture | 4 |
| M3 | Full session flow, all screens | 5–6 |
| M4 | Gallery + streak | 7 |
| M5 | Full movement library (3–5 movements) | 8–9 |
| M6 | Polish, accessibility, cross-browser, deploy | 10 |

---

## Appendix: File Structure (proposed React app)

```
src/
  components/
    Survey.tsx
    MovementPicker.tsx
    SafetyScreen.tsx
    DemoVideo.tsx
    CameraSetup.tsx
    Session.tsx
    EndOfSession.tsx
    Gallery.tsx
  data/
    movements.ts           # Movement[] config array
  hooks/
    useHandLandmarker.ts   # MediaPipe WASM initialization + per-frame landmarks
    useMovementClassifier.ts  # TF.js LSTM inference + ring buffer
    useRepStateMachine.ts  # State machine logic
    useArtCanvas.ts        # Particle system + canvas capture
  storage/
    profile.ts             # localStorage read/write for UserProfile
    sessions.ts            # localStorage read/write for Session[]
  types/
    index.ts               # Shared TypeScript interfaces
public/
  models/                  # TF.js model directories (one per movement)
  videos/                  # Demo MP4s (one per movement)
```
