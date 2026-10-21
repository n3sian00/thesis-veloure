import { getTranslations } from 'next-intl/server'
import BreathingOrb from '../chat/BreathingOrb'

const VAKUUTUS_AVAIMET = ['language', 'questions', 'share'] as const
const PIKAVASTAUS_AVAIMET = ['timeWorks', 'showOtherTimes', 'priceQuestion'] as const

export default async function ConsultationShowcase() {
  const t = await getTranslations('ConsultationShowcase')

  return (
    <section className="py-14 md:py-16 px-6 bg-transparent">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-16 items-center">

        {/* --- Vasen: teksti --- */}
        <div>
          <div className="inline-flex items-center px-4 py-1.5 mb-6 rounded-full border border-rose-deep/40 bg-white/70 text-rose-ink text-xs font-medium tracking-widest uppercase">
            {t('badge')}
          </div>

          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold text-chocolate leading-[1.15] tracking-tight mb-5">
            {t('title')}
          </h2>

          <p className="text-mocha text-lg leading-relaxed max-w-md mb-8">
            {t('subtitle')}
          </p>

          <ul className="space-y-4">
            {VAKUUTUS_AVAIMET.map((avain) => (
              <li key={avain} className="flex items-start gap-3">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-rose-ink shrink-0" aria-hidden />
                <span className="text-chocolate">{t(`bullets.${avain}`)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* --- Oikea: mallikeskustelu (staattinen, ei toiminnallinen) --- */}
        <div className="w-full max-w-md mx-auto lg:mx-0 bg-white rounded-2xl border border-card-border shadow-xl shadow-rose/10 overflow-hidden">

          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-card-border">
            <BreathingOrb className="w-9 h-9 shrink-0" />
            <div className="min-w-0">
              <p className="font-serif font-semibold text-chocolate leading-tight truncate">
                {t('chatAssistantName')}
              </p>
              <p className="text-xs text-mocha mt-0.5">{t('chatResponseTime')}</p>
            </div>
          </div>

          {/* Viestit */}
          <div className="px-5 py-5 space-y-3">
            <div className="bg-cream text-chocolate rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed max-w-[85%]">
              {t('chatMessage1Prefix')}{' '}
              <em className="italic font-serif text-rose-ink">{t('chatMessage1Emphasis')}</em>.
            </div>

            <div className="bg-baby text-chocolate rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed max-w-[85%] ml-auto">
              {t('chatMessage2')}
            </div>

            <div className="bg-cream text-chocolate rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed max-w-[85%]">
              {t('chatMessage3Prefix')}{' '}
              <em className="italic font-serif text-rose-ink">{t('chatMessage3Emphasis')}</em>.
              {' '}{t('chatMessage3Suffix')}
            </div>

            {/* Kirjoitusindikaattori */}
            <div className="flex items-center gap-1.5 px-1" aria-hidden>
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="w-1.5 h-1.5 bg-rose-ink rounded-full animate-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>

            {/* Pikavastaukset */}
            <div className="flex flex-wrap gap-2 pt-1">
              {PIKAVASTAUS_AVAIMET.map((avain) => (
                <div
                  key={avain}
                  className="text-xs px-3 py-1.5 rounded-full border border-rose/40 text-rose-ink bg-baby/20"
                >
                  {t(`quickReplies.${avain}`)}
                </div>
              ))}
            </div>
          </div>

          {/* Syötealue (vain ulkoasu) */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-card-border">
            <div className="flex-1 px-3 py-2 text-sm rounded-xl border border-card-border text-mocha bg-white">
              {t('chatInputPlaceholder')}
            </div>
            <div
              className="flex-shrink-0 p-2.5 rounded-xl bg-chocolate text-warm-white"
              aria-hidden
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
