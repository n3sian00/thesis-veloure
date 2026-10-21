import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from '@/i18n/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { formatDateTimeHelsinki, toIntlLocale } from '@/lib/dates'
import { cancelBookingAction } from '@/app/actions/bookings'
import { removeWaitlistAction } from '@/app/actions/waitlist'
import BookingsFilter from '@/components/dashboard/BookingsFilter'
import BookingActions from '@/components/dashboard/BookingActions'
import { Suspense } from 'react'

// Värikoodi varauksen tilalle
const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-green-50 text-green-800',
  cancelled: 'bg-red-50 text-red-700',
  completed: 'bg-cream text-mocha',
}

// Tunnetut tilat — näyttönimet tulevat käännöksistä (BookingStatus.<tila>)
const KNOWN_STATUSES = ['confirmed', 'cancelled', 'completed']

// Next.js 16: searchParams on Promise
export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const { q, status } = await searchParams
  const t = await getTranslations('BookingsPage')
  const tStatus = await getTranslations('BookingStatus')
  const tCommon = await getTranslations('Common')

  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect({ href: '/login', locale: await getLocale() })
    return null
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!business) return <p className="text-mocha">{tCommon('businessNotFound')}</p>

  // Rakennetaan kysely suodattimien perusteella
  let query = supabase
    .from('bookings')
    .select('*, services(name)')
    .eq('business_id', business.id)
    .order('starts_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  // Tekstihaku: nimi tai sähköposti (Supabase ilike)
  if (q?.trim()) {
    query = query.or(
      `customer_name.ilike.%${q.trim()}%,customer_email.ilike.%${q.trim()}%`
    )
  }

  // Suodatettaessa ladataan enemmän tuloksia
  const limit = q || status ? 200 : 50
  const { data: bookings } = await query.limit(limit)

  // Haetaan jonotuslista palveluiden nimillä
  const { data: waitlist } = await supabase
    .from('waitlist')
    .select('id, customer_name, customer_email, created_at, services(name)')
    .eq('business_id', business.id)
    .order('created_at', { ascending: true })

  const isFiltered = !!(q || status)
  const now = new Date()

  const tulevat = bookings?.filter(
    (b) => new Date(b.starts_at) >= now && b.status === 'confirmed'
  ) ?? []

  const menneet = bookings?.filter(
    (b) => new Date(b.starts_at) < now || b.status !== 'confirmed'
  ) ?? []

  return (
    <div className="space-y-6">

      <div>
        <h1 className="font-serif text-2xl font-semibold text-chocolate">{t('title')}</h1>
        <p className="text-mocha mt-1">
          {isFiltered
            ? t('resultCount', { count: bookings?.length ?? 0 })
            : tulevat.length > 0
            ? t('upcomingCount', { count: tulevat.length })
            : t('noUpcoming')}
        </p>
      </div>

      {/* Hakupalkki — Suspense tarvitaan useSearchParams-hookin takia */}
      <Suspense>
        <BookingsFilter />
      </Suspense>

      {isFiltered ? (
        /* Suodatettu: yksi litteä lista */
        <BookingSection
          otsikko={`${t('searchResults')}${q ? ` — "${q}"` : ''}${status ? ` (${KNOWN_STATUSES.includes(status) ? tStatus(status) : status})` : ''}`}
          bookings={bookings ?? []}
          businessId={business.id}
          tyhjaViesti={t('noResults')}
          showCancel
        />
      ) : (
        /* Oletustila: tulevat + menneet */
        <>
          <BookingSection
            otsikko={t('upcoming')}
            bookings={tulevat}
            businessId={business.id}
            tyhjaViesti={t('noUpcomingList')}
            showCancel
          />

          {menneet.length > 0 && (
            <BookingSection
              otsikko={t('past')}
              bookings={menneet}
              businessId={business.id}
              tyhjaViesti=""
              dim
            />
          )}
        </>
      )}

      {/* Jonotuslista */}
      {!isFiltered && (
        <WaitlistSection waitlist={waitlist ?? []} />
      )}
    </div>
  )
}

type WaitlistEntry = {
  id: string
  customer_name: string
  customer_email: string
  created_at: string
  services: { name: string } | { name: string }[] | null
}

async function WaitlistSection({ waitlist }: { waitlist: WaitlistEntry[] }) {
  const t = await getTranslations('BookingsPage')
  const tCommon = await getTranslations('Common')
  const locale = await getLocale()

  return (
    <div>
      <h2 className="text-sm font-medium text-mocha mb-2">
        {t('waitlist')}{waitlist.length > 0 ? ` (${waitlist.length})` : ''}
      </h2>

      {waitlist.length === 0 ? (
        <div className="bg-white rounded-xl border border-card-border p-6 text-center shadow-sm">
          <p className="text-mocha text-sm">{t('noWaitlist')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-card-border shadow-sm divide-y divide-card-border/60">
          {waitlist.map((entry) => {
            const serviceName = Array.isArray(entry.services)
              ? entry.services[0]?.name
              : (entry.services as { name: string } | null)?.name

            return (
              <div key={entry.id} className="px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-chocolate">{entry.customer_name}</p>
                    <p className="text-xs text-mocha mt-0.5">
                      {serviceName ?? tCommon('serviceFallback')} &middot; {entry.customer_email}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <p className="text-xs text-mocha tabular-nums whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleDateString(toIntlLocale(locale), {
                        day: 'numeric', month: 'numeric', year: 'numeric',
                        timeZone: 'Europe/Helsinki',
                      })}
                    </p>
                    <form action={async () => { await removeWaitlistAction(entry.id) }}>
                      <button
                        type="submit"
                        className="text-xs text-mocha hover:text-red-800 hover:bg-red-50
                                   px-2.5 py-1 rounded-lg transition-colors border border-card-border
                                   hover:border-red-200 whitespace-nowrap"
                      >
                        {t('remove')}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

type Booking = {
  id: string
  service_id: string
  customer_name: string
  customer_email: string
  customer_phone: string | null
  customer_notes: string | null
  starts_at: string
  ends_at: string
  status: string
  services: { name: string } | { name: string }[] | null
}

async function BookingSection({
  otsikko,
  bookings,
  businessId,
  tyhjaViesti,
  dim = false,
  showCancel = false,
}: {
  otsikko: string
  bookings: Booking[]
  businessId: string
  tyhjaViesti: string
  dim?: boolean
  showCancel?: boolean
}) {
  const t = await getTranslations('BookingsPage')
  const tStatus = await getTranslations('BookingStatus')
  const tCommon = await getTranslations('Common')
  const locale = await getLocale()

  return (
    <div>
      <h2 className="text-sm font-medium mb-2 text-mocha">
        {otsikko}
      </h2>

      {bookings.length === 0 ? (
        <div className="bg-white rounded-xl border border-card-border p-6 text-center shadow-sm">
          <p className="text-mocha text-sm">{tyhjaViesti}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-card-border shadow-sm divide-y divide-card-border/60">
          {bookings.map((booking) => {
            const serviceName = Array.isArray(booking.services)
              ? booking.services[0]?.name
              : (booking.services as { name: string } | null)?.name

            const statusStyle = STATUS_STYLES[booking.status] ?? 'bg-cream text-mocha'
            const statusLabel = KNOWN_STATUSES.includes(booking.status)
              ? tStatus(booking.status)
              : booking.status

            const durationMinutes = Math.round(
              (new Date(booking.ends_at).getTime() - new Date(booking.starts_at).getTime()) / 60000
            )

            return (
              <div
                key={booking.id}
                className={`px-5 py-4 ${dim ? 'bg-cream/50' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-chocolate">
                        {booking.customer_name}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <p className="text-xs text-mocha mt-0.5">
                      {serviceName ?? tCommon('serviceFallback')} &middot; {booking.customer_email}
                      {booking.customer_phone && ` · ${booking.customer_phone}`}
                    </p>
                    {booking.customer_notes && (
                      <p className="text-xs text-mocha mt-1">
                        {booking.customer_notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <p className="text-sm text-mocha tabular-nums whitespace-nowrap">
                      {formatDateTimeHelsinki(booking.starts_at, 'long', locale)}
                    </p>

                    {showCancel && booking.status === 'confirmed' && (
                      <>
                        <BookingActions
                          bookingId={booking.id}
                          businessId={businessId}
                          serviceId={booking.service_id}
                          serviceName={serviceName ?? tCommon('serviceFallback')}
                          durationMinutes={durationMinutes}
                          startsAt={booking.starts_at}
                          customerName={booking.customer_name}
                          customerEmail={booking.customer_email}
                          customerPhone={booking.customer_phone}
                          customerNotes={booking.customer_notes}
                        />
                        <form action={cancelBookingAction}>
                          <input type="hidden" name="booking_id" value={booking.id} />
                          <button
                            type="submit"
                            className="text-xs text-red-700 hover:text-red-800 hover:bg-red-50
                                       px-2.5 py-1 rounded-lg transition-colors border border-red-200
                                       hover:border-red-300 whitespace-nowrap"
                          >
                            {t('cancelBooking')}
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
