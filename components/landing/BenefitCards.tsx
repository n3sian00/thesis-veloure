import { Bot, Target, Smartphone, CheckCircle, Clock, Sparkles } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

const benefits = [
  { id: 'automate', icon: Bot },
  { id: 'guidance', icon: Target },
  { id: 'noWebsite', icon: Smartphone },
  { id: 'fewerMistakes', icon: CheckCircle },
  { id: 'saveTime', icon: Clock },
  { id: 'builtForBeauty', icon: Sparkles },
] as const

export default async function BenefitCards() {
  const t = await getTranslations('Benefits')
  const tAnchors = await getTranslations('Anchors')

  return (
    <section id={tAnchors('features')} className="scroll-mt-16 py-14 md:py-16 px-6 bg-transparent">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 md:mb-12">
          <h2 className="font-serif text-3xl md:text-4xl font-semibold text-chocolate mb-4">
            {t('title')}
          </h2>
          <p className="text-mocha max-w-lg mx-auto">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {benefits.map((b) => (
            <div
              key={b.id}
              className="bg-white rounded-2xl p-7 border border-card-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
            >
              <b.icon className="w-7 h-7 mb-4 text-rose-ink" strokeWidth={1.75} aria-hidden />
              <h3 className="font-serif text-lg font-semibold text-chocolate mb-2">
                {t(`items.${b.id}.title`)}
              </h3>
              <p className="text-sm text-mocha leading-relaxed">{t(`items.${b.id}.description`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
