import React, { useEffect } from 'react';
import { MotionConfig } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Navbar } from './components/layout/Navbar';
import { Hero } from './components/sections/Hero';
import { DeferredSection, lazyWithPreload } from './components/layout/DeferredSection';
import { Toaster } from './components/ui/sonner';

const Services = lazyWithPreload(() =>
  import('./components/sections/Services').then((m) => ({ default: m.Services })),
);
const GameAssets = lazyWithPreload(() =>
  import('./components/sections/GameAssets').then((m) => ({ default: m.GameAssets })),
);
const Portfolio = lazyWithPreload(() =>
  import('./components/sections/Portfolio').then((m) => ({ default: m.Portfolio })),
);
const WhyChooseUs = lazyWithPreload(() =>
  import('./components/sections/WhyChooseUs').then((m) => ({ default: m.WhyChooseUs })),
);
const XOGame = lazyWithPreload(() =>
  import('./components/sections/XOGame').then((m) => ({ default: m.XOGame })),
);
const Technologies = lazyWithPreload(() =>
  import('./components/sections/Technologies').then((m) => ({ default: m.Technologies })),
);
const Testimonials = lazyWithPreload(() =>
  import('./components/sections/Testimonials').then((m) => ({ default: m.Testimonials })),
);
const About = lazyWithPreload(() =>
  import('./components/sections/About').then((m) => ({ default: m.About })),
);
const Contact = lazyWithPreload(() =>
  import('./components/sections/Contact').then((m) => ({ default: m.Contact })),
);
const FAQ = lazyWithPreload(() =>
  import('./components/sections/FAQ').then((m) => ({ default: m.FAQ })),
);
const Map = lazyWithPreload(() =>
  import('./components/sections/Map').then((m) => ({ default: m.Map })),
);
const Footer = lazyWithPreload(() =>
  import('./components/layout/Footer').then((m) => ({ default: m.Footer })),
);

const SEO_COPY = {
  en: {
    title: 'Dawaniyah Games Studio | Game Developer & Game Studio in KSA',
    description:
      'Dawaniyah Games Studio (multi-platform game development in Riyadh (KSA) and Cologne). Full-cycle development, mobile production, art & animation, UI/UX, LiveOps, and optimization.',
    keywords:
      'game studio, game developer, game development, game company, Riyadh, KSA, Saudi Arabia, Unity, Unreal Engine, Dawaniyah Games',
  },
  ar: {
    title: 'دَوَانِيَّة الألعاب | مطور ألعاب سعودي | شركة تطوير ألعاب في السعودية',
    description:
      'دَوَانِيَّة الألعاب (Dawaniyah Games Studio) مطور ألعاب سعودي وشركة تطوير ألعاب في السعودية (الرياض). نقدم تطوير ألعاب متكامل (Full‑Cycle)، وألعاب موبايل، وتصميم واجهات وتجربة المستخدم (UI/UX)، وفن وتحريك، وLiveOps، وتحسين الأداء — لألعاب عالية الجودة وتجربة لعب قوية.',
    keywords:
      'دَوَانِيَّة الألعاب, Dawaniyah Games, مطور ألعاب سعودي, مطور العاب, مطور العاب في السعودية, مطور العاب في السعوديه, مطور العاب في الرياض, شركة تطوير ألعاب, شركة تطوير ألعاب في السعودية, شركة تصميم ألعاب في السعودية, شركة العاب, استوديو ألعاب, تصميم العاب, تطوير العاب, Unity, Unreal Engine, الرياض, السعودية, KSA',
  },
} as const;

function setMetaContent(selector: string, value: string) {
  const el = document.querySelector<HTMLMetaElement>(selector);
  if (el) el.setAttribute('content', value);
}

function setLinkHref(selector: string, value: string) {
  const el = document.querySelector<HTMLLinkElement>(selector);
  if (el) el.setAttribute('href', value);
}

function getPreferredSiteBaseUrl(): URL | null {
  const raw = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (!url.pathname.endsWith('/')) url.pathname += '/';
    return url;
  } catch {
    return null;
  }
}

function buildCanonicalUrl(isArabic: boolean): string {
  const preferred = getPreferredSiteBaseUrl();

  if (preferred) {
    const basePath = (import.meta.env.BASE_URL as string | undefined) || '/';
    const url = new URL(basePath.replace(/^\//, ''), preferred);
    if (isArabic) url.searchParams.set('lang', 'ar');
    else url.searchParams.delete('lang');
    return url.toString();
  }

  const url = new URL(window.location.href);
  url.hash = '';
  if (isArabic) url.searchParams.set('lang', 'ar');
  else url.searchParams.delete('lang');
  return url.toString();
}

export default function App() {
  const { i18n } = useTranslation();

  // Eagerly preload all sections directly reachable from the navbar so they
  // are ready before the user clicks a nav link (avoids empty-page-on-scroll).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      Services.preload?.();
      Portfolio.preload?.();
      About.preload?.();
      Contact.preload?.();
      // Load the rest of the page content soon after.
      GameAssets.preload?.();
      WhyChooseUs.preload?.();
      XOGame.preload?.();
      Technologies.preload?.();
      Testimonials.preload?.();
      FAQ.preload?.();
      Map.preload?.();
      Footer.preload?.();
    }, 1500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const isArabic = i18n.language?.toLowerCase().startsWith('ar');
    const copy = isArabic ? SEO_COPY.ar : SEO_COPY.en;

    document.title = copy.title;
    setMetaContent('meta[name="description"]', copy.description);
    setMetaContent('meta[name="keywords"]', copy.keywords);
    setMetaContent('meta[property="og:title"]', copy.title);
    setMetaContent('meta[property="og:description"]', copy.description);
    setMetaContent('meta[property="og:locale"]', isArabic ? 'ar_SA' : 'en_US');
    setMetaContent('meta[name="twitter:title"]', copy.title);
    setMetaContent('meta[name="twitter:description"]', copy.description);

    const canonical = buildCanonicalUrl(isArabic);
    setLinkHref('link[rel="canonical"]', canonical);
    setMetaContent('meta[property="og:url"]', canonical);

    const preferred = getPreferredSiteBaseUrl();
    if (preferred) {
      const basePath = (import.meta.env.BASE_URL as string | undefined) || '/';
      const base = new URL(basePath.replace(/^\//, ''), preferred).toString();
      setLinkHref('link[rel="alternate"][hreflang="x-default"]', base);
      setLinkHref('link[rel="alternate"][hreflang="en"]', `${base}?lang=en`);
      setLinkHref('link[rel="alternate"][hreflang="ar"]', `${base}?lang=ar`);
    }
  }, [i18n.language]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="bg-[#100425] min-h-screen text-white font-['Inter'] selection:bg-[#DC00D3] selection:text-white overflow-x-hidden">
        <Navbar />
        <Hero />
        <DeferredSection anchorId="services" component={Services} rootMargin="1400px 0px" />
        <DeferredSection component={GameAssets} rootMargin="1600px 0px" />
        <DeferredSection anchorId="portfolio" component={Portfolio} rootMargin="1800px 0px" />
        <DeferredSection component={WhyChooseUs} rootMargin="2200px 0px" />
        <DeferredSection component={XOGame} rootMargin="2400px 0px" />
        <DeferredSection component={Technologies} rootMargin="2600px 0px" />
        <DeferredSection component={Testimonials} rootMargin="2800px 0px" />
        <DeferredSection anchorId="about" component={About} rootMargin="3200px 0px" />
        <DeferredSection anchorId="contact" component={Contact} rootMargin="3400px 0px" />
        <DeferredSection component={FAQ} rootMargin="3600px 0px" />
        <DeferredSection component={Map} rootMargin="3800px 0px" />
        <DeferredSection component={Footer} rootMargin="4200px 0px" />
        <Toaster />
      </div>
    </MotionConfig>
  );
}