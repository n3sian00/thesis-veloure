import { createAdminClient } from '@/lib/supabase/server'
import { sendBookingReminderToCustomer } from '@/lib/email'
import { supabaseErr } from '@/lib/log-error'

// GET /api/send-reminder  ← Vercel Cron käyttää GET-pyyntöä
// POST /api/send-reminder ← yhteensopivuus manuaalikutsuille
// Lähettää 24h muistutussähköpostit tulevista varauksista.
// Suojattu CRON_SECRET-tokenilla (Vercel asettaa Authorization-headerin automaattisesti).
async function handleReminder(request: Request): Promise<Response> {
  // --- Autentikointi ---
  const authHeader = request.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('Ympäristömuuttuja CRON_SECRET puuttuu.')
    return Response.json({ error: 'Palvelimen konfigurointivirhe.' }, { status: 500 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Ei käyttöoikeutta.' }, { status: 401 })
  }

  // --- Haetaan varaukset joiden alkuaika on nyt+23h — nyt+25h ---
  // Joustoa ±1h ettei cron-ajoituksen pienet viiveet aiheuta puuttuvia muistutuksia.
  const now = new Date()
  const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000)
  const windowEnd   = new Date(now.getTime() + 25 * 60 * 60 * 1000)

  const supabase = createAdminClient()

  const { data: bookings, error: fetchError } = await supabase
    .from('bookings')
    .select(`
      id,
      customer_name,
      customer_email,
      starts_at,
      locale,
      services ( name ),
      businesses ( name )
    `)
    .eq('status', 'confirmed')
    .eq('reminder_sent', false)
    .gte('starts_at', windowStart.toISOString())
    .lte('starts_at', windowEnd.toISOString())

  if (fetchError) {
    console.error('Varausten haku epäonnistui:', supabaseErr(fetchError))
    return Response.json({ error: 'Varausten haku epäonnistui.' }, { status: 500 })
  }

  if (!bookings || bookings.length === 0) {
    return Response.json({ sent: 0, failed: 0, errors: [] })
  }

  // --- Lähetetään muistutukset ---
  let sent = 0
  let failed = 0
  const errors: string[] = []

  for (const booking of bookings) {
    // Supabase palauttaa join-datan arrayna tai objektina
    const serviceName = Array.isArray(booking.services)
      ? (booking.services[0]?.name ?? 'Palvelu')
      : ((booking.services as { name: string } | null)?.name ?? 'Palvelu')

    const businessName = Array.isArray(booking.businesses)
      ? (booking.businesses[0]?.name ?? 'Palveluntarjoaja')
      : ((booking.businesses as { name: string } | null)?.name ?? 'Palveluntarjoaja')

    const ok = await sendBookingReminderToCustomer({
      customerName:  booking.customer_name,
      customerEmail: booking.customer_email,
      serviceName,
      startsAt: booking.starts_at,
      businessName,
      locale: booking.locale,
    })

    if (ok) {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ reminder_sent: true })
        .eq('id', booking.id)

      if (updateError) {
        console.error(`reminder_sent-päivitys epäonnistui (id: ${booking.id}):`, supabaseErr(updateError))
      }

      sent++
    } else {
      failed++
      errors.push(`${booking.id}: sähköpostilähetys epäonnistui`)
    }
  }

  return Response.json({ sent, failed, errors })
}

export const GET  = handleReminder
export const POST = handleReminder
