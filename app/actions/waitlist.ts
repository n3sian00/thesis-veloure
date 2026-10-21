'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'

// Poistaa jonotuslistaentryyn — vain yrityksen omistaja voi poistaa
export async function removeWaitlistAction(entryId: string): Promise<string | null> {
  const t = await getTranslations('Errors')
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return t('loginRequired')

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!business) return t('businessNotFound')

  const { error } = await supabase
    .from('waitlist')
    .delete()
    .eq('id', entryId)
    .eq('business_id', business.id)

  if (error) return t('deleteFailed')

  revalidatePath('/dashboard/bookings')
  return null
}
