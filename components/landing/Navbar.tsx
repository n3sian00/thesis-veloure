import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default async function Navbar() {
  const t = await getTranslations('Navbar')
  const tAnchors = await getTranslations('Anchors')

  return (
    <header className="sticky top-0 z-50 bg-warm-white/90 backdrop-blur-sm border-b border-card-border">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="font-serif text-xl font-semibold text-chocolate tracking-wide shrink-0"
        >
          Veloure
        </Link>

        <div className="flex items-center gap-3 sm:gap-6 shrink-0">
          {/* Sivunsisäinen ankkuri — tunniste tulee käännöksistä, jotta URL vastaa kieltä */}
          <a
            href={`#${tAnchors('features')}`}
            className="hidden sm:inline text-sm text-mocha hover:text-chocolate transition-colors"
          >
            {t('features')}
          </a>
          <LanguageSwitcher />
          <Link
            href="/register"
            className="px-5 py-2 text-sm font-medium text-warm-white bg-chocolate rounded-full hover:bg-chocolate/85 transition-colors whitespace-nowrap"
          >
            {t('cta')}
          </Link>
        </div>
      </div>
    </header>
  )
}
