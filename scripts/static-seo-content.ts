// Builds the crawlable HTML that ships inside <div id="root"> for / and /ar/.
//
// The site is a client-rendered React app, so without this the HTML that search engines and
// AI crawlers (GPTBot, ClaudeBot, PerplexityBot, which do not run JavaScript) receive is empty.
// The copy comes from the same locale files the app renders, so it always matches the page.
// React's createRoot().render() replaces this markup as soon as the app starts.

type Locale = Record<string, any>;

function esc(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

const UI_FRAMEWORK_COPY = {
  en: {
    heading: 'UI Framework for Unity (free and open source)',
    text:
      'Our free, open-source UI framework for Unity: smooth, organized game UI, AI-ready. Build Unity game UI from Addressable scenes on a state stack, with shared elements, built-in animations and an editor that generates the scripts, scenes and config for you. Unity 2022.3 to Unity 6, MIT license.',
    docs: 'Read the UI Framework docs',
    github: 'UI Framework on GitHub',
    langLink: 'العربية',
  },
  ar: {
    heading: 'UI Framework لمحرك Unity (مجاني ومفتوح المصدر)',
    text:
      'إطار عمل واجهات مجاني ومفتوح المصدر لمحرك Unity: واجهات ألعاب سلسة ومنظمة، وجاهزة للعمل مع الذكاء الاصطناعي. ابنِ واجهات لعبتك من مشاهد Addressables على كومة حالات، مع عناصر مشتركة وحركات جاهزة ومحرر يولّد السكربتات والمشاهد والإعدادات. يدعم Unity 2022.3 حتى Unity 6 برخصة MIT.',
    docs: 'توثيق UI Framework',
    github: 'UI Framework على GitHub',
    langLink: 'English',
  },
} as const;

export function buildStaticContent(t: Locale, lang: 'en' | 'ar', base: string): string {
  const ui = UI_FRAMEWORK_COPY[lang];
  const services = Object.values<any>(t.services?.items ?? {});
  const faqs = Object.values<any>(t.faq?.items ?? {});
  const projects = Object.values<any>(t.portfolio?.projects ?? {});
  const otherLangHref = lang === 'en' ? `${base}ar/` : base;

  return `
<div id="seo-static" style="max-width:960px;margin:0 auto;padding:32px 20px;color:#fff;background:#100425;font-family:Inter,system-ui,sans-serif;line-height:1.6">
  <header>
    <nav aria-label="Main">
      <a href="${base}#services" style="color:#fff">${esc(t.nav?.services)}</a> ·
      <a href="${base}#portfolio" style="color:#fff">${esc(t.nav?.portfolio)}</a> ·
      <a href="${base}uiframework/" style="color:#fff">UI Framework</a> ·
      <a href="${base}#about" style="color:#fff">${esc(t.nav?.about)}</a> ·
      <a href="${base}#contact" style="color:#fff">${esc(t.nav?.contact)}</a> ·
      <a href="${otherLangHref}" hreflang="${lang === 'en' ? 'ar' : 'en'}" style="color:#fff">${ui.langLink}</a>
    </nav>
    <h1>${esc(t.hero?.descriptionLine1)}</h1>
    <p>${esc(t.hero?.descriptionLine2)}</p>
  </header>
  <section id="services-static">
    <h2>${esc(t.services?.heading)}</h2>
    <p>${esc(t.services?.subheading)}</p>
    <ul>${services.map((s) => `<li><h3>${esc(s.title)}</h3><p>${esc(s.description)}</p></li>`).join('')}</ul>
  </section>
  <section id="uiframework-static">
    <h2>${ui.heading}</h2>
    <p>${ui.text}</p>
    <p><a href="${base}uiframework/" style="color:#fff">${ui.docs}</a> · <a href="https://github.com/dawaniyah-games/UiFramework" style="color:#fff">${ui.github}</a></p>
  </section>
  <section id="portfolio-static">
    <h2>${esc(t.portfolio?.heading)}</h2>
    <ul>${projects.map((p) => `<li>${esc(p.title)}: ${esc(p.category)}</li>`).join('')}<li>UI Framework for Unity</li></ul>
  </section>
  <section id="about-static">
    <h2>${esc(t.about?.heading)}</h2>
    <p><strong>${esc(t.about?.name)}</strong>, ${esc(t.about?.mohamedRole)}. ${esc(t.about?.p1)} ${esc(t.about?.p2)}</p>
  </section>
  <section id="faq-static">
    <h2>${esc(t.faq?.heading)}</h2>
    <p>${esc(t.faq?.subheading)}</p>
    ${faqs.map((f) => `<h3>${esc(f.question)}</h3><p>${esc(f.answer)}</p>`).join('\n    ')}
  </section>
  <footer>
    <p>${esc(t.map?.locationsLine)} · <a href="mailto:info@dawaniyahgames.com" style="color:#fff">info@dawaniyahgames.com</a> · ${esc(t.contact?.phoneKSA)}</p>
  </footer>
</div>`;
}
