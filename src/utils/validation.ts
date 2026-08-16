const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isEmailAddress(value: string, max = 254) {
  return value.length <= max && EMAIL_PATTERN.test(value)
}
