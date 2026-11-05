import React from 'react';
import { useTranslation } from 'react-i18next';
import { PixelTwinkle } from '../brand/PixelTwinkle';
import { EmblemLockup } from '../brand/EmblemLockup';

const LINKS = [
  { key: 'nav.home', href: '#hero' },
  { key: 'nav.about', href: '#about' },
  { key: 'nav.services', href: '#services' },
  { key: 'nav.contact', href: '#contact' },
];

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="relative overflow-hidden bg-night text-white">
      <PixelTwinkle cell={44} size={36} rgb="138, 92, 240" peak={0.16} density={0.09} />

      <div className="page-gutter relative pt-[72px] pb-[88px]">
        <EmblemLockup className="w-[min(100%,630px)] mx-auto" />

        <div className="border-t border-[rgb(255_248_239_/_0.15)] mt-16 lg:mt-24 pt-9 flex flex-col md:flex-row md:justify-between gap-8">
          <div>
            <p className="t-body opacity-75">{t('footer.tagline')}</p>
            <p className="t-eyebrow t-upper text-saffron mt-4">{t('map.locationsLine')}</p>
          </div>

          <div className="md:text-end">
            <nav className="flex flex-wrap md:justify-end gap-7">
              {LINKS.map(({ key, href }) => (
                <a key={key} href={href} className="t-nav hover:text-saffron transition-colors">
                  {t(key)}
                </a>
              ))}
            </nav>
            <p className="t-body opacity-60 mt-[22px]">{t('footer.rights')}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
