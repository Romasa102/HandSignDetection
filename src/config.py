import numpy as np

#Data

DATAFILE_NAME = 'Test' #Set your file's name here

ACTIONS = np.array(['hello', 'thanks', 'iloveyou'])

NO_SEQUENCES = 30 #How many data do you want to take for each actions.

SEQUENCE_LENGTH = 30 #How long the video would be (frame count)

#Training setting

TRAINING_DATAFILE_NAME = 'MP_Data' #Which dataset to use for training

LSTM_ACTIVATION_FUNCTION = 'tanh'

DENSE_ACTIVATION_FUNCTION = 'relu'

L2NORM = 0.001 #L2 norm regularization term

DROPOUTRATE = 0.2 #dropout rate

OPTIMIZER = 'Adam' #Optimizer to use

EPOCHS = 2000 #Epoch count

MODEL_SAVE_DIRECTORY = 'models'

#Model

MODEL_PATH = 'models/action.h5' #The model you would like to use for the test

