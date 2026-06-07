import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { captureText, captureImage } from '../services/api'
import { enqueueCapture } from '../services/offlineQueue'
import { showToast } from '../components/Toast'

const SOURCE_TYPES = [
  { id: 'book', label: 'Book' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'podcast', label: 'Podcast' },
  { id: 'tweet', label: 'Tweet' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'voice_memo', label: 'Voice' },
  { id: 'reddit', label: 'Reddit' },
  { id: 'note', label: 'Note' },
  { id: 'conversation', label: 'Convo' },
  { id: 'handwritten', label: 'Handwritten' },
]

type SaveState = 'idle' | 'saving' | 'success'

export default function Capture() {
  const navigate = useNavigate()
  const [sourceType, setSourceType] = useState('note')
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [insight, setInsight] = useState('')
  const [isOcr, setIsOcr] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSave = async () => {
    if (!content.trim()) { showToast('Add some content first'); return }
    setSaveState('saving')
    try {
      await captureText({
        content: content.trim(),
        source_type: sourceType,
        source_title: title.trim() || undefined,
        source_author: author.trim() || undefined,
      })
      setSaveState('success')
      // Show a placeholder insight — real insight would come from backend response
      setInsight('Saved to your brain. Ask a question on the home screen to see this knowledge in action.')
    } catch (err) {
      // Offline fallback
      if (!navigator.onLine) {
        await enqueueCapture({ content: content.trim(), source_type: sourceType, source_title: title.trim() || undefined })
        setSaveState('success')
        setInsight('Saved offline. Will sync when you reconnect.')
        showToast('Saved offline — will sync when reconnected')
      } else {
        setSaveState('idle')
        showToast('Capture failed. Try again.')
      }
    }
  }

  const handleCamera = () => fileInputRef.current?.click()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsOcr(true)
    try {
      const result = await captureImage(file, sourceType, title.trim() || undefined)
      setContent(result.extracted_text)
      showToast('Page read. Review text and tap SAVE.')
    } catch {
      showToast("Couldn't read image. Try again.")
    } finally {
      setIsOcr(false)
      e.target.value = ''
    }
  }

  const reset = () => {
    setContent('')
    setTitle('')
    setAuthor('')
    setSaveState('idle')
    setInsight('')
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: '0.5px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: '14px 16px',
    fontFamily: 'DM Mono, monospace',
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    outline: 'none',
    width: '100%',
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: '#080808', paddingBottom: 120 }}>

      {/* Header */}
      <div className="flex items-center gap-4 px-5 pt-14 pb-6">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.3)', fontSize: 20, padding: '4px 0', minWidth: 44, minHeight: 44,
            display: 'flex', alignItems: 'center',
          }}
        >
          ←
        </button>
        <span style={{ fontFamily: "'Clash Display', sans-serif", fontWeight: 700, fontSize: 16, color: 'rgba(255,255,255,0.9)' }}>
          ADD TO BRAIN
        </span>
      </div>

      <div className="px-5 flex flex-col gap-5">

        {/* Source type pills */}
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none', paddingBottom: 4 }}>
          {SOURCE_TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => setSourceType(t.id)}
              style={{
                background: sourceType === t.id ? '#F5A623' : 'rgba(255,255,255,0.06)',
                border: '0.5px solid rgba(255,255,255,0.1)',
                borderRadius: 20,
                padding: '8px 16px',
                fontFamily: 'DM Mono, monospace',
                fontSize: 11,
                color: sourceType === t.id ? '#080808' : 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                minHeight: 36,
                letterSpacing: '0.06em',
                flexShrink: 0,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content textarea */}
        <div className="relative">
          {isOcr && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(8,8,8,0.85)',
              borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'DM Mono, monospace', fontSize: 13, color: '#F5A623', zIndex: 1,
            }}>
              Reading page...
            </div>
          )}
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Paste text, a highlight, a quote, an idea..."
            rows={8}
            style={{ ...inputStyle, resize: 'vertical' }}
            aria-label="Capture content"
            disabled={saveState === 'saving' || saveState === 'success'}
          />
          {/* Camera button */}
          <button
            onClick={handleCamera}
            aria-label="Photograph a page"
            style={{
              position: 'absolute', top: 12, right: 12,
              background: 'rgba(255,255,255,0.08)', border: 'none',
              borderRadius: 6, padding: '6px 10px', cursor: 'pointer',
              fontSize: 16, minWidth: 44, minHeight: 44,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            📷
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        {/* Title + Author */}
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Title (optional)"
          style={inputStyle}
          aria-label="Source title"
          disabled={saveState === 'success'}
        />
        <input
          type="text"
          value={author}
          onChange={e => setAuthor(e.target.value)}
          placeholder="Author (optional)"
          style={inputStyle}
          aria-label="Source author"
          disabled={saveState === 'success'}
        />

        {/* Insight card — shown after save */}
        {saveState === 'success' && insight && (
          <div
            style={{
              background: 'rgba(245,166,35,0.08)',
              border: '0.5px solid rgba(245,166,35,0.25)',
              borderRadius: 8,
              padding: '16px',
              animation: 'fadeUp 0.3s ease-out',
            }}
          >
            <div style={{ fontSize: 10, color: '#F5A623', fontFamily: 'DM Mono, monospace', letterSpacing: '0.15em', marginBottom: 8 }}>
              BRAIN UNDERSTOOD
            </div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
              {insight}
            </div>
            <button
              onClick={reset}
              style={{
                marginTop: 16, background: 'transparent',
                border: '0.5px solid rgba(255,255,255,0.15)',
                borderRadius: 6, padding: '8px 16px',
                fontFamily: 'DM Mono, monospace', fontSize: 11,
                color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
                letterSpacing: '0.08em',
              }}
            >
              ADD ANOTHER
            </button>
          </div>
        )}
      </div>

      {/* Fixed bottom SAVE button */}
      {saveState !== 'success' && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          padding: '16px 20px 32px',
          background: 'linear-gradient(to top, #080808 60%, transparent)',
        }}>
          <button
            onClick={handleSave}
            disabled={!content.trim() || saveState === 'saving'}
            style={{
              width: '100%', height: 52,
              background: content.trim() ? '#F5A623' : 'rgba(255,255,255,0.08)',
              border: 'none', borderRadius: 8,
              fontFamily: 'DM Mono, monospace', fontSize: 13,
              fontWeight: 500, letterSpacing: '0.12em',
              color: content.trim() ? '#080808' : 'rgba(255,255,255,0.3)',
              cursor: content.trim() ? 'pointer' : 'default',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {saveState === 'saving' ? (
              <>
                <div style={{ width: 14, height: 14, border: '1.5px solid #080808', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                SAVING...
              </>
            ) : 'SAVE TO BRAIN'}
          </button>
        </div>
      )}

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
        @keyframes spin { to { transform:rotate(360deg) } }
      `}</style>
    </div>
  )
}
