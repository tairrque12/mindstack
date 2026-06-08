import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconSearch } from '@tabler/icons-react'
import ParticleCanvas from '../components/ParticleCanvas'
import SourceIcon, { resolveSourceType, sourceLabel } from '../components/SourceIcon'
import NodeDetailSheet from '../components/NodeDetailSheet'
import { getNode, getNodes, type NodeDetail, type NodeSummary } from '../services/api'
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

const DOMAIN_FILTERS = [
  'Business', 'Mindset', 'Fitness', 'Design', 'Engineering',
  'Leadership', 'Investing', 'Learning', 'Health',
]

type NodeMeta = { insight?: string; domains: string[] }
type LoadState = 'loading' | 'loaded' | 'error'

function pillStyle(active: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: active ? 'rgba(245,166,35,0.12)' : 'rgba(255,255,255,0.04)',
    border: active ? '0.5px solid rgba(245,166,35,0.4)' : '0.5px solid rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: '8px 16px',
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    letterSpacing: '0.05em',
    color: active ? '#F5A623' : 'rgba(255,255,255,0.4)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    minHeight: 36,
  }
}

function formatCardDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

export default function Library() {
  const navigate = useNavigate()
  const [sourceFilter, setSourceFilter] = useState('')
  const [domainFilter, setDomainFilter] = useState('')
  const [nodes, setNodes] = useState<NodeSummary[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [metaCache, setMetaCache] = useState<Record<string, NodeMeta>>({})
  const metaCacheRef = useRef(metaCache)
  metaCacheRef.current = metaCache

  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [search, setSearch] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [detail, setDetail] = useState<NodeDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    getNodes(100, 0)
      .then(r => setTotalCount(r.nodes.length))
      .catch(() => {})
  }, [])

  const enrichMeta = useCallback(async (slugs: string[]) => {
    const missing = slugs.filter(s => !metaCacheRef.current[s])
    if (missing.length === 0) return
    const results = await Promise.all(
      missing.map(async slug => {
        try {
          const { node } = await getNode(slug)
          return {
            slug,
            meta: {
              insight: node.insight,
              domains: node.applicable_domains ?? [],
            } satisfies NodeMeta,
          }
        } catch {
          return { slug, meta: { domains: [] } satisfies NodeMeta }
        }
      }),
    )
    setMetaCache(prev => {
      const next = { ...prev }
      for (const { slug, meta } of results) next[slug] = meta
      return next
    })
  }, [])

  const load = useCallback(async (filter: string) => {
    setLoadState('loading')
    try {
      const result = await getNodes(50, 0, filter || undefined)
      setNodes(result.nodes)
      setLoadState('loaded')
      enrichMeta(result.nodes.map(n => n.slug))
    } catch {
      setLoadState('error')
      showToast("Couldn't load brain")
    }
  }, [enrichMeta])

  useEffect(() => { load(sourceFilter) }, [sourceFilter, load])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') load(sourceFilter)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load, sourceFilter])

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

  const filtered = nodes.filter(n => {
    if (search && !n.title.toLowerCase().includes(search.toLowerCase())) return false
    if (domainFilter) {
      const domains = metaCache[n.slug]?.domains ?? []
      if (!domains.some(d => d.toLowerCase() === domainFilter.toLowerCase())) return false
    }
    return true
  })

  return (
    <div className="relative flex flex-col h-full overflow-hidden" style={{ background: '#080808' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <ParticleCanvas dimmed />
      </div>

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center gap-3 px-5 pt-14 pb-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="Back to home"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.3)',
              fontSize: 20,
              minWidth: 44,
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            ←
          </button>
          <span
            style={{
              fontFamily: "'Clash Display', sans-serif",
              fontWeight: 700,
              fontSize: 22,
              color: 'rgba(255,255,255,0.9)',
            }}
          >
            YOUR BRAIN
          </span>
          <div
            style={{
              marginLeft: 'auto',
              fontFamily: 'DM Mono, monospace',
              fontSize: 11,
              color: 'rgba(255,255,255,0.3)',
            }}
          >
            {totalCount > 0 ? `${totalCount} nodes` : loadState === 'loaded' ? `${nodes.length} nodes` : ''}
          </div>
        </div>

        <div className="px-5 mb-4">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              height: 44,
              background: 'rgba(255,255,255,0.04)',
              border: searchFocused
                ? '0.5px solid rgba(245,166,35,0.3)'
                : '0.5px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              padding: '0 16px',
              transition: 'border-color 0.2s',
            }}
          >
            <IconSearch size={16} stroke={1.5} color="rgba(255,255,255,0.3)" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search your brain..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontFamily: 'DM Mono, monospace',
                fontSize: 13,
                color: 'rgba(255,255,255,0.9)',
              }}
              aria-label="Search nodes"
            />
          </div>
        </div>

        <div
          className="flex gap-2 overflow-x-auto px-5 mb-3 no-scrollbar"
          style={{ paddingBottom: 4 }}
        >
          {SOURCE_FILTERS.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSourceFilter(f.id)}
              style={pillStyle(sourceFilter === f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div
          className="flex gap-2 overflow-x-auto px-5 mb-4 no-scrollbar"
          style={{ paddingBottom: 4 }}
        >
          <button
            type="button"
            onClick={() => setDomainFilter('')}
            style={pillStyle(domainFilter === '')}
          >
            All domains
          </button>
          {DOMAIN_FILTERS.map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setDomainFilter(domainFilter === d ? '' : d)}
              style={pillStyle(domainFilter === d)}
            >
              {d}
            </button>
          ))}
        </div>

        <div
          className="flex-1 overflow-y-auto px-5"
          style={{ paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }}
          role="main"
        >
          {loadState === 'loading' && (
            <div className="flex flex-col gap-2">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '0.5px solid rgba(255,255,255,0.07)',
                    borderRadius: 12,
                    height: 120,
                    animation: 'shimmer 1.5s ease-in-out infinite',
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
          )}

          {loadState === 'error' && (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <button
                type="button"
                onClick={() => load(sourceFilter)}
                style={{
                  background: 'rgba(245,166,35,0.12)',
                  border: '0.5px solid rgba(245,166,35,0.35)',
                  borderRadius: 8,
                  padding: '12px 20px',
                  fontFamily: 'DM Mono, monospace',
                  fontSize: 13,
                  color: '#F5A623',
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </div>
          )}

          {loadState === 'loaded' && filtered.length === 0 && (
            <div
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '32px 20px',
                fontFamily: 'DM Mono, monospace',
                fontSize: 13,
                textAlign: 'center',
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              {nodes.length === 0
                ? 'Brain is empty. Add your first capture.'
                : 'No nodes match that filter.'}
            </div>
          )}

          {loadState === 'loaded' && filtered.length > 0 && (
            <div className="flex flex-col">
              {filtered.map(node => (
                <NodeCard
                  key={node.slug}
                  node={node}
                  meta={metaCache[node.slug]}
                  onOpen={() => openDetail(node.slug)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedSlug && (
        <NodeDetailSheet loading={detailLoading} detail={detail} onClose={closeDetail} />
      )}

      <style>{`
        .no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes shimmer {
          0%,100% { opacity:0.5 }
          50% { opacity:0.25 }
        }
      `}</style>
    </div>
  )
}

function NodeCard({
  node,
  meta,
  onOpen,
}: {
  node: NodeSummary
  meta?: NodeMeta
  onOpen: () => void
}) {
  const [hover, setHover] = useState(false)
  const insight = meta?.insight ?? node.insight
  const domains = meta?.domains ?? []
  const src = resolveSourceType(node.slug, node.type, node.source_type)

  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%',
        background: hover ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
        border: hover ? '0.5px solid rgba(255,255,255,0.12)' : '0.5px solid rgba(255,255,255,0.07)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
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
        <span
          style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: 9,
            color: 'rgba(255,255,255,0.2)',
            flexShrink: 0,
          }}
        >
          {formatCardDate(node.updated_at)}
        </span>
      </div>

      <div
        style={{
          fontFamily: "'Clash Display', sans-serif",
          fontWeight: 500,
          fontSize: 15,
          color: 'rgba(255,255,255,0.88)',
          lineHeight: 1.35,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {node.title}
      </div>

      {insight && (
        <div
          style={{
            marginTop: 6,
            fontFamily: 'DM Mono, monospace',
            fontSize: 12,
            color: 'rgba(255,255,255,0.45)',
            fontStyle: 'italic',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {insight}
        </div>
      )}

      {domains.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
          {domains.slice(0, 4).map(d => (
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
    </button>
  )
}
