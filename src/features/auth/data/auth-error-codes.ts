export type AuthErrorCode =
  | 'invalid_email'
  | 'link_expired'
  | 'verification_retired'
  | 'invitation_invalid'
  | 'signup_restricted'
  | 'email_unavailable'
  | 'account_suspended'
  | 'rate_limited'
  | 'unreachable'
  | 'unknown'

export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  invalid_email: 'That email address does not look right. Check it and try again.',
  link_expired:
    'That sign-in link has expired or was already used. Request a new link and try again.',
  verification_retired:
    'That older email-verification link is no longer supported. Request a new sign-in link instead.',
  invitation_invalid:
    'The invitation attached to that sign-in link is invalid, expired, or already used. Ask for a new invitation.',
  signup_restricted:
    'This email can no longer create an account. Ask an administrator for access, then request a new sign-in link.',
  email_unavailable:
    'We could not send the email just now. Please try again in a minute, or use a different address.',
  account_suspended: 'This account is unavailable. Contact an administrator if this is unexpected.',
  rate_limited: 'Too many tries. Please wait a moment before asking for another link.',
  unreachable: 'We could not reach OpenDeck. Check your connection and try again.',
  unknown: 'Something went wrong on our side. Please try again.',
}

export const REQUEST_ERROR_CODES: Record<string, AuthErrorCode> = {
  'Enter a valid email address.': 'invalid_email',
  'Email delivery is not configured.': 'email_unavailable',
  'Unable to send email right now.': 'email_unavailable',
}

export const CALLBACK_ERROR_CODES: Record<string, AuthErrorCode> = {
  'Missing token.': 'link_expired',
  'Token is invalid or expired.': 'link_expired',
  'Token is invalid, expired, or already used.': 'link_expired',
  'Token invitation metadata is invalid.': 'invitation_invalid',
  'Invitation is invalid or expired.': 'invitation_invalid',
  'This invitation has already been used.': 'invitation_invalid',
  'An invitation is required to create an account.': 'signup_restricted',
  'This email is not allowed to create an account.': 'signup_restricted',
  'This email is not on the account allowlist.': 'signup_restricted',
  'This account is suspended.': 'account_suspended',
}
