'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'

// Apufunktio: hakee autentikoidun käyttäjän yrityksen ID:n
async function getOwnBusiness() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { supabase, businessId: null }

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('user_id', user.id)
    .single()

  return { supabase, businessId: business?.id ?? null }
}

// Lisää uusi palvelu
export async function createServiceAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const t = await getTranslations('Errors')
  const name = (formData.get('name') as string)?.trim()
  const durationRaw = formData.get('duration_minutes') as string
  const priceRaw = formData.get('price') as string
  const description = (formData.get('description') as string)?.trim() || null
  const category = (formData.get('category') as string)?.trim() || null

  if (!name) return t('serviceNameRequired')

  const duration_minutes = parseInt(durationRaw, 10)
  const price = parseFloat(priceRaw.replace(',', '.')) // salli sekä piste että pilkku

  if (isNaN(duration_minutes) || duration_minutes < 1)
    return t('durationTooShort')
  if (isNaN(price) || price < 0) return t('priceNegative')

  const { supabase, businessId } = await getOwnBusiness()
  if (!businessId) return t('loginRequired')

  const { error } = await supabase.from('services').insert({
    business_id: businessId,
    name,
    description,
    category,
    duration_minutes,
    price,
  })

  if (error) return t('serviceAddFailed')

  revalidatePath('/dashboard/services')
  return null
}

// Muokkaa palvelua
export async function updateServiceAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const t = await getTranslations('Errors')
  const id = (formData.get('id') as string)?.trim()
  const name = (formData.get('name') as string)?.trim()
  const durationRaw = formData.get('duration_minutes') as string
  const priceRaw = formData.get('price') as string
  const description = (formData.get('description') as string)?.trim() || null
  const category = (formData.get('category') as string)?.trim() || null

  if (!id) return t('serviceIdMissing')
  if (!name) return t('serviceNameRequired')

  const duration_minutes = parseInt(durationRaw, 10)
  const price = parseFloat(priceRaw.replace(',', '.'))

  if (isNaN(duration_minutes) || duration_minutes < 1)
    return t('durationTooShort')
  if (isNaN(price) || price < 0) return t('priceNegative')

  const { supabase, businessId } = await getOwnBusiness()
  if (!businessId) return t('loginRequired')

  const { error } = await supabase
    .from('services')
    .update({ name, description, category, duration_minutes, price })
    .eq('id', id)
    .eq('business_id', businessId)

  if (error) return t('serviceSaveFailed')

  revalidatePath('/dashboard/services')
  return null
}

// Poista palvelu (business_id-tarkistus RLS:n lisäksi)
export async function deleteServiceAction(formData: FormData): Promise<string | null> {
  const t = await getTranslations('Errors')
  const id = formData.get('id') as string
  const { supabase, businessId } = await getOwnBusiness()
  if (!businessId) return t('loginRequired')

  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', id)
    .eq('business_id', businessId)

  if (error) {
    if (error.code === '23503') {
      return t('serviceHasBookings')
    }
    return t('serviceDeleteFailed')
  }

  revalidatePath('/dashboard/services')
  return null
}

// Vaihda palvelun aktiivisuustila
export async function toggleServiceAction(formData: FormData): Promise<void> {
  const id = formData.get('id') as string
  const currentActive = formData.get('active') === 'true'

  const { supabase, businessId } = await getOwnBusiness()
  if (!businessId) return

  await supabase
    .from('services')
    .update({ active: !currentActive })
    .eq('id', id)
    .eq('business_id', businessId)

  revalidatePath('/dashboard/services')
}
