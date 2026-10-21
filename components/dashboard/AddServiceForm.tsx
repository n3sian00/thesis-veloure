'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { createServiceAction } from '@/app/actions/services'
import CategorySelect from '@/components/dashboard/CategorySelect'

interface Props {
  existingCategories: string[]
}

export default function AddServiceForm({ existingCategories }: Props) {
  const [virhe, toiminto, lataa] = useActionState(createServiceAction, null)
  const formRef = useRef<HTMLFormElement>(null)
  const t = useTranslations('ServiceForm')
  const tCommon = useTranslations('Common')

  // Tyhjennetään lomake onnistuneen lisäyksen jälkeen
  useEffect(() => {
    if (virhe === null && !lataa) {
      formRef.current?.reset()
    }
  }, [virhe, lataa])

  return (
    <form
      ref={formRef}
      action={toiminto}
      className="bg-white rounded-xl border border-card-border shadow-sm p-5"
    >
      <h3 className="text-sm font-medium text-chocolate mb-4">{t('addTitle')}</h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

        {/* Palvelun nimi */}
        <div className="sm:col-span-1">
          <label htmlFor="name" className="block text-xs font-medium text-mocha mb-1">
            {t('name')}
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder={t('namePlaceholder')}
            className="w-full px-3 py-2 text-sm rounded-lg border border-card-border text-chocolate placeholder-mocha/50
                       focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent transition-shadow"
          />
        </div>

        {/* Kesto */}
        <div>
          <label htmlFor="duration_minutes" className="block text-xs font-medium text-mocha mb-1">
            {t('duration')}
          </label>
          <input
            id="duration_minutes"
            name="duration_minutes"
            type="number"
            required
            min={5}
            step={5}
            placeholder="60"
            className="w-full px-3 py-2 text-sm rounded-lg border border-card-border text-chocolate placeholder-mocha/50
                       focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent transition-shadow"
          />
        </div>

        {/* Hinta */}
        <div>
          <label htmlFor="price" className="block text-xs font-medium text-mocha mb-1">
            {t('price')}
          </label>
          <input
            id="price"
            name="price"
            type="number"
            required
            min={0}
            step={0.5}
            placeholder="45"
            className="w-full px-3 py-2 text-sm rounded-lg border border-card-border text-chocolate placeholder-mocha/50
                       focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent transition-shadow"
          />
        </div>
      </div>

      {/* Kategoria */}
      <div className="mt-3">
        <CategorySelect existingCategories={existingCategories} idPrefix="add" />
      </div>

      {/* Huomiot */}
      <div className="mt-3">
        <label htmlFor="description" className="block text-xs font-medium text-mocha mb-1">
          {t('notes')} {tCommon('optional')}
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          placeholder={t('notesPlaceholder')}
          className="w-full px-3 py-2 text-sm rounded-lg border border-card-border text-chocolate placeholder-mocha/50 resize-none
                     focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent transition-shadow"
        />
      </div>

      {/* Virheilmoitus */}
      {virhe && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">
          {virhe}
        </p>
      )}

      <button
        type="submit"
        disabled={lataa}
        className="mt-4 px-4 py-2 text-sm font-medium text-warm-white rounded-lg
                   bg-chocolate hover:bg-chocolate/85
                   focus:outline-none focus:ring-2 focus:ring-rose focus:ring-offset-2
                   disabled:opacity-60 disabled:cursor-not-allowed transition-all"
      >
        {lataa ? t('adding') : t('add')}
      </button>
    </form>
  )
}
