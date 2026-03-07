import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

/**
 * Computes mean Euclidean distance each landmark moved between two frames.
 * Landmarks are in normalized [0, 1] coordinates.
 *
 * Returns 0 if either frame is null (hand not detected).
 */
export function computeMotionEnergy(
  prev: NormalizedLandmark[] | null,
  curr: NormalizedLandmark[] | null,
): number {
  if (!prev || !curr || prev.length !== curr.length) return 0

  let total = 0
  for (let i = 0; i < prev.length; i++) {
    const dx = curr[i].x - prev[i].x
    const dy = curr[i].y - prev[i].y
    const dz = (curr[i].z ?? 0) - (prev[i].z ?? 0)
    total += Math.sqrt(dx * dx + dy * dy + dz * dz)
  }
  return total / prev.length
}

/**
 * Returns a zero-filled array of NormalizedLandmarks with the given length.
 * Used to advance the ring buffer when no hand is detected.
 */
export function zeroLandmarks(count: number): NormalizedLandmark[] {
  return Array.from({ length: count }, () => ({ x: 0, y: 0, z: 0, visibility: 0 }))
}

/**
 * Flattens a frame of 21 landmarks to a Float32Array of 63 values [x,y,z, x,y,z, ...].
 */
export function flattenLandmarks(landmarks: NormalizedLandmark[]): Float32Array {
  const out = new Float32Array(landmarks.length * 3)
  for (let i = 0; i < landmarks.length; i++) {
    out[i * 3]     = landmarks[i].x
    out[i * 3 + 1] = landmarks[i].y
    out[i * 3 + 2] = landmarks[i].z ?? 0
  }
  return out
}
