import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconArrowLeft } from '@tabler/icons-react'
import ParticleCanvas from '../components/ParticleCanvas'
import SourcePills from '../components/capture/SourcePills'
import CaptureForm from '../components/capture/CaptureForm'
import ConfirmationCard from '../components/capture/ConfirmationCard'
import {
  SOURCES,
  emptyFormState,
  type CaptureConfirmation,
  type CaptureFormState,
  type SourceId,
} from '../components/capture/types'
import { saveCapture, toConfirmationData } from '../services/captureService'

type SaveState = 'idle' | 'saving' | 'error'

function hasContent(source: SourceId, form: CaptureFormState): boolean {
  switch (source) {
    case 'book':
      return !!(form.content.trim() || form.imagePreview)
    case 'youtube':
      return !!(form.url.trim() || form.notes.trim())
    case 'podcast':
      return !!(form.title.trim() || form.episode.trim() || form.notes.trim())
    case 'tweet':
    case 'linkedin':
      return !!form.content.trim()
    case 'voice':
      return !!form.audioBlob
    case 'reddit':
      return !!(form.url.trim() || form.notes.trim())
    case 'note':
    case 'convo':
      return !!form.content.trim()
    case 'handwritten':
      return !!form.imagePreview
    default:
      return false
  }
}

export default function Capture() {
  const navigate = useNavigate()
  const [source, setSource] = useState<SourceId>('note')
  const [form, setForm] = useState<CaptureFormState>(emptyFormState())
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [confirmation, setConfirmation] = useState<CaptureConfirmation | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [recordingError, setRecordingError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)

  const subtitle = SOURCES.find(s => s.id === source)?.subtitle ?? ''
  const canSave = hasContent(source, form)

  const patchForm = useCallback((patch: Partial<CaptureFormState>) => {
    setForm(prev => ({ ...prev, ...patch }))
  }, [])

  const resetForm = useCallback(() => {
    setForm(emptyFormState())
    setSaveState('idle')
    setRecordingSeconds(0)
    setIsRecording(false)
    setRecordingError(null)
    setSaveError(null)
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
      mediaRecorderRef.current?.stop()
    }
  }, [])

  const startRecording = async () => {
    setRecordingError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        patchForm({ audioBlob: blob })
        setIsRecording(false)
        if (timerRef.current) {
          window.clearInterval(timerRef.current)
          timerRef.current = null
        }
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
      setRecordingSeconds(0)
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds(s => s + 1)
      }, 1000)
    } catch {
      setRecordingError('Microphone access denied')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
  }

  const handleSave = async () => {
    if (saveState === 'saving') return
    if (saveState === 'error' && !canSave) {
      setSaveState('idle')
      return
    }
    if (!canSave) return
    setSaveState('saving')
    setSaveError(null)

    try {
      const response = await saveCapture(source, form)
      resetForm()
      setConfirmation(toConfirmationData(response))
      setSaveState('idle')
    } catch (err) {
      setSaveState('error')
      const message = err instanceof Error ? err.message : 'Could not save'
      if (message.includes('not supported')) {
        setSaveError('This source type is not wired up yet — try Book for now.')
      } else if (message.includes('Cannot reach backend')) {
        setSaveError(message)
      } else if (message.includes('Invalid API key')) {
        setSaveError(message)
      } else if (message.includes('GBrain') || message.includes('Storage backend')) {
        setSaveError('Brain storage failed — run `gbrain doctor` and try again.')
      } else {
        setSaveError(message || 'Could not save — check your connection and try again.')
      }
    }
  }

  const handleSourceChange = (id: SourceId) => {
    setSource(id)
    resetForm()
  }

  const buttonLabel = () => {
    if (saveState === 'saving') return 'SAVING...'
    if (saveState === 'error') return 'FAILED — TAP TO RETRY'
    return 'SAVE TO BRAIN'
  }

  const buttonBg = () => {
    if (saveState === 'error' && canSave) return 'rgba(255,80,80,0.8)'
    if (!canSave) return 'rgba(245,166,35,0.35)'
    return '#F5A623'
  }

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100dvh',
        background: '#080808',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <ParticleCanvas dimmed />
      </div>

      <div style={{ position: 'relative', zIndex: 1, flex: 1, overflowY: 'auto', paddingBottom: 120 }}>
        <header style={{ padding: '56px 16px 8px', position: 'relative' }}>
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="Back to home"
            style={{
              position: 'absolute',
              left: 16,
              top: 56,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
              display: 'flex',
              alignItems: 'center',
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            <IconArrowLeft size={20} stroke={1.5} />
          </button>

          <div style={{ textAlign: 'center' }}>
            <h1
              style={{
                fontFamily: "'Clash Display', sans-serif",
                fontWeight: 700,
                fontSize: 24,
                color: 'rgba(255,255,255,0.9)',
                margin: 0,
                letterSpacing: '0.02em',
              }}
            >
              ADD TO BRAIN
            </h1>
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                color: 'rgba(255,255,255,0.3)',
                margin: '6px 0 0',
              }}
            >
              {subtitle}
            </p>
          </div>
        </header>

        <div style={{ marginTop: 16, marginBottom: 20 }}>
          <SourcePills selected={source} onSelect={handleSourceChange} />
        </div>

        <CaptureForm
          source={source}
          form={form}
          onChange={patchForm}
          disabled={saveState === 'saving'}
          isRecording={isRecording}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          recordingSeconds={recordingSeconds}
          recordingError={recordingError}
        />
      </div>

      {!confirmation && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            padding: '16px 16px max(16px, env(safe-area-inset-bottom))',
            background: 'rgba(8,8,8,0.95)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          {saveError && (
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                color: 'rgba(255,80,80,0.85)',
                textAlign: 'center',
                margin: '0 0 10px',
                letterSpacing: '0.02em',
              }}
            >
              {saveError}
            </p>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || saveState === 'saving'}
            style={{
              width: '100%',
              height: 52,
              background: buttonBg(),
              color: '#080808',
              fontFamily: "'Clash Display', sans-serif",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              borderRadius: 10,
              border: 'none',
              cursor: canSave && saveState !== 'saving' ? 'pointer' : 'not-allowed',
              opacity: 1,
              filter: 'none',
              animation: saveState === 'saving' ? 'savingPulse 1.2s ease-in-out infinite' : undefined,
            }}
          >
            {buttonLabel()}
          </button>
        </div>
      )}

      {confirmation && (
        <ConfirmationCard
          data={confirmation}
          onDismiss={() => setConfirmation(null)}
          onViewLibrary={() => {
            setConfirmation(null)
            navigate('/brain')
          }}
        />
      )}

      <style>{`
        @keyframes savingPulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(0.92); }
        }
      `}</style>
    </div>
  )
}
