'use client'

import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { logoutAction } from '@/app/actions/logout'
import LanguageSwitcher from '@/components/LanguageSwitcher'

// Navigointilinkit sivupalkissa — label on Sidebar-nimiavaruuden käännösavain
const NAV_LINKS = [
  {
    href: '/dashboard',
    label: 'home',
    // Aktiivinen vain tarkalleen /dashboard — ei alalinkeillä
    exact: true,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/dashboard/services',
    label: 'services',
    exact: false,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/bookings',
    label: 'bookings',
    exact: false,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/calendar',
    label: 'calendar',
    exact: false,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/settings',
    label: 'settings',
    exact: false,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
] as const

interface Props {
  business: { name: string; slug: string } | null
}

export default function SidebarNav({ business }: Props) {
  const pathname = usePathname()
  const t = useTranslations('Sidebar')

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-card-border flex flex-col shrink-0">

      {/* Logo + salongin nimi */}
      <div className="px-6 py-5 border-b border-card-border">
        <span className="font-serif text-lg font-semibold text-chocolate">
          Veloure
        </span>
        {business && (
          <p className="text-sm text-mocha mt-0.5 truncate">{business.name}</p>
        )}
      </div>

      {/* Navigointilinkit */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_LINKS.map(({ href, label, exact, icon }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-baby text-rose-deep'
                  : 'text-mocha hover:bg-cream hover:text-chocolate'
              }`}
            >
              <span className={isActive ? 'text-rose-deep' : 'text-mocha/60'}>
                {icon}
              </span>
              {t(label)}
            </Link>
          )
        })}
      </nav>

      {/* Asiakaslinkin esikatselu + uloskirjautuminen */}
      <div className="px-3 pb-4 space-y-2">
        {business && (
          <div className="px-3 py-2.5 bg-baby rounded-lg">
            <p className="text-xs text-mocha mb-0.5">{t('customerLink')}</p>
            <a
              href={`/${business.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-rose-deep font-medium hover:underline truncate block"
            >
              /{business.slug}
            </a>
          </div>
        )}

        <form action={logoutAction}>
          <button
            type="submit"
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-mocha hover:bg-cream hover:text-chocolate transition-colors"
          >
            <svg className="w-4 h-4 text-mocha/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {t('logout')}
          </button>
        </form>

        <div className="px-3 pt-1">
          <LanguageSwitcher />
        </div>
      </div>
    </aside>
  )
}
