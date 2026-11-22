export function uniqueBy(items, keyOf) {
  const seen = new Set()
  const unique = []
  for (const item of items) {
    const key = keyOf(item)
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(item)
  }
  return unique
}

export function hasId(list, item) {
  return list.some((entry) => entry.id === item.id)
}

export function toggleById(list, item) {
  return hasId(list, item)
    ? list.filter((entry) => entry.id !== item.id)
    : [...list, item]
}
