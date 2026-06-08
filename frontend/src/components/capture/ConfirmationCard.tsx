import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CaptureConfirmation } from './types'
import { SOURCES } from './types'

type Props = {
  data: CaptureConfirmation
  onDismiss: () => void
  onViewLibrary?: () => void
}

function useIsDesktop() {
  const [desktop, setDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const update = () => setDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return desktop
}

function sourceLabel(sourceType: string) {
  return SOURCES.find(s => s.id === sourceType)?.label ?? sourceType
}

export default function ConfirmationCard({ data, onDismiss, onViewLibrary }: Props) {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startYRef = useRef(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY
    setDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return
    const delta = e.touches[0].clientY - startYRef.current
    if (delta > 0) setDragY(delta)
  }

  const handleTouchEnd = () => {
    if (dragY > 80) onDismiss()
    setDragY(0)
    setDragging(false)
  }

  const cardStyle: React.CSSProperties = isDesktop
    ? {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100%',
        maxWidth: 480,
        maxHeight: '80vh',
        zIndex: 100,
        animation: 'cardFadeInDesktop 0.35s ease-out',
      }
    : {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '80vh',
        transform: dragY ? `translateY(${dragY}px)` : undefined,
        zIndex: 100,
        animation: dragging || dragY ? undefined : 'slideUpMobile 0.4s cubic-bezier(0.32, 0.72, 0, 1)',
      }

  return (
    <>
      <div
        onClick={onDismiss}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 99,
        }}
      />
      <div
        style={{
          ...cardStyle,
          background: 'rgba(8,8,8,0.96)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '0.5px solid rgba(245,166,35,0.2)',
          borderRadius: isDesktop ? 16 : '20px 20px 0 0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
        onTouchStart={!isDesktop ? handleTouchStart : undefined}
        onTouchMove={!isDesktop ? handleTouchMove : undefined}
        onTouchEnd={!isDesktop ? handleTouchEnd : undefined}
      >
        {!isDesktop && (
          <div
            style={{
              width: 32,
              height: 3,
              background: 'rgba(255,255,255,0.15)',
              borderRadius: 2,
              margin: '12px auto',
              flexShrink: 0,
            }}
          />
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 24px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#F5A623',
                animation: 'pulse-dot 1.5s ease-in-out infinite',
              }}
            />
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                color: '#F5A623',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
              }}
            >
              ADDED TO YOUR BRAIN
            </span>
          </div>

          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 13,
              color: 'rgba(255,255,255,0.85)',
              fontStyle: 'italic',
              lineHeight: 1.6,
              padding: 12,
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 8,
              margin: '12px 0',
            }}
          >
            {data.insight}
          </p>

          {data.connections.length > 0 && (
            <>
              <div
                style={{
                  height: 0.5,
                  background: 'rgba(255,255,255,0.06)',
                  margin: '16px 0',
                }}
              />
              <div
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.3)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginBottom: 12,
                }}
              >
                YOUR BRAIN MADE CONNECTIONS
              </div>
              {data.connections.slice(0, 3).map(conn => (
                <button
                  key={conn.id}
                  type="button"
                  onClick={() => navigate('/brain')}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    background: 'rgba(255,255,255,0.03)',
                    border: '0.5px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    padding: '10px 12px',
                    marginBottom: 6,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 12,
                      color: 'rgba(255,255,255,0.75)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}
                  >
                    {conn.text}
                  </span>
                  <span
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 9,
                      color: '#F5A623',
                      letterSpacing: '0.05em',
                      background: 'rgba(245,166,35,0.12)',
                      border: '0.5px solid rgba(245,166,35,0.3)',
                      borderRadius: 12,
                      padding: '3px 8px',
                      flexShrink: 0,
                    }}
                  >
                    {sourceLabel(conn.sourceType)}
                  </span>
                </button>
              ))}
            </>
          )}

          <button
            type="button"
            onClick={() => {
              onDismiss()
              if (onViewLibrary) onViewLibrary()
              else navigate('/brain')
            }}
            style={{
              display: 'block',
              width: '100%',
              marginTop: 16,
              height: 44,
              background: 'rgba(245,166,35,0.12)',
              border: '0.5px solid rgba(245,166,35,0.35)',
              borderRadius: 8,
              fontFamily: "'Clash Display', sans-serif",
              fontWeight: 600,
              fontSize: 12,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#F5A623',
              cursor: 'pointer',
            }}
          >
            View in library
          </button>

          <button
            type="button"
            onClick={() => {
              onDismiss()
              navigate('/')
            }}
            style={{
              display: 'block',
              width: '100%',
              marginTop: 16,
              background: 'none',
              border: 'none',
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              color: 'rgba(255,255,255,0.3)',
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            ← back to brain
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUpMobile {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes cardFadeInDesktop {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.96); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </>
  )
}
