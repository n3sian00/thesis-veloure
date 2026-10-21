import { waitUntil } from '@vercel/functions'
import { createAdminClient } from '@/lib/supabase/server'
import { sendBookingConfirmationToCustomer, sendBookingNotificationToOwner } from '@/lib/email'
import { helsinkiToUTC } from '@/lib/dates'
import { generateCancelToken } from '@/lib/tokens'
import { hasLocale } from 'next-intl'
import { routing } from '@/i18n/routing'
import { getPathname } from '@/i18n/navigation'
import { supabaseErr, resendErr } from '@/lib/log-error'
import { bookingRequestSchema, zodFieldList } from '@/lib/validation'

// Vapaiden aikaslottien väli minuuteissa
const SLOT_INTERVAL = 30

// HUOM: Aikavyöhyke — ajat tallennetaan UTC:na ja käsitellään UTC:na.
// Tuotannossa aseta TZ=Europe/Helsinki (Vercel: Settings → Environment Variables)
// jolloin "09:00" tarkoittaa 09:00 Suomen aikaa.

// --- GET /api/bookings?business_id=&date=YYYY-MM-DD&duration=90 ---
// Palauttaa asiakkaalle vapaat aikaslotit annetulle päivälle.
// duration_minutes tulee query-parametrina — asiakas on jo valinnut palvelun.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const businessId = searchParams.get('business_id')
  const dateStr = searchParams.get('date')       // YYYY-MM-DD
  const durationStr = searchParams.get('duration') // minuutteja

  if (!businessId || !dateStr || !durationStr) {
    return Response.json({ error: 'Puutteelliset parametrit.' }, { status: 400 })
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return Response.json({ error: 'Virheellinen päivämäärä.' }, { status: 400 })
  }

  const durationMinutes = parseInt(durationStr, 10)
  if (isNaN(durationMinutes) || durationMinutes <= 0) {
    return Response.json({ error: 'Virheellinen kesto.' }, { status: 400 })
  }

  // Admin client — tarvitaan available_slots ja bookings lukemiseen (ei public SELECT)
  const supabase = createAdminClient()

  // Haetaan yrityksen aikaikkunat tälle päivälle tietokannasta
  const { data: windows } = await supabase
    .from('available_slots')
    .select('start_time, end_time')
    .eq('business_id', businessId)
    .eq('date', dateStr)
    .order('start_time', { ascending: true })

  if (!windows || windows.length === 0) {
    return Response.json({ slots: [] })
  }

  // Haetaan kyseisen päivän vahvistetut varaukset
  // Haetaan kyseisen päivän vahvistetut varaukset ja blokatut ajat rinnakkain
  const [{ data: existingBookings }, { data: blockedSlots }] = await Promise.all([
    supabase
      .from('bookings')
      .select('starts_at, ends_at')
      .eq('business_id', businessId)
      .eq('status', 'confirmed')
      .gte('starts_at', `${dateStr}T00:00:00.000Z`)
      .lte('starts_at', `${dateStr}T23:59:59.999Z`),

    supabase
      .from('blocked_slots')
      .select('slot_time')
      .eq('business_id', businessId)
      .eq('date', dateStr),
  ])

  // HH:MM-joukko nopeaa hakua varten
  const blockedTimes = new Set(
    (blockedSlots ?? []).map((b) => (b.slot_time as string).slice(0, 5))
  )

  const nyt = new Date()
  const durationMs = durationMinutes * 60 * 1000
  const slots: string[] = []

  // Käydään läpi jokainen aikaikkuna ja generoidaan varattavissa olevat slotit
  for (const window of windows) {
    // Muunnetaan ikkunan alku ja loppu Helsingin ajasta UTC:ksi.
    // Aiempi `Z`-suffiksi pakotti ajat UTC:ksi, jolloin esim. 09:00 → 12:00 Suomen ajassa.
    const windowStart = helsinkiToUTC(dateStr, (window.start_time as string).slice(0, 5))
    const windowEnd = helsinkiToUTC(dateStr, (window.end_time as string).slice(0, 5))
    let current = new Date(windowStart)

    while (current.getTime() + durationMs <= windowEnd.getTime()) {
      const slotEnd = new Date(current.getTime() + durationMs)

      // Ohitetaan jo menneet ajat (30 min puskuri)
      if (current.getTime() > nyt.getTime() + 30 * 60 * 1000) {
        // Slotti on blokattu jos sen alkuaika (Helsingin HH:MM) on blockedTimes-joukossa.
        // en-GB palauttaa aina "HH:MM"-muodon kaksoispisteineen (fi-FI käyttää pistettä "10.00").
        const slotTimeHelsinki = current.toLocaleTimeString('en-GB', {
          hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Helsinki',
        })
        const isBlocked = blockedTimes.has(slotTimeHelsinki)

        const hasOverlap = (existingBookings ?? []).some((booking) => {
          const bStart = new Date(booking.starts_at)
          const bEnd = new Date(booking.ends_at)
          return current < bEnd && slotEnd > bStart
        })

        if (!isBlocked && !hasOverlap) {
          slots.push(current.toISOString())
        }
      }

      current = new Date(current.getTime() + SLOT_INTERVAL * 60 * 1000)
    }
  }

  return Response.json({ slots })
}

// --- POST /api/bookings ---
// Luo uuden varauksen Supabaseen
export async function POST(request: Request) {
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    console.error('[bookings] Virheellinen JSON-body')
    return Response.json({ error: 'Virheellinen pyyntö.' }, { status: 400 })
  }

  const parsed = bookingRequestSchema.safeParse(rawBody)
  if (!parsed.success) {
    console.error('[bookings] Virheellinen syöte, kentät:', zodFieldList(parsed.error))
    return Response.json({ error: 'Virheellinen pyyntö.' }, { status: 400 })
  }

  const {
    business_id,
    service_id,
    customer_name,
    customer_email,
    customer_phone,
    customer_notes,
    starts_at,
  } = parsed.data

  const bookingLocale = hasLocale(routing.locales, parsed.data.locale)
    ? parsed.data.locale
    : routing.defaultLocale

  const supabase = createAdminClient()

  // Haetaan palvelun kesto ja yrityksen tiedot rinnakkain
  const [{ data: service }, { data: business }] = await Promise.all([
    supabase
      .from('services')
      .select('name, duration_minutes')
      .eq('id', service_id)
      .eq('business_id', business_id)
      .eq('active', true)
      .single(),
    supabase
      .from('businesses')
      .select('name, user_id, slug, locale')
      .eq('id', business_id)
      .single(),
  ])

  if (!service) {
    return Response.json({ error: 'Palvelua ei löydy.' }, { status: 404 })
  }

  const startsAt = new Date(starts_at)
  const endsAt = new Date(startsAt.getTime() + service.duration_minutes * 60 * 1000)

  // Päällekkäisyystarkistus ennen kirjoitusta
  const { data: conflicting } = await supabase
    .from('bookings')
    .select('id')
    .eq('business_id', business_id)
    .eq('status', 'confirmed')
    .lt('starts_at', endsAt.toISOString())
    .gt('ends_at', startsAt.toISOString())
    .limit(1)

  if (conflicting && conflicting.length > 0) {
    return Response.json(
      { error: 'Valittu aika on jo varattuna. Valitse toinen aika.' },
      { status: 409 }
    )
  }

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      business_id,
      service_id,
      customer_name: customer_name.trim(),
      customer_email: customer_email.toLowerCase().trim(),
      customer_phone: customer_phone?.trim() || null,
      customer_notes: customer_notes?.trim() || null,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: 'confirmed',
      locale: bookingLocale,
    })
    .select('id, starts_at, ends_at, customer_name, customer_email')
    .single()

  if (error) {
    console.error('Varauksen luonti epäonnistui:', supabaseErr(error))
    return Response.json({ error: 'Varauksen luonti epäonnistui.' }, { status: 500 })
  }

  const serviceName = service.name as string
  const businessName = (business?.name as string | undefined)?.trim() || 'Palveluntarjoaja'
  const businessSlug = business?.slug as string | undefined
  // Yrittäjän ilmoitus lähtee yrityksen kielellä, asiakkaan viestit varauksen kielellä
  const ownerLocale = hasLocale(routing.locales, business?.locale)
    ? business.locale
    : routing.defaultLocale

  // Haetaan yrittäjän sähköposti auth.users:sta (admin client)
  let ownerEmail: string | null = null
  if (business?.user_id) {
    const { data: ownerUser } = await supabase.auth.admin.getUserById(
      business.user_id as string
    )
    ownerEmail = ownerUser?.user?.email ?? null
  }

  // Generoidaan asiakkaan peruutuslinkki (vaatii BOOKING_CANCEL_SECRET).
  // Linkki osoittaa varauksen kielen mukaiselle peruutussivulle (fi: /cancel, en: /en/cancel).
  let cancellationUrl: string | undefined
  if (businessSlug && booking?.id) {
    const token = await generateCancelToken(booking.id)
    if (token) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? ''
      const cancelPath = getPathname({ href: '/cancel', locale: bookingLocale })
      cancellationUrl = `${baseUrl}${cancelPath}?id=${booking.id}&token=${token}`
    }
  }

  waitUntil(
    Promise.all([
      sendBookingConfirmationToCustomer({
        customerName: customer_name.trim(),
        customerEmail: customer_email.toLowerCase().trim(),
        serviceName,
        startsAt: startsAt.toISOString(),
        businessName,
        cancellationUrl,
        locale: bookingLocale,
      }),
      ...(ownerEmail
        ? [
            sendBookingNotificationToOwner({
              customerName: customer_name.trim(),
              customerPhone: customer_phone?.trim() || null,
              customerNotes: customer_notes?.trim() || null,
              serviceName,
              startsAt: startsAt.toISOString(),
              ownerEmail,
              locale: ownerLocale,
            }),
          ]
        : []),
    ]).catch((emailError) => {
      console.error('Sähköpostilähetys epäonnistui (varaus tallennettu):', resendErr(emailError))
    })
  )

  return Response.json({ booking }, { status: 201 })
}
