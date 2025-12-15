import numpy as np

#Data

DATAFILE_NAME = 'MP_Data' #Set your file's name here

ACTIONS = np.array(['hello', 'thanks', 'iloveyou'])

NO_SEQUENCES = 30 #How many data do you want to take for each actions.

SEQUENCE_LENGTH = 30 #How long the video would be (frame count)

#Training setting

TRAINING_DATAFILE_NAME = 'MP_Data' #Set your file's name here

OPTIMIZER = 'Adam'

L2NORM = ''

EPOCHS = 2000

MODEL_SAVE_DIRECTORY = 'models'

#Model

MODEL_DIRECTORY = 'models/action.h5'

