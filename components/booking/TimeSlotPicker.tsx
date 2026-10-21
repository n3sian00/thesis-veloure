'use client'

import { useState, useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { nextDaysHelsinki, formatDayHelsinki, formatTimeHelsinki } from '@/lib/dates'

interface SelectedSlot {
  starts_at: string
  ends_at: string
}

interface Props {
  businessId: string
  serviceId: string
  serviceName: string
  duration: number  // minuuteissa
  onSlotSelected: (slot: SelectedSlot) => void
}

export default function TimeSlotPicker({
  businessId,
  serviceId,
  serviceName,
  duration,
  onSlotSelected,
}: Props) {
  const locale = useLocale()
  const t = useTranslations('TimeSlotPicker')
  const tCommon = useTranslations('Common')

  // Päivät ovat nyt YYYY-MM-DD -merkkijonoja Helsingin ajassa
  const days = nextDaysHelsinki(7)
  const [selectedDay, setSelectedDay] = useState<string>(days[0])
  const [slots, setSlots] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [virhe, setVirhe] = useState<string | null>(null)

  // Jonotuslista-lomakkeen tila
  const [showWaitlist, setShowWaitlist] = useState(false)
  const [waitlistName, setWaitlistName] = useState('')
  const [waitlistEmail, setWaitlistEmail] = useState('')
  const [waitlistPending, setWaitlistPending] = useState(false)
  const [waitlistError, setWaitlistError] = useState<string | null>(null)
  const [waitlistDone, setWaitlistDone] = useState(false)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setVirhe(null)
    setSlots([])
    setShowWaitlist(false)

    // selectedDay on jo YYYY-MM-DD — ei enää UTC-leikkausongelmaa
    fetch(
      `/api/bookings?business_id=${businessId}&date=${selectedDay}&duration=${duration}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        // API on lokalisoimaton — näytetään käännetty yleisviesti
        if (data.error) setVirhe(t('fetchError'))
        else setSlots(data.slots ?? [])
      })
      .catch(() => { if (!cancelled) setVirhe(t('fetchError')) })
      .finally(() => { if (!cancelled) setIsLoading(false) })

    return () => { cancelled = true }
  }, [selectedDay, businessId, duration, t])

  function handleSlotClick(slotIso: string) {
    const start = new Date(slotIso)
    const end = new Date(start.getTime() + duration * 60 * 1000)
    onSlotSelected({ starts_at: start.toISOString(), ends_at: end.toISOString() })
  }

  async function handleWaitlistSubmit(e: React.FormEvent) {
    e.preventDefault()
    setWaitlistError(null)
    setWaitlistPending(true)

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          service_id: serviceId,
          customer_name: waitlistName,
          customer_email: waitlistEmail,
          locale,
        }),
      })
      if (!res.ok) {
        setWaitlistError(res.status === 409 ? t('alreadyOnWaitlist') : t('waitlistError'))
      } else {
        setWaitlistDone(true)
      }
    } catch {
      setWaitlistError(t('networkError'))
    } finally {
      setWaitlistPending(false)
    }
  }

  const noSlots = !isLoading && !virhe && slots.length === 0

  return (
    <div className="bg-baby rounded-xl p-4 border border-rose/30 ml-9">
      <p className="text-xs font-medium text-mocha uppercase tracking-wide mb-3">
        {t('title', { service: serviceName, duration })}
      </p>

      <div className="flex gap-1.5 flex-wrap mb-4">
        {days.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              day === selectedDay
                ? 'bg-rose-ink text-warm-white'
                : 'bg-white text-mocha border border-card-border hover:border-rose'
            }`}
          >
            {formatDayHelsinki(day, locale)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-xs text-mocha text-center py-3">{t('loading')}</p>
      ) : virhe ? (
        <p className="text-xs text-red-700 text-center py-3">{virhe}</p>
      ) : noSlots ? (
        <div className="space-y-3">
          <p className="text-xs text-mocha text-center py-1">
            {t('noSlots')}
          </p>

          {waitlistDone ? (
            <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2.5 text-center">
              <p className="text-xs font-medium text-green-800">
                {t('waitlistJoined')}
              </p>
              <p className="text-xs text-green-800 mt-0.5">
                {t('waitlistJoinedHint')}
              </p>
            </div>
          ) : !showWaitlist ? (
            <button
              onClick={() => setShowWaitlist(true)}
              className="w-full py-2 text-xs font-medium text-rose-ink border border-rose/40
                         rounded-lg hover:bg-rose/10 transition-colors"
            >
              {t('joinWaitlist')}
            </button>
          ) : (
            <form onSubmit={handleWaitlistSubmit} className="space-y-2">
              <p className="text-xs font-medium text-mocha">
                {t('waitlistIntro')}
              </p>
              <input
                type="text"
                required
                value={waitlistName}
                onChange={(e) => setWaitlistName(e.target.value)}
                placeholder={t('namePlaceholder')}
                className="w-full px-3 py-2 text-xs rounded-lg border border-card-border bg-white text-chocolate
                           placeholder-mocha focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent"
              />
              <input
                type="email"
                required
                value={waitlistEmail}
                onChange={(e) => setWaitlistEmail(e.target.value)}
                placeholder={t('emailPlaceholder')}
                className="w-full px-3 py-2 text-xs rounded-lg border border-card-border bg-white text-chocolate
                           placeholder-mocha focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent"
              />
              {waitlistError && (
                <p className="text-xs text-red-700 bg-red-50 rounded-lg px-2 py-1.5">{waitlistError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={waitlistPending}
                  className="flex-1 py-2 text-xs font-medium text-warm-white rounded-lg
                             bg-chocolate hover:bg-chocolate/85
                             disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {waitlistPending ? t('joining') : t('join')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowWaitlist(false)}
                  className="px-3 py-2 text-xs text-mocha hover:text-chocolate rounded-lg
                             hover:bg-white transition-colors"
                >
                  {tCommon('cancel')}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-1.5">
          {slots.map((slot) => (
            <button
              key={slot}
              onClick={() => handleSlotClick(slot)}
              className="py-2 rounded-lg text-xs font-medium bg-white border border-card-border
                         text-chocolate hover:bg-rose-ink hover:text-warm-white hover:border-rose-ink
                         transition-colors"
            >
              {formatTimeHelsinki(slot, locale)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
