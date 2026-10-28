import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, Github } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import imgUiFramework from '../../../assets/Uiframework_promo.jpg';
import imgUiFrameworkWebpSrcSet from '../../../assets/Uiframework_promo.jpg?w=320;480;640;768&format=webp&as=srcset';
import { fadeLeft, fadeScale, fadeUp, VIEWPORT_ONCE } from '../../motion/presets';

// Developer tools the studio builds and open-sources. One card per tool; UI Framework is the first.
export function Tools() {
  const { t } = useTranslation();
  const tags = t('toolsSection.uiframework.tags', { returnObjects: true }) as string[];
  const docsUrl = `${import.meta.env.BASE_URL}uiframework/`;

  return (
    <section className="py-24 bg-[#0B021C] relative">
      <div className="container mx-auto px-6">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT_ONCE}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold font-['Josefin_Sans'] text-white mb-4">
            <span className="text-[#D4AF37]">{t('toolsSection.heading')}</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">{t('toolsSection.subheading')}</p>
        </motion.div>

        <div className="flex flex-col md:flex-row md:[html[dir='rtl']_&]:flex-row-reverse items-center justify-center gap-10 lg:gap-16 max-w-5xl mx-auto">
          <motion.a
            variants={fadeScale}
            initial="hidden"
            whileInView="show"
            viewport={VIEWPORT_ONCE}
            href={docsUrl}
            className="block shrink-0 w-full max-w-[320px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
            aria-label={t('toolsSection.uiframework.docs')}
          >
            <picture>
              <source type="image/webp" srcSet={imgUiFrameworkWebpSrcSet} sizes="(max-width: 420px) 90vw, 320px" />
              <img
                src={imgUiFramework}
                alt={t('toolsSection.uiframework.title')}
                loading="lazy"
                decoding="async"
                className="w-full h-auto"
              />
            </picture>
          </motion.a>

          <motion.div
            variants={fadeLeft}
            initial="hidden"
            whileInView="show"
            viewport={VIEWPORT_ONCE}
            className="max-w-xl text-center md:text-left md:[html[dir='rtl']_&]:text-right"
          >
            <h3 className="text-3xl font-bold text-white mb-4 font-['Josefin_Sans']">
              {t('toolsSection.uiframework.title')}
            </h3>
            <p className="text-gray-300 leading-relaxed mb-6">{t('toolsSection.uiframework.description')}</p>
            <div className="flex flex-wrap justify-center md:justify-start md:[html[dir='rtl']_&]:justify-end gap-2 mb-8">
              {Array.isArray(tags) &&
                tags.map((tag) => (
                  <span
                    key={tag}
                    dir="auto"
                    className="text-xs px-3 py-1 rounded-full bg-white/10 text-white border border-white/10"
                  >
                    {tag}
                  </span>
                ))}
            </div>
            <div className="flex flex-col sm:flex-row md:[html[dir='rtl']_&]:flex-row-reverse gap-4 justify-center md:justify-start">
              <a
                href={docsUrl}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#D4AF37] text-[#100425] hover:bg-[#C5A059] font-bold px-6 py-3"
              >
                <BookOpen size={18} /> {t('toolsSection.uiframework.docs')}
              </a>
              <a
                href="https://github.com/dawaniyah-games/UiFramework"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-[#DC00D3] text-[#DC00D3] hover:bg-[#DC00D3] hover:text-white font-bold px-6 py-3"
              >
                <Github size={18} /> {t('toolsSection.uiframework.github')}
              </a>
            </div>
            <p className="mt-6 text-sm text-gray-400">
              <a href={`${docsUrl}guides/organized-game-ui-unity/`} className="text-[#D4AF37] hover:underline">
                {t('toolsSection.uiframework.guide')}
              </a>
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
