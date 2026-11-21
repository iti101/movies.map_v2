import { cn } from '../lib/format.js'
import './Select.css'

function Select({
  className = '',
  id,
  ariaLabel,
  value,
  onChange,
  options = [],
  children,
  ...props
}) {
  return (
    <select
      id={id}
      className={cn('ui-select', className)}
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      {...props}
    >
      {children ??
        options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
    </select>
  )
}

export default Select
