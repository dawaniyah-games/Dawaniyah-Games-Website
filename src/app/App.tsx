import React from 'react';
import { MotionConfig } from 'motion/react';
import { Navbar } from './components/layout/Navbar';
import { Hero } from './components/sections/Hero';
import { About } from './components/sections/About';
import { Services } from './components/sections/Services';
import { Portfolio } from './components/sections/Portfolio';
import { DemoProjects } from './components/sections/DemoProjects';
import { WhyChooseUs } from './components/sections/WhyChooseUs';
import { Technologies } from './components/sections/Technologies';
import { Testimonials } from './components/sections/Testimonials';
import { Contact } from './components/sections/Contact';
import { Map } from './components/sections/Map';
import { Footer } from './components/layout/Footer';
import { Toaster } from './components/ui/sonner';

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="bg-[#100425] min-h-screen text-white font-['Inter'] selection:bg-[#DC00D3] selection:text-white overflow-x-hidden">
        <Navbar />
        <Hero />
        <Services />
        <Portfolio />
        <DemoProjects />
        <WhyChooseUs />
        <Technologies />
        <Testimonials />
        <About />
        <Contact />
        <Map />
        <Footer />
        <Toaster />
      </div>
    </MotionConfig>
  );
}