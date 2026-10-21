'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { rescheduleBookingAction, updateBookingDetailsAction } from '@/app/actions/bookings'
import TimeSlotPicker from '@/components/booking/TimeSlotPicker'
import { formatDateTimeHelsinki } from '@/lib/dates'

interface Props {
  bookingId: string
  businessId: string
  serviceId: string
  serviceName: string
  durationMinutes: number
  startsAt: string
  customerName: string
  customerEmail: string
  customerPhone: string | null
  customerNotes: string | null
}

// "Siirrä"- ja "Muokkaa"-painikkeet varausriville, avaavat omat modaalinsa
export default function BookingActions({
  bookingId,
  businessId,
  serviceId,
  serviceName,
  durationMinutes,
  startsAt,
  customerName,
  customerEmail,
  customerPhone,
  customerNotes,
}: Props) {
  const [modal, setModal] = useState<'none' | 'reschedule' | 'edit'>('none')
  const t = useTranslations('BookingActions')

  return (
    <>
      <button
        type="button"
        onClick={() => setModal('reschedule')}
        className="text-xs text-mocha hover:text-rose-ink hover:bg-baby
                   px-2.5 py-1 rounded-lg transition-colors border border-card-border
                   hover:border-rose/40 whitespace-nowrap"
      >
        {t('reschedule')}
      </button>
      <button
        type="button"
        onClick={() => setModal('edit')}
        className="text-xs text-mocha hover:text-rose-ink hover:bg-baby
                   px-2.5 py-1 rounded-lg transition-colors border border-card-border
                   hover:border-rose/40 whitespace-nowrap"
      >
        {t('edit')}
      </button>

      {modal === 'reschedule' && (
        <RescheduleModal
          bookingId={bookingId}
          businessId={businessId}
          serviceId={serviceId}
          serviceName={serviceName}
          durationMinutes={durationMinutes}
          currentStartsAt={startsAt}
          onClose={() => setModal('none')}
        />
      )}

      {modal === 'edit' && (
        <EditBookingModal
          bookingId={bookingId}
          customerName={customerName}
          customerEmail={customerEmail}
          customerPhone={customerPhone}
          customerNotes={customerNotes}
          onClose={() => setModal('none')}
        />
      )}
    </>
  )
}

// --- Siirtomodaali ---

function RescheduleModal({
  bookingId,
  businessId,
  serviceId,
  serviceName,
  durationMinutes,
  currentStartsAt,
  onClose,
}: {
  bookingId: string
  businessId: string
  serviceId: string
  serviceName: string
  durationMinutes: number
  currentStartsAt: string
  onClose: () => void
}) {
  const [selectedSlot, setSelectedSlot] = useState<{ starts_at: string; ends_at: string } | null>(null)
  const [virhe, toiminto, lataa] = useActionState(rescheduleBookingAction, null)
  const prevLataa = useRef(false)
  const t = useTranslations('BookingActions')
  const tCommon = useTranslations('Common')
  const locale = useLocale()

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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">

        {/* Otsikkorivi */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-base font-semibold text-chocolate">{t('rescheduleTitle')}</h2>
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

        <p className="text-xs text-mocha mb-4">
          {t('currentTime')}{' '}
          <span className="font-medium text-chocolate">
            {formatDateTimeHelsinki(currentStartsAt, 'long', locale)}
          </span>
        </p>

        {!selectedSlot ? (
          /* Vaihe 1: uuden ajan valinta */
          <TimeSlotPicker
            businessId={businessId}
            serviceId={serviceId}
            serviceName={serviceName}
            duration={durationMinutes}
            onSlotSelected={(slot) => setSelectedSlot(slot)}
          />
        ) : (
          /* Vaihe 2: vahvistus */
          <form action={toiminto} className="space-y-4">
            <input type="hidden" name="booking_id" value={bookingId} />
            <input type="hidden" name="starts_at" value={selectedSlot.starts_at} />

            <div className="bg-cream rounded-xl px-4 py-3 border border-card-border">
              <p className="text-xs font-medium text-mocha uppercase tracking-wide mb-1">
                {t('newTime')}
              </p>
              <p className="text-sm font-semibold text-chocolate">
                {formatDateTimeHelsinki(selectedSlot.starts_at, 'long', locale)}
              </p>
            </div>

            {virhe && (
              <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{virhe}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSelectedSlot(null)}
                disabled={lataa}
                className="flex-1 px-4 py-2 text-sm font-medium text-mocha rounded-lg border border-card-border
                           hover:bg-cream transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('chooseAnother')}
              </button>
              <button
                type="submit"
                disabled={lataa}
                className="flex-1 px-4 py-2 text-sm font-medium text-warm-white rounded-lg
                           bg-chocolate hover:bg-chocolate/85
                           focus:outline-none focus:ring-2 focus:ring-rose focus:ring-offset-2
                           disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {lataa ? t('rescheduling') : t('confirmReschedule')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// --- Muokkausmodaali ---

function EditBookingModal({
  bookingId,
  customerName,
  customerEmail,
  customerPhone,
  customerNotes,
  onClose,
}: {
  bookingId: string
  customerName: string
  customerEmail: string
  customerPhone: string | null
  customerNotes: string | null
  onClose: () => void
}) {
  const [virhe, toiminto, lataa] = useActionState(updateBookingDetailsAction, null)
  const prevLataa = useRef(false)
  const t = useTranslations('BookingActions')
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
          <input type="hidden" name="booking_id" value={bookingId} />

          {/* Nimi */}
          <div>
            <label htmlFor="booking-name" className="block text-xs font-medium text-mocha mb-1">
              {t('name')}
            </label>
            <input
              id="booking-name"
              name="customer_name"
              type="text"
              required
              defaultValue={customerName}
              className="w-full px-3 py-2 text-sm rounded-lg border border-card-border text-chocolate
                         focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent transition-shadow"
            />
          </div>

          {/* Sähköposti */}
          <div>
            <label htmlFor="booking-email" className="block text-xs font-medium text-mocha mb-1">
              {t('email')}
            </label>
            <input
              id="booking-email"
              name="customer_email"
              type="email"
              required
              defaultValue={customerEmail}
              className="w-full px-3 py-2 text-sm rounded-lg border border-card-border text-chocolate
                         focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent transition-shadow"
            />
          </div>

          {/* Puhelinnumero */}
          <div>
            <label htmlFor="booking-phone" className="block text-xs font-medium text-mocha mb-1">
              {t('phone')} <span className="text-mocha font-normal">{tCommon('optional')}</span>
            </label>
            <input
              id="booking-phone"
              name="customer_phone"
              type="tel"
              defaultValue={customerPhone ?? ''}
              className="w-full px-3 py-2 text-sm rounded-lg border border-card-border text-chocolate
                         focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent transition-shadow"
            />
          </div>

          {/* Lisätiedot */}
          <div>
            <label htmlFor="booking-notes" className="block text-xs font-medium text-mocha mb-1">
              {t('notes')} <span className="text-mocha font-normal">{tCommon('optional')}</span>
            </label>
            <textarea
              id="booking-notes"
              name="customer_notes"
              rows={2}
              defaultValue={customerNotes ?? ''}
              className="w-full px-3 py-2 text-sm rounded-lg border border-card-border text-chocolate resize-none
                         focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent transition-shadow"
            />
          </div>

          {/* Virheilmoitus */}
          {virhe && (
            <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{virhe}</p>
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
