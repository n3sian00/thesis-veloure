'use client'

import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { registerAction } from '@/app/actions/auth'

export default function RegisterPage() {
  const t = useTranslations('Auth')
  const [virhe, toiminto, lataa] = useActionState(registerAction, null)

  return (
    <main className="min-h-screen bg-warm-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo / otsikko */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-semibold text-chocolate">
            Veloure
          </h1>
          <p className="text-mocha mt-2 text-sm">{t('registerSubtitle')}</p>
        </div>

        {/* Lomakekortti */}
        <div className="bg-white rounded-2xl border border-card-border shadow-xl shadow-rose/20 p-8">
          <h2 className="font-serif text-xl font-semibold text-chocolate mb-6">
            {t('registerTitle')}
          </h2>

          <form action={toiminto} className="space-y-5">

            {/* Salongin nimi */}
            <div>
              <label
                htmlFor="businessName"
                className="block text-sm font-medium text-chocolate mb-1"
              >
                {t('businessName')}
              </label>
              <input
                id="businessName"
                name="businessName"
                type="text"
                autoComplete="organization"
                required
                placeholder={t('businessNamePlaceholder')}
                className="w-full px-4 py-2.5 rounded-lg border border-card-border text-chocolate placeholder-mocha/50
                           focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent
                           transition-shadow"
              />
              <p className="text-xs text-mocha/70 mt-1">
                {t('slugHint')}{' '}
                <span className="text-rose-deep">veloure.fi/studio-lumiere</span>
              </p>
            </div>

            {/* Sähköposti */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-chocolate mb-1"
              >
                {t('email')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder={t('emailPlaceholder')}
                className="w-full px-4 py-2.5 rounded-lg border border-card-border text-chocolate placeholder-mocha/50
                           focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent
                           transition-shadow"
              />
            </div>

            {/* Salasana */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-chocolate mb-1"
              >
                {t('password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg border border-card-border text-chocolate placeholder-mocha/50
                           focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent
                           transition-shadow"
              />
              <p className="text-xs text-mocha/70 mt-1">{t('passwordHint')}</p>
            </div>

            {/* Virheilmoitus */}
            {virhe && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5">
                {virhe}
              </p>
            )}

            {/* Luo tili -nappi */}
            <button
              type="submit"
              disabled={lataa}
              className="w-full py-2.5 px-4 rounded-lg font-medium text-warm-white
                         bg-chocolate hover:bg-chocolate/85
                         focus:outline-none focus:ring-2 focus:ring-rose focus:ring-offset-2
                         disabled:opacity-60 disabled:cursor-not-allowed
                         transition-all"
            >
              {lataa ? t('creatingAccount') : t('createAccount')}
            </button>
          </form>

          {/* Kirjautumislinkki */}
          <p className="text-center text-sm text-mocha mt-6">
            {t('haveAccount')}{' '}
            <Link
              href="/login"
              className="text-rose-deep hover:text-chocolate font-medium transition-colors"
            >
              {t('login')}
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
