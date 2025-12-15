
# Real-Time Sign Language Recognition using LSTM

![Python](https://img.shields.io/badge/Python-3.10-blue.svg)
![TensorFlow](https://img.shields.io/badge/TensorFlow-2.x-orange.svg)
![MediaPipe](https://img.shields.io/badge/MediaPipe-Legacy-green.svg)

## 📖 About the Project

This project implements a real-time gesture,hand-sign recognition model. By utilizing **Long Short-Term Memory (LSTM)** networks, the model analyzes the *sequence* of hand movements rather than relying on a single static frame for inference. This allows the system to recognize dynamic gestures that involve movement, not just stationary hand signs.

This repository contains an end-to-end pipeline that allows users to:
1. **Create a custom dataset** using a webcam.
2. **Train the LSTM model** on that data.
3. **Test the model** with real-time prediction and visualization.

---
## ⚙️ Setup

### Prerequisites & Installation
Due to strict version requirements for **TensorFlow** and **MediaPipe**, you must use **Python 3.10**.

> [!NOTE]
> **Highly Recommended:** Use a virtual environment (venv or conda) to manage dependencies. Mixing these specific library versions with your global Python installation can cause significant conflicts.

**1. Clone the repository:**
```bash
git clone <your-repo-url>
cd <your-repo-name>
```
**2. Create and activate a virtual environment (Optional but recommended):**

You can use either `venv` (built-in) or `conda`.

**Option A: Using venv**
```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# Linux/MacOS
python3 -m venv venv
source venv/bin/activate
```

**Option B: Using conda**
```bash
# Create environment with Python 3.10
conda create -n sign-lang-env python=3.10

# Activate the environment
conda activate sign-lang-env
```

**3. Install dependencies:**
```bash
pip install -r requirements.txt 
```
---
## 🛠️ Configuration
All settings are managed in config.py. Adjust the variables below to suit your specific use case.

### Data collection settings
- DATAFILE_NAME - Name of the folder/dataset you will create.
- ACTIONS - A list of actions (signs) for the model to detect (e.g., `['hello', 'thanks', 'iloveyou']`).
- NO_SEQUENCES - The number of video sequences to record for each action.
- SEQUENCE_LENGTH - The length of each video sequence (in frames).

### Model training settings
- TRAINING_DATAFILE_NAME - The name of the dataset folder to use for training.
- LSTM_ACTIVATION_FUNCTION - Activation function for the LSTM layers (e.g., `tanh`).
- DENSE_ACTIVATION_FUNCTION - Activation function for the Dense layers (e.g., `relu`).
- L2NORM - L2 regularization factor to prevent overfitting.
- DROPOUTRATE - Dropout rate to prevent overfitting.
- OPTIMIZER - The optimizer algorithm (e.g., `Adam`).
- EPOCHS - Number of training iterations.
- MODEL_SAVE_DIRECTORY - Directory where the trained `.h5` model will be saved.

### Testing Settings
- MODEL_PATH - Path to the specific model file you wish to load for inference.

---
## 🚀 How to use
### Create the dataset
Open and run `notebooks/CreateDataSet.ipynb`. This script launches an application that records video sequences via your webcam based on the instructions defined in `config.py`.

Estimated Time to Complete: The total recording time is calculated as:

$$ Time \approx \text{NOSEQUENCES} \times \text{len(ACTIONS)} \times (2 + \frac{\text{SEQUENCELENGTH}}{30}) \text{ seconds}$$

 Example: With 3 actions, 30 sequences each, and 30 frames per sequence, data collection will take approximately 270 seconds (4.5 minutes).

### Train the model
Open and run `notebooks/Training.ipynb`.

>[!IMPORTANT] 
>Training LSTM models can be computationally intensive. Ensure you are using a machine with a dedicated GPU and that your environment correctly recognizes your CUDA/GPU setup to speed up the process.

### Test the model
Open and run `notebooks/Test.ipynb`. This will launch the real-time inference window.

Features:

- Probability Bar Chart: Visualizes the model's confidence for each action.

- Action Prediction: If the confidence threshold is met, the detected action name will be printed on the screen.