export const DAY_MS = 24 * 60 * 60 * 1000

export function toDate(value?: Date | string | null) {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}
