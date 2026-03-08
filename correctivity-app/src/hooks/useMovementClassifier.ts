import { useEffect, useRef, useState, useCallback } from 'react'
import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-backend-webgl'
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { flattenLandmarks } from '@/utils/motion'
import type { RingBuffer } from '@/utils/ringBuffer'

const SEQUENCE_LENGTH = 30
const FEATURES_PER_FRAME = 63 // 21 landmarks × 3

interface UseMovementClassifierReturn {
  isReady: boolean
  error: string | null
  confidence: number
  /** Run inference against the current buffer contents. No-op until ready and buffer is full. */
  runInference: (
    buffer: RingBuffer<NormalizedLandmark[]>,
    motionEnergy: number,
    motionEnergyThreshold: number,
  ) => void
}

export function useMovementClassifier(modelUrl: string): UseMovementClassifierReturn {
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confidence, setConfidence] = useState(0)
  const modelRef = useRef<tf.LayersModel | null>(null)

  // ── Backend + model initialisation ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        await tf.setBackend('webgl')
      } catch {
        console.warn('[useMovementClassifier] WebGL unavailable, falling back to CPU')
        await tf.setBackend('cpu')
      }
      await tf.ready()

      try {
        console.log('[useMovementClassifier] loading model from', modelUrl)
        const model = await tf.loadLayersModel(modelUrl)
        console.log('[useMovementClassifier] model loaded OK')
        if (!cancelled) {
          modelRef.current = model
          setIsReady(true)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[useMovementClassifier] model load failed:', msg)
        if (!cancelled) setError(msg)
      }
    }

    init()

    return () => {
      cancelled = true
      modelRef.current?.dispose()
    }
  }, [modelUrl])

  // ── Inference ──────────────────────────────────────────────────────────────
  const runInference = useCallback(
    (
      buffer: RingBuffer<NormalizedLandmark[]>,
      motionEnergy: number,
      motionEnergyThreshold: number,
    ) => {
      const model = modelRef.current
      if (!model || !buffer.isFull()) return

      // Motion energy gate — skip when hand is still
      if (motionEnergy < motionEnergyThreshold) {
        setConfidence(0)
        return
      }

      // Build input tensor [1, 30, 63]
      const frames = buffer.toArray()
      const flat = new Float32Array(SEQUENCE_LENGTH * FEATURES_PER_FRAME)
      for (let i = 0; i < frames.length; i++) {
        const frameFeat = flattenLandmarks(frames[i])
        flat.set(frameFeat, i * FEATURES_PER_FRAME)
      }

      const inputTensor = tf.tensor3d(flat, [1, SEQUENCE_LENGTH, FEATURES_PER_FRAME])

      let outputTensor: tf.Tensor | null = null
      try {
        outputTensor = model.predict(inputTensor) as tf.Tensor
        const probs = outputTensor.dataSync()
        // Index 0 is the target movement class by convention
        const conf = probs[0]
        setConfidence(conf)

        if (import.meta.env.DEV) {
          console.debug('[Classifier] confidence:', conf.toFixed(3))
        }
      } finally {
        inputTensor.dispose()
        outputTensor?.dispose()
      }
    },
    [],
  )

  return { isReady, error, confidence, runInference }
}
