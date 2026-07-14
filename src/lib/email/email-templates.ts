import { APP_CONFIG } from '@/config/application'
import {
  EMAIL_COLORS,
  EMAIL_FONT_STACKS,
  EMAIL_MOBILE_BREAKPOINT_PX,
} from '@/lib/email/email-theme'

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

const PREHEADER_SPACER = '&#847;&zwnj;&nbsp;'.repeat(80)

const responsiveStyles = `@media only screen and (max-width:${EMAIL_MOBILE_BREAKPOINT_PX}px){
.gutter{padding-left:20px !important;padding-right:20px !important}
.masthead{display:block !important;width:100% !important;text-align:left !important}
.stamp{padding-top:8px !important}
.headline{font-size:22px !important}
.meta-label{display:block !important;width:100% !important;padding-bottom:2px !important}
.meta-value{display:block !important;width:100% !important}
.page{padding:24px 12px !important}
}`

export function formatEmailStamp(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'UTC',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? ''

  return `${part('day')}.${part('month')}.${part('year')} · ${part('hour')}:${part('minute')} UTC`
}

export function renderEmail(content: EmailContent): string {
  const stamp = formatEmailStamp(content.date ?? new Date())

  const paragraphs = (content.paragraphs ?? [])
    .map(
      (line) =>
        `<p style="margin:0 0 16px;font-family:${EMAIL_FONT_STACKS.sans};font-size:15px;line-height:1.65;color:${EMAIL_COLORS.muted}">${escapeHtml(line)}</p>`,
    )
    .join('')

  const button = content.button
    ? `<a href="${escapeHtml(content.button.href)}" style="display:inline-block;font-family:${EMAIL_FONT_STACKS.mono};font-size:12px;color:${EMAIL_COLORS.buttonText};text-decoration:none;padding:10px 16px;background-color:${EMAIL_COLORS.link};border:1px solid ${EMAIL_COLORS.link};line-height:16px">${escapeHtml(content.button.label)}</a>`
    : ''

  const note = content.note
    ? `<p style="margin:18px 0 0;font-family:${EMAIL_FONT_STACKS.mono};font-size:11px;color:${EMAIL_COLORS.dim};line-height:16px">${escapeHtml(content.note)}</p>`
    : ''

  const rowsSection =
    content.rows && content.rows.length > 0
      ? `<tr><td class="gutter" style="border-top:1px dashed ${EMAIL_COLORS.border};padding:28px 32px">${
          content.rowsLabel
            ? `<p style="margin:0 0 18px;font-family:${EMAIL_FONT_STACKS.mono};font-size:11px;color:${EMAIL_COLORS.dim};line-height:16px">${escapeHtml(content.rowsLabel)}</p>`
            : ''
        }${content.rows
          .map(
            (row) =>
              `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:14px"><tr><td class="meta-label" style="width:132px;vertical-align:top;font-family:${EMAIL_FONT_STACKS.mono};font-size:11px;color:${EMAIL_COLORS.dim};line-height:20px">${escapeHtml(row.label)}</td><td class="meta-value" style="vertical-align:top;font-family:${EMAIL_FONT_STACKS.mono};font-size:13px;color:${EMAIL_COLORS.text};line-height:20px;word-break:break-word">${escapeHtml(row.value)}</td></tr></table>`,
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
<style>${responsiveStyles}</style>
</head>
<body class="page" style="background-color:${EMAIL_COLORS.bodyBackground};margin:0;padding:40px 16px;font-family:${EMAIL_FONT_STACKS.sans}">
<div style="display:none;visibility:hidden;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:transparent;opacity:0;height:0;width:0;max-height:0;max-width:0">${escapeHtml(content.preview)}${PREHEADER_SPACER}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background-color:${EMAIL_COLORS.background};border:1px solid ${EMAIL_COLORS.border};border-collapse:collapse">
<tr><td class="gutter" style="padding:20px 32px;border-bottom:1px solid ${EMAIL_COLORS.border}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr>
<td class="masthead" style="vertical-align:middle">
<p style="margin:0;font-family:${EMAIL_FONT_STACKS.sans};font-size:13px;font-weight:500;color:${EMAIL_COLORS.text};line-height:16px">${escapeHtml(APP_CONFIG.name)}</p>
<a href="${escapeHtml(APP_CONFIG.url)}" style="font-family:${EMAIL_FONT_STACKS.mono};font-size:11px;color:${EMAIL_COLORS.link};line-height:16px;text-decoration:none">${escapeHtml(APP_CONFIG.domain)}</a>
</td>
<td align="right" class="masthead stamp" style="vertical-align:middle">
<p style="margin:0;font-family:${EMAIL_FONT_STACKS.mono};font-size:12px;color:${EMAIL_COLORS.dim}">${stamp}</p>
</td>
</tr></table>
</td></tr>
<tr><td class="gutter" style="padding:40px 32px 36px">
<p style="margin:0 0 14px;font-family:${EMAIL_FONT_STACKS.mono};font-size:11px;color:${EMAIL_COLORS.dim};line-height:16px">${escapeHtml(content.eyebrow)}</p>
<h1 class="headline" style="margin:0 0 24px;font-family:${EMAIL_FONT_STACKS.sans};font-weight:500;font-size:28px;line-height:1.2;letter-spacing:-0.022em;color:${EMAIL_COLORS.text}">${escapeHtml(content.heading)}</h1>
${paragraphs}${button}${note}
</td></tr>
${rowsSection}
<tr><td class="gutter" style="border-top:1px dashed ${EMAIL_COLORS.border};padding:18px 32px 22px">
<p style="margin:0;font-family:${EMAIL_FONT_STACKS.mono};font-size:10px;color:${EMAIL_COLORS.dim};line-height:16px">${escapeHtml(content.footer)}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}
