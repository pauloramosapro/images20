import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the current directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');
const publicConfigPath = join(rootDir, 'public', 'config.json');
const distConfigPath = join(distDir, 'config.json');
const indexPath = join(distDir, 'index.html');

// Ensure dist directory exists
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

// Copy config.json from public to dist if it exists in public
if (existsSync(publicConfigPath) && !existsSync(distConfigPath)) {
  copyFileSync(publicConfigPath, distConfigPath);
  //console.log('Copied config.json from public to dist directory');
}

// Read the config file if it exists
let config = {};
if (existsSync(distConfigPath)) {
  try {
    config = JSON.parse(readFileSync(distConfigPath, 'utf8'));
   // console.log('Loaded config from config.json:', config);
  } catch (err) {
    console.error('Error parsing config file:', err);
    process.exit(1);
  }
}

// Default values


// Merge with defaults
const mergedConfig = { ...defaultConfig, ...config };

// Read the index.html file
let html = '';
if (existsSync(indexPath)) {
  html = readFileSync(indexPath, 'utf8');
} else {
  console.error('index.html not found in dist directory');
  process.exit(1);
}

// Create the config script
const configScript = `
    <script id="app-config" type="application/json">
      ${JSON.stringify({
        API_BASE: mergedConfig.API_BASE,
        //UPLOAD_ROOT: mergedConfig.UPLOAD_ROOT,
        BEELDBANKEN: mergedConfig.BEELDBANKEN,
        //CK: mergedConfig.CK,
      }, null, 2)}
    </script>`;

// Replace the config script in the HTML
const updatedHtml = html.replace(
  /<script id="app-config"[\s\S]*?<\/script>/, 
  configScript
);

// Write the updated HTML back to disk
writeFileSync(indexPath, updatedHtml, 'utf8');
//console.log('Configuration updated successfully in index.html');
//console.log('Current configuration:', JSON.stringify(mergedConfig, null, 2));
