import React from 'react';
import { motion } from 'motion/react';
import Vector from '../../../imports/Vector';

export function Map() {
  return (
    <section className="py-24 bg-[#100425] relative overflow-hidden">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold font-['Josefin_Sans'] text-white mb-4">
            GLOBAL <span className="text-[#D4AF37]">REACH</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Creating world-class gaming experiences from Riyadh and Cologne
          </p>
        </motion.div>

        {/* Map Container */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6 }}
          className="relative max-w-5xl mx-auto"
        >
          {/* Glow effect behind map */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#DC00D3]/20 via-[#D4AF37]/20 to-[#DC00D3]/20 blur-3xl opacity-50"></div>
          
          {/* Map SVG */}
          <div className="relative z-10 w-full h-auto opacity-80 hover:opacity-100 transition-opacity duration-500">
            <div className="w-full aspect-[1060/538]">
              <Vector />
            </div>
          </div>

          {/* Riyadh Location Pin (Middle East - right side) */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, type: "spring" }}
            className="absolute top-[48.5%] left-[60.3%] -translate-x-1/2 -translate-y-1/2 group"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-[#D4AF37] rounded-full animate-ping"></div>
              <div className="relative bg-[#D4AF37] rounded-full w-5 h-5 border-2 border-white shadow-lg shadow-[#D4AF37]/50"></div>
            </div>
            <div className="absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-[#0B021C] border border-[#D4AF37]/30 px-3 py-2 rounded-lg">
                <p className="text-[#D4AF37] font-semibold text-sm">Riyadh, KSA</p>
              </div>
            </div>
          </motion.div>

          {/* Cologne Location Pin (Germany - left side) */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.7, type: "spring" }}
            className="absolute top-[30.5%] left-[50%] -translate-x-1/2 -translate-y-1/2 group"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-[#D4AF37] rounded-full animate-ping"></div>
              <div className="relative bg-[#D4AF37] rounded-full w-5 h-5 border-2 border-white shadow-lg shadow-[#D4AF37]/50"></div>
            </div>
            <div className="absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-[#0B021C] border border-[#D4AF37]/30 px-3 py-2 rounded-lg">
                <p className="text-[#D4AF37] font-semibold text-sm">Cologne, Germany</p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Optional stats or text below map */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ delay: 0.3 }}
          className="text-center mt-12"
        >
          <p className="text-gray-500 text-sm tracking-wider uppercase">
            Riyadh, KSA • Cologne, Germany
          </p>
        </motion.div>
      </div>
    </section>
  );
}
