import React, { useRef } from 'react';
import vid01 from '../../../assets/vid_01.mp4';
import { motion } from 'motion/react';
import { Button } from '../ui/Button';
import logoIcon from "../../../assets/logo-icon.png";
import { EASE_SMOOTH, fadeUp, VIEWPORT_ONCE } from '../../motion/presets';
import { useHero3DScroll } from './useHero3DScroll';
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

export function Hero() {
  const { t, i18n } = useTranslation();
  const logoRef = useRef<HTMLImageElement | null>(null);
  const logoTextRef = useRef<HTMLImageElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const subtitleRef = useRef<HTMLSpanElement | null>(null);
  const descRef = useRef<HTMLParagraphElement | null>(null);
  const btnsRef = useRef<HTMLDivElement | null>(null);
  useHero3DScroll(logoRef, logoTextRef, titleRef, subtitleRef, descRef, btnsRef);
  return (
    <div id="hero" className="relative w-full bg-[#100425]">
      {/* This empty div ensures the Navbar is always on top, video comes after */}
      <div className="h-0" />
      {/* Background Video */}
      <video
        className="absolute inset-0 w-full h-full object-cover z-0"
        src={vid01}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        style={{ pointerEvents: 'none' }}
      />
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/80 z-0" />
      {/* Shared Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden h-full">
        {/* Pattern Grid */}
        <div className="absolute inset-0 opacity-20" 
             style={{ 
               backgroundImage: `linear-gradient(rgba(212, 175, 55, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(220, 0, 211, 0.2) 1px, transparent 1px)`,
               backgroundSize: '100px 100px',
               maskImage: 'linear-gradient(to bottom, black 0%, black 80%, transparent 100%)',
               WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 80%, transparent 100%)'
             }} 
        />
      </div>

      {/* Decorative overlay for "Cinematic" feel */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#100425]/50 via-transparent to-[#100425] pointer-events-none" />

      {/* Section 1: Branding (Logo) */}
      <section className="relative z-10 min-h-[60vh] flex flex-col items-center justify-end pb-16 pt-20 -mt-[25px] mb-[20px]">
        <div className="flex flex-col items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotateX: 45 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            transition={{ duration: 1.2, type: "spring", bounce: 0.4 }}
            style={{ perspective: 1000 }}
          >
            <motion.img 
              ref={logoRef}
              src={logoIcon} 
              alt="Dawaniyah Games Icon" 
              className="h-42 md:h-59 lg:h-68 w-auto object-contain mb-8 drop-shadow-[0_0_32px_rgba(212,175,55,0.4)]"
              animate={{ 
                y: [0, -20, 0]
              }}
              transition={{ 
                y: { duration: 6, repeat: Infinity, ease: "easeInOut" }
              }}
              style={{ willChange: "transform" }}
            />
          </motion.div>

          <motion.img 
            ref={logoTextRef}
            src={getLogoTextSrc(i18n.language)} 
            alt="Dawaniyah Games" 
            className="h-16 md:h-24 lg:h-28 w-auto object-contain"
            initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.9, delay: 0.45, ease: EASE_SMOOTH, type: 'tween' }}
          />
        </div>
      </section>

      {/* Section 2: Hero Content (Text & Buttons) */}
      <section className="relative z-10 min-h-[40vh] flex flex-col items-center justify-start pb-20 px-6 text-center pt-8">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT_ONCE}
        >
          <h1 ref={titleRef} className="text-[2.35rem] md:text-[3.55rem] lg:text-[4.1rem] font-bold font-['Josefin_Sans'] leading-tight mb-8 -mt-2">
            <span className="block text-white mb-2 text-[0.95em]">{t('hero.titleTop')}</span>
            <span ref={subtitleRef} className="bg-clip-text text-transparent bg-gradient-to-r from-[#D4AF37] via-[#F4E3B2] to-[#DC00D3] animate-gradient-x text-[0.95em]">
              {t('hero.titleBottom')}
            </span>
          </h1>
        </motion.div>

        <motion.p
          ref={descRef}
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT_ONCE}
          transition={{ delay: 0.12 }}
          className="text-[19px] md:text-[21px] text-gray-300 max-w-3xl mx-auto mb-12 font-light leading-relaxed"
        >
          {t('hero.descriptionLine1')}
          <br className="hidden md:block" />
          {t('hero.descriptionLine2')}
        </motion.p>

        <motion.div
          ref={btnsRef}
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT_ONCE}
          transition={{ delay: 0.18 }}
          className="flex flex-col sm:flex-row sm:[html[dir='rtl']_&]:flex-row-reverse items-center justify-center gap-6"
        >
          <Button size="lg" className="bg-[#D4AF37] text-[#100425] hover:bg-[#C5A059] border-none font-bold px-8 py-6 text-lg" onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
            {t('hero.ctaServices')}
          </Button>
          <Button variant="outline" size="lg" className="border-[#DC00D3] text-[#DC00D3] hover:bg-[#DC00D3] hover:text-white font-bold px-8 py-6 text-lg" onClick={() => document.getElementById('portfolio')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
            {t('hero.ctaPortfolio')}
          </Button>
        </motion.div>
      </section>
    </div>
  );
}
