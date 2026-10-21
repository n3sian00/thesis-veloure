import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from '@/i18n/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import AddServiceForm from '@/components/dashboard/AddServiceForm'
import ServiceRow from '@/components/dashboard/ServiceRow'
import type { Database } from '@/types/database'

type Service = Database['public']['Tables']['services']['Row']

export default async function ServicesPage() {
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

  const t = await getTranslations('ServicesPage')
  const tCommon = await getTranslations('Common')

  if (!business) {
    return <p className="text-mocha">{tCommon('businessNotFound')}</p>
  }

  // Haetaan kaikki palvelut (myös ei-aktiiviset omistajalle)
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', business.id)
    .order('created_at', { ascending: true })

  const aktiiviset = services?.filter((s) => s.active) ?? []
  const eiAktiiviset = services?.filter((s) => !s.active) ?? []

  // Olemassa olevat kategoriat lomakkeiden pudotusvalikkoa varten (duplikaattien esto)
  const existingCategories = Array.from(
    new Set((services ?? []).map((s) => s.category).filter((c): c is string => !!c))
  ).sort((a, b) => a.localeCompare(b, 'fi'))

  return (
    <div className="space-y-8">

      {/* Otsikko */}
      <div>
        <h1 className="font-serif text-2xl font-semibold text-chocolate">{t('title')}</h1>
        <p className="text-mocha mt-1">
          {t('subtitle')}
        </p>
      </div>

      {/* Lisää palvelu -lomake */}
      <AddServiceForm existingCategories={existingCategories} />

      {/* Palvelulistaus */}
      {(!services || services.length === 0) ? (
        <div className="bg-white rounded-xl border border-card-border p-8 text-center shadow-sm">
          <p className="text-mocha text-sm">
            {t('empty')}
          </p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Aktiiviset palvelut */}
          {aktiiviset.length > 0 && (
            <ServiceGroup
              otsikko={t('active')}
              services={aktiiviset}
              existingCategories={existingCategories}
            />
          )}

          {/* Ei-aktiiviset palvelut */}
          {eiAktiiviset.length > 0 && (
            <ServiceGroup
              otsikko={t('hidden')}
              services={eiAktiiviset}
              existingCategories={existingCategories}
            />
          )}
        </div>
      )}
    </div>
  )
}

// Palveluryhmä-komponentti (aktiiviset / piilotetut)
function ServiceGroup({
  otsikko,
  services,
  existingCategories,
}: {
  otsikko: string
  services: Service[]
  existingCategories: string[]
}) {
  return (
    <div>
      <h2 className="text-sm font-medium mb-2 text-mocha">
        {otsikko} ({services.length})
      </h2>
      <div className="bg-white rounded-xl border border-card-border shadow-sm divide-y divide-card-border/60">
        {services.map((service) => (
          <ServiceRow key={service.id} service={service} existingCategories={existingCategories} />
        ))}
      </div>
    </div>
  )
}
