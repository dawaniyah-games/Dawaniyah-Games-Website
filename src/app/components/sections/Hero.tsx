import React from 'react';
import { motion } from 'motion/react';
import { Button } from '../ui/Button';
import logoText from "figma:asset/53719f767293946eb3436bd4f6d1f92f3c2f4306.png";
import logoIcon from "figma:asset/70f06a910fc964d546e82ec2b62a58bc2b2b0877.png";

export function Hero() {
  return (
    <div id="hero" className="relative w-full bg-[#100425]">
      {/* Shared Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden h-full">
        {/* Gradient Blob - Positioned centrally but fixed/sticky-like feel relative to the container */}
        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] rounded-full bg-gradient-to-br from-[#DC00D3] to-[#D4AF37] opacity-10 blur-[60px] md:blur-[100px] animate-pulse" />
        
        {/* Pattern Grid */}
        <div className="absolute inset-0 opacity-20" 
             style={{ 
               backgroundImage: `linear-gradient(rgba(212, 175, 55, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(220, 0, 211, 0.2) 1px, transparent 1px)`,
               backgroundSize: '100px 100px',
               maskImage: 'linear-gradient(to bottom, black 0%, black 80%, transparent 100%)',
               WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 80%, transparent 100%)'
             }} 
        />
      </div>

      {/* Decorative overlay for "Cinematic" feel */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#100425]/50 via-transparent to-[#100425] pointer-events-none" />

      {/* Section 1: Branding (Logo) */}
      <section className="relative z-10 min-h-[60vh] flex flex-col items-center justify-end pb-16 pt-20 -mt-[25px] mb-[20px]">
        <div className="flex flex-col items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotateX: 45 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            transition={{ duration: 1.2, type: "spring", bounce: 0.4 }}
            style={{ perspective: 1000 }}
          >
            <motion.img 
              src={logoIcon} 
              alt="Dawaniyah Games Icon" 
              className="h-36 md:h-52 lg:h-60 w-auto object-contain mb-8 drop-shadow-[0_0_25px_rgba(212,175,55,0.3)]" 
              animate={{ 
                y: [0, -20, 0]
              }}
              transition={{ 
                y: { duration: 6, repeat: Infinity, ease: "easeInOut" }
              }}
              style={{ willChange: "transform" }}
            />
          </motion.div>

          <motion.img 
            src={logoText} 
            alt="Dawaniyah Games" 
            className="h-16 md:h-24 lg:h-28 w-auto object-contain"
            initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
          />
        </div>
      </section>

      {/* Section 2: Hero Content (Text & Buttons) */}
      <section className="relative z-10 min-h-[40vh] flex flex-col items-center justify-start pb-20 px-6 text-center pt-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold font-['Josefin_Sans'] leading-tight mb-8">
            <span className="block text-white mb-2">CRAFTING WORLDS</span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#D4AF37] via-[#F4E3B2] to-[#DC00D3] animate-gradient-x">
              POWERING EXPERIENCES
            </span>
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-[19px] md:text-[21px] text-gray-300 max-w-3xl mx-auto mb-12 font-light leading-relaxed"
        >
          Multi-Platform Game Development, Done Right.
          <br className="hidden md:block" />
          Renowned across Germany, our Cologne and Riyadh teams create exceptional games for mobile, PC, console, and VR. We fuse strong narrative design with advanced engineering to build immersive, memorable experiences for players.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6"
        >
          <Button size="lg" className="bg-[#D4AF37] text-[#100425] hover:bg-[#C5A059] border-none font-bold px-8 py-6 text-lg" onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
            Our Services
          </Button>
          <Button variant="outline" size="lg" className="border-[#DC00D3] text-[#DC00D3] hover:bg-[#DC00D3] hover:text-white font-bold px-8 py-6 text-lg" onClick={() => document.getElementById('portfolio')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
            View Portfolio
          </Button>
        </motion.div>
      </section>
    </div>
  );
}
