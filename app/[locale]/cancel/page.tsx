import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyCancelToken } from '@/lib/tokens'
import { formatDateLongHelsinki, formatTimeHelsinki } from '@/lib/dates'
import { cancelCustomerBookingAction } from '@/app/actions/cancel-customer'

export default async function CancelPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; token?: string; cancelled?: string }>
}) {
  const { id: bookingId, token, cancelled } = await searchParams

  if (!bookingId || !token) notFound()

  const valid = await verifyCancelToken(bookingId, token)
  if (!valid) notFound()

  const t = await getTranslations('CancelPage')
  const tCommon = await getTranslations('Common')
  const locale = await getLocale()

  if (cancelled === '1') {
    return (
      <main className="min-h-screen bg-warm-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-card-border shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-chocolate mb-2">{t('cancelledTitle')}</p>
          <p className="text-sm text-mocha">{t('cancelledBody')}</p>
        </div>
      </main>
    )
  }

  const supabase = createAdminClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      id, customer_name, starts_at, status,
      services ( name ),
      businesses ( name, cancellation_hours )
    `)
    .eq('id', bookingId)
    .single()

  if (!booking) notFound()

  const serviceName = Array.isArray(booking.services)
    ? (booking.services[0]?.name ?? tCommon('serviceFallback'))
    : ((booking.services as { name: string } | null)?.name ?? tCommon('serviceFallback'))

  const businessInfo = Array.isArray(booking.businesses)
    ? booking.businesses[0]
    : (booking.businesses as { name: string; cancellation_hours: number } | null)

  const businessName       = businessInfo?.name ?? t('businessFallback')
  const cancellationHours  = businessInfo?.cancellation_hours ?? 24

  const startsAt   = new Date(booking.starts_at)
  const hoursUntil = (startsAt.getTime() - Date.now()) / 3_600_000
  const canCancel  = booking.status === 'confirmed' && hoursUntil >= cancellationHours

  const dateLabel = formatDateLongHelsinki(booking.starts_at, locale)
  const timeLabel = formatTimeHelsinki(booking.starts_at, locale)

  if (booking.status === 'cancelled') {
    return (
      <main className="min-h-screen bg-warm-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-card-border shadow-sm p-8 max-w-md w-full text-center">
          <p className="text-lg font-semibold text-chocolate mb-2">{t('alreadyCancelledTitle')}</p>
          <p className="text-sm text-mocha">{t('alreadyCancelledBody')}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-warm-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-card-border shadow-sm p-8 max-w-md w-full">
        <h1 className="font-serif text-xl font-semibold text-chocolate mb-1">{t('title')}</h1>
        <p className="text-sm text-mocha mb-6">{businessName}</p>

        <div className="bg-cream rounded-xl p-4 mb-6 space-y-1">
          <p className="text-sm font-medium text-chocolate">{serviceName}</p>
          <p className="text-sm text-mocha">{t('dateTime', { date: dateLabel, time: timeLabel })}</p>
          <p className="text-xs text-mocha">{booking.customer_name}</p>
        </div>

        {canCancel ? (
          <>
            <form action={cancelCustomerBookingAction}>
              <input type="hidden" name="booking_id" value={bookingId} />
              <input type="hidden" name="token"      value={token} />
              <button
                type="submit"
                className="w-full py-2.5 text-sm font-medium text-white rounded-xl
                           bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2
                           focus:ring-red-300 transition-colors"
              >
                {t('submit')}
              </button>
            </form>
            <p className="text-xs text-mocha text-center mt-3">
              {t('policy', { hours: cancellationHours })}
            </p>
          </>
        ) : (
          <div className="text-center space-y-1">
            <p className="text-sm text-chocolate">{t('tooLateTitle')}</p>
            <p className="text-xs text-mocha">
              {t('tooLateBody', { hours: cancellationHours, businessName })}
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
