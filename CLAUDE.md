# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Requirements

**Python 3.10 is required** due to strict version constraints on TensorFlow 2.15 and MediaPipe 0.10.

```bash
pip install -r requirements.txt
```

## Running the Notebooks

All workflows are Jupyter notebook-based. Run from the `notebooks/` directory or open in VS Code/JupyterLab:

| Notebook | Purpose |
|---|---|
| `notebooks/CreateDataSet.ipynb` | Record webcam sequences to build a dataset |
| `notebooks/Training.ipynb` | Train the LSTM model on collected data |
| `notebooks/Test.ipynb` | Real-time inference (press `q` to quit) |
| `notebooks/Art.ipynb` | Real-time skeleton art drawing (press `q` to quit) |
| `notebooks/JuliaAMandelBrotSets.ipynb` | Julia/Mandelbrot set art generation |
| `notebooks/VoronoiDiagramsADelunaryTriangulation.ipynb` | Voronoi/Delaunay art generation |

Launch TensorBoard to monitor training:
```bash
tensorboard --logdir notebooks/Logs
```

## Architecture

### Pipeline Overview

The project is an end-to-end LSTM-based gesture recognition pipeline:

1. **Data collection** (`CreateDataSet.ipynb`): Uses MediaPipe Holistic to extract keypoints from webcam frames and saves them as `.npy` files under `datasets/<DATAFILE_NAME>/<action>/<sequence>/<frame>.npy`.

2. **Training** (`Training.ipynb`): Loads `.npy` keypoints, builds a 3-layer LSTM + Dense network with TensorFlow/Keras, and saves the model as `models/<name>.h5`.

3. **Inference** (`Test.ipynb`): Loads an `.h5` model and runs real-time prediction from webcam with a probability bar chart overlay.

### Key Files

- **`src/config.py`** — Central configuration for all stages: dataset name, actions list, sequence parameters, model hyperparameters, and paths. Edit this before running any notebook.
- **`src/utils.py`** — Shared helpers: `media_pipe_detection()`, `draw_landmarks()`, `extract_keypoints()` (1662-dim vector: 132 pose + 1404 face + 63 lh + 63 rh), and `prob_viz()`.

### Keypoint Feature Vector

`extract_keypoints()` returns a flat 1662-element array per frame: pose (33 landmarks × 4), face (468 landmarks × 3), left hand (21 × 3), right hand (21 × 3). This is the input shape used by the LSTM (`input_shape=(30, 1662)`).

### Model Architecture

Three stacked LSTM layers (64 → 128 → 64 units) with L2 regularization and dropout, followed by two Dense layers (64 → 32), and a softmax output layer sized to `len(ACTIONS)`.

### Dataset Layout

```
datasets/
  <DATAFILE_NAME>/
    <action>/
      <sequence_index>/
        0.npy ... <SEQUENCE_LENGTH-1>.npy
models/
  <name>.h5
notebooks/Logs/   # TensorBoard logs written during training
```

## Configuration

All tunable parameters live in `src/config.py`. Key settings:

- `DATAFILE_NAME` / `TRAINING_DATAFILE_NAME` — dataset folder name for collection vs. training (can differ)
- `ACTIONS` — numpy array of gesture class names
- `NO_SEQUENCES`, `SEQUENCE_LENGTH` — dataset size per action
- `MODEL_PATH` — path to `.h5` model used in `Test.ipynb`
- `MODEL_SAVE_DIRECTORY` — where trained models are saved (default: `models/`)
