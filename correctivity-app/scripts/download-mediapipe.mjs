/**
 * Downloads MediaPipe HandLandmarker assets from the official CDN into
 * public/mediapipe/ so they can be served locally at runtime (no CDN calls).
 *
 * Usage: node scripts/download-mediapipe.mjs
 */
import { createWriteStream, mkdirSync } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import path from 'node:path'

const BASE = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1'
const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'

const OUT_DIR = path.resolve('public/mediapipe')
const WASM_DIR = path.join(OUT_DIR, 'wasm')

mkdirSync(OUT_DIR, { recursive: true })
mkdirSync(WASM_DIR, { recursive: true })

const FILES = [
  { url: `${BASE}/hand_landmarker.task`, dest: path.join(OUT_DIR, 'hand_landmarker.task') },
  { url: `${WASM_BASE}/vision_wasm_internal.js`,    dest: path.join(WASM_DIR, 'vision_wasm_internal.js') },
  { url: `${WASM_BASE}/vision_wasm_internal.wasm`,  dest: path.join(WASM_DIR, 'vision_wasm_internal.wasm') },
  { url: `${WASM_BASE}/vision_wasm_nosimd_internal.js`,   dest: path.join(WASM_DIR, 'vision_wasm_nosimd_internal.js') },
  { url: `${WASM_BASE}/vision_wasm_nosimd_internal.wasm`, dest: path.join(WASM_DIR, 'vision_wasm_nosimd_internal.wasm') },
]

for (const { url, dest } of FILES) {
  console.log(`Downloading ${path.basename(dest)}...`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  await pipeline(res.body, createWriteStream(dest))
}

console.log('Done. MediaPipe assets written to public/mediapipe/')
