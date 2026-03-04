import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs';

// Vite plugin to copy config.json to the dist root
const copyConfigPlugin = () => ({
  name: 'copy-config',
  writeBundle() {
    const configPath = resolve(__dirname, 'public', 'config.json');
    const destPath = resolve(__dirname, 'dist', 'config.json');
    
    if (existsSync(configPath)) {
      try {
        // Read and validate the config file
        const config = JSON.parse(readFileSync(configPath, 'utf8'));
        
        // Ensure required fields exist
        const defaultConfig = {
          API_BASE: 'http://localhost:5000',
          UPLOAD_ROOT: 'C:\\data\\html\\public_html',
          BEELDBANKEN: ['aquarellen', 'beeldbank', 'boeken', 'collectie', 'demo', 'gipsmodel', 'knipsels', 'weinmann']
        };
        
        // Merge with defaults
        const mergedConfig = { ...defaultConfig, ...config };
        
        // Write the merged config to the dist directory
        writeFileSync(destPath, JSON.stringify(mergedConfig, null, 2), 'utf8');
        // console.log('Successfully copied config.json to dist directory');
      } catch (error) {
        console.error('Error processing config.json:', error);
      }
    }
  }
});

export default defineConfig({
  base: '/app/frontend/dist/',
  plugins: [
    react(),
    copyConfigPlugin()
  ],
  server: {
    port: 3000,
    open: true,
  },
  css: {
    postcss: './postcss.config.cjs',
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // Ensure config.json is not hashed and is in the root
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'config.json') {
            return '[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
  publicDir: 'public',
});
