import LanguageSwitcher from '@/components/LanguageSwitcher'

// Kirjautumis- ja rekisteröintisivujen yhteinen pohja — kielenvalitsin oikeassa yläkulmassa,
// jotta yrittäjä voi rekisteröityä haluamallaan kielellä (tallentuu businesses.locale-kenttään)
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="fixed top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>
      {children}
    </>
  )
}
