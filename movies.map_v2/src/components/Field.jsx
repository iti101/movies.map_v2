import { cn } from '../lib/format.js'
import { fieldClass } from './field-class.js'
import './Field.css'

/**
 * Labeled text control. Pass `children` to wrap a custom input (password + eye).
 * Default variant is the boxed modal field; pills still use `.ui-field` directly.
 */
export default function Field({
  id,
  label,
  variant = 'box',
  className,
  fieldClassName,
  children,
  ...props
}) {
  return (
    <div className={cn('ui-label', className)}>
      <label htmlFor={id}>{label}</label>
      {children ?? (
        <input id={id} className={fieldClass(variant, fieldClassName)} {...props} />
      )}
    </div>
  )
}
