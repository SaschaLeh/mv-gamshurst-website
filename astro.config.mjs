import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://mv-gamshurst.de',
  trailingSlash: 'never',
  build: {
    format: 'directory',
  },
});
