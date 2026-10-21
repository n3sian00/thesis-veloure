'use client'

import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { updateBusinessAction } from '@/app/actions/business'
import { routing } from '@/i18n/routing'

interface Props {
  business: {
    id: string
    name: string
    slug: string
    city: string | null
    cancellation_hours: number
    theme: string
    general_notes: string | null
    locale: string
  }
}

export default function BusinessSettingsForm({ business }: Props) {
  const [tulos, toiminto, lataa] = useActionState(updateBusinessAction, null)
  const t = useTranslations('Settings')
  const tCommon = useTranslations('Common')
  const tLang = useTranslations('LanguageNames')

  return (
    <form action={toiminto} className="space-y-6 max-w-lg">

      {/* Salongin nimi */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-chocolate mb-1">
          {t('name')}
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={business.name}
          className="w-full px-4 py-2.5 rounded-lg border border-card-border text-chocolate
                     focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent transition-shadow"
        />
      </div>

      {/* Kaupunki */}
      <div>
        <label htmlFor="city" className="block text-sm font-medium text-chocolate mb-1">
          {t('city')}
        </label>
        <input
          id="city"
          name="city"
          type="text"
          defaultValue={business.city ?? ''}
          placeholder={t('cityPlaceholder')}
          className="w-full px-4 py-2.5 rounded-lg border border-card-border text-chocolate placeholder-mocha
                     focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent transition-shadow"
        />
      </div>

      {/* URL-tunniste (vain näyttö, ei muokattavissa) */}
      <div>
        <label className="block text-sm font-medium text-chocolate mb-1">
          {t('slug')}
        </label>
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-card-border bg-cream">
          <span className="text-mocha text-sm">veloure.fi/</span>
          <span className="text-sm font-medium text-chocolate">{business.slug}</span>
        </div>
        <p className="text-xs text-mocha mt-1">{t('slugHint')}</p>
      </div>

      {/* Peruutusaika */}
      <div>
        <label htmlFor="cancellation_hours" className="block text-sm font-medium text-chocolate mb-1">
          {t('cancellationHours')}
        </label>
        <input
          id="cancellation_hours"
          name="cancellation_hours"
          type="number"
          min={0}
          max={168}
          required
          defaultValue={business.cancellation_hours}
          className="w-full px-4 py-2.5 rounded-lg border border-card-border text-chocolate
                     focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent transition-shadow"
        />
        <p className="text-xs text-mocha mt-1">
          {t('cancellationHint')}
        </p>
      </div>

      {/* Yleiset huomiot */}
      <div>
        <label htmlFor="general_notes" className="block text-sm font-medium text-chocolate mb-1">
          {t('generalNotes')} {tCommon('optional')}
        </label>
        <textarea
          id="general_notes"
          name="general_notes"
          rows={3}
          defaultValue={business.general_notes ?? ''}
          placeholder={t('generalNotesPlaceholder')}
          className="w-full px-4 py-2.5 rounded-lg border border-card-border text-chocolate placeholder-mocha resize-none
                     focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent transition-shadow"
        />
      </div>

      {/* Kieli */}
      <div>
        <label htmlFor="locale" className="block text-sm font-medium text-chocolate mb-1">
          {t('language')}
        </label>
        <select
          id="locale"
          name="locale"
          defaultValue={business.locale}
          className="w-full px-4 py-2.5 rounded-lg border border-card-border text-chocolate bg-white
                     focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent transition-shadow"
        >
          {routing.locales.map((loc) => (
            <option key={loc} value={loc}>{tLang(loc)}</option>
          ))}
        </select>
        <p className="text-xs text-mocha mt-1">{t('languageHint')}</p>
      </div>

      {/* Chat-teema piilotettu: ChatWidget ei vielä käytä teemaa. Arvo säilytetään
          piilokenttänä, ettei tallennus nollaa sitä. */}
      <input type="hidden" name="theme" value={business.theme} />

      {/* Palaute */}
      {tulos === null && !lataa ? null : tulos ? (
        <p className="text-sm text-red-700 bg-red-50 rounded-lg px-4 py-2.5">{tulos}</p>
      ) : null}

      <button
        type="submit"
        disabled={lataa}
        className="px-5 py-2.5 text-sm font-medium text-warm-white rounded-lg
                   bg-chocolate hover:bg-chocolate/85
                   focus:outline-none focus:ring-2 focus:ring-rose focus:ring-offset-2
                   disabled:opacity-60 disabled:cursor-not-allowed transition-all"
      >
        {lataa ? tCommon('saving') : t('submit')}
      </button>
    </form>
  )
}
