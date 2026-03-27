import { useCallback, useRef, useState } from 'react'
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import type { RepConfig, RepState } from '@/types'

/**
 * State machine designed for a POSE detector (not a motion detector).
 * The model outputs high confidence when the target pose is held,
 * and low confidence otherwise.
 *
 * Rep cycle:
 *   IDLE      → ACTIVE   : confidence rises above threshold (pose entered)
 *   ACTIVE    → PEAK     : confidence sustained for sustainFrames (confirmed pose)
 *   ACTIVE    → IDLE     : confidence drops before sustainFrames (false start)
 *   PEAK      → RETURNING: confidence drops below threshold (pose exited)
 *   RETURNING → IDLE     : confidence stays low for cooldown frames → rep counted
 */

interface UseRepStateMachineReturn {
  state: RepState
  repCount: number
  resetReps: () => void
  processFrame: (
    landmarks: NormalizedLandmark[],
    motionEnergy: number,
    confidence: number,
  ) => void
}

const COOLDOWN_FRAMES = 4 // frames of low confidence needed to confirm pose exit

export function useRepStateMachine(config: RepConfig): UseRepStateMachineReturn {
  const [state, setState] = useState<RepState>('IDLE')
  const [repCount, setRepCount] = useState(0)

  const stateRef = useRef<RepState>('IDLE')
  const sustainCountRef = useRef(0)  // consecutive frames above threshold
  const cooldownCountRef = useRef(0) // consecutive frames below threshold

  const setStateSync = useCallback((s: RepState) => {
    stateRef.current = s
    setState(s)
  }, [])

  const processFrame = useCallback(
    (
      _landmarks: NormalizedLandmark[],
      _motionEnergy: number,
      confidence: number,
    ) => {
      const s = stateRef.current
      const { confidenceThreshold, sustainFrames } = config
      const detected = confidence >= confidenceThreshold

      switch (s) {
        case 'IDLE': {
          if (detected) {
            sustainCountRef.current = 1
            cooldownCountRef.current = 0
            setStateSync('ACTIVE')
          }
          break
        }

        case 'ACTIVE': {
          if (detected) {
            sustainCountRef.current++
            if (sustainCountRef.current >= sustainFrames) {
              setStateSync('PEAK')
              cooldownCountRef.current = 0
            }
          } else {
            // Pose lost before confirmation — false start, back to IDLE
            sustainCountRef.current = 0
            setStateSync('IDLE')
          }
          break
        }

        case 'PEAK': {
          // Waiting for the user to leave the pose (return to start)
          if (!detected) {
            cooldownCountRef.current = 1
            setStateSync('RETURNING')
          }
          break
        }

        case 'RETURNING': {
          // Count the rep once confidence has been low for enough frames
          if (!detected) {
            cooldownCountRef.current++
            if (cooldownCountRef.current >= COOLDOWN_FRAMES) {
              setRepCount(c => c + 1)
              sustainCountRef.current = 0
              cooldownCountRef.current = 0
              setStateSync('IDLE')
            }
          } else {
            // Confidence spiked again — user re-entered pose, not a clean return
            cooldownCountRef.current = 0
            setStateSync('PEAK')
          }
          break
        }
      }
    },
    [config, setStateSync],
  )

  const resetReps = useCallback(() => {
    setRepCount(0)
    sustainCountRef.current = 0
    cooldownCountRef.current = 0
    setStateSync('IDLE')
  }, [setStateSync])

  return { state, repCount, resetReps, processFrame }
}
