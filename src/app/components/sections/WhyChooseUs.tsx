import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Layers, Users, Clock, MonitorSmartphone, Trophy } from 'lucide-react';
import { fadeScale, fadeUp, stagger, VIEWPORT_ONCE } from '../../motion/presets';

const reasons = [
  { icon: Clock, title: "14+ Years Experience", text: "Deep industry knowledge delivering successful titles." },
  { icon: MonitorSmartphone, title: "Cross-Platform", text: "Seamless gameplay on PC, Console, iOS, and Android." },
  { icon: Layers, title: "Scalable Architecture", text: "Robust backends built for millions of players." },
  { icon: Users, title: "Player-Centric", text: "Design philosophies that prioritize user engagement." },
  { icon: ShieldCheck, title: "Quality Assurance", text: "Rigorous testing for bug-free releases." },
  { icon: Trophy, title: "International Reach", text: "Experience working with global studios and teams." },
];

export function WhyChooseUs() {
  return (
    <motion.section
      className="py-24 bg-[#0B021C] relative"
      initial={{ opacity: 0, y: 64 }}
      whileInView={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 64 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      viewport={{ once: false, amount: 0.3 }}
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
            WHY <span className="text-[#DC00D3]">CHOOSE US</span>
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
              className="flex gap-4 items-start p-6 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-[#DC00D3]/50 transition-all duration-300"
            >
              <div className="shrink-0 p-3 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#DC00D3] text-white">
                <item.icon size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2 font-['Josefin_Sans']">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.text}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}
