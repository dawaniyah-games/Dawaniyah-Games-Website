import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { Button } from '../ui/Button';
import logoIcon from "../../../assets/logo-icon.png";
import { EASE_SMOOTH } from '../../motion/presets';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';
import { preloadSection } from '../../utils/sectionPreload';

const mobileMenuVariants = {
  closed: {
    opacity: 0,
    scaleY: 0.98,
    transition: { duration: 0.18, ease: EASE_SMOOTH },
  },
  open: {
    opacity: 1,
    scaleY: 1,
    transition: { duration: 0.22, ease: EASE_SMOOTH },
  },
} as const;

export function Navbar() {
  const { t } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const links = [
    { name: t('nav.home'), href: '#hero' },
    { name: t('nav.services'), href: '#services' },
    { name: t('nav.tools'), href: '#tools' },
    { name: t('nav.portfolio'), href: '#portfolio' },
    { name: t('nav.about'), href: '#about' },
    { name: t('nav.contact'), href: '#contact' },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);

    if (href === '#hero') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Start downloading the code-split chunk immediately so it's ready.
    preloadSection(href);

    const doScroll = () => {
      const el = document.querySelector(href);
      if (!el) return false;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return true;
    };

    // First attempt — section may already be in the DOM.
    doScroll();

    // Retry after a short delay in case the lazy chunk hasn't mounted yet.
    // Two retries cover typical network variance without feeling jumpy.
    const t1 = window.setTimeout(doScroll, 200);
    const t2 = window.setTimeout(doScroll, 600);

    // Clean up if the component unmounts before the timeouts fire.
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-[#100425]/90 backdrop-blur-md py-3 shadow-[0_4px_30px_rgba(0,0,0,0.5)] border-b border-[#D4AF37]/20' : 'bg-transparent py-6'
      }`}
    >
      <div dir="ltr" className="container mx-auto px-6 flex items-center justify-between lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <a href="#" className="block py-2 group md:justify-self-start">
          <img src={logoIcon} alt="Dawaniyah Games Icon" className="h-12 md:h-14 w-auto object-contain transition-transform duration-300 group-hover:scale-110" />
        </a>

        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center gap-6 justify-self-center">
            {links.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="text-sm font-bold text-gray-300 hover:text-[#D4AF37] transition-colors uppercase tracking-widest font-['Josefin_Sans']"
              >
                {link.name}
              </a>
            ))}
        </div>

        <div className="hidden lg:flex items-center justify-self-end">
          <div className="flex flex-col items-end gap-3 lg:flex-row lg:items-center lg:gap-4">
            <LanguageSwitcher />
            <Button
              className="bg-transparent border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#100425] transition-all duration-300 shadow-[0_0_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_25px_rgba(212,175,55,0.6)] min-w-[120px] lg:min-w-[140px] whitespace-nowrap shrink-0"
              size="sm"
              onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              {t('nav.getStarted')}
            </Button>
          </div>
        </div>

        <div className="lg:hidden flex items-center gap-3">
          <LanguageSwitcher />
          {/* Mobile Toggle */}
          <button
            className="text-[#D4AF37]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            key="mobile-menu"
            initial="closed"
            animate="open"
            exit="closed"
            variants={mobileMenuVariants}
            style={{ transformOrigin: 'top' }}
            className="lg:hidden bg-[#100425] border-t border-[#D4AF37]/20 overflow-hidden"
          >
            <div className="flex flex-col p-6 gap-4">
              {links.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-lg font-bold text-gray-300 hover:text-[#D4AF37] transition-colors font-['Josefin_Sans']"
                  onClick={(e) => handleNavClick(e, link.href)}
                >
                  {link.name}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
