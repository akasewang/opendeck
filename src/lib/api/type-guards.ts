export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

export function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

export function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

export function isOptionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === 'string'
}

export function toNonNegativeInteger(value: unknown): number | null {
  return isNonNegativeInteger(value) ? value : null
}
