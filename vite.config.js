import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// Read package.json for version
const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));

// Function to read the config file
function getConfig() {
  try {
    const configPath = path.resolve(__dirname, './public/config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    
    // For production, we want to use absolute paths for assets
    const isProduction = process.env.NODE_ENV === 'production';
    
    // In production, use the current origin with /zcbs_frontend/ path
    const baseUrl = isProduction ? (process.env.NODE_ENV === 'production' ? '/zcbs_frontend/' : '/') : '/';
    
    return {
      ...config,
      BASE_URL: baseUrl,
    };
  } catch (error) {
    console.warn('Failed to read config.json, using defaults', error);
    return { 
      BASE_URL: process.env.NODE_ENV === 'production' ? './' : '/'
    };
  }
}

// Get the configuration
const config = getConfig();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';
  
  // Get document root from environment or use a default
  const docRoot = env.DOC_ROOT || process.cwd();
  
  return {
    define: {
      // This will be replaced during build time
      __DOC_ROOT__: JSON.stringify(docRoot),
      'import.meta.env.PACKAGE_VERSION': JSON.stringify(packageJson.version)
    },
    plugins: [
      react(),
      // Custom plugin to ensure config.json is copied to the correct location
      {
        name: 'copy-config',
        apply: 'build',
        enforce: 'post',
        generateBundle() {
          // This ensures config.json is copied to the dist folder
          this.emitFile({
            type: 'asset',
            fileName: 'config.json',
            source: fs.readFileSync(path.resolve(__dirname, 'public/config.json'), 'utf-8')
          });
        }
      }
    ],
    // Base public path when served in production
    base: isProduction ? '/zcbs_frontend/' : '/',
    preview: {
      port: 4173,
      open: true,
    },
    server: {
      port: 3000,
      open: true,
      headers: {
        'X-DOC-ROOT': docRoot,
      },
      // Configure proxy for API requests
      proxy: {
        '/api': {
          target: config.API_BASE,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    },
    css: {
      postcss: './postcss.config.cjs',
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
    },
    build: {
      // Output directory relative to project root
      outDir: 'C://Data//html//public_html//zcbs_frontend',
      // Ensure assets are referenced with correct paths
      assetsDir: 'assets',
      // Copy public files to the output directory
      copyPublicDir: true,
      // Clean the output directory before building
      emptyOutDir: true,
      // Use relative paths for assets in production
      assetsInlineLimit: 4096, // 4kb
      // Increase chunk size warning limit to 1000kb
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // Use contenthash for better caching
          assetFileNames: 'assets/[name]-[hash][extname]',
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js'
        }
      }
    }
  };
});