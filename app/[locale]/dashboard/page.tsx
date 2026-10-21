import { getLocale, getTranslations } from 'next-intl/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Link } from '@/i18n/navigation'
import { formatDateTimeHelsinki } from '@/lib/dates'

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()
  const t = await getTranslations('DashboardHome')
  const tCommon = await getTranslations('Common')
  const locale = await getLocale()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Haetaan yritys
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, slug')
    .eq('user_id', user!.id)
    .single()

  if (!business) {
    return (
      <p className="text-mocha">
        {t('businessNotFound')}
      </p>
    )
  }

  // Haetaan tilastot rinnakkain
  const now = new Date().toISOString()

  const [
    { count: activeServices },
    { count: upcomingBookings },
    { data: nextBookings },
  ] = await Promise.all([
    supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .eq('active', true),

    supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .eq('status', 'confirmed')
      .gte('starts_at', now),

    supabase
      .from('bookings')
      .select('id, customer_name, starts_at, service_id, services(name)')
      .eq('business_id', business.id)
      .eq('status', 'confirmed')
      .gte('starts_at', now)
      .order('starts_at', { ascending: true })
      .limit(5),
  ])

  return (
    <div className="space-y-8">

      {/* Otsikko */}
      <div>
        <h1 className="font-serif text-2xl font-semibold text-chocolate">{t('title')}</h1>
        <p className="text-mocha mt-1">{t('welcome', { name: business.name })}</p>
      </div>

      {/* Tilastokortit */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label={t('activeServices')}
          value={activeServices ?? 0}
          linkHref="/dashboard/services"
          linkLabel={t('manageServices')}
        />
        <StatCard
          label={t('upcomingBookings')}
          value={upcomingBookings ?? 0}
          linkHref="/dashboard/bookings"
          linkLabel={t('seeAll')}
        />
        <div className="bg-white rounded-xl border border-card-border p-5 shadow-sm">
          <p className="text-sm text-mocha">{t('customerLink')}</p>
          <a
            href={`/${business.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-lg font-semibold text-rose-deep hover:underline block mt-1 truncate"
          >
            /{business.slug}
          </a>
          <p className="text-xs text-mocha/70 mt-1">{t('shareWithClients')}</p>
        </div>
      </div>

      {/* Seuraavat varaukset */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-lg font-medium text-chocolate">{t('nextBookings')}</h2>
          <Link
            href="/dashboard/bookings"
            className="text-sm text-rose-deep hover:text-chocolate transition-colors"
          >
            {t('allBookings')}
          </Link>
        </div>

        {!nextBookings || nextBookings.length === 0 ? (
          <div className="bg-white rounded-xl border border-card-border p-8 text-center shadow-sm">
            <p className="text-mocha text-sm">{t('noUpcoming')}</p>
            <p className="text-mocha/70 text-xs mt-1">
              {t('noUpcomingHint')}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-card-border shadow-sm divide-y divide-card-border/60">
            {nextBookings.map((booking) => {
              // Supabase palauttaa join-datan arrayna tai objektina — käsitellään molemmat
              const serviceName = Array.isArray(booking.services)
                ? booking.services[0]?.name
                : (booking.services as { name: string } | null)?.name

              return (
                <div
                  key={booking.id}
                  className="flex items-center justify-between px-5 py-4"
                >
                  <div>
                    <p className="text-sm font-medium text-chocolate">
                      {booking.customer_name}
                    </p>
                    <p className="text-xs text-mocha mt-0.5">
                      {serviceName ?? tCommon('serviceFallback')}
                    </p>
                  </div>
                  <p className="text-sm text-mocha tabular-nums">
                    {formatDateTimeHelsinki(booking.starts_at, 'short', locale)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// Tilastokortti-komponentti
function StatCard({
  label,
  value,
  linkHref,
  linkLabel,
}: {
  label: string
  value: number
  linkHref: string
  linkLabel: string
}) {
  return (
    <div className="bg-white rounded-xl border border-card-border p-5 shadow-sm">
      <p className="text-sm text-mocha">{label}</p>
      <p className="text-3xl font-bold text-chocolate mt-1">{value}</p>
      <Link
        href={linkHref}
        className="text-xs text-rose-deep hover:text-chocolate transition-colors mt-2 inline-block"
      >
        {linkLabel} →
      </Link>
    </div>
  )
}
