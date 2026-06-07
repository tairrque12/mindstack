const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const API_KEY = import.meta.env.VITE_API_KEY || ''

const headers = () => ({
  'Content-Type': 'application/json',
  'X-API-Key': API_KEY,
})

export interface Node {
  slug: string
  type: string
  updated_at: string
  title: string
}

export async function captureText(params: {
  content: string
  source_type: string
  source_title?: string
  source_author?: string
  source_url?: string
}): Promise<{ slug: string; source_type: string }> {
  const res = await fetch(`${API_URL}/capture`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function captureImage(
  file: File,
  source_type: string,
  source_title?: string
): Promise<{ slug: string; extracted_text: string }> {
  const form = new FormData()
  form.append('file', file)
  form.append('source_type', source_type)
  if (source_title) form.append('source_title', source_title)
  const res = await fetch(`${API_URL}/capture/image`, {
    method: 'POST',
    headers: { 'X-API-Key': API_KEY },
    body: form,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function* applyStream(query: string, projectContext?: string): AsyncGenerator<string> {
  const res = await fetch(`${API_URL}/apply`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ query, project_context: projectContext }),
  })
  if (!res.ok) throw new Error(await res.text())
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') return
        yield data
      }
    }
  }
}

export async function getNodes(limit = 20, offset = 0, source_type?: string): Promise<{ nodes: Node[] }> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  if (source_type) params.set('source_type', source_type)
  const res = await fetch(`${API_URL}/nodes?${params}`, { headers: headers() })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
