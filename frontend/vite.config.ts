import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const projectRoot = path.resolve(__dirname, '..');
  const env = loadEnv(mode, projectRoot, '');
  return {
    root: __dirname,
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'motion'],
            'vendor-ai': ['@google/genai'],
            'vendor-markdown': ['react-markdown', 'react-dropzone'],
            'vendor-charts': ['recharts'],
            'vendor-utils': ['clsx', 'tailwind-merge', 'date-fns', 'dexie'],
          },
        },
      },
    },
    server: {
      fs: { allow: [projectRoot] },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
