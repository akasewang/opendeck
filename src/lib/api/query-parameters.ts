export function parseNumber(value: string | null) {
  const normalized = value?.trim()
  if (!normalized || !/^-?\d+$/.test(normalized)) return undefined
  const parsed = Number(normalized)
  return Number.isSafeInteger(parsed) ? parsed : undefined
}

export function parseDate(value: string | null) {
  if (!value) return undefined
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

export function parseEnum<T extends string>(value: string | null, allowed: readonly T[]) {
  if (!value) return undefined
  return allowed.find((candidate) => candidate === value)
}

export function invalidEnumMessage(name: string, value: string, allowed: readonly string[]) {
  return `Invalid ${name}. Expected one of: ${allowed.join(', ')}. Received: ${value}.`
}

export function parseOptionalTextParameter(name: string, value: string | null, maxLength: number) {
  if (value === null || value.trim() === '') {
    return { error: null, value: undefined } as const
  }
  const normalized = value.trim()
  if (normalized.length > maxLength || /[\u0000-\u001f\u007f]/.test(normalized)) {
    return {
      error: `${name} must be at most ${maxLength} characters and contain no control characters.`,
      value: undefined,
    } as const
  }
  return { error: null, value: normalized } as const
}

export function parseOptionalInteger(
  name: string,
  value: string | null,
  options: { min?: number; max?: number } = {},
) {
  if (value === null || value.trim() === '') {
    return { error: null, value: undefined } as const
  }

  const parsed = parseNumber(value)
  const min = options.min ?? Number.MIN_SAFE_INTEGER
  const max = options.max ?? Number.MAX_SAFE_INTEGER
  if (parsed === undefined || parsed < min || parsed > max) {
    const range =
      options.min !== undefined && options.max !== undefined
        ? ` between ${options.min} and ${options.max}`
        : options.min !== undefined
          ? ` greater than or equal to ${options.min}`
          : options.max !== undefined
            ? ` less than or equal to ${options.max}`
            : ''
    return { error: `${name} must be an integer${range}.`, value: undefined } as const
  }

  return { error: null, value: parsed } as const
}
