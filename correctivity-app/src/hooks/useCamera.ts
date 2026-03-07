import { useEffect, useRef, useState } from 'react'

type CameraError =
  | { kind: 'permission-denied' }
  | { kind: 'no-camera' }
  | { kind: 'unknown'; message: string }

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement>
  isReady: boolean
  error: CameraError | null
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<CameraError | null>(null)

  useEffect(() => {
    let stream: MediaStream | null = null

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true })
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play()
        setIsReady(true)
      } catch (err) {
        if (err instanceof DOMException) {
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setError({ kind: 'permission-denied' })
          } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            setError({ kind: 'no-camera' })
          } else {
            setError({ kind: 'unknown', message: err.message })
          }
        } else {
          setError({ kind: 'unknown', message: String(err) })
        }
      }
    }

    startCamera()

    return () => {
      stream?.getTracks().forEach(t => t.stop())
      setIsReady(false)
    }
  }, [])

  return { videoRef, isReady, error }
}
