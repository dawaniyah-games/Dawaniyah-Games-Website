// Splits the one-file UI Framework docs (UiFramework/docs/index.html, one tab per <section class="panel">)
// into one page per tab, so each topic has its own URL, title and description that search engines can rank:
//
//   /uiframework/              Overview
//   /uiframework/get-started/  Get started
//   /uiframework/tutorial/     Tutorial
//   ...
//
// The docs stay one file in the UiFramework repo; this runs at sync time. Each page keeps only its own panel,
// the tab bar becomes real links, links into other tabs point at their pages, and old hash links
// (/uiframework/#t-state, /uiframework/#tutorial) are forwarded to the page that holds the id.

const PAGES = {
  overview: {
    slug: '',
    // The overview keeps the title and description written in the docs page itself.
  },
  start: {
    slug: 'get-started',
    title: 'Get Started: Install the Unity UI Framework | Dawaniyah Games',
    description:
      'Install UI Framework for Unity from a git URL, set up the config, make your first screen and show it from code with UiManager.ShowState. Unity 2022.3 to Unity 6.',
  },
  tutorial: {
    slug: 'tutorial',
    title: 'Unity UI Tutorial: Build Screens with the UI Setup Manager',
    description:
      'Step-by-step Unity UI tutorial with short videos: create elements and states, pick animations, validate scenes and build the runtime config with UI Framework.',
  },
  concepts: {
    slug: 'concepts',
    title: 'Unity UI Architecture: State Stack and Addressable Scenes',
    description:
      'How UI Framework structures Unity UI: a LIFO state stack, one Addressable scene per element, shared elements with reference counting, and one scene contract.',
  },
  animations: {
    slug: 'animations',
    title: 'Unity UI Transitions and Animation Presets | UI Framework',
    description:
      'Ten tuned Unity UI animation presets (fade, scale, slides, pops, shake), overlapping screen transitions with no empty frame, and per-call animation overrides.',
  },
  showcase: {
    slug: 'showcase',
    title: 'Unity Mobile Game UI Example: Showcase App | UI Framework',
    description:
      'A complete mobile game UI built only with UI Framework: intro, tabs, shared top and nav bars, store, leaderboard, and reward and purchase popups. Free to clone.',
  },
  api: {
    slug: 'api',
    title: 'UI Framework for Unity API: UiManager, UiElement, UiTransition',
    description:
      'API reference for UI Framework for Unity: UiManager.ShowState, HideUI and InitializeAsync, UiElement.Populate, UiTransition, TweenPresets and other types.',
  },
  faq: {
    slug: 'faq',
    title: 'UI Framework for Unity: FAQ and Troubleshooting',
    description:
      'Answers to common UI Framework for Unity questions and errors: UiConfig not found, state key not registered, popups, teamwork, mobile performance and cost.',
  },
};

function escapeAttr(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
}

function setMeta(html, pattern, value) {
  return html.replace(pattern, (_match, start, end) => `${start}${escapeAttr(value)}${end}`);
}

export function splitDocs(html, siteUrl) {
  const docsPath = new URL(siteUrl).pathname; // "/uiframework/"
  const pagePath = (panel) => `${docsPath}${PAGES[panel]?.slug ? `${PAGES[panel].slug}/` : ''}`;

  const mainStart = html.indexOf('<main>');
  const mainEnd = html.indexOf('</main>');
  if (mainStart < 0 || mainEnd < 0) throw new Error('Docs HTML: no <main> element.');
  const before = html.slice(0, mainStart + '<main>'.length);
  const main = html.slice(mainStart + '<main>'.length, mainEnd);
  const after = html.slice(mainEnd);

  // Panels, in page order.
  const panelPattern = /<section class="panel" id="([^"]+)" data-panel="([^"]+)"[^>]*>/g;
  const starts = [...main.matchAll(panelPattern)].map((m) => ({ index: m.index, id: m[1], name: m[2] }));
  if (starts.length === 0) throw new Error('Docs HTML: no panels found.');
  const panels = starts.map((s, i) => ({ ...s, body: main.slice(s.index, starts[i + 1]?.index ?? main.length) }));
  for (const panel of panels) {
    if (!PAGES[panel.name]) throw new Error(`Docs HTML: tab "${panel.name}" has no page entry in split-uiframework-docs.mjs.`);
  }

  // Where every id lives, so links and old hash URLs can be sent to the right page.
  const idPanel = new Map();
  for (const panel of panels) {
    for (const m of panel.body.matchAll(/\sid="([^"]+)"/g)) idPanel.set(m[1], panel);
  }
  const hrefFor = (id) => {
    const panel = idPanel.get(id);
    if (!panel) return null;
    return id === panel.id ? pagePath(panel.name) : `${pagePath(panel.name)}#${id}`;
  };

  const ldBlocks = [...before.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>\n?/g)];
  const breadcrumbBase = 'https://www.dawaniyahgames.com/';

  return panels.map((panel) => {
    const page = PAGES[panel.name];
    const isOverview = page.slug === '';
    const url = new URL(pagePath(panel.name), siteUrl).toString();

    // Only this tab's panel, shown.
    let body = panel.body.replace(/(<section class="panel"[^>]*?)\s+hidden(\s*>)/, '$1$2');
    let out = before + '\n' + body + after;

    // Tab bar: buttons become links to the pages.
    out = out.replace(
      /<button class="tab" role="tab" data-tab="([^"]+)" aria-selected="[^"]*">([^<]*)<\/button>/g,
      (_m, name, label) =>
        `<a class="tab" role="tab" data-tab="${name}" aria-selected="${name === panel.name}" href="${pagePath(name)}">${label}</a>`,
    );
    out = out.replace('</style>', 'a.tab { text-decoration: none; display: inline-block; }\n</style>');

    // Links to ids in other tabs point at their pages.
    out = out.replace(/href="#([^"]+)"/g, (match, id) => {
      if (idPanel.get(id) === panel && id !== panel.id) return match;
      const href = hrefFor(id);
      return href ? `href="${href}"` : match;
    });

    // Script: tabs are links now, and a hash this page doesn't hold goes to the page that does.
    out = out.replace(
      /\n\s*tabs\.forEach\(function \(tab\) \{\n\s*tab\.addEventListener\("click", function \(\) \{\n\s*location\.hash = tab\.getAttribute\("data-tab"\);\n\s*\}\);\n\s*\}\);\n/,
      '\n',
    );
    const elsewhere = {};
    for (const [id, owner] of idPanel) if (owner !== panel) elsewhere[id] = hrefFor(id);
    out = out.replace(
      /if \(!panel\) \{\n(\s*)showPanel\("overview"\);/,
      (_m, indent) =>
        `if (!panel) {\n${indent}if (id && DOC_PAGES[id]) {\n${indent}    location.replace(DOC_PAGES[id]);\n${indent}    return;\n${indent}}\n${indent}showPanel(${JSON.stringify(panel.name)});`,
    );
    out = out.replace(
      'var tabs = document.querySelectorAll(".tab");',
      `var DOC_PAGES = ${JSON.stringify(elsewhere)};\n    var tabs = document.querySelectorAll(".tab");`,
    );
    if (!out.includes('var DOC_PAGES') || !out.includes('location.replace(DOC_PAGES[id])')) {
      throw new Error('Docs HTML: the tab script changed; update split-uiframework-docs.mjs.');
    }

    // Relative assets from one folder deeper.
    if (!isOverview) {
      out = out
        .replace(/(src|href)="images\//g, '$1="../images/')
        .replace('href="llms.txt"', 'href="../llms.txt"')
        .replace('href="../favicon.png"', 'href="../../favicon.png"');
    }

    // Page metadata.
    if (!isOverview) {
      out = out.replace(/<title>[^<]*<\/title>/, `<title>${escapeAttr(page.title)}</title>`);
      out = setMeta(out, /(<meta name="description" content=")[^"]*(">)/, page.description);
      out = setMeta(out, /(<meta property="og:title" content=")[^"]*(">)/, page.title);
      out = setMeta(out, /(<meta property="og:description" content=")[^"]*(">)/, page.description);
      out = setMeta(out, /(<meta name="twitter:title" content=")[^"]*(">)/, page.title);
      out = setMeta(out, /(<meta name="twitter:description" content=")[^"]*(">)/, page.description);
    }
    out = out.replace(/(<link rel="canonical" href=")[^"]*(">)/, `$1${url}$2`);
    out = out.replace(/(<meta property="og:url" content=")[^"]*(">)/, `$1${url}$2`);

    // Structured data: the product on the overview, FAQ answers on the FAQ page, a breadcrumb everywhere.
    for (const block of ldBlocks) {
      const text = block[1];
      let keep = true;
      if (text.includes('"SoftwareApplication"')) keep = isOverview;
      if (text.includes('"FAQPage"')) keep = panel.name === 'faq';
      if (text.includes('"BreadcrumbList"')) {
        const items = [
          { name: 'Dawaniyah Games', item: breadcrumbBase },
          { name: 'UI Framework for Unity', item: siteUrl },
        ];
        if (!isOverview) items.push({ name: page.title.split(/[:|]/)[0].trim(), item: url });
        const crumb = {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, ...it })),
        };
        out = out.replace(block[0], `<script type="application/ld+json">\n${JSON.stringify(crumb, null, 1)}\n</script>\n`);
        continue;
      }
      if (!keep) out = out.replace(block[0], '');
    }

    return { slug: page.slug, url, html: out };
  });
}
