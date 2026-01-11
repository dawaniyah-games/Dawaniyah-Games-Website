import React from 'react';
import { motion } from 'motion/react';
import { BadgeCheck, Globe, Zap, Lightbulb, Linkedin } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import profileImg from "figma:asset/2e06796fda7c940cfe8654b5f77d0251299db755.png";

export function About() {
  const stats = [
    { label: "Years Experience", value: "14+", icon: BadgeCheck },
    { label: "Global Projects", value: "International", icon: Globe },
    { label: "Systems Scaled", value: "High Perf", icon: Zap },
    { label: "Creative Vision", value: "Innovative", icon: Lightbulb },
  ];

  return (
    <section id="about" className="py-20 bg-[#100425] relative">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center gap-12">
          {/* Image Side */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="w-full md:w-1/2 flex justify-center"
          >
            <div className="relative w-80 h-80 md:w-96 md:h-96">
              <div className="absolute -inset-4 rounded-2xl border-4 border-[#DC00D3] rotate-6 opacity-60 shadow-[0_0_20px_rgba(220,0,211,0.3)]"></div>
              <div className="absolute -inset-4 rounded-2xl border-4 border-[#D4AF37] -rotate-6 opacity-60 shadow-[0_0_20px_rgba(212,175,55,0.3)]"></div>
              <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(220,0,211,0.6)] border border-[#DC00D3]/30 bg-[#100425]">
                 <img 
                   src={profileImg} 
                   alt="Mohamed Moghazi" 
                   className="w-full h-full object-cover object-[50%_10%] scale-110 grayscale brightness-75 hover:grayscale-0 hover:brightness-100 transition-all duration-500"
                 />
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#100425_100%)] opacity-80 pointer-events-none mix-blend-multiply"></div>
              </div>
            </div>
          </motion.div>

          {/* Text Side */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="w-full md:w-1/2"
          >
            <h2 className="text-4xl font-bold font-['Josefin_Sans'] text-white mb-6">
              MEET THE <span className="text-[#DC00D3]">FOUNDER</span>
            </h2>
            <h3 className="text-xl text-[#D4AF37] font-semibold mb-4">Mohamed Moghazi</h3>
            <p className="text-gray-300 mb-6 leading-relaxed">
              With over 14 years of experience in the game development industry, I specialize in crafting immersive gameplay mechanics, building scalable systems in Unity and Unreal, and leading international teams to success.
            </p>
            <p className="text-gray-300 mb-8 leading-relaxed">
              Dawaniyah Games represents the culmination of this journey—a studio dedicated to pushing the boundaries of what's possible in interactive entertainment, focusing on innovation, quality, and performance.
            </p>

            <div className="grid grid-cols-2 gap-6 mb-8">
              {stats.map((stat, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#DC00D3]/10 text-[#DC00D3]">
                    <stat.icon size={24} />
                  </div>
                  <div>
                    <div className="font-bold text-white text-lg">{stat.value}</div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <a 
                href="https://www.linkedin.com/in/mohamed-moghazi-9a729554/" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-transparent border border-[#0077b5] text-[#0077b5] hover:bg-[#0077b5] hover:text-white rounded-lg font-medium transition-colors"
              >
                <Linkedin size={20} />
                Connect on LinkedIn
              </a>
              <a 
                href="https://dawaniyah-games.github.io/my-cv/" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#DC00D3]/10 hover:bg-[#DC00D3]/20 text-[#DC00D3] border border-[#DC00D3]/30 rounded-lg font-medium transition-colors"
              >
                <BadgeCheck size={20} />
                View Full CV
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
