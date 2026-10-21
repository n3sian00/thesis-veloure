import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default async function Footer() {
  const t = await getTranslations('Footer')
  const tNav = await getTranslations('Navbar')
  const tAnchors = await getTranslations('Anchors')

  return (
    <footer className="border-t border-card-border bg-warm-white/70 px-6 py-8">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5 text-sm text-mocha">
        <div className="flex flex-col items-center sm:items-start gap-1">
          <Link href="/" className="font-serif text-lg font-semibold text-chocolate">
            Veloure
          </Link>
          <p className="text-xs">{t('copyright')}</p>
        </div>

        <nav className="flex items-center gap-6">
          <a href={`#${tAnchors('features')}`} className="hover:text-chocolate transition-colors">
            {tNav('features')}
          </a>
          {/* Yrittäjän kirjautuminen — ainoa kirjautumisreitti etusivulta */}
          <Link href="/login" className="hover:text-chocolate transition-colors">
            {t('login')}
          </Link>
          <LanguageSwitcher />
        </nav>
      </div>
    </footer>
  )
}
