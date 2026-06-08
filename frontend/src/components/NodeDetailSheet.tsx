import { useNavigate } from 'react-router-dom'
import SourceIcon, { sourceLabel } from './SourceIcon'
import type { NodeDetail } from '../services/api'

type Props = {
  loading: boolean
  detail: NodeDetail | null
  onClose: () => void
}

function formatDate(iso?: string) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return ''
  }
}

export default function NodeDetailSheet({ loading, detail, onClose }: Props) {
  const navigate = useNavigate()
  const date = formatDate(detail?.captured_at)

  const askBrain = () => {
    if (!detail) return
    const context = [detail.raw_content, detail.insight, detail.principle].filter(Boolean).join('\n\n')
    onClose()
    navigate('/', { state: { prefilledQuery: `Based on this from my brain:\n\n${context.slice(0, 500)}\n\nWhat should I do with this?` } })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          height: '85vh',
          overflowY: 'auto',
          background: 'rgba(10,10,10,0.97)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '0.5px solid rgba(245,166,35,0.15)',
          borderRadius: '20px 20px 0 0',
          padding: '12px 20px max(24px, env(safe-area-inset-bottom))',
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 2,
            margin: '0 auto 16px',
          }}
        />

        {loading && (
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
            Loading…
          </div>
        )}

        {!loading && detail && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#F5A623',
                    borderRadius: 20,
                    padding: '5px 12px',
                    fontFamily: 'DM Mono, monospace',
                    fontSize: 9,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#080808',
                  }}
                >
                  <SourceIcon type={detail.source_type} size={12} color="#080808" />
                  {sourceLabel(detail.source_type)}
                </span>
              </div>
              {date && (
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>
                  {date}
                </span>
              )}
            </div>

            <h2
              style={{
                fontFamily: "'Clash Display', sans-serif",
                fontWeight: 700,
                fontSize: 20,
                color: 'rgba(255,255,255,0.9)',
                margin: '0 0 8px',
                lineHeight: 1.3,
              }}
            >
              {detail.source_title || detail.raw_content?.slice(0, 120) || 'Untitled'}
            </h2>

            {detail.source_author && (
              <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '0 0 16px' }}>
                {detail.source_author}
              </p>
            )}

            <div style={{ height: 0.5, background: 'rgba(255,255,255,0.06)', margin: '16px 0' }} />

            <div
              style={{
                fontFamily: 'DM Mono, monospace',
                fontSize: 10,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.25)',
                marginBottom: 10,
              }}
            >
              RAW CONTENT
            </div>
            <p
              style={{
                fontFamily: 'DM Mono, monospace',
                fontSize: 13,
                lineHeight: 1.7,
                color: 'rgba(255,255,255,0.75)',
                margin: 0,
                whiteSpace: 'pre-wrap',
              }}
            >
              {detail.raw_content}
            </p>

            {detail.insight && (
              <>
                <div style={{ height: 0.5, background: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />
                <div
                  style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: 10,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#F5A623',
                    marginBottom: 10,
                  }}
                >
                  INSIGHT
                </div>
                <p
                  style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: 13,
                    lineHeight: 1.7,
                    color: 'rgba(255,255,255,0.85)',
                    fontStyle: 'italic',
                    margin: 0,
                  }}
                >
                  {detail.insight}
                </p>
              </>
            )}

            {detail.principle && (
              <>
                <div style={{ height: 0.5, background: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />
                <div
                  style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: 10,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.25)',
                    marginBottom: 10,
                  }}
                >
                  PRINCIPLE
                </div>
                <p
                  style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: 13,
                    lineHeight: 1.7,
                    color: 'rgba(255,255,255,0.75)',
                    margin: 0,
                  }}
                >
                  {detail.principle}
                </p>
              </>
            )}

            {(detail.applicable_domains?.length ?? 0) > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 16 }}>
                {detail.applicable_domains!.map(d => (
                  <span
                    key={d}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      fontFamily: 'DM Mono, monospace',
                      fontSize: 9,
                      color: 'rgba(255,255,255,0.35)',
                      padding: '3px 8px',
                      borderRadius: 4,
                      textTransform: 'capitalize',
                    }}
                  >
                    {d}
                  </span>
                ))}
              </div>
            )}

            {(detail.open_questions?.length ?? 0) > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                {detail.open_questions!.map(q => (
                  <span
                    key={q}
                    style={{
                      background: 'rgba(245,166,35,0.08)',
                      fontFamily: 'DM Mono, monospace',
                      fontSize: 9,
                      color: 'rgba(245,166,35,0.6)',
                      padding: '3px 8px',
                      borderRadius: 4,
                    }}
                  >
                    ? {q}
                  </span>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={askBrain}
              style={{
                width: '100%',
                marginTop: 24,
                height: 48,
                background: '#F5A623',
                border: 'none',
                borderRadius: 10,
                fontFamily: "'Clash Display', sans-serif",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: '#080808',
                cursor: 'pointer',
              }}
            >
              Ask your brain about this
            </button>
          </>
        )}
      </div>
    </div>
  )
}
