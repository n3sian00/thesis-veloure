import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

export default async function CTABanner() {
  const t = await getTranslations('CTABanner')

  return (
    <section className="py-12 md:py-16 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="rounded-3xl border border-card-border bg-gradient-to-r from-warm-white/90 to-cream/90 shadow-sm px-6 py-8 md:px-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-chocolate mb-1">
              {t('title')}
            </h2>
            <p className="text-mocha">
              {t('subtitle')}
            </p>
          </div>
          <Link
            href="/register"
            className="shrink-0 px-8 py-3.5 text-sm font-medium text-warm-white bg-chocolate rounded-full hover:bg-chocolate/85 transition-colors shadow-sm whitespace-nowrap"
          >
            {t('cta')}
          </Link>
        </div>
      </div>
    </section>
  )
}
