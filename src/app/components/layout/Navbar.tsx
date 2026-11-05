import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import logoMark from '../../../assets/brand/logo-mark.webp';
import logoWordEn from '../../../assets/brand/logo-word-en.webp';
import logoWordAr from '../../../assets/brand/logo-word-ar.webp';
import { EASE_SMOOTH } from '../../motion/presets';
import { scrollToSection } from '../../utils/sectionPreload';
import { LanguageSwitcher } from './LanguageSwitcher';

const mobileMenuVariants = {
  closed: { opacity: 0, scaleY: 0.98, transition: { duration: 0.18, ease: EASE_SMOOTH } },
  open: { opacity: 1, scaleY: 1, transition: { duration: 0.22, ease: EASE_SMOOTH } },
} as const;

export function Navbar() {
  const { t, i18n } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isArabic = i18n.language?.startsWith('ar');

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { name: t('nav.home'), href: '#hero' },
    { name: t('nav.services'), href: '#services' },
    { name: t('nav.tools'), href: '#tools' },
    { name: t('nav.portfolio'), href: '#portfolio' },
    { name: t('nav.about'), href: '#about' },
    { name: t('nav.contact'), href: '#contact' },
  ];

  const goTo = (href: string) => {
    setMobileMenuOpen(false);

    if (href === '#hero') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    void scrollToSection(href);
  };

  const onLinkClick = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    event.preventDefault();
    goTo(href);
  };

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 text-night transition-[background-color,box-shadow] duration-300 ${
        isScrolled || mobileMenuOpen ? 'bg-[#fbf3e6]/92 backdrop-blur-md shadow-[0_8px_30px_rgba(15,8,31,0.18)]' : ''
      }`}
    >
      <div className="page-gutter flex items-center justify-between gap-6 h-[88px]">
        <a href="#hero" onClick={(event) => onLinkClick(event, '#hero')} className="flex items-center gap-2.5 shrink-0" aria-label="Dawaniyah Games">
          {/* The emblem and wordmark are separate so the wordmark can read at nav size: in the fixed lockup it came out at 116 px. */}
          <img src={logoMark} alt="" className="h-16 w-auto" />
          <img src={isArabic ? logoWordAr : logoWordEn} alt="" className={isArabic ? 'h-[52px] sm:h-[60px] w-auto' : 'h-[34px] sm:h-[42px] w-auto'} />
        </a>

        <div className="hidden xl:flex items-center gap-[30px] ms-auto">
          {links.map((link) => (
            <a key={link.href} href={link.href} onClick={(event) => onLinkClick(event, link.href)} className="t-nav t-upper whitespace-nowrap hover:text-majlis transition-colors">
              {link.name}
            </a>
          ))}
          <LanguageSwitcher />
        </div>

        <button type="button" className="hidden xl:inline-flex btn btn-night t-button t-upper ms-8 min-[1400px]:ms-[90px] shrink-0" onClick={() => goTo('#contact')}>
          {t('nav.getStarted')}
        </button>

        <div className="xl:hidden flex items-center gap-4">
          <LanguageSwitcher />
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            key="mobile-menu"
            initial="closed"
            animate="open"
            exit="closed"
            variants={mobileMenuVariants}
            style={{ transformOrigin: 'top' }}
            className="xl:hidden overflow-hidden"
          >
            <div className="flex flex-col gap-4 px-5 pt-2 pb-6">
              {links.map((link) => (
                <a key={link.href} href={link.href} className="t-h3" onClick={(event) => onLinkClick(event, link.href)}>
                  {link.name}
                </a>
              ))}
              <button type="button" className="btn btn-night t-button t-upper self-start mt-2" onClick={() => goTo('#contact')}>
                {t('nav.getStarted')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
