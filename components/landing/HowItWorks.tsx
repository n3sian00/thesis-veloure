import { getTranslations } from 'next-intl/server'

const steps = [
  { number: '01', id: 'setup' },
  { number: '02', id: 'share' },
  { number: '03', id: 'aiHandles' },
] as const

export default async function HowItWorks() {
  const t = await getTranslations('HowItWorks')
  const tAnchors = await getTranslations('Anchors')

  return (
    <section id={tAnchors('howItWorks')} className="scroll-mt-16 py-14 md:py-16 px-6 bg-transparent">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 md:mb-12">
          <h2 className="font-serif text-3xl md:text-4xl font-semibold text-chocolate mb-4">
            {t('title')}
          </h2>
          <p className="text-mocha max-w-md mx-auto">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
          {steps.map((step) => (
            <div
              key={step.number}
              className="flex flex-col items-center md:items-start text-center md:text-left"
            >
              <div className="w-14 h-14 rounded-full bg-baby border border-rose-deep/30 flex items-center justify-center mb-6 shrink-0">
                <span className="font-serif text-base font-semibold text-rose-ink">
                  {step.number}
                </span>
              </div>
              <h3 className="font-serif text-xl font-semibold text-chocolate mb-3">
                {t(`steps.${step.id}.title`)}
              </h3>
              <p className="text-sm text-mocha leading-relaxed">{t(`steps.${step.id}.description`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
