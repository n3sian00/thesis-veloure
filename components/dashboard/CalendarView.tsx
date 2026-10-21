'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { addSlotAction, deleteSlotAction, blockSlotAction, unblockSlotAction } from '@/app/actions/slots'
import { toDateStrHelsinki, todayHelsinki, formatTimeHelsinki, toIntlLocale } from '@/lib/dates'

// --- Tyypit ---

type SlotWindow = {
  id: string
  start_time: string  // HH:MM
  end_time: string    // HH:MM
  has_bookings: boolean
}

type DayBooking = {
  id: string
  starts_at: string
  ends_at: string
  customer_name: string
  service_name: string
}

type BlockedSlot = {
  id: string
  slot_time: string  // HH:MM
}

type DayDetail = {
  windows: SlotWindow[]
  bookings: DayBooking[]
  blocked: BlockedSlot[]
}

// --- Apufunktiot ---

// Palauttaa kuukauden päivät ma-ensin, null = täyttöpäivä
function getMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  // JS getDay(): 0=su → muunnetaan: 0=ma, 6=su
  const startPad = (first.getDay() + 6) % 7
  const grid: (Date | null)[] = Array(startPad).fill(null)
  for (let d = 1; d <= last.getDate(); d++) grid.push(new Date(year, month, d))
  while (grid.length % 7 !== 0) grid.push(null)
  return grid
}

// Muunnetaan ruudukko-Date Helsingin päivämääräksi (ei enää UTC-leikkaus)
function toDateStr(date: Date): string {
  return toDateStrHelsinki(date)
}

function toMonthStr(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

function formatDayHeading(dateStr: string, locale: string): string {
  return new Date(dateStr + 'T12:00:00Z').toLocaleDateString(toIntlLocale(locale), {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'UTC',
  })
}

// Varausten kellonajat näytetään aina Suomen ajassa (ei selaimen paikallisessa ajassa)
const formatBookingTime = formatTimeHelsinki

// Kuukauden nimi + vuosi kielen mukaan: "lokakuu 2026" / "October 2026"
function formatMonthHeading(year: number, month: number, locale: string): string {
  return new Date(Date.UTC(year, month, 1)).toLocaleDateString(toIntlLocale(locale), {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}

// Viikonpäivien lyhyet nimet maanantaista alkaen: "ma"… / "Mon"…
// 2024-01-01 oli maanantai, joten sitä käytetään ankkurina.
function getDayNames(locale: string): string[] {
  return Array.from({ length: 7 }, (_, i) =>
    new Date(Date.UTC(2024, 0, 1 + i)).toLocaleDateString(toIntlLocale(locale), {
      weekday: 'short', timeZone: 'UTC',
    })
  )
}

// --- Komponentti ---

interface Props {
  businessId: string
}

export default function CalendarView({ businessId: _businessId }: Props) {
  const t = useTranslations('Calendar')
  const tCommon = useTranslations('Common')
  const locale = useLocale()
  // Käytetään Helsingin aikaa — new Date() + toISOString() antaisi UTC-päivän
  const todayStr = todayHelsinki()
  const todayDate = new Date(todayStr + 'T12:00:00Z') // puolipäivä UTC ankkurina
  const [year, setYear] = useState(todayDate.getUTCFullYear())
  const [month, setMonth] = useState(todayDate.getUTCMonth())
  const [slotDates, setSlotDates] = useState<Set<string>>(new Set())
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dayDetail, setDayDetail] = useState<DayDetail | null>(null)
  const [isLoadingDay, setIsLoadingDay] = useState(false)

  // Lisää-lomakkeen tila
  const [addStart, setAddStart] = useState('09:00')
  const [addEnd, setAddEnd] = useState('17:00')
  const [addError, setAddError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Blokkaus-lomakkeen tila
  const [blockTime, setBlockTime] = useState('09:00')
  const [blockError, setBlockError] = useState<string | null>(null)
  const [unblockError, setUnblockError] = useState<string | null>(null)

  // Haetaan kuukauden slot-päivät vihreälle pisteelle ja blokatut päivät oranssille pisteelle
  const fetchMonthData = useCallback(async () => {
    const res = await fetch(`/api/slots?month=${toMonthStr(year, month)}`)
    if (!res.ok) return
    const data = await res.json()
    setSlotDates(new Set(data.dates ?? []))
    setBlockedDates(new Set(data.blockedDates ?? []))
  }, [year, month])

  useEffect(() => { fetchMonthData() }, [fetchMonthData])

  // Haetaan valitun päivän ikkunat ja varaukset
  const fetchDayDetail = useCallback(async (date: string) => {
    setIsLoadingDay(true)
    setDayDetail(null)
    const res = await fetch(`/api/slots?date=${date}`)
    if (res.ok) setDayDetail(await res.json())
    setIsLoadingDay(false)
  }, [])

  useEffect(() => {
    if (selectedDate) fetchDayDetail(selectedDate)
  }, [selectedDate, fetchDayDetail])

  // Kuukauden vaihto
  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    setSelectedDate(null)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    setSelectedDate(null)
  }

  // Päivää klikatessa
  function handleDayClick(date: Date) {
    const str = toDateStr(date)
    setSelectedDate(prev => prev === str ? null : str)
    setAddError(null)
    setDeleteError(null)
    setBlockError(null)
    setUnblockError(null)
  }

  // Lisää aikaikkuna
  function handleAdd() {
    if (!selectedDate) return
    setAddError(null)
    startTransition(async () => {
      const err = await addSlotAction({
        date: selectedDate,
        start_time: addStart,
        end_time: addEnd,
      })
      if (err) {
        setAddError(err)
      } else {
        setAddStart('09:00')
        setAddEnd('17:00')
        await fetchDayDetail(selectedDate)
        await fetchMonthData()
      }
    })
  }

  // Blokkaa yksittäinen aika
  function handleBlock() {
    if (!selectedDate) return
    setBlockError(null)
    startTransition(async () => {
      const err = await blockSlotAction({ date: selectedDate, slot_time: blockTime })
      if (err) {
        setBlockError(err)
      } else {
        await fetchDayDetail(selectedDate)
      }
    })
  }

  // Poista blokkaus
  function handleUnblock(slotId: string) {
    setUnblockError(null)
    startTransition(async () => {
      const err = await unblockSlotAction(slotId)
      if (err) {
        setUnblockError(err)
      } else if (selectedDate) {
        await fetchDayDetail(selectedDate)
      }
    })
  }

  // Poista aikaikkuna
  function handleDelete(slotId: string) {
    setDeleteError(null)
    startTransition(async () => {
      const err = await deleteSlotAction(slotId)
      if (err) {
        setDeleteError(err)
      } else if (selectedDate) {
        await fetchDayDetail(selectedDate)
        await fetchMonthData()
      }
    })
  }

  const grid = getMonthGrid(year, month)

  return (
    <div className="flex flex-col lg:flex-row gap-6">

      {/* --- Kuukausikalenteri --- */}
      <div className="bg-white rounded-xl border border-card-border shadow-sm p-5 lg:w-80 shrink-0">

        {/* Kuukauden otsikko + navigaatio */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-cream transition-colors text-mocha"
            aria-label={t('prevMonth')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-chocolate capitalize">
            {formatMonthHeading(year, month, locale)}
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-cream transition-colors text-mocha"
            aria-label={t('nextMonth')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Viikonpäivien otsikkorivi */}
        <div className="grid grid-cols-7 mb-1">
          {getDayNames(locale).map(d => (
            <div key={d} className="text-center text-xs font-medium text-mocha py-1 capitalize">
              {d}
            </div>
          ))}
        </div>

        {/* Päiväruudukko */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {grid.map((day, i) => {
            if (!day) return <div key={`pad-${i}`} />

            const dateStr = toDateStr(day)
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDate
            const hasSlots = slotDates.has(dateStr)
            const hasBlocked = blockedDates.has(dateStr)
            // Vertaillaan päivämäärämerkkijonoja (YYYY-MM-DD) — toimii oikein
            // eikä vaadi Date-objektien vertailua jossa UTC vs. paikallinen aika sekoittuu
            const isPast = dateStr < todayStr

            return (
              <button
                key={dateStr}
                onClick={() => handleDayClick(day)}
                className={`relative flex flex-col items-center justify-center rounded-lg py-1.5 text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-rose-ink text-warm-white'
                    : isToday
                    ? 'bg-baby text-rose-ink ring-1 ring-rose'
                    : isPast
                    ? 'text-mocha hover:bg-cream'
                    : 'text-chocolate hover:bg-cream'
                }`}
              >
                {day.getDate()}
                {/* Pisteet: vihreä = aikaikkunoita, oranssi = blokattuja aikoja */}
                {(hasSlots || hasBlocked) && (
                  <div className="flex gap-0.5 mt-0.5">
                    {hasSlots && (
                      <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-baby' : 'bg-green-400'}`} />
                    )}
                    {hasBlocked && (
                      <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-baby' : 'bg-orange-400'}`} />
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Selite */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-card-border/60 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-xs text-mocha">{t('legendWindows')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            <span className="text-xs text-mocha">{t('legendBlocked')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-ink" />
            <span className="text-xs text-mocha">{t('legendSelected')}</span>
          </div>
        </div>
      </div>

      {/* --- Päivänäkymä --- */}
      <div className="flex-1 min-w-0">
        {!selectedDate ? (
          <div className="bg-white rounded-xl border border-card-border shadow-sm p-8 text-center">
            <p className="text-mocha text-sm">{t('selectDay')}</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-card-border shadow-sm divide-y divide-card-border/60">

            {/* Päivän otsikko */}
            <div className="px-5 py-4">
              <h2 className="text-base font-semibold text-chocolate capitalize">
                {formatDayHeading(selectedDate, locale)}
              </h2>
            </div>

            {isLoadingDay ? (
              <div className="px-5 py-8 text-center text-sm text-mocha">
                {t('loading')}
              </div>
            ) : (
              <>
                {/* Aikaikkunat */}
                <div className="px-5 py-4">
                  <h3 className="text-xs font-medium text-mocha uppercase tracking-wide mb-3">
                    {t('windows')}
                  </h3>

                  {deleteError && (
                    <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2 mb-3">
                      {deleteError}
                    </p>
                  )}

                  {!dayDetail?.windows.length ? (
                    <p className="text-sm text-mocha">
                      {t('noWindows')}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {dayDetail.windows.map((w) => (
                        <div
                          key={w.id}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-cream"
                        >
                          <span className="text-sm font-medium text-chocolate tabular-nums">
                            {w.start_time} – {w.end_time}
                          </span>
                          {w.has_bookings ? (
                            <span className="text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">
                              {t('hasBookings')}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleDelete(w.id)}
                              disabled={isPending}
                              className="text-xs text-red-700 hover:text-red-800 hover:bg-red-50 px-2 py-0.5 rounded-lg
                                         transition-colors disabled:opacity-50"
                            >
                              {t('delete')}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Varaukset */}
                <div className="px-5 py-4">
                  <h3 className="text-xs font-medium text-mocha uppercase tracking-wide mb-3">
                    {t('bookings')}
                  </h3>
                  {!dayDetail?.bookings.length ? (
                    <p className="text-sm text-mocha">{t('noBookings')}</p>
                  ) : (
                    <div className="space-y-2">
                      {dayDetail.bookings.map((b) => (
                        <div
                          key={b.id}
                          className="flex items-center gap-3 py-2 px-3 rounded-lg bg-green-50"
                        >
                          <span className="text-sm font-semibold text-chocolate tabular-nums w-10 shrink-0">
                            {formatBookingTime(b.starts_at, locale)}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-chocolate truncate">
                              {b.service_name}
                            </p>
                            <p className="text-xs text-mocha truncate">
                              {b.customer_name}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Blokatut ajat */}
                <div className="px-5 py-4">
                  <h3 className="text-xs font-medium text-mocha uppercase tracking-wide mb-3">
                    {t('blocked')}
                  </h3>

                  {unblockError && (
                    <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2 mb-3">
                      {unblockError}
                    </p>
                  )}

                  {dayDetail?.blocked.length ? (
                    <div className="space-y-2 mb-3">
                      {dayDetail.blocked.map((b) => (
                        <div
                          key={b.id}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-orange-50"
                        >
                          <span className="text-sm font-medium text-orange-700 tabular-nums">
                            {b.slot_time}
                          </span>
                          <button
                            onClick={() => handleUnblock(b.id)}
                            disabled={isPending}
                            className="text-xs text-orange-800 hover:text-orange-900 hover:bg-orange-100 px-2 py-0.5 rounded-lg
                                       transition-colors disabled:opacity-50"
                          >
                            {t('unblock')}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-mocha mb-3">{t('noBlocked')}</p>
                  )}

                  {blockError && (
                    <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2 mb-3">
                      {blockError}
                    </p>
                  )}

                  <div className="flex items-end gap-3 flex-wrap">
                    <div>
                      <label className="block text-xs text-mocha mb-1">{t('blockAt')}</label>
                      <input
                        type="time"
                        value={blockTime}
                        step={1800}
                        onChange={(e) => setBlockTime(e.target.value)}
                        className="px-3 py-2 text-sm rounded-lg border border-card-border text-chocolate
                                   focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={handleBlock}
                      disabled={isPending}
                      className="px-4 py-2 text-sm font-medium text-white rounded-lg
                                 bg-gradient-to-r from-orange-400 to-amber-400
                                 hover:from-orange-500 hover:to-amber-500
                                 focus:outline-none focus:ring-2 focus:ring-orange-300
                                 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                    >
                      {isPending ? tCommon('saving') : t('block')}
                    </button>
                  </div>
                </div>

                {/* Lisää aikaikkuna */}
                <div className="px-5 py-4">
                  <h3 className="text-xs font-medium text-mocha uppercase tracking-wide mb-3">
                    {t('addWindow')}
                  </h3>

                  {addError && (
                    <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2 mb-3">
                      {addError}
                    </p>
                  )}

                  <div className="flex items-end gap-3 flex-wrap">
                    <div>
                      <label className="block text-xs text-mocha mb-1">{t('start')}</label>
                      <input
                        type="time"
                        value={addStart}
                        onChange={(e) => setAddStart(e.target.value)}
                        className="px-3 py-2 text-sm rounded-lg border border-card-border text-chocolate
                                   focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-mocha mb-1">{t('end')}</label>
                      <input
                        type="time"
                        value={addEnd}
                        onChange={(e) => setAddEnd(e.target.value)}
                        className="px-3 py-2 text-sm rounded-lg border border-card-border text-chocolate
                                   focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={handleAdd}
                      disabled={isPending}
                      className="px-4 py-2 text-sm font-medium text-warm-white rounded-lg
                                 bg-chocolate hover:bg-chocolate/85
                                 focus:outline-none focus:ring-2 focus:ring-rose
                                 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                    >
                      {isPending ? t('adding') : t('add')}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
