import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, type Plugin } from 'vite';

const rootDir = import.meta.dirname ?? path.dirname(fileURLToPath(import.meta.url));
const pkgVersion = '2.7.0';
const buildId =
  (process.env.BUILD_ID || '').trim() || `v${pkgVersion}-${Date.now().toString(36)}`;

function writeBuildIdPlugin(): Plugin {
  return {
    name: 'skill98-write-build-id',
    closeBundle() {
      try {
        const distDir = path.resolve(rootDir, 'dist');
        if (fs.existsSync(distDir)) {
          fs.writeFileSync(path.join(distDir, 'build-id.txt'), `${buildId}\n`, 'utf-8');
        }
      } catch {
        // Ignore write error in read-only environments
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), writeBuildIdPlugin()],
    define: {
      __APP_BUILD_ID__: JSON.stringify(buildId),
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(rootDir, '.'),
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'lucide-react',
        'gsap',
        'lenis',
        '@barba/core',
        'muuri',
        'motion/react',
        'jszip',
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
      ],
    },
    build: {
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
              return 'react-vendor';
            }
            if (id.includes('/lucide-react/')) {
              return 'icons-vendor';
            }
            if (
              id.includes('/gsap/') ||
              id.includes('/lenis/') ||
              id.includes('/@barba/') ||
              id.includes('/muuri/')
            ) {
              return 'motion-vendor';
            }
            if (id.includes('/firebase/') || id.includes('/@firebase/')) {
              return 'firebase-vendor';
            }
            if (id.includes('/jszip/')) {
              return 'jszip-vendor';
            }
            return undefined;
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
