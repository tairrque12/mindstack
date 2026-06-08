import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import ParticleCanvas from '../components/ParticleCanvas'
import SourceIcon, { resolveSourceType, sourceLabel } from '../components/SourceIcon'
import NodeDetailSheet from '../components/NodeDetailSheet'
import { applyStream, getNode, getNodes, type NodeDetail, type NodeSummary } from '../services/api'
import { showToast } from '../components/Toast'

type Mode = 'idle' | 'thinking' | 'streaming' | 'done'

type RecentNode = NodeSummary & { insight?: string }

export default function Home() {
  const navigate = useNavigate()
  const location = useLocation()
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<Mode>('idle')
  const [response, setResponse] = useState('')
  const [recentNodes, setRecentNodes] = useState<RecentNode[]>([])
  const [nodesLoaded, setNodesLoaded] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [detail, setDetail] = useState<NodeDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const responseRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prefilled = (location.state as { prefilledQuery?: string } | null)?.prefilledQuery
    if (prefilled) {
      setQuery(prefilled)
      window.history.replaceState({}, document.title)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [location.state])

  // Show recent cards immediately; enrich insights in background
  useEffect(() => {
    getNodes(8)
      .then(r => {
        setRecentNodes(r.nodes)
        setNodesLoaded(true)
        void Promise.all(
          r.nodes.map(async n => {
            if (n.insight) return n
            try {
              const { node } = await getNode(n.slug)
              return { ...n, insight: node.insight }
            } catch {
              return n
            }
          }),
        ).then(enriched => setRecentNodes(enriched))
      })
      .catch(() => setNodesLoaded(true))
  }, [])

  const openDetail = async (slug: string) => {
    setSelectedSlug(slug)
    setDetail(null)
    setDetailLoading(true)
    try {
      const { node } = await getNode(slug)
      setDetail(node)
    } catch {
      showToast("Couldn't load node")
      setSelectedSlug(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetail = () => {
    setSelectedSlug(null)
    setDetail(null)
  }

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
    } catch {
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

      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 4,
          background:
            'radial-gradient(ellipse at 50% 50%, transparent 25%, rgba(8,8,8,0.55) 70%, rgba(8,8,8,0.88) 100%)',
        }}
      />

      <div className="relative z-10 flex flex-col h-full min-h-0 px-5">
        <div className="pt-14 pb-4 flex-shrink-0">
          <span
            style={{
              fontFamily: "'Clash Display', sans-serif",
              fontWeight: 800,
              fontSize: 11,
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: '0.3em',
            }}
          >
            MINDSTACK
          </span>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
        <div
          className="flex-1 flex flex-col items-center min-h-0 overflow-y-auto no-scrollbar"
          style={{
            justifyContent: isActive ? 'flex-start' : recentNodes.length > 0 ? 'flex-start' : 'center',
            gap: 20,
            paddingTop: !isActive && recentNodes.length > 0 ? 8 : 0,
          }}
        >
          {!isActive && (
            <div
              style={{
                fontFamily: "'Clash Display', sans-serif",
                fontWeight: 800,
                fontSize: 36,
                color: 'rgba(255,255,255,0.85)',
                textAlign: 'center',
                width: '100%',
                maxWidth: 480,
                animation: 'dropDown 0.7s ease-out 0.2s both',
              }}
            >
              What's on your mind?
            </div>
          )}

          <div
            style={{
              width: '100%',
              maxWidth: isActive ? '100%' : 480,
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              transition: 'max-width 0.3s ease-out',
              animation: 'riseUp 0.7s ease-out 0.5s both',
            }}
          >
            <div
              className="relative"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: inputFocused
                  ? '0.5px solid rgba(245,166,35,0.35)'
                  : '0.5px solid rgba(255,255,255,0.06)',
                borderRadius: 12,
                boxShadow: inputFocused ? '0 0 0 1px rgba(245,166,35,0.35)' : 'none',
                transition: 'box-shadow 0.2s, border-color 0.2s',
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
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  padding: '18px 52px 18px 24px',
                  fontFamily: "'Clash Display', sans-serif",
                  fontSize: 16,
                  color: 'rgba(255,255,255,0.9)',
                  resize: 'none',
                  lineHeight: 1.6,
                  minHeight: 56,
                }}
                aria-label="Ask your brain"
              />

              <button
                onClick={handleSubmit}
                aria-label="Submit"
                style={{
                  position: 'absolute',
                  right: 14,
                  bottom: 14,
                  width: 28,
                  height: 28,
                  background: '#F5A623',
                  border: 'none',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  opacity: query.trim() && mode === 'idle' ? 1 : 0,
                  transition: 'opacity 0.2s ease',
                  fontSize: 15,
                  color: '#080808',
                  fontWeight: 700,
                  pointerEvents: query.trim() && mode === 'idle' ? 'auto' : 'none',
                }}
              >
                →
              </button>

              {mode === 'thinking' && (
                <div style={{ position: 'absolute', right: 14, bottom: 14 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#F5A623',
                      animation: 'pulse 1s ease-in-out infinite',
                    }}
                  />
                </div>
              )}
            </div>

            {isActive && (
              <div className="w-full overflow-y-auto" style={{ flex: 1, paddingBottom: 16 }} aria-live="polite">
                {response && (
                  <div
                    style={{
                      fontFamily: 'DM Mono, monospace',
                      fontSize: 14,
                      lineHeight: 1.8,
                      color: 'rgba(255,255,255,0.85)',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
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
                      marginTop: 24,
                      background: 'transparent',
                      border: '0.5px solid rgba(255,255,255,0.15)',
                      borderRadius: 8,
                      padding: '10px 20px',
                      fontFamily: 'DM Mono, monospace',
                      fontSize: 12,
                      color: 'rgba(255,255,255,0.5)',
                      cursor: 'pointer',
                      letterSpacing: '0.05em',
                    }}
                  >
                    ASK ANOTHER
                  </button>
                )}
                <div ref={responseRef} />
              </div>
            )}

            {!isActive && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                <button
                  onClick={() => navigate('/add')}
                  style={{
                    height: 36,
                    padding: '0 16px',
                    background: '#F5A623',
                    border: 'none',
                    borderRadius: 20,
                    fontFamily: "'Clash Display', sans-serif",
                    fontWeight: 700,
                    fontSize: 10,
                    letterSpacing: '0.15em',
                    color: '#080808',
                    cursor: 'pointer',
                  }}
                >
                  ADD
                </button>
                <button
                  onClick={() => navigate('/brain')}
                  style={{
                    height: 36,
                    padding: '0 16px',
                    background: 'transparent',
                    border: '0.5px solid rgba(255,255,255,0.15)',
                    borderRadius: 20,
                    fontFamily: "'Clash Display', sans-serif",
                    fontWeight: 700,
                    fontSize: 10,
                    letterSpacing: '0.15em',
                    color: 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                  }}
                >
                  VIEW BRAIN
                </button>
                <button
                  onClick={() => showToast('Coming soon')}
                  style={{
                    height: 36,
                    padding: '0 16px',
                    background: 'transparent',
                    border: '0.5px solid rgba(255,255,255,0.15)',
                    borderRadius: 20,
                    fontFamily: "'Clash Display', sans-serif",
                    fontWeight: 700,
                    fontSize: 10,
                    letterSpacing: '0.15em',
                    color: 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                  }}
                >
                  MIND MAP
                </button>
              </div>
            )}
          </div>
        </div>

        {!isActive && nodesLoaded && recentNodes.length > 0 && (
          <div className="flex-shrink-0 mt-auto" style={{ paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }}>
            <div
              style={{
                fontSize: 10,
                color: 'rgba(255,255,255,0.25)',
                letterSpacing: '0.15em',
                marginBottom: 12,
                fontFamily: 'DM Mono, monospace',
              }}
            >
              RECENTLY ADDED
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar" style={{ paddingBottom: 4 }}>
              {recentNodes.map(node => {
                const src = resolveSourceType(node.slug, node.type, node.source_type)
                return (
                <button
                  key={node.slug}
                  type="button"
                  aria-label={node.title}
                  onClick={() => openDetail(node.slug)}
                  style={{
                    width: 160,
                    flexShrink: 0,
                    background: 'rgba(255,255,255,0.04)',
                    border: '0.5px solid rgba(255,255,255,0.08)',
                    borderRadius: 12,
                    padding: 12,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <SourceIcon type={src} slug={node.slug} size={14} />
                    <span
                      style={{
                        fontFamily: 'DM Mono, monospace',
                        fontSize: 9,
                        color: 'rgba(255,255,255,0.3)',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {sourceLabel(src)}
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: "'Clash Display', sans-serif",
                      fontWeight: 500,
                      fontSize: 13,
                      color: 'rgba(255,255,255,0.85)',
                      lineHeight: 1.35,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      marginBottom: 6,
                    }}
                  >
                    {node.title}
                  </div>
                  {node.insight && (
                    <div
                      style={{
                        fontFamily: 'DM Mono, monospace',
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.4)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {node.insight}
                    </div>
                  )}
                </button>
                )
              })}
            </div>
          </div>
        )}
        </div>
      </div>

      {selectedSlug && (
        <NodeDetailSheet loading={detailLoading} detail={detail} onClose={closeDetail} />
      )}

      <style>{`
        .home-input::placeholder { color: rgba(255,255,255,0.2); }
        .no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes dropDown {
          from { opacity: 0; transform: translateY(-30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes riseUp {
          from { opacity: 0; transform: translateY(40px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse { 0%,100% { opacity:0.4; transform:scale(0.9) } 50% { opacity:1; transform:scale(1.1) } }
        @keyframes blink  { 0%,100% { opacity:1 } 50% { opacity:0 } }
      `}</style>
    </div>
  )
}
