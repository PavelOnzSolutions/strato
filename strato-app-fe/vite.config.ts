/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// Read version from package.json and ensure it's available as VITE_VERSION
const pkgPath = new URL('./package.json', import.meta.url);
const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as { version?: string };
const packageVersion = pkgJson.version ?? '0.0.0';
// Expose to process.env so any tooling/plugins can also see it
if (!process.env.VITE_VERSION) {
  process.env.VITE_VERSION = packageVersion;
}

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Inject the version into import.meta.env for app consumption
  define: {
    'import.meta.env.VITE_VERSION': JSON.stringify(process.env.VITE_VERSION ?? packageVersion)
  },
  test: {
    projects: [{
      extends: true,
      test: {
        name: 'unit',
        environment: 'jsdom',
        globals: true,
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
        setupFiles: ['./src/test/setup.ts']
      }
    }, {
      extends: true,
      plugins: [
      // The plugin will run tests for the stories defined in your Storybook config
      // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
      storybookTest({
        configDir: path.join(dirname, '.storybook')
      })],
      test: {
        name: 'storybook',
        browser: {
          enabled: true,
          headless: true,
          provider: playwright({}),
          instances: [{
            browser: 'chromium'
          }]
        },
        setupFiles: ['.storybook/vitest.setup.ts']
      }
    }]
  }
});