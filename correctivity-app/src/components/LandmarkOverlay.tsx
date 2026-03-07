import { useEffect, useRef } from 'react'
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

// MediaPipe hand skeleton connections (pairs of landmark indices)
const HAND_CONNECTIONS: [number, number][] = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm
  [5, 9], [9, 13], [13, 17],
]

interface Props {
  landmarks: NormalizedLandmark[] | null
  width: number
  height: number
}

export function LandmarkOverlay({ landmarks, width, height }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, width, height)
    if (!landmarks || landmarks.length === 0) return

    // Mirror horizontally to match mirrored video display
    ctx.save()
    ctx.translate(width, 0)
    ctx.scale(-1, 1)

    // Connections
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.lineWidth = 2
    for (const [a, b] of HAND_CONNECTIONS) {
      const lA = landmarks[a]
      const lB = landmarks[b]
      if (!lA || !lB) continue
      ctx.beginPath()
      ctx.moveTo(lA.x * width, lA.y * height)
      ctx.lineTo(lB.x * width, lB.y * height)
      ctx.stroke()
    }

    // Landmark dots
    for (const lm of landmarks) {
      ctx.beginPath()
      ctx.arc(lm.x * width, lm.y * height, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#00e5ff'
      ctx.fill()
    }

    ctx.restore()
  }, [landmarks, width, height])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
      }}
    />
  )
}
