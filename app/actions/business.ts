'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getLocale, getTranslations } from 'next-intl/server'
import { hasLocale } from 'next-intl'
import { redirect } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'

// Päivitä yrityksen perustiedot
export async function updateBusinessAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const t = await getTranslations('Errors')
  const name = (formData.get('name') as string)?.trim()
  const city = (formData.get('city') as string)?.trim()
  const cancellation_hours = parseInt(formData.get('cancellation_hours') as string, 10)
  const theme = formData.get('theme') as string
  const general_notes = (formData.get('general_notes') as string)?.trim() || null
  const localeRaw = formData.get('locale') as string
  const currentLocale = await getLocale()
  const locale = hasLocale(routing.locales, localeRaw) ? localeRaw : currentLocale

  if (!name) return t('businessNameRequired')
  if (isNaN(cancellation_hours) || cancellation_hours < 0)
    return t('cancellationNegative')

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return t('loginRequired')

  const { error } = await supabase
    .from('businesses')
    .update({ name, city: city || null, cancellation_hours, theme, general_notes, locale })
    .eq('user_id', user.id)

  if (error) return t('settingsSaveFailed')

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard')

  // Kielen vaihtuessa siirrytään saman sivun uuden kielen versioon
  if (locale !== currentLocale) {
    redirect({ href: '/dashboard/settings', locale })
  }
  return null
}
