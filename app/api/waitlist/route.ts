import { hasLocale } from 'next-intl'
import { routing } from '@/i18n/routing'
import { createAdminClient } from '@/lib/supabase/server'
import { supabaseErr } from '@/lib/log-error'
import { waitlistRequestSchema, zodFieldList } from '@/lib/validation'

// POST /api/waitlist
// Lisää asiakkaan jonotuslistalle palvelulle.
export async function POST(request: Request) {
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    console.error('[waitlist] Virheellinen JSON-body')
    return Response.json({ error: 'Virheellinen pyyntö.' }, { status: 400 })
  }

  const parsed = waitlistRequestSchema.safeParse(rawBody)
  if (!parsed.success) {
    console.error('[waitlist] Virheellinen syöte, kentät:', zodFieldList(parsed.error))
    return Response.json({ error: 'Virheellinen pyyntö.' }, { status: 400 })
  }

  const { business_id, service_id, customer_name, customer_email } = parsed.data
  const waitlistLocale = hasLocale(routing.locales, parsed.data.locale)
    ? parsed.data.locale
    : routing.defaultLocale

  const supabase = createAdminClient()

  // Tarkistetaan että yritys ja palvelu ovat olemassa
  const { data: service } = await supabase
    .from('services')
    .select('id')
    .eq('id', service_id)
    .eq('business_id', business_id)
    .eq('active', true)
    .single()

  if (!service) {
    return Response.json({ error: 'Palvelua ei löydy.' }, { status: 404 })
  }

  // Tarkistetaan onko sama asiakas jo jonossa tälle palvelulle
  const { data: existing } = await supabase
    .from('waitlist')
    .select('id')
    .eq('business_id', business_id)
    .eq('service_id', service_id)
    .eq('customer_email', customer_email.toLowerCase().trim())
    .single()

  if (existing) {
    return Response.json({ error: 'Olet jo jonotuslistalla tälle palvelulle.' }, { status: 409 })
  }

  const { error } = await supabase.from('waitlist').insert({
    business_id,
    service_id,
    customer_name: customer_name.trim(),
    customer_email: customer_email.toLowerCase().trim(),
    locale: waitlistLocale,
  })

  if (error) {
    console.error('Jonotuslistalle lisääminen epäonnistui:', supabaseErr(error))
    return Response.json({ error: 'Jonotuslistalle liittyminen epäonnistui.' }, { status: 500 })
  }

  return Response.json({ ok: true }, { status: 201 })
}
