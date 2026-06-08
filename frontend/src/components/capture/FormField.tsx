import { useState } from 'react'

type Props = {
  label?: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
  minHeight?: number
  rows?: number
  disabled?: boolean
  type?: 'text' | 'url'
}

const fieldStyle = (focused: boolean): React.CSSProperties => ({
  fontFamily: "'DM Mono', monospace",
  fontSize: 13,
  background: 'transparent',
  border: 'none',
  borderBottom: focused
    ? '0.5px solid rgba(245,166,35,0.4)'
    : '0.5px solid rgba(255,255,255,0.08)',
  padding: '14px 0',
  color: 'rgba(255,255,255,0.85)',
  outline: 'none',
  width: '100%',
  resize: 'none' as const,
})

const labelStyle: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: 10,
  color: 'rgba(255,255,255,0.3)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: 4,
  display: 'block',
}

export default function FormField({
  label,
  placeholder,
  value,
  onChange,
  multiline = false,
  minHeight,
  rows = 4,
  disabled,
  type = 'text',
}: Props) {
  const [focused, setFocused] = useState(false)

  return (
    <div style={{ marginBottom: 24 }}>
      <style>{`
        .capture-field::placeholder {
          color: rgba(255,255,255,0.2);
        }
      `}</style>
      {label && <label style={labelStyle}>{label}</label>}
      {multiline ? (
        <textarea
          className="capture-field"
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ ...fieldStyle(focused), minHeight: minHeight ?? undefined }}
          aria-label={label ?? placeholder}
        />
      ) : (
        <input
          className="capture-field"
          type={type}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={fieldStyle(focused)}
          aria-label={label ?? placeholder}
        />
      )}
    </div>
  )
}
