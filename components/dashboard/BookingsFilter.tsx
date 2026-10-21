'use client'

import { useSearchParams } from 'next/navigation'
import { useRouter, usePathname } from '@/i18n/navigation'
import { useCallback, useTransition } from 'react'
import { useTranslations } from 'next-intl'

export default function BookingsFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const t = useTranslations('BookingsFilter')
  const tStatus = useTranslations('BookingStatus')

  const q = searchParams.get('q') ?? ''
  const status = searchParams.get('status') ?? ''

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`)
      })
    },
    [router, pathname, searchParams]
  )

  const hasFilters = q || status

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Tekstihaku */}
      <div className="relative flex-1 min-w-48">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mocha pointer-events-none"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          value={q}
          onChange={(e) => update('q', e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-card-border bg-white text-chocolate
                     placeholder-mocha focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent"
        />
      </div>

      {/* Tilasuodatin */}
      <select
        value={status}
        onChange={(e) => update('status', e.target.value)}
        className="px-3 py-2 text-sm rounded-lg border border-card-border bg-white text-chocolate
                   focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent"
      >
        <option value="">{tStatus('all')}</option>
        <option value="confirmed">{tStatus('confirmed')}</option>
        <option value="cancelled">{tStatus('cancelled')}</option>
        {/* "Toteutunut" piilotettu: mikään ei vielä aseta varausta completed-tilaan */}
      </select>

      {/* Tyhjennä-nappi */}
      {hasFilters && (
        <button
          onClick={() => {
            startTransition(() => router.replace(pathname))
          }}
          disabled={isPending}
          className="px-3 py-2 text-sm text-mocha hover:text-chocolate hover:bg-cream
                     rounded-lg transition-colors disabled:opacity-50"
        >
          {t('clear')}
        </button>
      )}

      {isPending && (
        <span className="text-xs text-mocha">{t('searching')}</span>
      )}
    </div>
  )
}
