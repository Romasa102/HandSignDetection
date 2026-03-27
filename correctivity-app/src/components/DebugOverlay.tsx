// Dev-only overlay — not rendered in production builds.
// Shows real-time classifier and motion energy diagnostics.

import type { RepState } from '@/types'

interface Props {
  motionEnergy: number
  confidence: number
  handPresent: boolean
  bufferFull: boolean
  repState: RepState
  motionEnergyThreshold: number
  confidenceThreshold: number
  onMotionThresholdChange: (v: number) => void
  onConfidenceThresholdChange: (v: number) => void
}

export function DebugOverlay({
  motionEnergy,
  confidence,
  handPresent,
  bufferFull,
  repState,
  motionEnergyThreshold,
  confidenceThreshold,
  onMotionThresholdChange,
  onConfidenceThresholdChange,
}: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        background: 'rgba(0,0,0,0.75)',
        color: '#0f0',
        fontFamily: 'monospace',
        fontSize: 12,
        padding: '8px 12px',
        borderRadius: 6,
        minWidth: 240,
        zIndex: 100,
      }}
    >
      <div>[DEV]</div>
      <div>hand: {handPresent ? 'YES' : 'NO'}</div>
      <div>buffer full: {bufferFull ? 'YES' : 'NO'}</div>
      <div>state: {repState}</div>
      <div>energy: {motionEnergy.toFixed(4)}</div>
      <div>confidence: {confidence.toFixed(3)}</div>

      <hr style={{ borderColor: '#333', margin: '6px 0' }} />

      <label>
        energy threshold: {motionEnergyThreshold.toFixed(3)}
        <input
          type="range"
          min={0}
          max={0.05}
          step={0.001}
          value={motionEnergyThreshold}
          onChange={e => onMotionThresholdChange(parseFloat(e.target.value))}
          style={{ display: 'block', width: '100%' }}
        />
      </label>

      <label>
        confidence threshold: {confidenceThreshold.toFixed(2)}
        <input
          type="range"
          min={0.5}
          max={0.99}
          step={0.01}
          value={confidenceThreshold}
          onChange={e => onConfidenceThresholdChange(parseFloat(e.target.value))}
          style={{ display: 'block', width: '100%' }}
        />
      </label>
    </div>
  )
}
