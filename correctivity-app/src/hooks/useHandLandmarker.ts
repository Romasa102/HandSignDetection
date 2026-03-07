import { useEffect, useRef, useState, useCallback } from 'react'
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { RingBuffer } from '@/utils/ringBuffer'
import { computeMotionEnergy, zeroLandmarks } from '@/utils/motion'

const LANDMARKS_PER_HAND = 21
const BUFFER_CAPACITY = 30

// Threshold for considering the hand "still" — skip classifier when below this
const DEFAULT_MOTION_ENERGY_THRESHOLD = 0.005

interface UseHandLandmarkerReturn {
  isReady: boolean
  landmarks: NormalizedLandmark[] | null
  handPresent: boolean
  motionEnergy: number
  landmarkBuffer: RingBuffer<NormalizedLandmark[]>
  /** Start the rAF detection loop against the given video element */
  startDetection: (video: HTMLVideoElement) => void
  stopDetection: () => void
}

export function useHandLandmarker(
  motionEnergyThreshold = DEFAULT_MOTION_ENERGY_THRESHOLD,
): UseHandLandmarkerReturn {
  const [isReady, setIsReady] = useState(false)
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[] | null>(null)
  const [handPresent, setHandPresent] = useState(false)
  const [motionEnergy, setMotionEnergy] = useState(0)

  const detectorRef = useRef<HandLandmarker | null>(null)
  const rafIdRef = useRef<number | null>(null)
  const prevLandmarksRef = useRef<NormalizedLandmark[] | null>(null)
  const lastDetectedAtRef = useRef<number>(0)

  // Stable ring buffer instance — does not trigger re-renders
  const bufferRef = useRef(new RingBuffer<NormalizedLandmark[]>(BUFFER_CAPACITY))

  // ── Initialise MediaPipe ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function init() {
      const vision = await FilesetResolver.forVisionTasks(
        '/mediapipe/wasm',
      )
      const handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: '/mediapipe/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
      })
      if (!cancelled) {
        detectorRef.current = handLandmarker
        setIsReady(true)
      }
    }

    init().catch(err => console.error('[useHandLandmarker] init failed:', err))

    return () => {
      cancelled = true
      detectorRef.current?.close()
    }
  }, [])

  // ── Detection loop ──────────────────────────────────────────────────────────
  const startDetection = useCallback((video: HTMLVideoElement) => {
    if (!detectorRef.current) return

    function detect() {
      const detector = detectorRef.current
      if (!detector || video.readyState < 2) {
        rafIdRef.current = requestAnimationFrame(detect)
        return
      }

      const now = performance.now()
      const result = detector.detectForVideo(video, now)
      const frame = result.landmarks[0] ?? null

      // Motion energy
      const energy = computeMotionEnergy(prevLandmarksRef.current, frame)
      prevLandmarksRef.current = frame
      setMotionEnergy(energy)

      // Hand presence tracking
      const detected = frame !== null
      if (detected) lastDetectedAtRef.current = now
      setHandPresent(detected || (now - lastDetectedAtRef.current < 1000))

      // Push to ring buffer — zeros if no hand detected
      const bufferFrame = frame ?? zeroLandmarks(LANDMARKS_PER_HAND)
      bufferRef.current.push(bufferFrame)

      setLandmarks(frame)

      if (import.meta.env.DEV && bufferRef.current.isFull()) {
        // Visible in DevTools console during development
        console.debug('[HandLandmarker] energy:', energy.toFixed(4), 'handPresent:', detected)
      }

      rafIdRef.current = requestAnimationFrame(detect)
    }

    rafIdRef.current = requestAnimationFrame(detect)
  }, [])

  const stopDetection = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
  }, [])

  useEffect(() => () => stopDetection(), [stopDetection])

  return {
    isReady,
    landmarks,
    handPresent,
    motionEnergy,
    landmarkBuffer: bufferRef.current,
    startDetection,
    stopDetection,
  }
}
