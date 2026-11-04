import React, { useEffect } from 'react';
import { MotionConfig } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Navbar } from './components/layout/Navbar';
import { LoadingScreen } from './components/layout/LoadingScreen';
import { Hero } from './components/sections/Hero';
// Not deferred: the story's flying card needs the project spots to land in.
import { Story } from './components/sections/Story';
import { Tools } from './components/sections/Tools';
import { Portfolio } from './components/sections/Portfolio';
import { DeferredSection, lazyWithPreload } from './components/layout/DeferredSection';
import { Toaster } from './components/ui/sonner';
import { WhatsAppButton } from './components/ui/WhatsAppButton';

const Technologies = lazyWithPreload(() =>
  import('./components/sections/Technologies').then((m) => ({ default: m.Technologies })),
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
    title: 'Game Development Studio in Saudi Arabia & the Gulf | Dawaniyah',
    description:
      'Unity and Unreal game studio in Riyadh, serving Saudi Arabia, the UAE, Kuwait and Qatar. We build mobile and PC games for clients, and open-source tools for Unity developers.',
  },
  ar: {
    title: 'شركة تطوير ألعاب في السعودية والخليج | دوانية الألعاب',
    description:
      'استوديو تطوير ألعاب في الرياض بمحركي Unity وUnreal، نخدم السعودية والإمارات والكويت وقطر. نطوّر ألعاب الجوال والكمبيوتر لعملائنا، وننشر أدوات مفتوحة المصدر لمطوري Unity.',
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
    const url = new URL(basePath.replace(/^\//, '') + (isArabic ? 'ar/' : ''), preferred);
    return url.toString();
  }

  const basePath = (import.meta.env.BASE_URL as string | undefined) || '/';
  return new URL(basePath + (isArabic ? 'ar/' : ''), window.location.origin).toString();
}

export default function App() {
  const { i18n } = useTranslation();

  // Eagerly preload all sections directly reachable from the navbar so they
  // are ready before the user clicks a nav link (avoids empty-page-on-scroll).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      Contact.preload?.();
      Technologies.preload?.();
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
      setLinkHref('link[rel="alternate"][hreflang="en"]', base);
      setLinkHref('link[rel="alternate"][hreflang="ar"]', `${base}ar/`);
    }
  }, [i18n.language]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="site bg-night min-h-screen text-white selection:bg-saffron selection:text-night">
        <LoadingScreen />
        <Navbar />
        <Hero />
        <Story />
        <div id="tools">
          <Tools />
        </div>
        <div id="portfolio">
          <Portfolio />
        </div>
        <DeferredSection component={Technologies} rootMargin="2600px 0px" />
        <DeferredSection anchorId="contact" component={Contact} rootMargin="3400px 0px" />
        <DeferredSection component={FAQ} rootMargin="3600px 0px" />
        <DeferredSection component={Map} rootMargin="3800px 0px" />
        <DeferredSection component={Footer} rootMargin="4200px 0px" />
        <WhatsAppButton />
        <Toaster />
      </div>
    </MotionConfig>
  );
}