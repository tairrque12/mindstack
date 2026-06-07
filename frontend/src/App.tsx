import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Home from './screens/Home'
import Capture from './screens/Capture'
import Library from './screens/Library'
import Toast, { useToastController } from './components/Toast'
import { flushQueue } from './services/offlineQueue'

function OfflineIndicator() {
  const [offline, setOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const on = () => { setOffline(false); flushQueue().catch(() => {}) }
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  if (!offline) return null
  return (
    <div
      style={{
        position: 'fixed', top: 14, right: 20,
        width: 8, height: 8, borderRadius: '50%',
        background: '#F5A623', zIndex: 9999,
        animation: 'pulse 2s ease-in-out infinite',
      }}
      title="Offline — captures will sync when reconnected"
    />
  )
}

export default function App() {
  const { message, clear } = useToastController()

  return (
    <BrowserRouter>
      <div style={{ height: '100dvh', background: '#080808', overflow: 'hidden' }}>
        <OfflineIndicator />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/add" element={<Capture />} />
          <Route path="/brain" element={<Library />} />
          <Route path="/map" element={<Home />} />
        </Routes>
        {message && <Toast message={message} onDone={clear} />}
      </div>
    </BrowserRouter>
  )
}
