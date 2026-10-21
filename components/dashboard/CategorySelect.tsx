'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

// Erikoisarvo "+ Uusi kategoria" -vaihtoehdolle pudotusvalikossa
const UUSI_KATEGORIA = '__uusi__'

interface Props {
  existingCategories: string[]
  defaultValue?: string | null
  idPrefix: string
}

// Kategoriavalinta: pudotusvalikko olemassa olevista kategorioista + mahdollisuus
// lisätä uusi kategoria tekstikenttään (estää kirjoitusvirheistä johtuvat duplikaatit)
export default function CategorySelect({ existingCategories, defaultValue, idPrefix }: Props) {
  // Jos oletusarvo puuttuu listalta (esim. vanha data), lisätään se mukaan ettei valinta katoa
  const options =
    defaultValue && !existingCategories.includes(defaultValue)
      ? [...existingCategories, defaultValue].sort((a, b) => a.localeCompare(b, 'fi'))
      : existingCategories

  const [mode, setMode] = useState<'valitse' | 'uusi'>('valitse')
  const t = useTranslations('CategorySelect')
  const tCommon = useTranslations('Common')

  if (mode === 'uusi') {
    return (
      <div>
        <label htmlFor={`${idPrefix}-category-new`} className="block text-xs font-medium text-mocha mb-1">
          {t('label')}
        </label>
        <div className="flex gap-2">
          <input
            id={`${idPrefix}-category-new`}
            name="category"
            type="text"
            autoFocus
            placeholder={t('newPlaceholder')}
            className="w-full px-3 py-2 text-sm rounded-lg border border-card-border text-chocolate placeholder-mocha/50
                       focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent transition-shadow"
          />
          <button
            type="button"
            onClick={() => setMode('valitse')}
            className="shrink-0 px-3 py-2 text-xs text-mocha hover:text-chocolate rounded-lg hover:bg-cream transition-colors"
          >
            {tCommon('cancel')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <label htmlFor={`${idPrefix}-category-select`} className="block text-xs font-medium text-mocha mb-1">
        {t('label')} <span className="text-mocha/60">{tCommon('optional')}</span>
      </label>
      <select
        id={`${idPrefix}-category-select`}
        name="category"
        defaultValue={defaultValue ?? ''}
        onChange={(e) => {
          if (e.target.value === UUSI_KATEGORIA) setMode('uusi')
        }}
        className="w-full px-3 py-2 text-sm rounded-lg border border-card-border text-chocolate bg-white
                   focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent transition-shadow"
      >
        <option value="">{t('none')}</option>
        {options.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
        <option value={UUSI_KATEGORIA}>{t('new')}</option>
      </select>
    </div>
  )
}
