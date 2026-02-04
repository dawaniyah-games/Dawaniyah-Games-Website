import React from 'react';
import { Github, Twitter, Linkedin } from 'lucide-react';
import logoText from "../../../assets/logo-text.png";
import logoIcon from "../../../assets/logo-icon.png";

export function Footer() {
  return (
    <footer className="bg-[#050110] py-12 border-t border-[#D4AF37]/10 relative overflow-hidden">
       {/* Background glow */}
       <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#DC00D3] opacity-10 blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <div className="mb-6 md:mb-0 flex flex-col items-center md:items-start">
            <div className="flex flex-col items-center md:items-start gap-2 mb-4">
               <img src={logoIcon} alt="Dawaniyah Games Icon" className="h-16 w-auto object-contain" />
               <img src={logoText} alt="Dawaniyah Games" className="h-10 w-auto object-contain" />
            </div>
            <p className="text-gray-500 text-sm max-w-xs text-center md:text-left">
              Crafting immersive digital experiences with a touch of luxury and innovation.
            </p>
          </div>

          <div className="flex gap-8">
            <a href="#hero" className="text-gray-400 hover:text-[#D4AF37] transition-colors text-sm font-medium">Home</a>
            <a href="#about" className="text-gray-400 hover:text-[#D4AF37] transition-colors text-sm font-medium">About</a>
            <a href="#services" className="text-gray-400 hover:text-[#D4AF37] transition-colors text-sm font-medium">Services</a>
            <a href="#contact" className="text-gray-400 hover:text-[#D4AF37] transition-colors text-sm font-medium">Contact</a>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-600 text-xs">
            © 2026 Dawaniyah Games. All rights reserved.
          </p>

          <div className="flex gap-4">
            <a href="https://www.linkedin.com/company/110097301/" target="_blank" rel="noreferrer" className="text-gray-500 hover:text-[#0077b5] transition-colors">
              <Linkedin size={18} />
            </a>
            <a href="https://github.com/dawaniyah-games/" target="_blank" rel="noreferrer" className="text-gray-500 hover:text-white transition-colors">
              <Github size={18} />
            </a>
            <a href="#" className="text-gray-500 hover:text-[#DC00D3] transition-colors">
              <Twitter size={18} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
