import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelTwinkle } from '../brand/PixelTwinkle';
import { HeadlineLine } from './bird/HeadlineLine';
import { IslandBird } from './bird/IslandBird';
import { IslandScene } from './island/IslandScene';
import { WaterfallEdge } from './island/WaterfallEdge';
import { scrollToSection } from '../../utils/sectionPreload';

function scrollToId(id: string) {
  void scrollToSection(id);
}

export function Hero() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const heroRef = useRef<HTMLElement>(null);

  return (
    <div className="relative">
      <section ref={heroRef} id="hero" className="relative overflow-hidden bg-dusk-sky text-night lg:min-h-[min(68vw,980px)]">
        <PixelTwinkle bias peak={0.42} density={0.07} />

        {/* One centred composition: the island is placed against this, so it moves with the copy. */}
        <div className="relative mx-auto max-w-[1440px]">
          <div className="page-gutter relative pt-[112px] lg:pt-[min(13.9vw,200px)] lg:pb-16">
            <div className="lg:w-[min(41.67vw,600px)]">
              <h1 className="t-display t-upper">
                <span className="sr-only">
                  Dawaniyah Games (ديوانية الألعاب): game development studio in Riyadh, Saudi Arabia, serving the UAE, Kuwait and Qatar.
                </span>
                <HeadlineLine text={t('hero.titleTop')} rtl={rtl} />
                <HeadlineLine text={t('hero.titleBottom')} rtl={rtl} />
              </h1>

              <div data-bird-nofly="" className="t-body-l opacity-85 mt-6 lg:max-w-[560px]">
                <p>{t('hero.descriptionLine1')}</p>
                <p>{t('hero.descriptionLine2')}</p>
              </div>

              <div data-bird-nofly="row" className="flex flex-wrap items-center gap-4 mt-9">
                <button type="button" className="btn btn-saffron t-button t-upper" onClick={() => scrollToId('contact')}>
                  {t('hero.ctaServices')}
                </button>
                <button type="button" className="btn btn-outline t-button t-upper" onClick={() => scrollToId('tools')}>
                  {t('hero.ctaPortfolio')}
                </button>
              </div>
            </div>
          </div>

          {/* The page mirrors on /ar/; the island itself does not. On a phone, room for the bird on a palm under the buttons. */}
          <IslandScene className="mt-[max(40px,19vw)] mb-6 w-[112%] -ms-[6%] lg:mt-0 lg:mb-0 lg:ms-0 lg:absolute lg:w-[min(50vw,720px)] lg:top-[min(15.6vw,225px)] lg:end-[max(-2.8vw,-40px)]" />
          <IslandBird />
        </div>
      </section>
      <WaterfallEdge heroRef={heroRef} />
    </div>
  );
}
