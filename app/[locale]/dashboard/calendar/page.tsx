import { redirect } from '@/i18n/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import CalendarView from '@/components/dashboard/CalendarView'

// Kalenteri-sivun Server Component — autentikoi käyttäjän ja välittää
// businessId CalendarView-komponentille, joka hoitaa kaiken interaktiivisuuden
export default async function CalendarPage() {
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

  const t = await getTranslations('Calendar')
  const tCommon = await getTranslations('Common')

  if (!business) {
    return <p className="text-mocha">{tCommon('businessNotFound')}</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-chocolate">{t('title')}</h1>
        <p className="text-mocha mt-1">
          {t('subtitle')}
        </p>
      </div>
      <CalendarView businessId={business.id} />
    </div>
  )
}
