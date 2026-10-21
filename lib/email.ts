import { Resend } from 'resend'
import { createTranslator, hasLocale } from 'next-intl'
import { routing } from '@/i18n/routing'
import { resendErr } from '@/lib/log-error'
import { formatDateLongHelsinki, formatDateTimeHelsinki, formatTimeHelsinki } from '@/lib/dates'
import fi from '@/messages/fi.json'
import en from '@/messages/en.json'

const FROM = process.env.EMAIL_FROM ?? 'noreply@kauneusai.fi'

// Sähköpostit lähetetään myös request-kontekstin ulkopuolelta (cron, waitUntil),
// joten käännökset haetaan suoraan viestitiedostoista eikä getTranslations():lla.
const MESSAGES = { fi, en }

function emailTranslator(locale: string) {
  const loc = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale
  return createTranslator({ locale: loc, messages: MESSAGES[loc] as typeof fi, namespace: 'Email' })
}

type EmailTranslator = ReturnType<typeof emailTranslator>

// "tiistai 8. huhtikuuta 2026 klo 14.30" / "Tuesday 8 April 2026 at 14:30"
function formatEmailDateTime(t: EmailTranslator, iso: string, locale: string) {
  return t('dateTime', {
    date: formatDateLongHelsinki(iso, locale),
    time: formatTimeHelsinki(iso, locale),
  })
}

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn('Ympäristömuuttuja RESEND_API_KEY puuttuu — sähköposteja ei lähetetä.')
    return null
  }
  return new Resend(process.env.RESEND_API_KEY)
}

// Lähettää varausvahvistuksen asiakkaalle.
// Palauttaa true jos lähetys onnistui, false jos epäonnistui.
export async function sendBookingConfirmationToCustomer(params: {
  customerName: string
  customerEmail: string
  serviceName: string
  startsAt: string  // ISO-aikaleima
  businessName: string
  cancellationUrl?: string
  locale: string    // varauksen kieli (bookings.locale)
}): Promise<boolean> {
  const resend = getResend()
  if (!resend) return false
  const { customerName, customerEmail, serviceName, startsAt, businessName, cancellationUrl, locale } = params
  const t = emailTranslator(locale)

  const { error } = await resend.emails.send({
    from: FROM,
    to: customerEmail,
    subject: t('confirmationSubject', { service: serviceName, business: businessName }),
    text: `${t('greeting', { name: customerName })}

${t('confirmationIntro')}

${t('serviceLine', { service: serviceName })}
${t('timeLine', { dateTime: formatEmailDateTime(t, startsAt, locale) })}
${t('placeLine', { business: businessName })}
${cancellationUrl ? `\n${t('cancelLinkIntro')}\n${cancellationUrl}\n` : ''}
${t('contactForChanges', { business: businessName })}

${t('seeYouSoon')}
${businessName}`,
  })

  if (error) {
    console.error('Varausvahvistuksen lähetys epäonnistui:', resendErr(error))
    return false
  }
  return true
}

// Lähettää ilmoituksen uudesta varauksesta yrittäjälle.
// Palauttaa true jos lähetys onnistui, false jos epäonnistui.
export async function sendBookingNotificationToOwner(params: {
  customerName: string
  customerPhone?: string | null
  customerNotes?: string | null
  serviceName: string
  startsAt: string  // ISO-aikaleima
  ownerEmail: string
  locale: string    // yrityksen kieli (businesses.locale)
}): Promise<boolean> {
  const resend = getResend()
  if (!resend) return false
  const { customerName, customerPhone, customerNotes, serviceName, startsAt, ownerEmail, locale } = params
  const t = emailTranslator(locale)
  const dateTime = formatEmailDateTime(t, startsAt, locale)

  const { error } = await resend.emails.send({
    from: FROM,
    to: ownerEmail,
    subject: t('ownerSubject', { service: serviceName, dateTime }),
    text: `${t('ownerIntro')}

${t('serviceLine', { service: serviceName })}
${t('timeLine', { dateTime })}

${t('customerLine', { name: customerName })}${customerPhone ? `\n${t('phoneLine', { phone: customerPhone })}` : ''}${customerNotes ? `\n${t('notesLine', { notes: customerNotes })}` : ''}`,
  })

  if (error) {
    console.error('Yrittäjän ilmoituksen lähetys epäonnistui:', resendErr(error))
    return false
  }
  return true
}

// Lähettää peruutusilmoituksen asiakkaalle.
// Palauttaa true jos lähetys onnistui, false jos epäonnistui.
export async function sendBookingCancellationToCustomer(params: {
  customerName: string
  customerEmail: string
  serviceName: string
  startsAt: string  // ISO-aikaleima
  businessName: string
  locale: string    // varauksen kieli (bookings.locale)
}): Promise<boolean> {
  const resend = getResend()
  if (!resend) return false
  const { customerName, customerEmail, serviceName, startsAt, businessName, locale } = params
  const t = emailTranslator(locale)

  const { error } = await resend.emails.send({
    from: FROM,
    to: customerEmail,
    subject: t('cancellationSubject', { service: serviceName, business: businessName }),
    text: `${t('greeting', { name: customerName })}

${t('cancellationIntro')}

${t('serviceLine', { service: serviceName })}
${t('timeLine', { dateTime: formatEmailDateTime(t, startsAt, locale) })}
${t('placeLine', { business: businessName })}

${t('contactQuestions', { business: businessName })}

${t('hopeToSeeYou')}
${businessName}`,
  })

  if (error) {
    console.error('Peruutusilmoituksen lähetys epäonnistui:', resendErr(error))
    return false
  }
  return true
}

// Lähettää ilmoituksen asiakkaalle varauksen ajankohdan muuttumisesta.
// Palauttaa true jos lähetys onnistui, false jos epäonnistui.
export async function sendBookingRescheduleToCustomer(params: {
  customerName: string
  customerEmail: string
  serviceName: string
  oldStartsAt: string  // ISO-aikaleima
  newStartsAt: string  // ISO-aikaleima
  businessName: string
  locale: string       // varauksen kieli (bookings.locale)
}): Promise<boolean> {
  const resend = getResend()
  if (!resend) return false
  const { customerName, customerEmail, serviceName, oldStartsAt, newStartsAt, businessName, locale } = params
  const t = emailTranslator(locale)

  const { error } = await resend.emails.send({
    from: FROM,
    to: customerEmail,
    subject: t('rescheduleSubject', { service: serviceName, business: businessName }),
    text: `${t('greeting', { name: customerName })}

${t('rescheduleIntro')}

${t('serviceLine', { service: serviceName })}
${t('oldTimeLine', { dateTime: formatDateTimeHelsinki(oldStartsAt, 'long', locale) })}
${t('newTimeLine', { dateTime: formatDateTimeHelsinki(newStartsAt, 'long', locale) })}
${t('placeLine', { business: businessName })}

${t('contactQuestions', { business: businessName })}

${t('seeYouSoon')}
${businessName}`,
  })

  if (error) {
    console.error('Siirtoilmoituksen lähetys epäonnistui:', resendErr(error))
    return false
  }
  return true
}

// Lähettää ilmoituksen asiakkaalle varauksen tietojen päivittymisestä.
// Palauttaa true jos lähetys onnistui, false jos epäonnistui.
export async function sendBookingUpdateToCustomer(params: {
  customerName: string
  customerEmail: string
  serviceName: string
  startsAt: string  // ISO-aikaleima
  businessName: string
  locale: string    // varauksen kieli (bookings.locale)
}): Promise<boolean> {
  const resend = getResend()
  if (!resend) return false
  const { customerName, customerEmail, serviceName, startsAt, businessName, locale } = params
  const t = emailTranslator(locale)

  const { error } = await resend.emails.send({
    from: FROM,
    to: customerEmail,
    subject: t('updateSubject', { service: serviceName, business: businessName }),
    text: `${t('greeting', { name: customerName })}

${t('updateIntro')}

${t('serviceLine', { service: serviceName })}
${t('timeLine', { dateTime: formatDateTimeHelsinki(startsAt, 'long', locale) })}
${t('placeLine', { business: businessName })}

${t('contactQuestions', { business: businessName })}

${t('seeYouSoon')}
${businessName}`,
  })

  if (error) {
    console.error('Päivitysilmoituksen lähetys epäonnistui:', resendErr(error))
    return false
  }
  return true
}

// Ilmoittaa jonotuslistalla olevalle asiakkaalle että aika on vapautunut.
// Palauttaa true jos lähetys onnistui, false jos epäonnistui.
export async function sendWaitlistNotificationToCustomer(params: {
  customerName: string
  customerEmail: string
  serviceName: string
  businessName: string
  bookingUrl: string  // esim. https://veloure.fi/slug tai https://veloure.fi/en/slug
  locale: string      // jonotuslistalle liittymisen kieli (waitlist.locale)
}): Promise<boolean> {
  const resend = getResend()
  if (!resend) return false
  const { customerName, customerEmail, serviceName, businessName, bookingUrl, locale } = params
  const t = emailTranslator(locale)

  const { error } = await resend.emails.send({
    from: FROM,
    to: customerEmail,
    subject: t('waitlistSubject', { service: serviceName, business: businessName }),
    text: `${t('greeting', { name: customerName })}

${t('waitlistIntro')}

${t('serviceLine', { service: serviceName })}
${t('providerLine', { business: businessName })}

${t('waitlistCta')}
${bookingUrl}

${t('regards')}
${businessName}`,
  })

  if (error) {
    console.error('Jonotuslistailmoituksen lähetys epäonnistui:', resendErr(error))
    return false
  }
  return true
}

// Lähettää 24h muistutuksen asiakkaalle ennen varausta.
// Palauttaa true jos lähetys onnistui, false jos epäonnistui.
export async function sendBookingReminderToCustomer(params: {
  customerName: string
  customerEmail: string
  serviceName: string
  startsAt: string  // ISO-aikaleima
  businessName: string
  locale: string    // varauksen kieli (bookings.locale)
}): Promise<boolean> {
  const resend = getResend()
  if (!resend) return false
  const { customerName, customerEmail, serviceName, startsAt, businessName, locale } = params
  const t = emailTranslator(locale)

  const { error } = await resend.emails.send({
    from: FROM,
    to: customerEmail,
    subject: t('reminderSubject', { service: serviceName, business: businessName }),
    text: `${t('greeting', { name: customerName })}

${t('reminderIntro')}

${t('serviceLine', { service: serviceName })}
${t('timeLine', { dateTime: formatEmailDateTime(t, startsAt, locale) })}
${t('placeLine', { business: businessName })}

${t('contactForChanges', { business: businessName })}

${t('seeYouSoon')}
${businessName}`,
  })

  if (error) {
    console.error('Muistutuksen lähetys epäonnistui:', resendErr(error))
    return false
  }
  return true
}
