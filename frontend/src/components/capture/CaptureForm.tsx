import { useRef } from 'react'
import { IconCamera, IconMicrophone } from '@tabler/icons-react'
import FormField from './FormField'
import type { CaptureFormState, SourceId } from './types'

type Props = {
  source: SourceId
  form: CaptureFormState
  onChange: (patch: Partial<CaptureFormState>) => void
  disabled?: boolean
  isRecording: boolean
  onStartRecording: () => void
  onStopRecording: () => void
  recordingSeconds: number
  recordingError?: string | null
}

function CameraButton({
  label,
  sublabel,
  onClick,
  height = 48,
  disabled,
}: {
  label: string
  sublabel?: string
  onClick: () => void
  height?: number
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        height,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: sublabel ? 8 : 0,
        background: 'rgba(255,255,255,0.04)',
        border: '0.5px solid rgba(255,255,255,0.1)',
        borderRadius: sublabel ? 12 : 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <IconCamera size={sublabel ? 32 : 18} stroke={1.5} color="rgba(255,255,255,0.5)" />
      {sublabel && (
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 11,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.05em',
          }}
        >
          {sublabel}
        </span>
      )}
      {!sublabel && (
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 12,
            color: 'rgba(255,255,255,0.6)',
            marginLeft: 8,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {label}
        </span>
      )}
    </button>
  )
}

function ImagePreview({
  src,
  onRetake,
}: {
  src: string
  onRetake: () => void
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <img
        src={src}
        alt="Captured"
        style={{
          width: '100%',
          maxHeight: 200,
          objectFit: 'cover',
          borderRadius: 8,
          border: '0.5px solid rgba(255,255,255,0.1)',
        }}
      />
      <button
        type="button"
        onClick={onRetake}
        style={{
          marginTop: 8,
          background: 'none',
          border: 'none',
          fontFamily: "'DM Mono', monospace",
          fontSize: 11,
          color: 'rgba(255,255,255,0.4)',
          cursor: 'pointer',
          letterSpacing: '0.05em',
        }}
      >
        RETAKE
      </button>
    </div>
  )
}

function WaveformPreview() {
  const bars = [0.3, 0.7, 0.5, 0.9, 0.4, 0.8, 0.6, 0.95, 0.5, 0.7, 0.4, 0.85, 0.55, 0.75, 0.45]
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        height: 48,
        marginBottom: 12,
        padding: '0 8px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 8,
      }}
    >
      {bars.map((h, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: `${h * 100}%`,
            background: '#F5A623',
            borderRadius: 2,
            opacity: 0.7,
          }}
        />
      ))}
    </div>
  )
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function CaptureForm({
  source,
  form,
  onChange,
  disabled,
  isRecording,
  onStartRecording,
  onStopRecording,
  recordingSeconds,
  recordingError,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const openCamera = () => {
    fileInputRef.current?.click()
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    onChange({ imagePreview: url })
    e.target.value = ''
  }

  const formContent = () => {
    switch (source) {
      case 'book':
        return (
          <>
            <FormField
              multiline
              minHeight={120}
              placeholder="Paste your highlight here..."
              value={form.content}
              onChange={v => onChange({ content: v })}
              disabled={disabled}
            />
            <FormField
              label="Title"
              placeholder="Title (optional)"
              value={form.title}
              onChange={v => onChange({ title: v })}
              disabled={disabled}
            />
            <FormField
              label="Author"
              placeholder="Author (optional)"
              value={form.author}
              onChange={v => onChange({ author: v })}
              disabled={disabled}
            />
            {form.imagePreview ? (
              <ImagePreview src={form.imagePreview} onRetake={() => onChange({ imagePreview: null })} />
            ) : (
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  onClick={openCamera}
                  disabled={disabled}
                  style={{
                    width: '100%',
                    height: 52,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    background: 'rgba(255,255,255,0.05)',
                    border: '0.5px solid rgba(255,255,255,0.12)',
                    borderRadius: 10,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.5 : 1,
                  }}
                >
                  <IconCamera size={18} stroke={1.5} color="rgba(255,255,255,0.6)" />
                  <span
                    style={{
                      fontFamily: "'Clash Display', sans-serif",
                      fontWeight: 600,
                      fontSize: 12,
                      letterSpacing: '0.1em',
                      color: 'rgba(255,255,255,0.6)',
                    }}
                  >
                    PHOTOGRAPH PAGE
                  </span>
                </button>
              </div>
            )}
          </>
        )

      case 'youtube':
        return (
          <>
            <FormField
              label="URL"
              placeholder="https://youtube.com/..."
              value={form.url}
              onChange={v => onChange({ url: v })}
              disabled={disabled}
              type="url"
            />
            <FormField
              label="Notes"
              multiline
              minHeight={120}
              placeholder="Your key takeaways..."
              value={form.notes}
              onChange={v => onChange({ notes: v })}
              disabled={disabled}
            />
          </>
        )

      case 'podcast':
        return (
          <>
            <FormField
              label="Podcast"
              placeholder="Podcast name"
              value={form.title}
              onChange={v => onChange({ title: v })}
              disabled={disabled}
            />
            <FormField
              label="Episode"
              placeholder="Episode title or number"
              value={form.episode}
              onChange={v => onChange({ episode: v })}
              disabled={disabled}
            />
            <FormField
              label="Notes"
              multiline
              minHeight={120}
              placeholder="Key moments, quotes, ideas..."
              value={form.notes}
              onChange={v => onChange({ notes: v })}
              disabled={disabled}
            />
          </>
        )

      case 'tweet':
      case 'linkedin':
        return (
          <>
            <FormField
              multiline
              minHeight={120}
              placeholder="Paste the full text..."
              value={form.content}
              onChange={v => onChange({ content: v })}
              disabled={disabled}
            />
            <FormField
              label="URL"
              placeholder="Source URL (optional)"
              value={form.url}
              onChange={v => onChange({ url: v })}
              disabled={disabled}
              type="url"
            />
          </>
        )

      case 'voice':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0' }}>
            {!form.audioBlob && (
              <>
                <button
                  type="button"
                  onClick={isRecording ? onStopRecording : onStartRecording}
                  disabled={disabled}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: isRecording ? '#FF5050' : '#F5A623',
                    border: isRecording ? '2px solid rgba(255,80,80,0.9)' : 'none',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: isRecording ? 'pulse-red 1.2s ease-in-out infinite' : undefined,
                  }}
                >
                  <IconMicrophone size={24} stroke={1.5} color="#080808" />
                </button>
                {isRecording && (
                  <>
                    <div
                      style={{
                        marginTop: 16,
                        fontFamily: "'DM Mono', monospace",
                        fontSize: 12,
                        color: '#F5A623',
                      }}
                    >
                      {formatTime(recordingSeconds)}
                    </div>
                    <button
                      type="button"
                      onClick={onStopRecording}
                      style={{
                        marginTop: 12,
                        background: 'rgba(255,255,255,0.06)',
                        border: '0.5px solid rgba(255,255,255,0.15)',
                        borderRadius: 20,
                        padding: '8px 20px',
                        fontFamily: "'DM Mono', monospace",
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.6)',
                        cursor: 'pointer',
                        letterSpacing: '0.05em',
                      }}
                    >
                      STOP
                    </button>
                  </>
                )}
                {!isRecording && (
                  <p
                    style={{
                      marginTop: 16,
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 11,
                      color: recordingError ? 'rgba(255,80,80,0.8)' : 'rgba(255,255,255,0.3)',
                    }}
                  >
                    {recordingError ?? 'tap to start recording'}
                  </p>
                )}
              </>
            )}
            {form.audioBlob && (
              <>
                <WaveformPreview />
                <div style={{ width: '100%' }}>
                  <FormField
                    label="Title"
                    placeholder="Give this memo a title"
                    value={form.title}
                    onChange={v => onChange({ title: v })}
                    disabled={disabled}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onChange({ audioBlob: null, title: '' })}
                  style={{
                    marginTop: 4,
                    background: 'none',
                    border: 'none',
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.4)',
                    cursor: 'pointer',
                  }}
                >
                  RE-RECORD
                </button>
              </>
            )}
          </div>
        )

      case 'reddit':
        return (
          <>
            <FormField
              label="URL"
              placeholder="https://reddit.com/..."
              value={form.url}
              onChange={v => onChange({ url: v })}
              disabled={disabled}
              type="url"
            />
            <FormField
              label="Notes"
              multiline
              minHeight={120}
              placeholder="Key insight or quote..."
              value={form.notes}
              onChange={v => onChange({ notes: v })}
              disabled={disabled}
            />
          </>
        )

      case 'note':
        return (
          <FormField
            multiline
            minHeight={160}
            placeholder="Capture an idea, insight, or observation..."
            value={form.content}
            onChange={v => onChange({ content: v })}
            disabled={disabled}
          />
        )

      case 'convo':
        return (
          <FormField
            multiline
            minHeight={160}
            placeholder="What did you learn? Who said it? Why does it matter?"
            value={form.content}
            onChange={v => onChange({ content: v })}
            disabled={disabled}
          />
        )

      case 'handwritten':
        return form.imagePreview ? (
          <ImagePreview src={form.imagePreview} onRetake={() => onChange({ imagePreview: null })} />
        ) : (
          <CameraButton
            label=""
            sublabel="PHOTOGRAPH NOTES"
            onClick={openCamera}
            height={120}
            disabled={disabled}
          />
        )

      default:
        return null
    }
  }

  return (
    <div style={{ padding: '32px 16px 0' }}>
      <div
        key={source}
        style={{
          animation: 'formFade 0.2s ease-out',
        }}
      >
        {formContent()}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      <style>{`
        @keyframes formFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse-red {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,80,80,0.5); }
          50% { box-shadow: 0 0 0 12px rgba(255,80,80,0); }
        }
      `}</style>
    </div>
  )
}
