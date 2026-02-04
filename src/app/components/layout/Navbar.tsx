import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { Button } from '../ui/Button';
import logoText from "../../../assets/logo-text.png";
import logoIcon from "../../../assets/logo-icon.png";
import { EASE_SMOOTH } from '../../motion/presets';

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
    { name: 'Home', href: '#hero' },
    { name: 'Services', href: '#services' },
    { name: 'Portfolio', href: '#portfolio' },
    { name: 'About', href: '#about' },
    { name: 'Contact', href: '#contact' },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);

    // Immediate scroll to section for faster response
    if (href === '#hero') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const element = document.querySelector(href);
      if (element) {
        // Always center About section for better containment
        const shouldCenter = href === '#services' || href === '#portfolio' || href === '#about' || href === '#contact';
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: shouldCenter ? 'center' : 'start' 
        });
      }
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-[#100425]/90 backdrop-blur-md py-3 shadow-[0_4px_30px_rgba(0,0,0,0.5)] border-b border-[#D4AF37]/20' : 'bg-transparent py-6'
      }`}
    >
      <div className="container mx-auto px-6 flex items-center justify-between">
          <a href="#" className="block py-2 group">
            <img src={logoIcon} alt="Dawaniyah Games Icon" className="h-12 md:h-14 w-auto object-contain transition-transform duration-300 group-hover:scale-110" />
          </a>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
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
          <Button 
            className="bg-transparent border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#100425] transition-all duration-300 shadow-[0_0_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_25px_rgba(212,175,55,0.6)]"
            size="sm" 
            onClick={() => document.getElementById('contact')?.scrollIntoView()}
          >
            Get Started
          </Button>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-[#D4AF37]"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
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
            className="md:hidden bg-[#100425] border-t border-[#D4AF37]/20 overflow-hidden"
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
