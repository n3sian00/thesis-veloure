'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { helsinkiToUTC } from '@/lib/dates'
import { getTranslations } from 'next-intl/server'

// Apufunktio: hakee kirjautuneen käyttäjän oman businessId:n
async function getOwnBusinessId(): Promise<{ supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>; businessId: string | null }> {
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

// Lisää uusi aikaikkuna tietylle päivälle
// Kutsutaan suoraan CalendarView-komponentista (Server Action)
export async function addSlotAction(data: {
  date: string       // YYYY-MM-DD
  start_time: string // HH:MM
  end_time: string   // HH:MM
}): Promise<string | null> {
  const t = await getTranslations('Errors')
  const { date, start_time, end_time } = data

  if (!date || !start_time || !end_time) return t('fillAllFields')

  // Validoidaan aikaikkuna JS-puolella ennen DB-kutsua
  const [sh, sm] = start_time.split(':').map(Number)
  const [eh, em] = end_time.split(':').map(Number)
  const durationMins = eh * 60 + em - (sh * 60 + sm)

  if (durationMins <= 0) return t('windowEndBeforeStart')
  if (durationMins < 30) return t('windowTooShort')

  const { supabase, businessId } = await getOwnBusinessId()
  if (!businessId) return t('loginRequired')

  // Tarkistetaan päällekkäiset ikkunat samalle päivälle
  const { data: overlapping } = await supabase
    .from('available_slots')
    .select('id, start_time, end_time')
    .eq('business_id', businessId)
    .eq('date', date)
    .lt('start_time', end_time)   // olemassaoleva alkaa ennen uuden loppua
    .gt('end_time', start_time)   // olemassaoleva loppuu uuden alun jälkeen

  if (overlapping && overlapping.length > 0) {
    const o = overlapping[0]
    return t('windowOverlap', { start: o.start_time.slice(0, 5), end: o.end_time.slice(0, 5) })
  }

  const { error } = await supabase.from('available_slots').insert({
    business_id: businessId,
    date,
    start_time,
    end_time,
  })

  if (error) {
    if (error.code === '23505') return t('windowDuplicate')
    return t('windowAddFailed')
  }

  revalidatePath('/dashboard/calendar')
  return null
}

// Blokkaa yksittäisen aikaslottia (HH:MM) tietylle päivälle
export async function blockSlotAction(data: {
  date: string       // YYYY-MM-DD
  slot_time: string  // HH:MM
}): Promise<string | null> {
  const t = await getTranslations('Errors')
  const { date, slot_time } = data
  if (!date || !slot_time) return t('fillAllFields')

  const { supabase, businessId } = await getOwnBusinessId()
  if (!businessId) return t('loginRequired')

  const { error } = await supabase.from('blocked_slots').insert({
    business_id: businessId,
    date,
    slot_time,
  })

  if (error) {
    if (error.code === '23505') return t('alreadyBlocked')
    return t('blockFailed')
  }

  revalidatePath('/dashboard/calendar')
  return null
}

// Poistaa blokatun ajan
export async function unblockSlotAction(slotId: string): Promise<string | null> {
  const t = await getTranslations('Errors')
  const { supabase, businessId } = await getOwnBusinessId()
  if (!businessId) return t('loginRequired')

  const { error } = await supabase
    .from('blocked_slots')
    .delete()
    .eq('id', slotId)
    .eq('business_id', businessId)

  if (error) return t('deleteFailed')

  revalidatePath('/dashboard/calendar')
  return null
}

// Poistaa aikaikkunan — estää poiston jos siihen osuu varauksia
export async function deleteSlotAction(slotId: string): Promise<string | null> {
  const t = await getTranslations('Errors')
  const { supabase, businessId } = await getOwnBusinessId()
  if (!businessId) return t('loginRequired')

  // Haetaan ikkuna — RLS varmistaa omistajuuden (palauttaa null jos ei omistaja)
  const { data: slot } = await supabase
    .from('available_slots')
    .select('business_id, date, start_time, end_time')
    .eq('id', slotId)
    .single()

  if (!slot) return t('windowNotFound')

  // Tarkistetaan ettei ikkunaan osu vahvistettuja varauksia.
  // start_time ja end_time ovat Helsingin paikallisaikoja (HH:MM) — muunnetaan UTC:ksi
  // ennen vertailua, koska bookings.starts_at on UTC-aikaleima.
  const slotStart = helsinkiToUTC(slot.date, slot.start_time.slice(0, 5)).toISOString()
  const slotEnd   = helsinkiToUTC(slot.date, slot.end_time.slice(0, 5)).toISOString()

  const { data: conflicting } = await supabase
    .from('bookings')
    .select('id')
    .eq('business_id', slot.business_id)
    .eq('status', 'confirmed')
    .lt('starts_at', slotEnd)
    .gt('ends_at', slotStart)
    .limit(1)

  if (conflicting && conflicting.length > 0) {
    return t('windowHasBookings')
  }

  const { error } = await supabase
    .from('available_slots')
    .delete()
    .eq('id', slotId)

  if (error) return t('deleteFailed')

  revalidatePath('/dashboard/calendar')
  return null
}
