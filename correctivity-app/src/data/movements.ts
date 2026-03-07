import type { Movement } from '@/types'

// Placeholder entry for M0/M1 development. Replace with real values once the
// LSTM is trained and the demo MP4 is recorded.
const FINGER_EXTENSION_RIGHT: Movement = {
  id: 'finger_extension_right',
  name: 'Finger Extension',
  targetHand: 'right',
  targetJoint: 'finger_flexion',
  demoVideoUrl: '/videos/finger_extension_right.mp4',
  modelUrl: '/models/finger_extension_right/model.json',
  repStateMachineConfig: {
    motionEnergyThreshold: 0.005,
    confidenceThreshold: 0.7,
    sustainFrames: 6,
    returnProximity: 0.04,
  },
  artPalette: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff'],
}

export const MOVEMENTS: Movement[] = [
  FINGER_EXTENSION_RIGHT,
]
