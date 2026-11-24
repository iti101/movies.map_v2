import { cn } from '../lib/format.js'
import Button from './Button.jsx'
import './ChipRow.css'

function matchesSelection(selected, item) {
  if (selected == null) return false
  if (Array.isArray(selected)) return selected.some((entry) => matchesSelection(entry, item))
  if (typeof selected === 'object') return selected.id === item.id
  return selected === item.id
}

export default function ChipRow({
  items,
  selected,
  isActive,
  onSelect,
  className,
  getKey = (item) => item.id,
  getLabel = (item) => item.label ?? item.name,
  disabled = false,
  loading = false,
  loadingLabel = 'Loading…',
  messageClassName,
  children,
}) {
  const activeFor = isActive ?? ((item) => matchesSelection(selected, item))

  if (loading) {
    return <p className={messageClassName}>{loadingLabel}</p>
  }

  return (
    <div className={cn('chip-row', className)}>
      {items.map((item) => (
        <Button
          key={getKey(item)}
          active={activeFor(item)}
          onClick={() => onSelect(item)}
          disabled={disabled}
        >
          {getLabel(item)}
        </Button>
      ))}
      {children}
    </div>
  )
}
