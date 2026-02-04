import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { BadgeCheck, Globe, Zap, Lightbulb, Linkedin } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import profileImg from "../../../assets/profile.jpg";
import { EASE_SMOOTH, fadeUp, stagger, VIEWPORT_ONCE } from '../../motion/presets';
import { useSection3DScroll } from './useSection3DScroll';
import { useTranslation } from 'react-i18next';

const founderImageAnim = {
  hidden: { opacity: 0, x: -120 },
  show: { opacity: 1, x: 0, transition: { duration: 1.1, ease: EASE_SMOOTH } },
  exit: { opacity: 0, x: -120, transition: { duration: 0.7, ease: EASE_SMOOTH } }
} as const;
const founderTextAnim = {
  hidden: { opacity: 0, x: 120 },
  show: { opacity: 1, x: 0, transition: { duration: 1.1, ease: EASE_SMOOTH } },
  exit: { opacity: 0, x: 120, transition: { duration: 0.7, ease: EASE_SMOOTH } }
} as const;

export function About() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLHeadingElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  useSection3DScroll({ section: sectionRef, image: imageRef, header: headerRef, text: textRef, stats: statsRef });
  const stats = [
    { label: t('about.stats.years'), value: "14+", icon: BadgeCheck },
    { label: t('about.stats.global'), value: t('about.stats.international'), icon: Globe },
    { label: t('about.stats.scaled'), value: t('about.stats.highPerf'), icon: Zap },
    { label: t('about.stats.vision'), value: t('about.stats.innovative'), icon: Lightbulb },
  ];

  return (
    <section id="about" ref={sectionRef} className="py-20 bg-[#100425] relative">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row md:[html[dir='rtl']_&]:flex-row-reverse items-center gap-12">
          {/* Image Side */}
          <motion.div 
            ref={imageRef}
            variants={founderImageAnim}
            initial="hidden"
            whileInView="show"
            exit="exit"
            viewport={VIEWPORT_ONCE}
            className="w-full md:w-1/2 flex justify-center"
          >
            <div className="relative w-80 h-80 md:w-96 md:h-96">
              <div className="absolute -inset-4 rounded-2xl border-4 border-[#DC00D3] rotate-6 opacity-60 shadow-[0_0_20px_rgba(220,0,211,0.3)]"></div>
              <div className="absolute -inset-4 rounded-2xl border-4 border-[#D4AF37] -rotate-6 opacity-60 shadow-[0_0_20px_rgba(212,175,55,0.3)]"></div>
              <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(220,0,211,0.6)] border border-[#DC00D3]/30 bg-[#100425]">
                   <ImageWithFallback
                     src={profileImg}
                     alt="Mohamed Moghazi"
                     loading="lazy"
                     decoding="async"
                     className="w-full h-full object-cover object-[50%_12%] scale-105 brightness-90 contrast-110 saturate-90 transition-all duration-700 group-hover:scale-110 hover:scale-110 hover:brightness-100 hover:saturate-100"
                   />
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,#100425_100%)] opacity-60 pointer-events-none"></div>
              </div>
            </div>
          </motion.div>

          {/* Text Side */}
          <motion.div 
            ref={textRef}
            variants={founderTextAnim}
            initial="hidden"
            whileInView="show"
            exit="exit"
            viewport={VIEWPORT_ONCE}
            className="w-full md:w-1/2 md:[html[dir='rtl']_&]:text-right"
          >
            <h2 ref={headerRef} className="text-4xl font-bold font-['Josefin_Sans'] text-white mb-6">
              <span className="text-[#DC00D3]">{t('about.heading')}</span>
            </h2>
            <h3 className="text-xl text-[#D4AF37] font-semibold mb-4">{t('about.name')}</h3>
            <p className="text-gray-300 mb-6 leading-relaxed">
              {t('about.p1')}
            </p>
            <p className="text-gray-300 mb-8 leading-relaxed">
              {t('about.p2')}
            </p>

            <motion.div
              ref={statsRef}
              variants={stagger(0.06, 0.02)}
              initial="hidden"
              whileInView="show"
              viewport={VIEWPORT_ONCE}
              className="grid grid-cols-2 gap-6 mb-8"
            >
              {stats.map((stat, index) => (
                <motion.div key={index} variants={fadeUp} className="flex items-center gap-3 [html[dir='rtl']_&]:flex-row-reverse">
                  <div className="p-2 rounded-lg bg-[#DC00D3]/10 text-[#DC00D3]">
                    <stat.icon size={24} />
                  </div>
                  <div>
                    <div className="font-bold text-white text-lg">{stat.value}</div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide">{stat.label}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <div className="flex gap-4 [html[dir='rtl']_&]:flex-row-reverse">
              <a 
                href="https://www.linkedin.com/in/mohamed-moghazi-9a729554/" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-transparent border border-[#0077b5] text-[#0077b5] hover:bg-[#0077b5] hover:text-white rounded-lg font-medium transition-colors"
              >
                <Linkedin size={20} />
                {t('about.connect')}
              </a>
              <a 
                href="https://dawaniyah-games.github.io/my-cv/" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#DC00D3]/10 hover:bg-[#DC00D3]/20 text-[#DC00D3] border border-[#DC00D3]/30 rounded-lg font-medium transition-colors"
              >
                <BadgeCheck size={20} />
                {t('about.viewCv')}
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
