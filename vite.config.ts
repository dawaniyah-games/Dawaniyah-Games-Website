import { defineConfig, loadEnv, type Plugin, type ResolvedConfig } from 'vite'
import path from 'path'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { imagetools } from 'vite-imagetools'
import en from './src/app/i18n/locales/en'
import ar from './src/app/i18n/locales/ar'
import { buildStaticContent } from './scripts/static-seo-content'

const AR_META = {
  title: 'شركة تطوير ألعاب في السعودية والخليج | دوانية الألعاب',
  description:
    'استوديو تطوير ألعاب في الرياض بمحركي Unity وUnreal، نخدم السعودية والإمارات والكويت وقطر. نطوّر ألعاب الجوال والكمبيوتر لعملائنا، وننشر أدوات مفتوحة المصدر لمطوري Unity.',
};

function normalizeSiteUrl(value: string | undefined): string {
  const raw = (value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    // Ensure trailing slash for URL joining
    if (!url.pathname.endsWith('/')) url.pathname += '/';
    return url.toString();
  } catch {
    return '';
  }
}

function buildSeoFilesPlugin(env: Record<string, string>): Plugin {
  let resolved: ResolvedConfig;

  return {
    name: 'build-seo-files',
    apply: 'build',
    configResolved(config) {
      resolved = config;
    },
    transformIndexHtml(html) {
      const base = resolved.base || '/';
      return html.replace('<div id="root"></div>', `<div id="root">${buildStaticContent(en, 'en', base)}</div>`);
    },
    async closeBundle() {
      const outDir = path.resolve(resolved.root, resolved.build.outDir);
      const base = resolved.base || '/';

      // Optional: set VITE_SITE_URL (e.g. https://dawaniyahgames.com)
      const siteUrl = normalizeSiteUrl(env.VITE_SITE_URL);
      const siteBaseUrl = siteUrl ? new URL(base.replace(/^\//, ''), siteUrl).toString() : '';
      const sitemapUrl = siteBaseUrl ? new URL('sitemap.xml', siteBaseUrl).toString() : '';

      // robots.txt
      const robotsLines = [
        'User-agent: *',
        'Allow: /',
        // Use absolute sitemap URL if available; otherwise keep it relative (works on most crawlers)
        `Sitemap: ${sitemapUrl || new URL('sitemap.xml', 'http://localhost').pathname}`,
        '',
      ];
      await fsp.writeFile(path.join(outDir, 'robots.txt'), robotsLines.join('\n'), 'utf8');

      // sitemap.xml: English home, Arabic home (/ar/), UI Framework docs.
      // Language versions are real paths now; the old ?lang= URLs are not listed.
      const now = new Date().toISOString();
      const baseLoc = siteBaseUrl || base || '/';
      const arLoc = siteBaseUrl ? new URL('ar/', siteBaseUrl).toString() : `${base}ar/`;
      const docsLoc = siteBaseUrl ? new URL('uiframework/', siteBaseUrl).toString() : `${base}uiframework/`;

      const alternatesXml =
        `    <xhtml:link rel="alternate" hreflang="en" href="${baseLoc}" />\n` +
        `    <xhtml:link rel="alternate" hreflang="ar" href="${arLoc}" />\n` +
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${baseLoc}" />\n`;

      const urlXml = (loc: string, priority: string, alternates: boolean) => `  <url>\n` +
        `    <loc>${loc}</loc>\n` +
        (alternates ? alternatesXml : '') +
        `    <lastmod>${now}</lastmod>\n` +
        `    <priority>${priority}</priority>\n` +
        `  </url>\n`;

      // UI Framework docs sub-pages, one folder per tab (written by scripts/split-uiframework-docs.mjs).
      const docsDir = path.join(outDir, 'uiframework');
      const docsPageLocs = fs.existsSync(docsDir)
        ? fs
            .readdirSync(docsDir, { withFileTypes: true })
            .filter((d) => d.isDirectory() && fs.existsSync(path.join(docsDir, d.name, 'index.html')))
            .map((d) => new URL(`${d.name}/`, docsLoc).toString())
            .sort()
        : [];

      const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlXml(baseLoc, '1.0', true)}${urlXml(arLoc, '0.9', true)}${urlXml(docsLoc, '0.9', false)}${docsPageLocs.map((loc) => urlXml(loc, '0.8', false)).join('')}</urlset>
`;
      await fsp.writeFile(path.join(outDir, 'sitemap.xml'), sitemapXml, 'utf8');

      // /ar/index.html: the Arabic home page as its own indexable URL, with Arabic meta,
      // a self-referencing canonical and Arabic crawlable content. The app reads the
      // language from the /ar/ path (see src/app/i18n).
      const indexPath = path.join(outDir, 'index.html');
      let arHtml = await fsp.readFile(indexPath, 'utf8');
      const enTitle = 'Game Development Studio in Saudi Arabia &amp; the Gulf | Dawaniyah';
      arHtml = arHtml
        .replace('<html lang="en">', '<html lang="ar" dir="rtl">')
        .replaceAll(enTitle, AR_META.title)
        .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${AR_META.description}$2`)
        .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/, `$1${AR_META.description}$2`)
        .replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/, `$1${AR_META.description}$2`)
        .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${arLoc}" />`)
        .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${arLoc}$2`)
        .replace('<meta property="og:locale" content="en_US" />', '<meta property="og:locale" content="ar_SA" />')
        .replace('<meta property="og:locale:alternate" content="ar_SA" />', '<meta property="og:locale:alternate" content="en_US" />');
      const enStatic = buildStaticContent(en, 'en', base);
      arHtml = arHtml.replace(enStatic, buildStaticContent(ar, 'ar', base));
      await fsp.mkdir(path.join(outDir, 'ar'), { recursive: true });
      await fsp.writeFile(path.join(outDir, 'ar', 'index.html'), arHtml, 'utf8');

      // Copy OG/favicons into dist root so meta tags resolve at %BASE_URL%...
      const srcLogo = path.resolve(resolved.root, 'src/assets/logo-icon.png');
      const outLogo = path.resolve(outDir, 'logo-icon.png');
      const outFavicon = path.resolve(outDir, 'favicon.png');
      if (fs.existsSync(srcLogo)) {
        await fsp.copyFile(srcLogo, outLogo);
        await fsp.copyFile(srcLogo, outFavicon);
      }
    },
  };
}

// Dev only: serve public/uiframework/ like a static host does (GitHub Pages).
// Without this, Vite's SPA fallback answers /uiframework and /uiframework/ with the main app.
function uiFrameworkDocsDevPlugin(): Plugin {
  return {
    name: 'uiframework-docs-dev',
    apply: 'serve',
    configureServer(server) {
      const docsPath = `${server.config.base}uiframework`;
      server.middlewares.use((req, res, next) => {
        const [pathname, query] = (req.url || '').split(/\?(.*)/s);
        if (pathname === docsPath) {
          res.statusCode = 301;
          res.setHeader('Location', `${docsPath}/${query ? `?${query}` : ''}`);
          res.end();
          return;
        }
        // /uiframework/ and every docs page folder (/uiframework/tutorial/ ...) serve their index.html.
        if (pathname.startsWith(`${docsPath}/`) && pathname.endsWith('/')) {
          req.url = `${pathname}index.html${query ? `?${query}` : ''}`;
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load env from .env files so plugins can access VITE_SITE_URL during build.
  // Use prefix '' to load all keys (we only consume VITE_* keys).
  const fileEnv = loadEnv(mode, process.cwd(), '');
  // Important: GitHub Actions provides env vars via process.env (not via .env files).
  // Merge so VITE_SITE_URL works in CI even when no .env file exists.
  const env = { ...(process.env as Record<string, string | undefined>), ...fileEnv } as Record<string, string>;

  // Set VITE_BASE (e.g. '/') when using a custom domain.
  // If not set, auto-derive GitHub Pages project base '/<repo>/' for Actions builds.
  // GitHub Pages serves the site from '/<repo>/' (project pages).
  // In Actions, GITHUB_REPOSITORY is like 'owner/repo'. Locally it's undefined.
  const base = (() => {
    const explicitBase = env.VITE_BASE || process.env.VITE_BASE;
    if (explicitBase) return explicitBase;
    const repo = process.env.GITHUB_REPOSITORY?.split('/')?.[1];
    if (!repo) return '/';
    // For user/org pages (repo named '<user>.github.io'), the site is served from '/'.
    if (repo.endsWith('.github.io')) return '/';
    return `/${repo}/`;
  })();

  return {
    base,
    plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    imagetools(),
    react(),
    tailwindcss(),
    buildSeoFilesPlugin(env),
    uiFrameworkDocsDevPlugin(),
    ],
    resolve: {
      alias: {
        // Alias @ to the src directory
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
})
