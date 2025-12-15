# About the proejct
This project create the real time sign recognition model. By usng LSTM, the model consider the sequence of the movement of the hand to guess the sign rather than taking a single frame and process the inference. This allows the model to recognize the gesture that involve hand movement rather than just the sign which is stationary.

This project is a whole pipeline which allows the user to create the dataset, train the model and test the model. 


# Setup
## Library installation
Due to the strict version requirement for tensorflow and mediapipe, make sure to use python 3.10 and download the library as it is in requirement.txt.
> [!NOTE]
> I would suggest to use the virtual environment in order to manage this specific environement. It could make such a mess.

Use the following command to install all the required library.
```
pip install -r requirements.txt 
```
## Configuration
Configure the setting using config,py
Each of the variable's function is as follows

### Data creation configurartion
- DATAFILE_NAME - Name of the dataset you will create
- ACTIONS - List of possible actions detected in your model
- NO_SEQUENCES - How many data do you want to have for each actions.
- SEQUENCE_LENGTH - How long the video would be (frame count)

### Model training configuration
- TRAINING_DATAFILE_NAME - Name of dataset that you will use to train the model
- LSTM_ACTIVATION_FUNCTION - Activation function for LSTM
- DENSE_ACTIVATION_FUNCTION - Activation function for Dense layers
- L2NORM - L2 norm regularization term
- DROPOUTRATE - Dropout rate
- OPTIMIZER - Optimizer to use
- EPOCHS - number of epochs
- MODEL_SAVE_DIRECTORY - derectry to save your model

### Testing condiguration
- MODEL_DIRECTORY - directory of the model to use

# How to use
## Create the dataset
Follow notebooks/CreateDataSet.ipynb to create your own datasets. This code will turn on an application where you will record the video following the instruction.

This datasets creation takes 
```
NO_SEQUENCES*len(ACTIONS)*(2+ SEQUENCE_LENGTH/30) seconds
```
to complete. (Default setting with 3 action, 30 data per action, 30 frame would take 270 seconds (4.5min) to complete)

## Train the model
> [!IMPORTANT]
> This step could take significant time when the GPU is not utilized. Make sure that you are using the computer with powerful GPU and make sure that pytorch recognize your GPU.

Follow notebook/Training.ipynb.

## Test the model
Run notebook/Test.ipynb and it will open the application that run the model in real-time.

This application would show the bar chart which show the outptu of the model (percentage for each action) and if the model decide that it is clear that the sign is made, it will print out the action's name on the screen.