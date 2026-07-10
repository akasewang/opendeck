export function parseNumber(value: string | null) {
  if (!value) return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? undefined : parsed
}

export function parseDate(value: string | null) {
  if (!value) return undefined
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

export function parseEnum<T extends string>(value: string | null, allowed: readonly T[]) {
  if (!value) return undefined
  return allowed.includes(value as T) ? (value as T) : undefined
}

export function invalidEnumMessage(name: string, value: string, allowed: readonly string[]) {
  return `Invalid ${name}. Expected one of: ${allowed.join(', ')}. Received: ${value}.`
}

export function parseBoundedNumber(
  value: string | null,
  options: { min?: number; max?: number; fallback: number },
) {
  const parsed = parseNumber(value)
  if (parsed === undefined) return options.fallback

  const min = options.min ?? Number.NEGATIVE_INFINITY
  const max = options.max ?? Number.POSITIVE_INFINITY
  return Math.min(Math.max(Math.floor(parsed), min), max)
}
