import { cn } from '../lib/format.js'
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
 * Shared chip / ghost / solid / accent / outline / icon / link control.
 * Pass `href` to render an `<a>` with the same variants. Colors are CSS
 * variables from App.css unless you pass a full color string.
 */
export default function Button({
  children,
  className = '',
  type = 'button',
  href,
  target,
  rel,
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
  disabled,
  style,
  ...props
}) {
  const isLink = Boolean(href) && !disabled
  const Tag = isLink ? 'a' : 'button'
  const classes = cn(
    'ui-button',
    `ui-button--${variant}`,
    SIZE_PRESETS.has(size) && variant !== 'link' && `ui-button--${size}`,
    active && 'is-active',
    round && 'ui-button--round',
    className,
  )

  return (
    <Tag
      type={isLink ? undefined : type}
      href={isLink ? href : undefined}
      target={isLink ? target : undefined}
      rel={isLink ? rel ?? (target === '_blank' ? 'noreferrer' : undefined) : undefined}
      className={classes}
      disabled={isLink ? undefined : disabled}
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
      {children}
    </Tag>
  )
}
