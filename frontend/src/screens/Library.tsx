import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getNodes, type Node } from '../services/api'
import { showToast } from '../components/Toast'

const SOURCE_FILTERS = [
  { id: '', label: 'All' },
  { id: 'book', label: 'Books' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'podcast', label: 'Podcasts' },
  { id: 'voice_memo', label: 'Voice' },
  { id: 'tweet', label: 'Tweets' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'reddit', label: 'Reddit' },
  { id: 'note', label: 'Notes' },
]

const SOURCE_ICONS: Record<string, string> = {
  book: '📖', tweet: '𝕏', youtube: '▶', podcast: '🎙',
  voice_memo: '🎤', linkedin: '🔗', reddit: '🟠', conversation: '💬',
  handwritten: '✍', note: '📝',
}

type LoadState = 'loading' | 'loaded' | 'error'

export default function Library() {
  const navigate = useNavigate()
  const [sourceFilter, setSourceFilter] = useState('')
  const [nodes, setNodes] = useState<Node[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [search, setSearch] = useState('')

  const load = useCallback(async (filter: string) => {
    setLoadState('loading')
    try {
      const result = await getNodes(50, 0, filter || undefined)
      setNodes(result.nodes)
      setLoadState('loaded')
    } catch {
      setLoadState('error')
      showToast("Couldn't load brain")
    }
  }, [])

  useEffect(() => { load(sourceFilter) }, [sourceFilter, load])

  const filtered = nodes.filter(n =>
    !search || n.title.toLowerCase().includes(search.toLowerCase())
  )

  const pillStyle = (active: boolean): React.CSSProperties => ({
    background: active ? '#F5A623' : 'rgba(255,255,255,0.06)',
    border: '0.5px solid rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: '7px 14px',
    fontFamily: 'DM Mono, monospace',
    fontSize: 11,
    color: active ? '#080808' : 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    minHeight: 36,
    letterSpacing: '0.06em',
    flexShrink: 0,
  })

  return (
    <div className="flex flex-col h-full" style={{ background: '#080808' }}>

      {/* Header */}
      <div className="flex items-center gap-4 px-5 pt-14 pb-4">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.3)', fontSize: 20,
            minWidth: 44, minHeight: 44,
            display: 'flex', alignItems: 'center',
          }}
        >
          ←
        </button>
        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, color: 'rgba(255,255,255,0.9)' }}>
          YOUR BRAIN
        </span>
        <div style={{ marginLeft: 'auto', fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
          {loadState === 'loaded' ? `${nodes.length} nodes` : ''}
        </div>
      </div>

      {/* Search */}
      <div className="px-5 mb-4">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search your brain..."
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.06)',
            border: '0.5px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            padding: '12px 16px',
            fontFamily: 'DM Mono, monospace',
            fontSize: 14,
            color: 'rgba(255,255,255,0.9)',
            outline: 'none',
          }}
          aria-label="Search nodes"
        />
      </div>

      {/* Source filter pills */}
      <div className="flex gap-2 overflow-x-auto px-5 mb-4" style={{ scrollbarWidth: 'none', paddingBottom: 4 }}>
        {SOURCE_FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setSourceFilter(f.id)}
            style={pillStyle(sourceFilter === f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Node list */}
      <div className="flex-1 overflow-y-auto px-5" style={{ paddingBottom: 32 }} role="main">
        {loadState === 'loading' && (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid rgba(255,255,255,0.08)',
                  borderRadius: 8, height: 88,
                  animation: 'shimmer 1.5s ease-in-out infinite',
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>
        )}

        {loadState === 'loaded' && filtered.length === 0 && (
          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '32px 20px',
              fontFamily: 'DM Mono, monospace',
              fontSize: 13, textAlign: 'center',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            {nodes.length === 0
              ? 'Brain is empty. Add your first capture.'
              : 'No nodes match that filter.'}
          </div>
        )}

        {loadState === 'loaded' && filtered.length > 0 && (
          <div className="flex flex-col gap-3">
            {filtered.map(node => (
              <NodeCard key={node.slug} node={node} />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0%,100% { opacity:0.5 }
          50% { opacity:0.25 }
        }
      `}</style>
    </div>
  )
}

function NodeCard({ node }: { node: Node }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '0.5px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: '14px 16px',
        display: 'flex',
        gap: 12,
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.065)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
    >
      <div style={{ fontSize: 20, flexShrink: 0, paddingTop: 2 }}>
        {SOURCE_ICONS[node.type] || '📝'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'DM Mono, monospace',
          fontSize: 13,
          color: 'rgba(255,255,255,0.85)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginBottom: 4,
        }}>
          {node.title}
        </div>
        <div style={{
          fontFamily: 'DM Mono, monospace',
          fontSize: 11,
          color: 'rgba(255,255,255,0.3)',
          letterSpacing: '0.04em',
        }}>
          {node.type.replace('_', ' ')} · {new Date(node.updated_at).toLocaleDateString()}
        </div>
      </div>
    </div>
  )
}
