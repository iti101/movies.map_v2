import Button from './Button.jsx'

export default function ChipRow({
  items,
  isActive,
  onSelect,
  className,
  getKey = (item) => item.id,
  getLabel = (item) => item.label ?? item.name,
  disabled = false,
}) {
  return (
    <div className={className}>
      {items.map((item) => (
        <Button
          key={getKey(item)}
          active={isActive(item)}
          onClick={() => onSelect(item)}
          disabled={disabled}
        >
          {getLabel(item)}
        </Button>
      ))}
    </div>
  )
}
