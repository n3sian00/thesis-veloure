import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from '@/i18n/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import BusinessSettingsForm from '@/components/dashboard/BusinessSettingsForm'

export default async function SettingsPage() {
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
    .select('id, name, slug, city, cancellation_hours, theme, general_notes, locale')
    .eq('user_id', user.id)
    .single()

  const t = await getTranslations('Settings')
  const tCommon = await getTranslations('Common')

  if (!business) return <p className="text-mocha">{tCommon('businessNotFound')}</p>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-chocolate">{t('title')}</h1>
        <p className="text-mocha mt-1">{t('subtitle')}</p>
      </div>

      <BusinessSettingsForm business={business} />
    </div>
  )
}
