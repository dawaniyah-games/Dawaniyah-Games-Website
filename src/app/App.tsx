import React, { useEffect } from 'react';
import { MotionConfig } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Navbar } from './components/layout/Navbar';
import { Hero } from './components/sections/Hero';
import { About } from './components/sections/About';
import { Services } from './components/sections/Services';
import { GameAssets } from './components/sections/GameAssets';
import { FAQ } from './components/sections/FAQ';
import { Portfolio } from './components/sections/Portfolio';
import { WhyChooseUs } from './components/sections/WhyChooseUs';
import { Technologies } from './components/sections/Technologies';
import { Testimonials } from './components/sections/Testimonials';
import { XOGame } from './components/sections/XOGame';
import { Contact } from './components/sections/Contact';
import { Map } from './components/sections/Map';
import { Footer } from './components/layout/Footer';
import { Toaster } from './components/ui/sonner';

const SEO_COPY = {
  en: {
    title: 'Dawaniyah Games Studio | Game Developer & Game Studio in KSA',
    description:
      'Dawaniyah Games Studio (multi-platform game development in Riyadh (KSA) and Cologne). Full-cycle development, mobile production, art & animation, UI/UX, LiveOps, and optimization.',
    keywords:
      'game studio, game developer, game development, game company, Riyadh, KSA, Saudi Arabia, Unity, Unreal Engine, Dawaniyah Games',
  },
  ar: {
    title: 'دَوَانِيَّة الألعاب | مطور العاب في السعودية | شركة تصميم الالعاب الالكترونية',
    description:
      'دَوَانِيَّة الألعاب (Dawaniyah Games Studio) مطور العاب في السعوديه ومطور العاب في السعودية. شركة تصميم الالعاب الالكترونية تقدم تطوير ألعاب متكامل، ألعاب موبايل، تصميم UI/UX، فن وتحريك، LiveOps وتحسين الأداء. أفضل شركة تصميم الالعاب الالكترونية لعملاء يبحثون عن جودة وأداء وتجربة لعب قوية.',
    keywords:
      'دَوَانِيَّة الألعاب, Dawaniyah Games, مطور العاب, مطور العاب في السعودية, مطور العاب في السعوديه, مطور العاب في الرياض, شركة العاب, شركة تصميم الالعاب الالكترونية, أفضل شركة تصميم الالعاب الالكترونية, تصميم العاب, تطوير العاب, Unity, Unreal Engine, الرياض, السعودية',
  },
} as const;

function setMetaContent(selector: string, value: string) {
  const el = document.querySelector<HTMLMetaElement>(selector);
  if (el) el.setAttribute('content', value);
}

export default function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const isArabic = i18n.language?.toLowerCase().startsWith('ar');
    const copy = isArabic ? SEO_COPY.ar : SEO_COPY.en;

    document.title = copy.title;
    setMetaContent('meta[name="description"]', copy.description);
    setMetaContent('meta[name="keywords"]', copy.keywords);
    setMetaContent('meta[property="og:title"]', copy.title);
    setMetaContent('meta[property="og:description"]', copy.description);
    setMetaContent('meta[name="twitter:title"]', copy.title);
    setMetaContent('meta[name="twitter:description"]', copy.description);
  }, [i18n.language]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="bg-[#100425] min-h-screen text-white font-['Inter'] selection:bg-[#DC00D3] selection:text-white overflow-x-hidden">
        <Navbar />
        <Hero />
        <Services />
        <GameAssets />
        <Portfolio />
        <WhyChooseUs />
        <XOGame />
        <Technologies />
        <Testimonials />
        <About />
        <Contact />
        <FAQ />
        <Map />
        <Footer />
        <Toaster />
      </div>
    </MotionConfig>
  );
}