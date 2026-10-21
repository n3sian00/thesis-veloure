import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

export default async function Hero() {
  const t = await getTranslations('Hero')
  const tAnchors = await getTranslations('Anchors')

  return (
    <section className="relative pt-20 pb-8 md:pt-24 md:pb-10 px-6 text-center overflow-hidden bg-transparent">
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-baby/30 blur-3xl" />
      </div>

      <div className="relative max-w-3xl mx-auto">
        {/* Badge — sama ulkoasu kuin painikkeilla (ruskea tausta, vaalea teksti), mutta ei linkki */}
        <p className="inline-flex items-center px-5 py-2 mb-8 rounded-full bg-chocolate text-warm-white text-sm font-medium">
          {t('badge')}
        </p>

        <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-semibold text-chocolate leading-[1.1] tracking-tight mb-6">
          {t('title')}{' '}
          <br className="hidden sm:block" />
          <em className="italic text-rose-ink">{t('titleAccent')}</em>
        </h1>

        <p className="text-lg md:text-xl text-mocha leading-relaxed max-w-2xl mx-auto mb-10">
          {t('subtitle')}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-3.5 text-sm font-medium text-warm-white bg-chocolate rounded-full hover:bg-chocolate/85 transition-colors shadow-sm"
          >
            {t('ctaPrimary')}
          </Link>
          {/* Sivunsisäinen ankkurilinkki — tunniste tulee käännöksistä, jotta URL vastaa kieltä */}
          <a
            href={`#${tAnchors('howItWorks')}`}
            className="w-full sm:w-auto px-8 py-3.5 text-sm font-medium text-chocolate border border-chocolate/20 rounded-full hover:border-chocolate/40 hover:bg-chocolate/5 transition-colors"
          >
            {t('ctaSecondary')}
          </a>
        </div>
      </div>
    </section>
  )
}
