import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  onDone: () => void
  duration?: number
}

export default function Toast({ message, onDone, duration = 3000 }: ToastProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); onDone() }, duration)
    return () => clearTimeout(t)
  }, [duration, onDone])

  if (!visible) return null
  return <div className="toast">{message}</div>
}

// Global toast state manager — singleton hook
import { useCallback } from 'react'

let _setGlobalToast: ((msg: string) => void) | null = null

export function useToastController() {
  const [message, setMessage] = useState<string | null>(null)
  _setGlobalToast = setMessage
  const clear = useCallback(() => setMessage(null), [])
  return { message, clear }
}

export function showToast(message: string) {
  _setGlobalToast?.(message)
}
