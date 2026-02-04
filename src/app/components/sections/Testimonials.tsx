import React from 'react';
import { motion } from 'motion/react';
import { Quote } from 'lucide-react';
import { fadeUp, stagger, VIEWPORT_ONCE } from '../../motion/presets';

const testimonials = [
  {
    quote: "Dawaniyah Games delivered our project ahead of schedule and with exceptional quality.",
    author: "Alex Johnson",
    role: "CEO, TechStream"
  },
  {
    quote: "Their expertise in Unity and scalable systems saved us months of development time.",
    author: "Sarah Chen",
    role: "Product Lead, MobileFirst"
  },
  {
    quote: "A true partner in creativity. They understood our vision perfectly.",
    author: "Mike Ross",
    role: "Director, IndieStudio"
  }
];

export function Testimonials() {
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
          <h2 className="text-3xl font-bold font-['Josefin_Sans'] text-white">
            CLIENT <span className="text-[#0CFAF5]">STORIES</span>
          </h2>
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
              className="bg-white/5 border border-white/5 p-8 rounded-2xl relative"
            >
              <div className="absolute -top-4 left-8 bg-[#100425] p-2 text-[#0CFAF5]">
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
