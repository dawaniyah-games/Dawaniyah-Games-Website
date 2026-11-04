import React from 'react';
import { useTranslation } from 'react-i18next';
import iconPin from '../../../assets/brand/icon-pin.svg';

const PLACES = [
  { key: 'map.riyadh', tone: 'bg-majlis' },
  { key: 'map.cologne', tone: 'bg-dusk' },
];

export function Map() {
  const { t } = useTranslation();

  return (
    <section className="bg-cream text-night">
      <div className="page-gutter py-16 lg:pt-24 lg:pb-[92px]">
        <h2 className="t-h2 t-upper">{t('map.heading')}</h2>
        <p className="t-body-l opacity-75 mt-3.5 max-w-[900px]">{t('map.subheading')}</p>

        <div className="grid gap-6 md:grid-cols-2 mt-11">
          {PLACES.map(({ key, tone }) => (
            <div key={key} className="flex items-center gap-5 rounded-[28px] bg-white/75 p-7 min-h-[120px]">
              <span className={`grid place-items-center size-14 rounded-full shrink-0 ${tone}`}>
                <img src={iconPin} alt="" width={24} height={24} />
              </span>
              <p className="t-h3">{t(key)}</p>
            </div>
          ))}
        </div>

        <p className="t-eyebrow t-upper text-majlis mt-10">{t('map.locationsLine')}</p>
      </div>
    </section>
  );
}
