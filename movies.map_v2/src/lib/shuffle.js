export function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

export function shuffle(items) {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

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
