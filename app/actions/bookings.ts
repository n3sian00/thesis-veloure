'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  sendBookingCancellationToCustomer,
  sendWaitlistNotificationToCustomer,
  sendBookingRescheduleToCustomer,
  sendBookingUpdateToCustomer,
} from '@/lib/email'
import { getPathname } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'
import { supabaseErr, resendErr } from '@/lib/log-error'
import { revalidatePath } from 'next/cache'

// Peruuttaa varauksen ja lähettää asiakkaalle ilmoituksen.
// Vain yrityksen omistaja voi peruuttaa oman yrityksensä varauksia.
export async function cancelBookingAction(formData: FormData): Promise<void> {
  const bookingId = formData.get('booking_id') as string
  if (!bookingId) return

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, slug')
    .eq('user_id', user.id)
    .single()

  if (!business) return

  // Haetaan varauksen tiedot sähköpostia varten ennen päivitystä
  const admin = createAdminClient()
  const { data: booking } = await admin
    .from('bookings')
    .select('customer_name, customer_email, starts_at, service_id, locale, services(name)')
    .eq('id', bookingId)
    .eq('business_id', business.id)
    .eq('status', 'confirmed')
    .single()

  if (!booking) return

  // Päivitetään tila — RLS varmistaa omistajuuden
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)
    .eq('business_id', business.id)

  if (error) {
    console.error('Varauksen peruutus epäonnistui:', supabaseErr(error))
    return
  }

  revalidatePath('/dashboard/bookings')

  const serviceName = Array.isArray(booking.services)
    ? (booking.services[0]?.name ?? 'Palvelu')
    : ((booking.services as { name: string } | null)?.name ?? 'Palvelu')

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://kauneusai.fi'

  // Sähköpostit fire-and-forget — ei estä paluuta
  Promise.all([
    // 1) Peruutusilmoitus varaajalle
    sendBookingCancellationToCustomer({
      customerName: booking.customer_name,
      customerEmail: booking.customer_email,
      serviceName,
      startsAt: booking.starts_at,
      businessName: business.name,
      locale: booking.locale,
    }),

    // 2) Ilmoitus jonotuslistalle — haetaan kaikki jonottajat tälle palvelulle
    admin
      .from('waitlist')
      .select('customer_name, customer_email, locale')
      .eq('business_id', business.id)
      .eq('service_id', booking.service_id)
      .then(({ data: waitlist }) => {
        if (!waitlist?.length) return
        return Promise.all(
          waitlist.map((entry) =>
            sendWaitlistNotificationToCustomer({
              customerName: entry.customer_name,
              customerEmail: entry.customer_email,
              serviceName,
              businessName: business.name,
              // Varauslinkki jonottajan omalla kielellä (fi: /slug, en: /en/slug)
              bookingUrl: `${baseUrl}${getPathname({ href: `/${business.slug}`, locale: entry.locale })}`,
              locale: entry.locale,
            })
          )
        )
      }),
  ]).catch((err) => {
    console.error('Sähköpostilähetys epäonnistui (varaus peruutettu):', resendErr(err))
  })
}

// Siirtää varauksen uuteen ajankohtaan ja lähettää asiakkaalle ilmoituksen.
// Vain yrityksen omistaja voi siirtää oman yrityksensä varauksia, vain vahvistetuille varauksille.
export async function rescheduleBookingAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const t = await getTranslations('Errors')
  const bookingId = (formData.get('booking_id') as string)?.trim()
  const newStartsAtRaw = (formData.get('starts_at') as string)?.trim()

  if (!bookingId) return t('bookingIdMissing')
  if (!newStartsAtRaw) return t('newTimeMissing')

  const newStartsAt = new Date(newStartsAtRaw)
  if (isNaN(newStartsAt.getTime())) return t('invalidTime')

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return t('loginRequired')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('user_id', user.id)
    .single()

  if (!business) return t('businessNotFound')

  // Haetaan varauksen ja palvelun tiedot ennen päivitystä (sähköpostia ja kestoa varten)
  const admin = createAdminClient()
  const { data: booking } = await admin
    .from('bookings')
    .select('customer_name, customer_email, starts_at, service_id, locale, services(name, duration_minutes)')
    .eq('id', bookingId)
    .eq('business_id', business.id)
    .eq('status', 'confirmed')
    .single()

  if (!booking) return t('bookingNotReschedulable')

  const serviceName = Array.isArray(booking.services)
    ? (booking.services[0]?.name ?? 'Palvelu')
    : ((booking.services as { name: string } | null)?.name ?? 'Palvelu')

  const durationMinutes = Array.isArray(booking.services)
    ? booking.services[0]?.duration_minutes
    : (booking.services as { duration_minutes: number } | null)?.duration_minutes

  if (!durationMinutes) return t('durationNotFound')

  const newEndsAt = new Date(newStartsAt.getTime() + durationMinutes * 60 * 1000)

  // Päällekkäisyystarkistus — sama logiikka kuin varauksen luonnissa (/api/bookings POST),
  // pois lukien siirrettävä varaus itse
  const { data: conflicting } = await admin
    .from('bookings')
    .select('id')
    .eq('business_id', business.id)
    .eq('status', 'confirmed')
    .neq('id', bookingId)
    .lt('starts_at', newEndsAt.toISOString())
    .gt('ends_at', newStartsAt.toISOString())
    .limit(1)

  if (conflicting && conflicting.length > 0) {
    return t('slotTaken')
  }

  // Päivitetään ajankohta — RLS varmistaa omistajuuden
  const { error } = await supabase
    .from('bookings')
    .update({ starts_at: newStartsAt.toISOString(), ends_at: newEndsAt.toISOString() })
    .eq('id', bookingId)
    .eq('business_id', business.id)

  if (error) {
    console.error('Varauksen siirto epäonnistui:', supabaseErr(error))
    return t('rescheduleFailed')
  }

  revalidatePath('/dashboard/bookings')

  // Sähköposti fire-and-forget — ei estä paluuta
  Promise.all([
    sendBookingRescheduleToCustomer({
      customerName: booking.customer_name,
      customerEmail: booking.customer_email,
      serviceName,
      oldStartsAt: booking.starts_at,
      newStartsAt: newStartsAt.toISOString(),
      businessName: business.name,
      locale: booking.locale,
    }),
  ]).catch((err) => {
    console.error('Sähköpostilähetys epäonnistui (varaus siirretty):', resendErr(err))
  })

  return null
}

// Muokkaa varauksen asiakastietoja ja lähettää asiakkaalle ilmoituksen.
// Vain yrityksen omistaja voi muokata oman yrityksensä varauksia, vain vahvistetuille varauksille.
export async function updateBookingDetailsAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const t = await getTranslations('Errors')
  const bookingId = (formData.get('booking_id') as string)?.trim()
  const customer_name = (formData.get('customer_name') as string)?.trim()
  const customer_email = (formData.get('customer_email') as string)?.trim()
  const customer_phone = (formData.get('customer_phone') as string)?.trim() || null
  const customer_notes = (formData.get('customer_notes') as string)?.trim() || null

  if (!bookingId) return t('bookingIdMissing')
  if (!customer_name) return t('nameRequired')
  if (!customer_email) return t('emailRequired')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email)) return t('invalidEmail')

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return t('loginRequired')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('user_id', user.id)
    .single()

  if (!business) return t('businessNotFound')

  // Haetaan varauksen ja palvelun tiedot ennen päivitystä (sähköpostia varten)
  const admin = createAdminClient()
  const { data: booking } = await admin
    .from('bookings')
    .select('starts_at, locale, services(name)')
    .eq('id', bookingId)
    .eq('business_id', business.id)
    .eq('status', 'confirmed')
    .single()

  if (!booking) return t('bookingNotEditable')

  const serviceName = Array.isArray(booking.services)
    ? (booking.services[0]?.name ?? 'Palvelu')
    : ((booking.services as { name: string } | null)?.name ?? 'Palvelu')

  // Päivitetään asiakastiedot — RLS varmistaa omistajuuden
  const { error } = await supabase
    .from('bookings')
    .update({ customer_name, customer_email, customer_phone, customer_notes })
    .eq('id', bookingId)
    .eq('business_id', business.id)

  if (error) {
    console.error('Varauksen tietojen tallennus epäonnistui:', supabaseErr(error))
    return t('bookingSaveFailed')
  }

  revalidatePath('/dashboard/bookings')

  // Sähköposti fire-and-forget — ei estä paluuta
  Promise.all([
    sendBookingUpdateToCustomer({
      customerName: customer_name,
      customerEmail: customer_email,
      serviceName,
      startsAt: booking.starts_at,
      businessName: business.name,
      locale: booking.locale,
    }),
  ]).catch((err) => {
    console.error('Sähköpostilähetys epäonnistui (varaus päivitetty):', resendErr(err))
  })

  return null
}
