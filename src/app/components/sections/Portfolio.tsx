import React from 'react';
import { useTranslation } from 'react-i18next';
import { PixelDissolve } from '../brand/PixelDissolve';
import { CardSlot } from './cards/CardSlot';
import type { ProjectCardId } from './cards/projectCards';

const GAMES: { id: ProjectCardId; key: string }[] = [
  { id: 'dendon', key: 'dendon' },
  { id: 'khuzama', key: 'khuzama' },
];

/** One section per game. Dendon opens with the "Our games" heading; the sky runs on into Khuzama. */
export function Portfolio() {
  const { t } = useTranslation();

  return (
    <>
      {GAMES.map(({ id, key }, index) => (
        <section key={id} className={`project-section text-night ${index === 0 ? 'bg-dusk-sky' : 'bg-dusk-sky-reverse'}`}>
          {index === 0 && <PixelDissolve color="#2B1B4D" />}
          <div className="page-gutter project-pad">
            {index === 0 && (
              <div className="mb-11">
                <h2 className="t-h2 t-upper">{t('portfolio.heading')}</h2>
                <p className="t-body-l opacity-75 mt-3.5 max-w-[900px]">{t('portfolio.subheading')}</p>
              </div>
            )}
            <article className={`game-panel ${index === 0 ? 'is-flipped' : ''}`}>
              <div className="project-spot">
                <CardSlot
                  id={id}
                  alt={t(`portfolio.projects.${key}.title`)}
                  sizes="(max-width: 420px) 90vw, 375px"
                  radius={27}
                  className="size-full"
                />
              </div>
              <div className="game-panel-text">
                <span className="t-eyebrow t-upper inline-block rounded-full bg-saffron px-3.5 py-1.5">
                  {t('portfolio.comingSoon')}
                </span>
                <h3 className="t-h2 mt-5">{t(`portfolio.projects.${key}.title`)}</h3>
                <p className="t-body-l opacity-[0.72] mt-3">{t(`portfolio.projects.${key}.category`)}</p>
              </div>
            </article>
          </div>
        </section>
      ))}
    </>
  );
}
