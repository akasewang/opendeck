import { isRecord } from '@/lib/api/input-normalization'

export async function readJsonObject(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    throw new Error('Request body must be valid JSON.')
  }

  if (!isRecord(body)) {
    throw new Error('Request body must be a JSON object.')
  }

  return body
}
