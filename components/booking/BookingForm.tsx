'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { formatDateTimeHelsinki } from '@/lib/dates'

interface Props {
  businessId: string
  serviceId: string
  serviceName: string
  startsAt: string  // ISO-string
  endsAt: string    // ISO-string
  onSuccess: () => void
}

export default function BookingForm({
  businessId,
  serviceId,
  serviceName,
  startsAt,
  endsAt,
  onSuccess,
}: Props) {
  const locale = useLocale()
  const t = useTranslations('BookingForm')
  const tCommon = useTranslations('Common')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [virhe, setVirhe] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setVirhe(null)
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          service_id: serviceId,
          customer_name: name,
          customer_email: email,
          customer_phone: phone || undefined,
          customer_notes: notes || undefined,
          starts_at: startsAt,
          locale,
        }),
      })

      // API on lokalisoimaton, joten virheteksti valitaan tilakoodin perusteella
      if (!res.ok) {
        setVirhe(
          res.status === 409
            ? t('errorSlotTaken')
            : res.status === 404
              ? t('errorServiceNotFound')
              : t('errorGeneric')
        )
        return
      }

      onSuccess()
    } catch {
      setVirhe(t('errorNetwork'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-cream rounded-xl p-4 border border-card-border ml-9">
      {/* Yhteenveto valitusta ajasta */}
      <div className="mb-4">
        <p className="text-xs font-medium text-mocha uppercase tracking-wide mb-1">
          {t('bookingDetails')}
        </p>
        <p className="text-sm font-semibold text-chocolate">{serviceName}</p>
        <p className="text-xs text-mocha mt-0.5">{formatDateTimeHelsinki(startsAt, 'long', locale)}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Nimi */}
        <div>
          <label htmlFor="bf-name" className="block text-xs font-medium text-mocha mb-1">
            {t('name')}
          </label>
          <input
            id="bf-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('namePlaceholder')}
            className="w-full px-3 py-2 text-sm rounded-lg border border-card-border bg-white text-chocolate placeholder-mocha/50
                       focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent"
          />
        </div>

        {/* Sähköposti */}
        <div>
          <label htmlFor="bf-email" className="block text-xs font-medium text-mocha mb-1">
            {t('email')}
          </label>
          <input
            id="bf-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('emailPlaceholder')}
            className="w-full px-3 py-2 text-sm rounded-lg border border-card-border bg-white text-chocolate placeholder-mocha/50
                       focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent"
          />
        </div>

        {/* Puhelinnumero */}
        <div>
          <label htmlFor="bf-phone" className="block text-xs font-medium text-mocha mb-1">
            {t('phone')} <span className="text-mocha/60">{tCommon('optional')}</span>
          </label>
          <input
            id="bf-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+358 40 123 4567"
            className="w-full px-3 py-2 text-sm rounded-lg border border-card-border bg-white text-chocolate placeholder-mocha/50
                       focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent"
          />
        </div>

        {/* Lisätiedot */}
        <div>
          <label htmlFor="bf-notes" className="block text-xs font-medium text-mocha mb-1">
            {t('notes')} <span className="text-mocha/60">{tCommon('optional')}</span>
          </label>
          <textarea
            id="bf-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('notesPlaceholder')}
            className="w-full px-3 py-2 text-sm rounded-lg border border-card-border bg-white text-chocolate placeholder-mocha/50 resize-none
                       focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent"
          />
        </div>

        {/* Virheilmoitus */}
        {virhe && (
          <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{virhe}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2 text-sm font-medium text-warm-white rounded-lg
                     bg-chocolate hover:bg-chocolate/85
                     focus:outline-none focus:ring-2 focus:ring-rose
                     disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          {isSubmitting ? t('submitting') : t('submit')}
        </button>
      </form>
    </div>
  )
}
