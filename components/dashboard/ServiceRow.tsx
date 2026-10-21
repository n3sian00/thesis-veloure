'use client'

import { useState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { deleteServiceAction, toggleServiceAction } from '@/app/actions/services'
import EditServiceModal from '@/components/dashboard/EditServiceModal'
import { toIntlLocale } from '@/lib/dates'
import type { Database } from '@/types/database'

type Service = Database['public']['Tables']['services']['Row']

// Muotoilee hinnan euroiksi
function formatPrice(price: number, locale: string) {
  return new Intl.NumberFormat(toIntlLocale(locale), {
    style: 'currency',
    currency: 'EUR',
  }).format(price)
}

interface Props {
  service: Service
  existingCategories: string[]
}

export default function ServiceRow({ service, existingCategories }: Props) {
  const [editOpen, setEditOpen] = useState(false)
  const [togglePending, startToggle] = useTransition()
  const [deletePending, startDelete] = useTransition()
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const t = useTranslations('ServiceRow')
  const tCommon = useTranslations('Common')
  const locale = useLocale()

  // Muotoilee minuutit luettavaan muotoon: 90 → "1 t 30 min" / "1 h 30 min"
  function formatDuration(minutes: number) {
    if (minutes < 60) return t('minutes', { m: minutes })
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? t('hoursMinutes', { h, m }) : t('hours', { h })
  }

  const isPending = togglePending || deletePending

  function handleToggle() {
    const fd = new FormData()
    fd.append('id', service.id)
    fd.append('active', String(service.active))
    startToggle(() => toggleServiceAction(fd))
  }

  function handleDelete() {
    if (!window.confirm(t('deleteConfirm', { name: service.name }))) return
    setDeleteError(null)
    const fd = new FormData()
    fd.append('id', service.id)
    startDelete(async () => {
      const virhe = await deleteServiceAction(fd)
      setDeleteError(virhe)
    })
  }

  return (
    <>
      {editOpen && (
        <EditServiceModal
          service={service}
          existingCategories={existingCategories}
          onClose={() => setEditOpen(false)}
        />
      )}

    <div
      className={`flex items-center justify-between px-5 py-4 ${
        !service.active ? 'bg-cream/50' : ''
      }`}
    >
      {/* Palvelun tiedot */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-chocolate truncate">{service.name}</p>
          {service.category && (
            <span className="shrink-0 px-2 py-0.5 text-[10px] font-medium rounded-full bg-baby text-rose-ink">
              {service.category}
            </span>
          )}
        </div>
        <p className="text-xs text-mocha mt-0.5">
          {formatDuration(service.duration_minutes)} &middot;{' '}
          {formatPrice(Number(service.price), locale)}
        </p>
        {service.description && (
          <p className="text-xs text-mocha mt-1 truncate">{service.description}</p>
        )}
      </div>

      {/* Toimintopainikkeet */}
      <div className="flex items-center gap-2 ml-4">

        {/* Muokkaa */}
        <button
          onClick={() => setEditOpen(true)}
          disabled={isPending}
          title={t('edit')}
          className="p-1.5 rounded-lg text-mocha hover:text-rose-ink hover:bg-baby transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>

        {/* Aktiivisuuden vaihto */}
        <button
          onClick={handleToggle}
          disabled={isPending}
          title={service.active ? t('hide') : t('activate')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            service.active
              ? 'bg-green-50 text-green-800 hover:bg-green-100'
              : 'bg-cream text-mocha hover:bg-baby'
          }`}
        >
          {togglePending
            ? tCommon('saving')
            : service.active
              ? t('active')
              : t('hidden')}
        </button>

        {/* Poisto */}
        <button
          onClick={handleDelete}
          disabled={isPending}
          title={t('delete')}
          className="p-1.5 rounded-lg text-mocha hover:text-red-800 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {deletePending ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          )}
        </button>
      </div>
    </div>

    {deleteError && (
      <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2 mx-5 mb-4">
        {deleteError}
      </p>
    )}
    </>
  )
}
