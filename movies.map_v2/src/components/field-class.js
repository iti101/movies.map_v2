import { cn } from '../lib/format.js'
import './Field.css'

const VARIANTS = {
  pill: null,
  box: 'ui-field--box',
  tall: ['ui-field--box', 'ui-field--tall'],
  area: 'ui-field--area',
}

/** Shared class names for pill, boxed, tall, and textarea fields. */
export function fieldClass(variant = 'pill', className) {
  return cn('ui-field', VARIANTS[variant], className)
}
