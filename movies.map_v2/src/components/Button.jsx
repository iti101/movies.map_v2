import './Button.css'

/** Token name (`accent-btn`) → `var(--color-accent-btn)`; raw CSS colors pass through. */
function toCssColor(value) {
  if (!value) return undefined
  if (/^(var\(|#|rgb|hsl|oklch|currentColor|transparent)/i.test(value)) return value
  return `var(--color-${value})`
}

function resolveFont(font) {
  if (!font) return undefined
  if (font === 'body') return 'var(--font-body)'
  if (font === 'display') return 'var(--font-display)'
  return font
}

const SIZE_PRESETS = new Set(['sm', 'md', 'lg', 'xl'])

/**
 * Shared chip / ghost / solid / icon button.
 * Colors are CSS variables from App.css unless you pass a full color string.
 */
export default function Button({
  children,
  text,
  className = '',
  type = 'button',
  variant = 'chip',
  size = 'md',
  font = 'body',
  color,
  background,
  hoverBackground,
  weight,
  fontSize,
  active = false,
  round = false,
  style,
  ...props
}) {
  const sizeClass = SIZE_PRESETS.has(size) ? `ui-button--${size}` : ''
  const classes = [
    'ui-button',
    `ui-button--${variant}`,
    sizeClass,
    active && 'is-active',
    round && 'ui-button--round',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type={type}
      className={classes}
      style={{
        '--button-color': toCssColor(color),
        '--button-bg': toCssColor(background),
        '--button-hover-bg': toCssColor(hoverBackground),
        '--button-font': resolveFont(font),
        '--button-weight': weight,
        '--button-size': SIZE_PRESETS.has(size) ? undefined : size,
        fontSize,
        ...style,
      }}
      aria-pressed={active || undefined}
      {...props}
    >
      {children ?? text}
    </button>
  )
}
