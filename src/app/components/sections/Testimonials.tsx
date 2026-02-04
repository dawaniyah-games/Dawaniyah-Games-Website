import React from 'react';
import { motion } from 'motion/react';
import { Quote } from 'lucide-react';
import { fadeUp, stagger, VIEWPORT_ONCE } from '../../motion/presets';
import { useTranslation } from 'react-i18next';

export function Testimonials() {
  const { t } = useTranslation();

  const testimonials = [
    {
      quote: t('testimonials.items.0.quote'),
      author: t('testimonials.items.0.author'),
      role: t('testimonials.items.0.role'),
    },
    {
      quote: t('testimonials.items.1.quote'),
      author: t('testimonials.items.1.author'),
      role: t('testimonials.items.1.role'),
    },
    {
      quote: t('testimonials.items.2.quote'),
      author: t('testimonials.items.2.author'),
      role: t('testimonials.items.2.role'),
    },
  ];

  return (
    <section className="py-20 bg-[#100425] relative">
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT_ONCE}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold font-['Josefin_Sans'] text-white">{t('testimonials.heading')}</h2>
          <p className="text-gray-400 max-w-2xl mx-auto mt-3">{t('testimonials.subheading')}</p>
        </motion.div>

        <motion.div
          variants={stagger(0.1, 0.05)}
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT_ONCE}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {testimonials.map((item, index) => (
            <motion.div
              key={index}
              variants={fadeUp}
              className="bg-white/5 border border-white/5 p-8 rounded-2xl relative [html[dir='rtl']_&]:text-right"
            >
              <div className="absolute -top-4 left-8 [html[dir='rtl']_&]:left-auto [html[dir='rtl']_&]:right-8 bg-[#100425] p-2 text-[#0CFAF5]">
                <Quote size={24} />
              </div>
              <p className="text-gray-300 italic mb-6 leading-relaxed">
                "{item.quote}"
              </p>
              <div>
                <div className="font-bold text-white font-['Josefin_Sans']">{item.author}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">{item.role}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
