import React from 'react';
import { Github, Twitter, Linkedin } from 'lucide-react';
import logoIcon from "../../../assets/logo-icon.png";
import { useTranslation } from 'react-i18next';

const LOGO_TEXTS = import.meta.glob(
  [
    '../../../assets/logo-text*.{png,PNG,webp,WEBP,jpg,JPG,jpeg,JPEG,svg,SVG}',
    '../../../assets/Logo-text*.{png,PNG,webp,WEBP,jpg,JPG,jpeg,JPEG,svg,SVG}',
  ],
  {
    eager: true,
    import: 'default',
  },
) as Record<string, string>;

function getLogoTextSrc(language: string | undefined) {
  const isArabic = (language ?? '').toLowerCase().startsWith('ar');
  const entries = Object.entries(LOGO_TEXTS);
  const en = entries.find(([path]) => /\/logo-text\.[a-z0-9]+$/i.test(path))?.[1];
  const ar = entries.find(([path]) => /\/logo-text-ar\.[a-z0-9]+$/i.test(path))?.[1];
  if (import.meta.env.DEV && isArabic && !ar) {
    // eslint-disable-next-line no-console
    console.warn(
      "Arabic is active but 'src/assets/logo-text-ar.*' was not found. Add 'logo-text-ar.png' (or .webp/.svg) to src/assets and restart the dev server.",
    );
  }
  return (isArabic && ar) ? ar : (en ?? entries[0]?.[1]);
}

export function Footer() {
  const { t, i18n } = useTranslation();
  return (
    <footer className="bg-[#050110] py-12 border-t border-[#D4AF37]/10 relative overflow-hidden">
       {/* Background glow */}
       <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#DC00D3] opacity-10 blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <div className="mb-6 md:mb-0 flex flex-col items-center md:items-start">
            <div className="flex flex-col items-center md:items-start gap-2 mb-4">
               <img src={logoIcon} alt="Dawaniyah Games Icon" className="h-16 w-auto object-contain" />
              <img src={getLogoTextSrc(i18n.language)} alt="Dawaniyah Games" className="h-10 w-auto object-contain" />
            </div>
              <p className="text-gray-500 text-sm max-w-xs text-center md:text-left">
                {t('footer.tagline')}
              </p>
              <p className="text-gray-400 text-xs mt-2 max-w-xs text-center md:text-left">
                {t('contact.address')}
              </p>
                <p className="text-gray-400 text-xs mt-1 max-w-xs text-center md:text-left">
                  {t('contact.phone')}
                </p>
          </div>

          <div className="flex gap-8">
            <a href="#hero" className="text-gray-400 hover:text-[#D4AF37] transition-colors text-sm font-medium">{t('nav.home')}</a>
            <a href="#about" className="text-gray-400 hover:text-[#D4AF37] transition-colors text-sm font-medium">{t('nav.about')}</a>
            <a href="#services" className="text-gray-400 hover:text-[#D4AF37] transition-colors text-sm font-medium">{t('nav.services')}</a>
            <a href="#contact" className="text-gray-400 hover:text-[#D4AF37] transition-colors text-sm font-medium">{t('nav.contact')}</a>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-600 text-xs">{t('footer.rights')}</p>

          <div className="flex gap-4">
            <a href="https://www.linkedin.com/company/110097301/" target="_blank" rel="noreferrer" className="text-gray-500 hover:text-[#0077b5] transition-colors">
              <Linkedin size={18} />
            </a>
            <a href="https://github.com/dawaniyah-games/" target="_blank" rel="noreferrer" className="text-gray-500 hover:text-white transition-colors">
              <Github size={18} />
            </a>
            <a href="#" className="text-gray-500 hover:text-[#DC00D3] transition-colors">
              <Twitter size={18} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
