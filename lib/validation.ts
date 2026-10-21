import { z } from 'zod'

// Julkisten API-reittien syöteskeemat.
// Nämä reitit ovat autentikoimattomia ja ajavat admin-clientilla, joten rajat
// ovat tarkoituksella tiukat. Virheellisestä syötteestä palautetaan reitissä
// yleinen 400 — zodin virhepuuta ei koskaan lähetetä asiakkaalle.

// --- /api/chat ---

export const chatRequestSchema = z.object({
  businessId: z.uuid(),
  // Tarkempi locale-tarkistus (hasLocale) tehdään reitissä.
  locale: z.string().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(50),
})

export type ChatMessage = z.infer<typeof chatRequestSchema>['messages'][number]

// --- /api/bookings POST ---

export const bookingRequestSchema = z.object({
  business_id: z.uuid(),
  service_id: z.uuid(),
  customer_name: z.string().min(1).max(120),
  customer_email: z.email().max(200),
  customer_phone: z.string().max(40).optional(),
  customer_notes: z.string().max(1000).optional(),
  starts_at: z.iso.datetime({ offset: true }),
  // Tarkempi locale-tarkistus (hasLocale) tehdään reitissä.
  locale: z.string().optional(),
})

export type BookingRequest = z.infer<typeof bookingRequestSchema>

// --- /api/waitlist POST ---

export const waitlistRequestSchema = z.object({
  business_id: z.uuid(),
  service_id: z.uuid(),
  customer_name: z.string().min(1).max(120),
  customer_email: z.email().max(200),
  customer_phone: z.string().max(40).optional(),
  // Tarkempi locale-tarkistus (hasLocale) tehdään reitissä.
  locale: z.string().optional(),
})

export type WaitlistRequest = z.infer<typeof waitlistRequestSchema>

// Palauttaa pilkulla erotellun listan epäonnistuneista kentistä — vain
// kenttäpolut, ei arvoja — palvelinlokitusta varten.
export function zodFieldList(error: z.ZodError): string {
  const paths = [...new Set(error.issues.map((i) => i.path.join('.') || '(root)'))]
  return paths.join(', ') || '(tuntematon)'
}
