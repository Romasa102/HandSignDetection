import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

export type { NormalizedLandmark }

// ── Movement library ──────────────────────────────────────────────────────────

export interface RepConfig {
  motionEnergyThreshold: number
  confidenceThreshold: number  // default 0.7
  sustainFrames: number        // frames confidence must be held for ACTIVE → PEAK
  returnProximity: number      // landmark distance threshold for RETURNING → IDLE
}

export interface Movement {
  id: string
  name: string
  targetHand: 'left' | 'right' | 'both'
  targetJoint: string
  demoVideoUrl: string
  modelUrl: string
  repStateMachineConfig: RepConfig
  artPalette: string[]
}

// ── Session storage ───────────────────────────────────────────────────────────

export interface UserProfile {
  affectedHand: 'left' | 'right' | 'both'
  affectedArea: 'fingers' | 'wrist' | 'both'
  createdAt: string
}

export interface Session {
  id: string
  date: string
  movementId: string
  repsCompleted: number
  targetReps: number
  artworkDataUrl: string
}

// ── Rep state machine ─────────────────────────────────────────────────────────

export type RepState = 'IDLE' | 'ACTIVE' | 'PEAK' | 'RETURNING'
