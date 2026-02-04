import React from 'react';
import { motion } from 'motion/react';
import { Gamepad2, Smartphone, Palette, Activity, Code, Rocket } from 'lucide-react';
import { EASE_SMOOTH, fadeUp, stagger, VIEWPORT_ONCE } from '../../motion/presets';

const services = [
  {
    title: "Full-Cycle Game Development",
    description: "From concept to release, we handle every stage of production using Unity & Unreal Engine.",
    icon: Gamepad2,
    color: "#DC00D3"
  },
  {
    title: "Mobile Game Production",
    description: "Native iOS and Android development with a focus on performance and monetization.",
    icon: Smartphone,
    color: "#D4AF37"
  },
  {
    title: "Art & Animation",
    description: "High-quality 2D/3D assets, character design, and fluid animations that bring worlds to life.",
    icon: Palette,
    color: "#DC00D3"
  },
  {
    title: "UI/UX Design",
    description: "Intuitive and immersive interfaces designed specifically for gaming experiences.",
    icon: Code, // Using Code as generic tech/design icon
    color: "#D4AF37"
  },
  {
    title: "LiveOps & Support",
    description: "Continuous updates, event management, and analytics to keep players engaged.",
    icon: Activity,
    color: "#DC00D3"
  },
  {
    title: "Performance Optimization",
    description: "Ensuring smooth framerates and fast load times across all target devices.",
    icon: Rocket,
    color: "#D4AF37"
  }
];

export function Services() {
  return (
    <section id="services" className="py-24 bg-[#0B021C] relative overflow-hidden">
      {/* Background noise/grid */}
      <div className="absolute inset-0 opacity-5" 
           style={{ backgroundImage: 'radial-gradient(#444 1px, transparent 1px)', backgroundSize: '30px 30px' }} 
      />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT_ONCE}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold font-['Josefin_Sans'] text-white mb-4">
            OUR <span className="text-[#D4AF37]">SERVICES</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Comprehensive game development solutions tailored to your vision.
          </p>
        </motion.div>

        <motion.div
          variants={stagger(0.1, 0.05)}
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT_ONCE}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {services.map((service, index) => (
            <motion.div
              key={index}
              variants={fadeUp}
              whileHover={{ y: -10 }}
              transition={{ duration: 0.35, ease: EASE_SMOOTH, type: 'tween' }}
              className="group relative p-8 rounded-2xl bg-[#150630] border border-white/5 hover:border-white/20 transition-all duration-300"
            >
              <div 
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: `radial-gradient(circle at center, ${service.color}15 0%, transparent 70%)` }}
              />
              
              <div 
                className="w-16 h-16 rounded-xl flex items-center justify-center mb-6 text-white text-3xl shadow-lg"
                style={{ backgroundColor: `${service.color}20`, color: service.color, boxShadow: `0 0 20px ${service.color}40` }}
              >
                <service.icon size={32} />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-3 font-['Josefin_Sans'] group-hover:text-[#D4AF37] transition-colors">
                {service.title}
              </h3>
              <p className="text-gray-400 leading-relaxed text-sm">
                {service.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
