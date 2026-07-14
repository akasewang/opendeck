'use client'

import { toast } from '@/components/ui/toast'
import { getJson, postJson } from '@/lib/api/http-client'

export const getAdminApi = getJson

export async function postAdminApi(path: string, body: Record<string, unknown>) {
  try {
    return await postJson(path, body)
  } catch (error) {
    toast(error instanceof Error ? error.message : 'Request failed.', { tone: 'error' })
    throw error
  }
}
