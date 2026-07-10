const LOCALE = 'en-IN'
const TIME_ZONE = 'Asia/Kolkata'

export function formatHomeClock(date: Date): string {
  const time = date
    .toLocaleTimeString(LOCALE, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: TIME_ZONE,
    })
    .toUpperCase()

  const year = date.toLocaleDateString(LOCALE, {
    year: 'numeric',
    timeZone: TIME_ZONE,
  })

  return `${time} IST ${year}`
}
