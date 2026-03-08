import { useEffect, useRef, useState } from 'react'
import { useCamera } from '@/hooks/useCamera'
import { useHandLandmarker } from '@/hooks/useHandLandmarker'
import { useMovementClassifier } from '@/hooks/useMovementClassifier'
import { LandmarkOverlay } from '@/components/LandmarkOverlay'
import { DebugOverlay } from '@/components/DebugOverlay'
import { MOVEMENTS } from '@/data/movements'

const VIDEO_WIDTH = 640
const VIDEO_HEIGHT = 480

// Use the first movement for M0 proof-of-concept
const MOVEMENT = MOVEMENTS[0]

export default function App() {
  const { videoRef, isReady: cameraReady, error: cameraError } = useCamera()

  const [motionThreshold, setMotionThreshold] = useState(
    MOVEMENT.repStateMachineConfig.motionEnergyThreshold,
  )
  const [confidenceThreshold, setConfidenceThreshold] = useState(
    MOVEMENT.repStateMachineConfig.confidenceThreshold,
  )

  const {
    isReady: landmarkerReady,
    landmarks,
    handPresent,
    motionEnergy,
    landmarkBuffer,
    startDetection,
    stopDetection,
  } = useHandLandmarker(motionThreshold)

  const { isReady: classifierReady, error: classifierError, confidence, runInference } =
    useMovementClassifier(MOVEMENT.modelUrl)

  const inferenceScheduledRef = useRef(false)

  // Start detection once both camera and landmarker are ready
  useEffect(() => {
    if (!cameraReady || !landmarkerReady || !videoRef.current) return
    startDetection(videoRef.current)
    return () => stopDetection()
  }, [cameraReady, landmarkerReady, videoRef, startDetection, stopDetection])

  // Run classifier on every new landmarks frame
  useEffect(() => {
    if (!classifierReady || inferenceScheduledRef.current) return
    inferenceScheduledRef.current = true
    requestAnimationFrame(() => {
      runInference(landmarkBuffer, motionEnergy, motionThreshold)
      inferenceScheduledRef.current = false
    })
  }, [landmarks, classifierReady, landmarkBuffer, motionEnergy, motionThreshold, runInference])

  // ── Render ────────────────────────────────────────────────────────────────

  if (cameraError) {
    const msg =
      cameraError.kind === 'permission-denied'
        ? 'Camera access is required. Please allow camera permissions and reload.'
        : cameraError.kind === 'no-camera'
          ? 'No camera found. Please connect a webcam and reload.'
          : `Camera error: ${cameraError.message}`
    return (
      <div style={styles.errorScreen}>
        <p style={styles.errorText}>{msg}</p>
      </div>
    )
  }

  const isLoading = !cameraReady || !landmarkerReady

  return (
    <div style={styles.root}>
      {isLoading && (
        <div style={styles.loadingBanner}>
          {!cameraReady ? 'Starting camera…' : 'Loading hand detector…'}
        </div>
      )}

      <div style={{ position: 'relative', width: VIDEO_WIDTH, height: VIDEO_HEIGHT }}>
        {/* Mirrored video */}
        <video
          ref={videoRef}
          width={VIDEO_WIDTH}
          height={VIDEO_HEIGHT}
          muted
          playsInline
          style={{ transform: 'scaleX(-1)', display: 'block' }}
        />

        {/* Landmark skeleton overlay */}
        <LandmarkOverlay
          landmarks={landmarks}
          width={VIDEO_WIDTH}
          height={VIDEO_HEIGHT}
        />

        {/* Dev-only debug panel */}
        {import.meta.env.DEV && (
          <DebugOverlay
            motionEnergy={motionEnergy}
            confidence={confidence}
            handPresent={handPresent}
            bufferFull={landmarkBuffer.isFull()}
            motionEnergyThreshold={motionThreshold}
            confidenceThreshold={confidenceThreshold}
            onMotionThresholdChange={setMotionThreshold}
            onConfidenceThresholdChange={setConfidenceThreshold}
          />
        )}

        {/* Classification result indicator */}
        {cameraReady && (
          <div style={styles.classifierPanel}>
            <div
              style={{
                ...styles.detectedBadge,
                background: classifierError ? '#dc2626' : !classifierReady ? '#7c3aed' : confidence >= confidenceThreshold ? '#22c55e' : '#374151',
              }}
            >
              {classifierError
                ? `Model error: ${classifierError}`
                : !classifierReady
                  ? 'Loading classifier…'
                  : confidence >= confidenceThreshold
                    ? '✓ MOVEMENT DETECTED'
                    : 'Waiting for movement…'}
            </div>
            <div style={styles.confidenceBarTrack}>
              <div
                style={{
                  ...styles.confidenceBarFill,
                  width: `${Math.round(confidence * 100)}%`,
                  background: confidence >= confidenceThreshold ? '#22c55e' : '#60a5fa',
                }}
              />
            </div>
            <div style={styles.confidenceLabel}>
              Confidence: {Math.round(confidence * 100)}%
            </div>
          </div>
        )}

        {/* Hand not detected banner */}
        {!handPresent && cameraReady && (
          <div style={styles.handBanner}>Move your hand into the box!</div>
        )}
      </div>
    </div>
  )
}

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#111',
    color: '#fff',
    fontFamily: 'sans-serif',
  },
  loadingBanner: {
    marginBottom: 16,
    fontSize: 18,
    color: '#aaa',
  },
  errorScreen: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#111',
    padding: 32,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 20,
    textAlign: 'center' as const,
    maxWidth: 480,
  },
  handBanner: {
    position: 'absolute' as const,
    bottom: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.7)',
    color: '#fff',
    padding: '10px 24px',
    borderRadius: 24,
    fontSize: 16,
    whiteSpace: 'nowrap' as const,
  },
  classifierPanel: {
    position: 'absolute' as const,
    bottom: 16,
    left: 16,
    right: 16,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },
  detectedBadge: {
    color: '#fff',
    fontWeight: 700,
    fontSize: 18,
    textAlign: 'center' as const,
    padding: '8px 0',
    borderRadius: 8,
    transition: 'background 0.2s',
  },
  confidenceBarTrack: {
    height: 12,
    background: '#1f2937',
    borderRadius: 6,
    overflow: 'hidden' as const,
  },
  confidenceBarFill: {
    height: '100%',
    borderRadius: 6,
    transition: 'width 0.1s, background 0.2s',
  },
  confidenceLabel: {
    color: '#d1d5db',
    fontSize: 13,
    textAlign: 'center' as const,
  },
} as const
