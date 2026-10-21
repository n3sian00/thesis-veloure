import { useTranslations } from 'next-intl'

// Regex poistaa booking-triggerin näkyvästä tekstistä
const BOOKING_TRIGGER_REGEX = /\[VARAUS:\{.*?\}\]/gs

interface Props {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatMessage({ role, content }: Props) {
  const t = useTranslations('ChatWidget')
  // Poistetaan [VARAUS:{...}] tagit näytettävästä tekstistä
  const cleanContent = content.replace(BOOKING_TRIGGER_REGEX, '').trim()

  if (!cleanContent) return null

  const isUser = role === 'user'

  return (
    <div className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>

      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-medium ${
          isUser
            ? 'bg-baby text-chocolate'
            : 'bg-cream text-chocolate'
        }`}
      >
        {isUser ? t('userAvatar') : 'AI'}
      </div>

      {/* Viestikupla */}
      <div
        className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-baby text-chocolate rounded-br-sm'
            : 'bg-cream text-chocolate rounded-bl-sm'
        }`}
      >
        {cleanContent}
      </div>
    </div>
  )
}
