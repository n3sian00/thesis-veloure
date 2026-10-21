'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { updateServiceAction } from '@/app/actions/services'
import CategorySelect from '@/components/dashboard/CategorySelect'
import type { Database } from '@/types/database'

type Service = Database['public']['Tables']['services']['Row']

interface Props {
  service: Service
  existingCategories: string[]
  onClose: () => void
}

export default function EditServiceModal({ service, existingCategories, onClose }: Props) {
  const [virhe, toiminto, lataa] = useActionState(updateServiceAction, null)
  const prevLataa = useRef(false)
  const t = useTranslations('ServiceForm')
  const tCommon = useTranslations('Common')

  // Suljetaan modaali kun toiminto valmistuu ilman virhettä
  useEffect(() => {
    if (prevLataa.current && !lataa && virhe === null) {
      onClose()
    }
    prevLataa.current = lataa
  }, [lataa, virhe, onClose])

  // Suljetaan Escape-näppäimellä
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    /* Taustaoverlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">

        {/* Otsikkorivi */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-base font-semibold text-chocolate">{t('editTitle')}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-mocha hover:text-chocolate hover:bg-cream transition-colors"
            aria-label={tCommon('close')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form action={toiminto} className="space-y-4">
          {/* Piilotettu ID */}
          <input type="hidden" name="id" value={service.id} />

          {/* Nimi */}
          <div>
            <label htmlFor="edit-name" className="block text-xs font-medium text-mocha mb-1">
              {t('name')}
            </label>
            <input
              id="edit-name"
              name="name"
              type="text"
              required
              defaultValue={service.name}
              className="w-full px-3 py-2 text-sm rounded-lg border border-card-border text-chocolate
                         focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent transition-shadow"
            />
          </div>

          {/* Kategoria */}
          <CategorySelect
            existingCategories={existingCategories}
            defaultValue={service.category}
            idPrefix="edit"
          />

          {/* Huomiot */}
          <div>
            <label htmlFor="edit-description" className="block text-xs font-medium text-mocha mb-1">
              {t('notes')} <span className="text-mocha font-normal">{tCommon('optional')}</span>
            </label>
            <textarea
              id="edit-description"
              name="description"
              rows={2}
              defaultValue={service.description ?? ''}
              placeholder={t('notesPlaceholder')}
              className="w-full px-3 py-2 text-sm rounded-lg border border-card-border text-chocolate placeholder-mocha resize-none
                         focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent transition-shadow"
            />
          </div>

          {/* Kesto ja hinta rinnakkain */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-duration" className="block text-xs font-medium text-mocha mb-1">
                {t('duration')}
              </label>
              <input
                id="edit-duration"
                name="duration_minutes"
                type="number"
                required
                min={5}
                step={5}
                defaultValue={service.duration_minutes}
                className="w-full px-3 py-2 text-sm rounded-lg border border-card-border text-chocolate
                           focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent transition-shadow"
              />
            </div>
            <div>
              <label htmlFor="edit-price" className="block text-xs font-medium text-mocha mb-1">
                {t('price')}
              </label>
              <input
                id="edit-price"
                name="price"
                type="number"
                required
                min={0}
                step={0.5}
                defaultValue={Number(service.price)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-card-border text-chocolate
                           focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent transition-shadow"
              />
            </div>
          </div>

          {/* Virheilmoitus */}
          {virhe && (
            <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">
              {virhe}
            </p>
          )}

          {/* Toimintopainikkeet */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={lataa}
              className="flex-1 px-4 py-2 text-sm font-medium text-mocha rounded-lg border border-card-border
                         hover:bg-cream transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {tCommon('cancel')}
            </button>
            <button
              type="submit"
              disabled={lataa}
              className="flex-1 px-4 py-2 text-sm font-medium text-warm-white rounded-lg
                         bg-chocolate hover:bg-chocolate/85
                         focus:outline-none focus:ring-2 focus:ring-rose focus:ring-offset-2
                         disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {lataa ? tCommon('saving') : tCommon('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
