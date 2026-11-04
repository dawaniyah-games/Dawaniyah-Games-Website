import React from 'react';
import { useTranslation } from 'react-i18next';
import { PixelField } from '../brand/PixelField';
import { CardSlot } from './cards/CardSlot';

export function Tools() {
  const { t } = useTranslation();
  const tags = t('toolsSection.uiframework.tags', { returnObjects: true }) as string[];
  const docsUrl = `${import.meta.env.BASE_URL}uiframework/`;

  return (
    <section className="project-section bg-night text-white overflow-hidden">
      <div className="absolute inset-0 mx-auto max-w-[1440px]">
        <PixelField />
      </div>
      <div className="page-gutter project-pad relative">
        <h2 className="t-h2 t-upper">{t('toolsSection.heading')}</h2>
        <p className="t-body-l opacity-75 mt-3.5 max-w-[900px]">{t('toolsSection.subheading')}</p>

        <div className="project-row">
        <a
          href={docsUrl}
          aria-label={t('toolsSection.uiframework.docs')}
          className="project-spot block rounded-[28px] focus-visible:outline-3 focus-visible:outline-saffron"
        >
          <CardSlot id="ui" alt={t('toolsSection.uiframework.title')} sizes="(max-width: 420px) 90vw, 375px" radius={27} className="size-full" />
        </a>

        <div className="project-text">
          <h3 className="t-h3 text-saffron">{t('toolsSection.uiframework.title')}</h3>
          <p className="t-body-l opacity-[0.82] mt-4">{t('toolsSection.uiframework.description')}</p>

          <ul className="flex flex-wrap gap-2.5 mt-7">
            {Array.isArray(tags) &&
              tags.map((tag) => (
                <li key={tag} dir="auto" className="t-body rounded-full border border-white/18 bg-white/8 px-4 py-2">
                  {tag}
                </li>
              ))}
          </ul>

          <div className="flex flex-wrap items-center gap-3.5 mt-[26px]">
            <a href={docsUrl} className="btn btn-saffron t-button">
              {t('toolsSection.uiframework.docs')}
            </a>
            <a
              href="https://github.com/dawaniyah-games/UiFramework"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline-light t-button"
            >
              {t('toolsSection.uiframework.github')}
            </a>
          </div>

          <p className="mt-7">
            <a href={`${docsUrl}guides/organized-game-ui-unity/`} className="t-body text-saffron hover:underline">
              {t('toolsSection.uiframework.guide')}
            </a>
          </p>
        </div>
        </div>
      </div>
    </section>
  );
}
