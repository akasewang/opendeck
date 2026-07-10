import { APP_CONFIG } from '@/config/app'

const theme = {
  bg: '#ffffff',
  bodyBg: '#f5f5f7',
  border: '#e5e5ea',
  text: '#1c1c1e',
  muted: '#6e6e73',
  dim: '#8e8e93',
  link: '#2563eb',
}

const sans = "-apple-system, BlinkMacSystemFont, 'Inter', 'Helvetica Neue', Arial, sans-serif"
const mono = "ui-monospace, 'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace"

type EmailRow = { label: string; value: string }

type EmailContent = {
  preview: string
  eyebrow: string
  heading: string
  paragraphs?: string[]
  button?: { label: string; href: string }
  note?: string
  rowsLabel?: string
  rows?: EmailRow[]
  footer: string
  date?: Date
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatDate(date: Date) {
  return Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(date)
    .replaceAll('/', '.')
}

export function renderEmail(content: EmailContent): string {
  const date = formatDate(content.date ?? new Date())

  const paragraphs = (content.paragraphs ?? [])
    .map(
      (line) =>
        `<p style="margin:0 0 16px;font-family:${sans};font-size:15px;line-height:1.65;color:${theme.muted}">${escapeHtml(line)}</p>`,
    )
    .join('')

  const button = content.button
    ? `<a href="${escapeHtml(content.button.href)}" style="display:inline-block;font-family:${mono};font-size:12px;color:#ffffff;text-decoration:none;padding:10px 16px;background-color:${theme.link};border:1px solid ${theme.link};line-height:16px">${escapeHtml(content.button.label)}</a>`
    : ''

  const note = content.note
    ? `<p style="margin:18px 0 0;font-family:${mono};font-size:11px;color:${theme.dim};line-height:16px">${escapeHtml(content.note)}</p>`
    : ''

  const rowsSection =
    content.rows && content.rows.length > 0
      ? `<tr><td style="border-top:1px dashed ${theme.border};padding:28px 32px">${
          content.rowsLabel
            ? `<p style="margin:0 0 18px;font-family:${mono};font-size:11px;color:${theme.dim};line-height:16px">${escapeHtml(content.rowsLabel)}</p>`
            : ''
        }${content.rows
          .map(
            (row) =>
              `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:14px"><tr><td style="width:132px;vertical-align:top;font-family:${mono};font-size:11px;color:${theme.dim};line-height:20px">${escapeHtml(row.label)}</td><td style="vertical-align:top;font-family:${mono};font-size:13px;color:${theme.text};line-height:20px;word-break:break-word">${escapeHtml(row.value)}</td></tr></table>`,
          )
          .join('')}</td></tr>`
      : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
</head>
<body style="background-color:${theme.bodyBg};margin:0;padding:40px 16px;font-family:${sans}">
<div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0">${escapeHtml(content.preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background-color:${theme.bg};border:1px solid ${theme.border};border-collapse:collapse">
<tr><td style="padding:20px 32px;border-bottom:1px solid ${theme.border}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr>
<td style="vertical-align:middle">
<p style="margin:0;font-family:${sans};font-size:13px;font-weight:500;color:${theme.text};line-height:16px">${escapeHtml(APP_CONFIG.name)}</p>
<a href="${escapeHtml(APP_CONFIG.url)}" style="font-family:${mono};font-size:11px;color:${theme.link};line-height:16px;text-decoration:none">${escapeHtml(APP_CONFIG.domain)}</a>
</td>
<td align="right" style="vertical-align:middle">
<p style="margin:0;font-family:${mono};font-size:12px;color:${theme.dim}">${date}</p>
</td>
</tr></table>
</td></tr>
<tr><td style="padding:40px 32px 36px">
<p style="margin:0 0 14px;font-family:${mono};font-size:11px;color:${theme.dim};line-height:16px">${escapeHtml(content.eyebrow)}</p>
<h1 style="margin:0 0 24px;font-family:${sans};font-weight:500;font-size:28px;line-height:1.2;letter-spacing:-0.022em;color:${theme.text}">${escapeHtml(content.heading)}</h1>
${paragraphs}${button}${note}
</td></tr>
${rowsSection}
<tr><td style="border-top:1px dashed ${theme.border};padding:18px 32px 22px">
<p style="margin:0;font-family:${mono};font-size:10px;color:${theme.dim};line-height:16px">${escapeHtml(content.footer)}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}
