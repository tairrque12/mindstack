/** Use Vite proxy in dev — direct localhost:8000 fails from browser (CORS / unreachable). */
function resolveApiUrl(): string {
  const configured = import.meta.env.VITE_API_URL || '/api'
  if (
    import.meta.env.DEV &&
    (configured === 'http://localhost:8000' || configured === 'http://127.0.0.1:8000')
  ) {
    return '/api'
  }
  return configured
}

const API_URL = resolveApiUrl()
const API_KEY = import.meta.env.VITE_API_KEY || ''

function formatApiError(status: number, detail: unknown): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg ?? JSON.stringify(item)).join('; ')
  }
  if (status === 403) return 'Invalid API key — check VITE_API_KEY matches backend API_KEY'
  if (status >= 500) return 'Server error — is the backend running?'
  return `Request failed (${status})`
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'X-API-Key': API_KEY,
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...options.headers,
      },
    })
  } catch {
    throw new Error(
      API_URL.startsWith('http')
        ? `Cannot reach backend at ${API_URL} — start it with: uvicorn app.main:app --reload`
        : 'Cannot reach backend — start uvicorn on port 8000',
    )
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(formatApiError(res.status, err.detail))
  }
  return res.json()
}

export interface CaptureResponse {
  slug: string
  source_type: string
  title?: string
  insight?: string
  message: string
  extracted_text?: string
}

export interface NodeSummary {
  slug: string
  type: string
  source_type?: string
  updated_at: string
  title: string
  insight?: string
}

export interface NodeDetail {
  slug: string
  source_type: string
  source_title: string
  source_author?: string
  raw_content: string
  insight?: string
  principle?: string
  applicable_domains?: string[]
  open_questions?: string[]
  tags?: string[]
  captured_at?: string
}

export function captureText(body: {
  content: string
  source_type: string
  source_title?: string
  source_author?: string
  source_url?: string
  extra_metadata?: Record<string, unknown>
}): Promise<CaptureResponse> {
  return request('/capture', { method: 'POST', body: JSON.stringify(body) })
}

export function captureImage(
  file: File,
  source_type: string,
  source_title?: string,
): Promise<CaptureResponse> {
  const form = new FormData()
  form.append('file', file)
  form.append('source_type', source_type)
  if (source_title) form.append('source_title', source_title)
  return request('/capture/image', { method: 'POST', body: form })
}

export function getNodes(
  limit = 50,
  offset = 0,
  source_type?: string,
): Promise<{ nodes: NodeSummary[]; limit: number; offset: number }> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  if (source_type) params.set('source_type', source_type)
  return request(`/nodes?${params}`)
}

export function getNode(slug: string): Promise<{ node: NodeDetail }> {
  const path = slug.split('/').map(encodeURIComponent).join('/')
  return request(`/nodes/${path}`)
}

export type Node = NodeSummary

export async function* applyStream(
  query: string,
  projectContext?: string,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const res = await fetch(`${API_URL}/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
    body: JSON.stringify({ query, project_context: projectContext }),
    signal,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    for (const line of decoder.decode(value).split('\n')) {
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        yield line.slice(6)
      }
    }
  }
}

export async function applyQuery(
  query: string,
  projectContext?: string,
  onChunk?: (text: string) => void,
): Promise<string> {
  const res = await fetch(`${API_URL}/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
    body: JSON.stringify({ query, project_context: projectContext }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let full = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    for (const line of decoder.decode(value).split('\n')) {
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        const chunk = line.slice(6)
        full += chunk
        onChunk?.(chunk)
      }
    }
  }
  return full
}
