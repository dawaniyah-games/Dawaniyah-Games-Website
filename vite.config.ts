import { defineConfig, loadEnv, type Plugin, type ResolvedConfig } from 'vite'
import path from 'path'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

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

      // sitemap.xml (homepage only; SPA)
      const now = new Date().toISOString();
      const baseLoc = siteBaseUrl || base || '/';
      const enLoc = siteBaseUrl ? `${siteBaseUrl}?lang=en` : `${base}?lang=en`;
      const arLoc = siteBaseUrl ? `${siteBaseUrl}?lang=ar` : `${base}?lang=ar`;
      const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseLoc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${enLoc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${arLoc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>
`;
      await fsp.writeFile(path.join(outDir, 'sitemap.xml'), sitemapXml, 'utf8');

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

export default defineConfig(({ mode }) => {
  // Load env from .env files so plugins can access VITE_SITE_URL during build.
  // Use prefix '' to load all keys (we only consume VITE_* keys).
  const env = loadEnv(mode, process.cwd(), '');

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
    react(),
    tailwindcss(),
    buildSeoFilesPlugin(env),
    ],
    resolve: {
      alias: {
        // Alias @ to the src directory
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
})
