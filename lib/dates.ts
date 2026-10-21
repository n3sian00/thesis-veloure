// Kaikki aikavyöhyketietoinen päivämäärälogiikka kootusti.
// Käytetään kalenterissa, TimeSlotPickerissä ja slots-API:ssa.

const TZ = 'Europe/Helsinki'

// Sovelluksen kielikoodi → Intl-locale. en-GB: päivä ennen kuukautta ja 24h-kello,
// kuten suomalaisessa muodossa.
const INTL_LOCALES: Record<string, string> = {
  fi: 'fi-FI',
  en: 'en-GB',
}

/**
 * Muuntaa sovelluksen kielikoodin ('fi' | 'en') Intl-localeksi. Tuntematon → fi-FI.
 */
export function toIntlLocale(locale: string = 'fi'): string {
  return INTL_LOCALES[locale] ?? INTL_LOCALES.fi
}

/**
 * Palauttaa tämän päivän päivämäärän muodossa YYYY-MM-DD Helsingin ajassa.
 */
export function todayHelsinki(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: TZ })
}

/**
 * Muuntaa Date-objektin YYYY-MM-DD -merkkijonoksi Helsingin ajassa.
 * sv-SE-locale tuottaa aina YYYY-MM-DD -muodon.
 */
export function toDateStrHelsinki(date: Date): string {
  return date.toLocaleDateString('sv-SE', { timeZone: TZ })
}

/**
 * Palauttaa seuraavat N arkipäivää (ma–la, ei sunnuntaita) YYYY-MM-DD -merkkijonoina
 * Helsingin ajassa. Aloittaa huomisesta.
 */
export function nextDaysHelsinki(n: number): string[] {
  const days: string[] = []
  // Käytetään puoltapäivää UTC-ankkurina — vältetään kesäajan vaihtoon liittyvät
  // reunatapaukset, koska puolipäivä UTC = 15:00 Helsinki, joka on sama kalenteripäivä.
  const cursor = new Date(todayHelsinki() + 'T12:00:00Z')

  while (days.length < n) {
    cursor.setUTCDate(cursor.getUTCDate() + 1)
    const dateStr = toDateStrHelsinki(cursor)
    // Tarkistetaan viikonpäivä UTC-puolipäivällä (sama Helsingin päivä)
    if (cursor.getUTCDay() !== 0) { // 0 = sunnuntai
      days.push(dateStr)
    }
  }
  return days
}

/**
 * Muuntaa Helsingin paikallisen päivämäärän + ajan UTC Date-objektiksi.
 * Toimii oikein sekä talvi- (UTC+2) että kesäajalla (UTC+3).
 *
 * Esim. helsinkiToUTC('2026-04-08', '09:00') → 2026-04-08T06:00:00.000Z
 */
export function helsinkiToUTC(dateStr: string, timeStr: string): Date {
  // Luodaan "väärä" UTC-päivä syötearvoilla
  const fakeUTC = new Date(`${dateStr}T${timeStr}:00Z`)

  // Mitä Helsinki-aika näyttää tälle UTC-ajalle?
  const helsinkiRepr = fakeUTC.toLocaleString('sv-SE', { timeZone: TZ })
  // sv-SE locale antaa "YYYY-MM-DD HH:MM:SS" -muodon
  const gotAsUTC = new Date(helsinkiRepr.replace(' ', 'T') + 'Z')

  // Siirtymä: haluamamme - saamamme = kuinka paljon siirretään
  const diff = fakeUTC.getTime() - gotAsUTC.getTime()

  return new Date(fakeUTC.getTime() + diff)
}

/**
 * Muotoilee ISO-aikaleiman kellonajaksi (HH:MM) Helsingin ajassa.
 */
export function formatTimeHelsinki(iso: string, locale: string = 'fi'): string {
  return new Date(iso).toLocaleTimeString(toIntlLocale(locale), {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Muotoilee ISO-aikaleiman päivämääräksi + kellonaiksi Helsingin ajassa.
 * short: "ti 8.4. 09:00" | long: "tiistai 8. huhtikuuta 09:00" (fi)
 */
export function formatDateTimeHelsinki(
  iso: string,
  style: 'short' | 'long' = 'short',
  locale: string = 'fi'
): string {
  return new Date(iso).toLocaleDateString(toIntlLocale(locale), {
    timeZone: TZ,
    weekday: style === 'long' ? 'long' : 'short',
    day: 'numeric',
    month: style === 'long' ? 'long' : 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Muotoilee ISO-aikaleiman pitkäksi päivämääräksi Helsingin ajassa ilman kellonaikaa.
 * fi: "tiistai 8. huhtikuuta 2026" | en: "Tuesday 8 April 2026"
 */
export function formatDateLongHelsinki(iso: string, locale: string = 'fi'): string {
  return new Date(iso).toLocaleDateString(toIntlLocale(locale), {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Muotoilee YYYY-MM-DD -merkkijonon lyhyeksi päiväksi, esim. "ti 8.4." / "Tue 8/4"
 */
export function formatDayHelsinki(dateStr: string, locale: string = 'fi'): string {
  // Puolipäivä UTC ankkurina — oikea Helsingin päivä
  return new Date(dateStr + 'T12:00:00Z').toLocaleDateString(toIntlLocale(locale), {
    timeZone: TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
  })
}
