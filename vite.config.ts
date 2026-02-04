import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // GitHub Pages serves the site from '/<repo>/' (project pages).
  // In Actions, GITHUB_REPOSITORY is like 'owner/repo'. Locally it's undefined.
  base: (() => {
    const repo = process.env.GITHUB_REPOSITORY?.split('/')?.[1];
    if (!repo) return '/';
    // For user/org pages (repo named '<user>.github.io'), the site is served from '/'.
    if (repo.endsWith('.github.io')) return '/';
    return `/${repo}/`;
  })(),
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
})
