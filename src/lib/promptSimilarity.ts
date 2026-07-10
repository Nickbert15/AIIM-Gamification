function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9äöüß\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function wordSet(text: string): Set<string> {
  const normalized = normalize(text)
  return normalized ? new Set(normalized.split(' ')) : new Set()
}

// Word-set (unigram) Jaccard rather than n-grams: robust to the reordering/synonym-swap
// case ("leicht umgestellter Aufgabentext") that would otherwise dodge a contiguous-phrase
// n-gram check, while a genuinely own-formulated short prompt naturally shares only a
// handful of topic words with the much larger task text, keeping its score low.
export function computeSimilarity(a: string, b: string): number {
  const setA = wordSet(a)
  const setB = wordSet(b)
  if (setA.size === 0 || setB.size === 0) return 0
  let intersection = 0
  setA.forEach(word => { if (setB.has(word)) intersection++ })
  const union = setA.size + setB.size - intersection
  return union === 0 ? 0 : intersection / union
}

export function isPromptTooSimilarToTask(prompt: string, task: string, threshold = 0.6): boolean {
  return computeSimilarity(prompt, task) >= threshold
}
