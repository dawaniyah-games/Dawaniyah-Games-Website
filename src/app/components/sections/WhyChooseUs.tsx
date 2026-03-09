import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Layers, Users, Clock, MonitorSmartphone, Trophy } from 'lucide-react';
import { fadeScale, fadeUp, stagger, VIEWPORT_ONCE } from '../../motion/presets';
import { useTranslation } from 'react-i18next';

export function WhyChooseUs() {
  const { t } = useTranslation();

  const reasons = [
    {
      icon: Clock,
      title: t('why.reasons.experience.title'),
      text: t('why.reasons.experience.text'),
    },
    {
      icon: MonitorSmartphone,
      title: t('why.reasons.cross.title'),
      text: t('why.reasons.cross.text'),
    },
    {
      icon: Layers,
      title: t('why.reasons.scalable.title'),
      text: t('why.reasons.scalable.text'),
    },
    {
      icon: Users,
      title: t('why.reasons.player.title'),
      text: t('why.reasons.player.text'),
    },
    {
      icon: ShieldCheck,
      title: t('why.reasons.qa.title'),
      text: t('why.reasons.qa.text'),
    },
    {
      icon: Trophy,
      title: t('why.reasons.reach.title'),
      text: t('why.reasons.reach.text'),
    },
  ];

  return (
    <section
      className="py-24 bg-[#0B021C] relative"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#100425] to-[#0B021C] pointer-events-none" />
      <div className="container mx-auto px-6 relative z-10">
        <motion.div 
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT_ONCE}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold font-['Josefin_Sans'] text-white">
            <span className="text-[#DC00D3]">{t('why.heading')}</span>
          </h2>
        </motion.div>

        <motion.div
          variants={stagger(0.1, 0.05)}
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT_ONCE}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {reasons.map((item, index) => (
            <motion.div
              key={index}
              variants={fadeScale}
              className="flex gap-4 items-start p-6 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-[#DC00D3]/50 transition-all duration-300 [html[dir='rtl']_&]:flex-row-reverse"
            >
              <div className="shrink-0 p-3 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#DC00D3] text-white">
                <item.icon size={24} />
              </div>
              <div className="[html[dir='rtl']_&]:text-right">
                <h3 className="text-lg font-bold text-white mb-2 font-['Josefin_Sans']">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.text}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
