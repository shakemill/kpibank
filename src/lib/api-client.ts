import { toast } from 'sonner'
import { TOAST } from './toast-messages'

export interface ApiCallOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: unknown
  successMessage?: string
  errorMessage?: string
  showSuccessToast?: boolean
}

export async function apiCall<T>(
  url: string,
  options: ApiCallOptions = {}
): Promise<{ data: T | null; error: string | null }> {
  const {
    method = 'GET',
    body,
    successMessage,
    errorMessage,
    showSuccessToast = true,
  } = options

  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    })

    const result = await response.json().catch(() => ({ error: TOAST.ERROR_SERVER }))

    if (!response.ok) {
      const msg = result.error || errorMessage || TOAST.ERROR_SERVER
      toast.error(msg)
      return { data: null, error: msg }
    }

    if (showSuccessToast && successMessage) {
      toast.success(successMessage)
    }

    return { data: result as T, error: null }
  } catch {
    toast.error(TOAST.ERROR_NETWORK)
    return { data: null, error: TOAST.ERROR_NETWORK }
  }
}
