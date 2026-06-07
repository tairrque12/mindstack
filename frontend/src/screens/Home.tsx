import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ParticleCanvas from '../components/ParticleCanvas'
import { applyStream, getNodes, type Node } from '../services/api'
import { showToast } from '../components/Toast'

type Mode = 'idle' | 'thinking' | 'streaming' | 'done'

const SOURCE_ICONS: Record<string, string> = {
  book: '📖', tweet: '𝕏', youtube: '▶', podcast: '🎙',
  voice_memo: '🎤', linkedin: '🔗', reddit: '🟠', conversation: '💬',
  handwritten: '✍', note: '📝',
}

export default function Home() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<Mode>('idle')
  const [response, setResponse] = useState('')
  const [recentNodes, setRecentNodes] = useState<Node[]>([])
  const [nodesLoaded, setNodesLoaded] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const responseRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getNodes(6)
      .then(r => { setRecentNodes(r.nodes); setNodesLoaded(true) })
      .catch(() => setNodesLoaded(true))
  }, [])

  const handleSubmit = useCallback(async () => {
    const q = query.trim()
    if (!q || mode === 'thinking' || mode === 'streaming') return
    setMode('thinking')
    setResponse('')
    abortRef.current = new AbortController()
    try {
      setMode('streaming')
      for await (const chunk of applyStream(q)) {
        setResponse(prev => prev + chunk)
        responseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }
      setMode('done')
    } catch (_err) {
      setMode('idle')
      showToast("Couldn't reach brain — try again")
    }
  }, [query, mode])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const reset = () => {
    setMode('idle')
    setResponse('')
    setQuery('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const isActive = mode !== 'idle'

  return (
    <div className="relative flex flex-col h-full overflow-hidden" style={{ background: '#080808' }}>
      <ParticleCanvas />

      {/* Vignette */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 5,
        background: 'radial-gradient(ellipse at 50% 50%, transparent 20%, rgba(8,8,8,0.5) 70%, rgba(8,8,8,0.85) 100%)',
      }} />

      {/* Content layer */}
      <div className="relative z-10 flex flex-col h-full px-5">

        {/* Wordmark */}
        <div className="pt-14 pb-4">
          <span style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 800,
            fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.3em',
          }}>
            MINDSTACK
          </span>
        </div>

        {/* Center cluster */}
        <div
          className="flex-1 flex flex-col items-center"
          style={{
            justifyContent: 'flex-start',
            paddingTop: isActive ? 0 : 'calc(58dvh - 200px)',
            gap: 20,
          }}
        >
          {/* Headline — drops from above */}
          {!isActive && (
            <div style={{
              fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 36,
              color: 'rgba(255,255,255,0.85)', textAlign: 'center',
              width: '100%', maxWidth: 480,
              animation: 'dropDown 0.8s ease-out 0.2s both',
            }}>
              What's on your mind?
            </div>
          )}

          {/* Input + response + buttons — rises from below as one unit */}
          <div
            style={{
              width: '100%',
              maxWidth: isActive ? '100%' : 480,
              display: 'flex', flexDirection: 'column', gap: 20,
              transition: 'max-width 0.3s ease-out',
              animation: 'riseUp 0.8s ease-out 0.5s both',
            }}
          >
            {/* Input */}
            <div
              className="relative"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '0.5px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                boxShadow: inputFocused
                  ? '0 0 0 1px rgba(245,166,35,0.4)'
                  : mode === 'thinking'
                  ? '0 0 12px rgba(245,166,35,0.12)'
                  : 'none',
                transition: 'box-shadow 0.3s',
              }}
            >
              <textarea
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="Ask your brain anything..."
                rows={isActive ? 2 : 3}
                disabled={mode === 'thinking' || mode === 'streaming'}
                className="home-input"
                style={{
                  width: '100%', background: 'transparent',
                  border: 'none', outline: 'none',
                  padding: '18px 52px 18px 24px',
                  fontFamily: 'Syne, sans-serif', fontSize: 16,
                  color: 'rgba(255,255,255,0.9)', resize: 'none',
                  lineHeight: 1.6, minHeight: 56,
                }}
                aria-label="Ask your brain"
              />

              {/* Send arrow */}
              <button
                onClick={handleSubmit}
                aria-label="Submit"
                style={{
                  position: 'absolute', right: 14, bottom: 14,
                  width: 28, height: 28,
                  background: '#F5A623', border: 'none', borderRadius: 6,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  opacity: query.trim() && mode === 'idle' ? 1 : 0,
                  transition: 'opacity 0.2s',
                  fontSize: 15, color: '#080808', fontWeight: 700,
                  pointerEvents: query.trim() && mode === 'idle' ? 'auto' : 'none',
                }}
              >
                →
              </button>

              {mode === 'thinking' && (
                <div style={{ position: 'absolute', right: 14, bottom: 14 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F5A623', animation: 'pulse 1s ease-in-out infinite' }} />
                </div>
              )}
            </div>

            {/* Streaming response */}
            {isActive && (
              <div
                className="w-full overflow-y-auto"
                style={{ flex: 1, paddingBottom: 16 }}
                aria-live="polite"
                aria-label="Brain response"
              >
                {response && (
                  <div style={{
                    fontFamily: 'DM Mono, monospace', fontSize: 14,
                    lineHeight: 1.8, color: 'rgba(255,255,255,0.85)',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {response}
                    {mode === 'streaming' && (
                      <span style={{ color: '#F5A623', animation: 'blink 1s step-end infinite' }}>▋</span>
                    )}
                  </div>
                )}
                {mode === 'done' && (
                  <button
                    onClick={reset}
                    style={{
                      marginTop: 24, background: 'transparent',
                      border: '0.5px solid rgba(255,255,255,0.15)',
                      borderRadius: 8, padding: '10px 20px',
                      fontFamily: 'DM Mono, monospace', fontSize: 12,
                      color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
                      letterSpacing: '0.05em',
                    }}
                  >
                    ASK ANOTHER
                  </button>
                )}
                <div ref={responseRef} />
              </div>
            )}

            {/* Action buttons — idle only */}
            {!isActive && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                <button
                  onClick={() => navigate('/add')}
                  style={{
                    height: 36, padding: '0 16px',
                    background: '#F5A623', border: 'none', borderRadius: 20,
                    fontFamily: 'Syne, sans-serif', fontWeight: 700,
                    fontSize: 10, letterSpacing: '0.15em',
                    color: '#080808', cursor: 'pointer',
                  }}
                >
                  ADD
                </button>
                <button
                  onClick={() => navigate('/brain')}
                  style={{
                    height: 36, padding: '0 16px',
                    background: 'transparent',
                    border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 20,
                    fontFamily: 'Syne, sans-serif', fontWeight: 700,
                    fontSize: 10, letterSpacing: '0.15em',
                    color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
                  }}
                >
                  VIEW BRAIN
                </button>
                <button
                  onClick={() => showToast('Coming soon')}
                  style={{
                    height: 36, padding: '0 16px',
                    background: 'transparent',
                    border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 20,
                    fontFamily: 'Syne, sans-serif', fontWeight: 700,
                    fontSize: 10, letterSpacing: '0.15em',
                    color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
                  }}
                >
                  MIND MAP
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Recent nodes — only when brain has content */}
        {!isActive && nodesLoaded && recentNodes.length > 0 && (
          <div style={{ paddingBottom: 32 }}>
            <div style={{
              fontSize: 10, color: 'rgba(255,255,255,0.25)',
              letterSpacing: '0.15em', marginBottom: 12,
              fontFamily: 'DM Mono, monospace',
            }}>
              RECENT
            </div>
            <div className="flex gap-3 overflow-x-auto" style={{ scrollbarWidth: 'none', paddingBottom: 4 }}>
              {recentNodes.map(node => (
                <div
                  key={node.slug}
                  style={{
                    minWidth: 180, maxWidth: 220,
                    background: 'rgba(255,255,255,0.04)',
                    border: '0.5px solid rgba(255,255,255,0.1)',
                    borderRadius: 8, padding: '12px 14px',
                    flexShrink: 0, cursor: 'pointer',
                  }}
                  onClick={() => navigate('/brain')}
                >
                  <div style={{ fontSize: 16, marginBottom: 6 }}>
                    {SOURCE_ICONS[node.type] || '📝'}
                  </div>
                  <div style={{
                    fontFamily: 'DM Mono, monospace', fontSize: 12,
                    color: 'rgba(255,255,255,0.85)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {node.title}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'DM Mono, monospace', marginTop: 4 }}>
                    {node.type.replace('_', ' ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .home-input::placeholder { color: rgba(255,255,255,0.2); }
        @keyframes dropDown {
          from { opacity: 0; transform: translateY(-40px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes riseUp {
          from { opacity: 0; transform: translateY(60px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse { 0%,100% { opacity:0.4; transform:scale(0.9) } 50% { opacity:1; transform:scale(1.1) } }
        @keyframes blink  { 0%,100% { opacity:1 } 50% { opacity:0 } }
      `}</style>
    </div>
  )
}
