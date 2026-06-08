import {
  IconBook,
  IconBrandYoutube,
  IconHeadphones,
  IconBrandTwitter,
  IconBrandLinkedin,
  IconMicrophone,
  IconBrandReddit,
  IconFileText,
  IconMessage,
  IconPencil,
} from '@tabler/icons-react'
import type { ComponentType } from 'react'

export type SourceId =
  | 'book'
  | 'youtube'
  | 'podcast'
  | 'tweet'
  | 'linkedin'
  | 'voice'
  | 'reddit'
  | 'note'
  | 'convo'
  | 'handwritten'

export type SourceConfig = {
  id: SourceId
  label: string
  subtitle: string
  Icon: ComponentType<{ size?: number; stroke?: number }>
}

export const SOURCES: SourceConfig[] = [
  { id: 'book', label: 'Book', subtitle: 'paste a highlight or photograph the page', Icon: IconBook },
  { id: 'youtube', label: 'YouTube', subtitle: 'paste the URL or add your notes', Icon: IconBrandYoutube },
  { id: 'podcast', label: 'Podcast', subtitle: 'paste your notes or key moments', Icon: IconHeadphones },
  { id: 'tweet', label: 'Tweet', subtitle: 'paste the tweet text or thread', Icon: IconBrandTwitter },
  { id: 'linkedin', label: 'LinkedIn', subtitle: 'paste the post or your takeaway', Icon: IconBrandLinkedin },
  { id: 'voice', label: 'Voice', subtitle: 'record a thought or memo', Icon: IconMicrophone },
  { id: 'reddit', label: 'Reddit', subtitle: 'paste the URL or key insight', Icon: IconBrandReddit },
  { id: 'note', label: 'Note', subtitle: 'capture an idea or observation', Icon: IconFileText },
  { id: 'convo', label: 'Convo', subtitle: 'what did you learn from this conversation', Icon: IconMessage },
  { id: 'handwritten', label: 'Handwritten', subtitle: 'photograph your notes or sketch', Icon: IconPencil },
]

export type CaptureFormState = {
  content: string
  title: string
  author: string
  url: string
  notes: string
  episode: string
  imagePreview: string | null
  audioBlob: Blob | null
  recordingSeconds: number
}

export const emptyFormState = (): CaptureFormState => ({
  content: '',
  title: '',
  author: '',
  url: '',
  notes: '',
  episode: '',
  imagePreview: null,
  audioBlob: null,
  recordingSeconds: 0,
})

export type MockConnection = {
  id: string
  text: string
  sourceType: string
}

export type CaptureConfirmation = {
  insight: string
  connections: MockConnection[]
  slug?: string
  title?: string
}
