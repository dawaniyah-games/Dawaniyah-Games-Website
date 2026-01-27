import React from 'react';
import { motion } from 'motion/react';

const technologies = [
  "Unity", "Unreal Engine", "C#", "C++", "GitHub", "Firebase", "Photon", "Blender", "Maya", "React", "Node.js", "AWS"
];

export function Technologies() {
  return (
    <section className="py-20 bg-[#100425] overflow-hidden border-y border-white/5">
      <div className="container mx-auto px-6 mb-10 text-center">
        <h2 className="text-2xl font-['Josefin_Sans'] text-gray-400 uppercase tracking-[0.2em]">Powered By</h2>
      </div>
      
      <div className="relative flex overflow-x-hidden group">
        <motion.div 
          className="flex gap-12 animate-marquee whitespace-nowrap py-4"
          animate={{ x: [0, -1000] }}
          transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
          style={{ willChange: "transform" }}
        >
          {[...technologies, ...technologies, ...technologies].map((tech, index) => (
            <div 
              key={index} 
              className="text-3xl font-bold text-white/30 hover:text-[#D4AF37] transition-colors cursor-default font-['Josefin_Sans']"
            >
              {tech}
            </div>
          ))}
        </motion.div>
      </div>
      
      {/* Reverse scroll for visual interest */}
      <div className="relative flex overflow-x-hidden group mt-4">
        <motion.div 
          className="flex gap-12 animate-marquee whitespace-nowrap py-4"
          animate={{ x: [-1000, 0] }}
          transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
          style={{ willChange: "transform" }}
        >
          {[...technologies, ...technologies, ...technologies].map((tech, index) => (
            <div 
              key={index} 
              className="text-3xl font-bold text-white/30 hover:text-[#DC00D3] transition-colors cursor-default font-['Josefin_Sans']"
            >
              {tech}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
