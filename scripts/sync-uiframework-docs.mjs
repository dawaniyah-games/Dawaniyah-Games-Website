// Copies the UI Framework docs site (UiFramework/docs) into public/uiframework,
// so it is served at https://dawaniyahgames.com/uiframework/.
//
// Usage:  npm run sync:uiframework-docs
// Source defaults to ../UiFramework/docs; override with UIFRAMEWORK_DOCS_DIR.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.resolve(
  process.env.UIFRAMEWORK_DOCS_DIR || path.join(root, '..', 'UiFramework', 'docs'),
);
const targetDir = path.join(root, 'public', 'uiframework');
const siteUrl = 'https://dawaniyahgames.com/uiframework/';

const sourceHtml = path.join(sourceDir, 'index.html');
if (!fs.existsSync(sourceHtml)) {
  console.error(`UI Framework docs not found at ${sourceHtml}`);
  console.error('Clone UiFramework next to this repo or set UIFRAMEWORK_DOCS_DIR.');
  process.exit(1);
}

// The page uses relative paths (images/...), so it must be served with a trailing slash.
// Redirect /uiframework -> /uiframework/ before anything else loads, keeping the hash.
const headInjection = [
  '<script>',
  '// Added by sync-uiframework-docs: relative image paths need a trailing slash.',
  'if (!/\\/$|\\.html$/.test(location.pathname)) {',
  '    location.replace(location.pathname + "/" + location.search + location.hash);',
  '}',
  '</script>',
  `<link rel="canonical" href="${siteUrl}">`,
  `<meta property="og:url" content="${siteUrl}">`,
  '<meta property="og:title" content="UI Framework for Unity | Dawaniyah Games">',
  '<link rel="icon" type="image/png" href="../favicon.png">',
].join('\n');

let html = fs.readFileSync(sourceHtml, 'utf8');
if (!html.includes('<meta name="viewport"')) {
  throw new Error('Unexpected docs HTML: no viewport meta to anchor the injection.');
}
html = html.replace(/(<meta name="viewport"[^>]*>)/, `$1\n${headInjection}`);

fs.rmSync(targetDir, { recursive: true, force: true });
fs.mkdirSync(path.join(targetDir, 'images'), { recursive: true });
fs.writeFileSync(path.join(targetDir, 'index.html'), html, 'utf8');

const imagesDir = path.join(sourceDir, 'images');
let imageCount = 0;
if (fs.existsSync(imagesDir)) {
  for (const name of fs.readdirSync(imagesDir)) {
    if (!/\.(png|jpe?g|webp|gif|svg)$/i.test(name)) continue;
    fs.copyFileSync(path.join(imagesDir, name), path.join(targetDir, 'images', name));
    imageCount += 1;
  }
}

console.log(`Synced UI Framework docs from ${sourceDir}`);
console.log(`  -> public/uiframework/index.html + ${imageCount} images`);
