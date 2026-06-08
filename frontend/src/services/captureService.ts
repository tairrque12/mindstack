import { captureImage, captureText, type CaptureResponse } from './api'
import type { CaptureFormState, SourceId } from '../components/capture/types'
import { enqueueCapture } from './offlineQueue'

const SOURCE_TYPE_MAP: Record<SourceId, string> = {
  book: 'book',
  youtube: 'youtube',
  podcast: 'podcast',
  tweet: 'tweet',
  linkedin: 'linkedin',
  voice: 'voice_memo',
  reddit: 'reddit',
  note: 'note',
  convo: 'conversation',
  handwritten: 'handwritten',
}

async function dataUrlToFile(dataUrl: string, filename = 'capture.jpg'): Promise<File> {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  return new File([blob], filename, { type: blob.type || 'image/jpeg' })
}

function buildTextPayload(source: SourceId, form: CaptureFormState) {
  const source_type = SOURCE_TYPE_MAP[source]

  switch (source) {
    case 'book':
      return {
        content: form.content.trim(),
        source_type,
        source_title: form.title.trim() || undefined,
        source_author: form.author.trim() || undefined,
      }
    case 'youtube':
    case 'reddit':
      return {
        content: [form.url.trim(), form.notes.trim()].filter(Boolean).join('\n\n'),
        source_type,
        source_url: form.url.trim() || undefined,
        source_title: form.title.trim() || undefined,
      }
    case 'podcast':
      return {
        content: [form.title.trim(), form.episode.trim(), form.notes.trim()].filter(Boolean).join('\n\n'),
        source_type,
        source_title: form.title.trim() || undefined,
        extra_metadata: form.episode.trim() ? { episode: form.episode.trim() } : undefined,
      }
    case 'tweet':
    case 'linkedin':
    case 'note':
    case 'convo':
      return {
        content: form.content.trim(),
        source_type,
        source_title: form.title.trim() || undefined,
      }
    default:
      throw new Error(`Text capture not supported for ${source}`)
  }
}

export async function saveCapture(
  source: SourceId,
  form: CaptureFormState,
): Promise<CaptureResponse> {
  const source_type = SOURCE_TYPE_MAP[source]

  try {
    if (source === 'book' && form.imagePreview && !form.content.trim()) {
      const file = await dataUrlToFile(form.imagePreview)
      return await captureImage(file, source_type, form.title.trim() || undefined)
    }

    if (source === 'handwritten' && form.imagePreview) {
      const file = await dataUrlToFile(form.imagePreview)
      return await captureImage(file, source_type, form.title.trim() || undefined)
    }

    const payload = buildTextPayload(source, form)
    if (!payload.content) {
      throw new Error('Nothing to save')
    }
    return await captureText(payload)
  } catch (err) {
    if (!navigator.onLine && payloadHasContent(source, form)) {
      const payload = buildTextPayload(source, form)
      if (payload.content) {
        await enqueueCapture({
          content: payload.content,
          source_type: payload.source_type,
          source_title: payload.source_title,
        })
        return {
          slug: 'offline-queued',
          source_type: payload.source_type,
          title: payload.source_title,
          insight: 'Saved offline — will sync when you reconnect.',
          message: 'Queued offline.',
        }
      }
    }
    throw err
  }
}

function payloadHasContent(source: SourceId, form: CaptureFormState): boolean {
  switch (source) {
    case 'book':
      return !!(form.content.trim() || form.imagePreview)
    case 'handwritten':
      return !!form.imagePreview
    default:
      try {
        return !!buildTextPayload(source, form).content
      } catch {
        return false
      }
  }
}

export function toConfirmationData(response: CaptureResponse) {
  return {
    insight: response.insight || 'Saved to your brain.',
    connections: [] as { id: string; text: string; sourceType: string }[],
    slug: response.slug,
    title: response.title,
  }
}
