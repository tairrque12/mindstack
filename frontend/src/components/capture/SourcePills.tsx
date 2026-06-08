import { SOURCES, type SourceId } from './types'

type Props = {
  selected: SourceId
  onSelect: (id: SourceId) => void
}

export default function SourcePills({ selected, onSelect }: Props) {
  return (
    <div
      className="capture-pills-scroll"
      style={{
        display: 'flex',
        gap: 10,
        overflowX: 'auto',
        scrollbarWidth: 'none',
        padding: '0 16px',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {SOURCES.map(({ id, label, Icon }) => {
        const isSelected = selected === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: isSelected ? 'rgba(245,166,35,0.12)' : 'rgba(255,255,255,0.04)',
              border: isSelected
                ? '0.5px solid rgba(245,166,35,0.4)'
                : '0.5px solid rgba(255,255,255,0.1)',
              borderRadius: 20,
              padding: '8px 16px',
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              letterSpacing: '0.05em',
              color: isSelected ? '#F5A623' : 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              minHeight: 36,
            }}
          >
            <Icon size={14} stroke={1.5} />
            {label}
          </button>
        )
      })}
    </div>
  )
}
