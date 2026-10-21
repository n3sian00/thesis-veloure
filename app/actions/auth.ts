'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { getLocale, getTranslations } from 'next-intl/server'
import { hasLocale } from 'next-intl'
import { isReservedSlug } from '@/lib/reserved-slugs'

// Muuntaa salongin nimen URL-turvalliseksi slugiksi
// Esim. "Studio Lumière & Co." → "studio-lumiere-co"
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')                    // hajoittaa ä → a + yhdistävä merkki
    .replace(/[\u0300-\u036f]/g, '')     // poistaa yhdistävät merkit (skandit yms.)
    .replace(/[^a-z0-9]+/g, '-')         // ei-aakkosnumeeriset → väliviiva
    .replace(/^-+|-+$/g, '')             // poistaa alun ja lopun väliviivat
}

// Server Action: kirjautuminen
// Palauttaa virheviestin tai redirectaa /dashboard-sivulle
export async function loginAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const t = await getTranslations('Errors')
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return t('fillAllFields')
  }

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Käännetyt virheilmoitukset yleisimmille tilanteille
    if (error.message.includes('Invalid login credentials')) {
      return t('invalidCredentials')
    }
    if (error.message.includes('Email not confirmed')) {
      return t('emailNotConfirmed')
    }
    return t('loginFailed')
  }

  // Ohjataan yrittäjän oman businesses.locale-kielen mukaiseen dashboardiin
  // (esim. englantilainen yrittäjä → /en/dashboard), riippumatta siitä
  // millä kielen sivulla kirjautumislomake täytettiin.
  const { data: business } = await supabase
    .from('businesses')
    .select('locale')
    .eq('user_id', data.user.id)
    .single()

  const currentLocale = await getLocale()
  const targetLocale = hasLocale(routing.locales, business?.locale) ? business.locale : currentLocale

  redirect({ href: '/dashboard', locale: targetLocale })
  return null
}

// Server Action: rekisteröityminen
// Luo Supabase Auth -käyttäjän + businesses-rivin automaattisesti
export async function registerAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const t = await getTranslations('Errors')
  const businessName = formData.get('businessName') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!businessName || !email || !password) {
    return t('fillAllFields')
  }

  if (password.length < 8) {
    return t('passwordTooShort')
  }

  const slug = generateSlug(businessName)

  if (!slug) {
    return t('slugInvalid')
  }

  // Reititykseen varatut sanat (esim. "dashboard", "en") eivät kelpaa slugiksi,
  // koska ne törmäisivät sovelluksen omiin reitteihin [locale]-segmentin sisällä.
  if (isReservedSlug(slug)) {
    return t('slugReserved', { slug })
  }

  const supabase = await createSupabaseServerClient()

  // Luodaan Auth-käyttäjä
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      return t('emailTaken')
    }
    return t('registerFailed')
  }

  if (!authData.user) {
    return t('registerFailed')
  }

  // Yrityksen kieli tallennetaan rekisteröintihetken aktiivisesta localesta
  // (esim. /en/register-sivulla rekisteröitynyt yrittäjä → 'en')
  const locale = await getLocale()

  // Luodaan yritysprofiili businesses-tauluun
  const { error: businessError } = await supabase.from('businesses').insert({
    user_id: authData.user.id,
    name: businessName,
    slug,
    locale,
  })

  if (businessError) {
    // Slug on jo käytössä
    if (businessError.code === '23505') {
      return t('slugTaken', { slug })
    }
    return t('businessCreateFailed')
  }

  redirect({ href: '/dashboard', locale })
  return null
}
