import {
  IconBook,
  IconBrandLinkedin,
  IconBrandReddit,
  IconBrandX,
  IconBrandYoutube,
  IconMessages,
  IconMicrophone,
  IconNote,
  IconWriting,
} from '@tabler/icons-react'

const ICONS: Record<string, typeof IconBook> = {
  book: IconBook,
  youtube: IconBrandYoutube,
  podcast: IconMicrophone,
  voice_memo: IconMicrophone,
  tweet: IconBrandX,
  linkedin: IconBrandLinkedin,
  reddit: IconBrandReddit,
  note: IconNote,
  conversation: IconMessages,
  handwritten: IconWriting,
}

const LABELS: Record<string, string> = {
  book: 'BOOK',
  youtube: 'YOUTUBE',
  podcast: 'PODCAST',
  voice_memo: 'VOICE',
  voice: 'VOICE',
  tweet: 'TWEET',
  linkedin: 'LINKEDIN',
  reddit: 'REDDIT',
  note: 'NOTES',
  conversation: 'CONVERSATION',
  handwritten: 'NOTES',
}

/** GBrain list returns page type "concept"; real source lives in slug or detail metadata. */
export function resolveSourceType(
  slug: string,
  gbrainType?: string,
  metadataSourceType?: string,
): string {
  if (metadataSourceType) return metadataSourceType
  const parts = slug.split('/')
  if (parts.length >= 3 && parts[0] === 'captures') return parts[1]
  if (gbrainType && gbrainType !== 'concept') return gbrainType
  return 'note'
}

export function sourceLabel(type: string): string {
  const key = type.toLowerCase()
  return LABELS[key] ?? key.replace(/_/g, ' ').toUpperCase()
}

export default function SourceIcon({
  type,
  slug,
  metadataSourceType,
  size = 14,
  color = '#F5A623',
}: {
  type: string
  slug?: string
  metadataSourceType?: string
  size?: number
  color?: string
}) {
  const resolved = slug
    ? resolveSourceType(slug, type, metadataSourceType)
    : resolveSourceType('', type, metadataSourceType)
  const Icon = ICONS[resolved] ?? IconNote
  return <Icon size={size} stroke={1.5} color={color} />
}
