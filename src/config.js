// Helper function to normalize paths
const normalizePath = (path) => {
  if (!path) return '/';
  // Ensure path starts with a slash and doesn't end with a slash (except for root)
  let normalized = String(path).replace(/\\/g, '/').replace(/\/+$/, '');
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  return normalized === '' ? '/' : normalized;
};

// Default configuration
const defaultConfig = {
  // Gebruik de lokale backend server als standaard
  API_BASE: '', // Wordt dynamisch ingesteld door getDefaultApiBase()
  PATH_SMALL: '/files/small',
  PATH_LARGE: '/files/large',
  PATH_100PC: '/files/100pc',
  PATH_ORIGINEEL: '/files/origineel',
  PATH_WATERMERK: '/files/watermerk',
  CK: 'ZCBSSystemimages2.0', // Standaard waarde uit config.json
  disableSmallUpload: false, // Default value
  JPEG_QUALITY: 0.7, // Default JPEG quality (0.0 - 1.0)
  FONT_SIZE: 18 // Default font size in pixels
};

// Ensure all paths are normalized
defaultConfig.API_BASE = normalizePath(defaultConfig.API_BASE) || getDefaultApiBase();
defaultConfig.APP_ROOT = normalizePath(defaultConfig.APP_ROOT);
defaultConfig.PUBLIC_PATH = normalizePath(defaultConfig.PUBLIC_PATH);

// Function to get default API base from current domain
function getDefaultApiBase() {
  if (typeof window !== 'undefined' && window.location) {
    const { protocol, hostname, port } = window.location;
    
    // In development, remove port 3000 to connect to backend
    if (import.meta.env.DEV && port === '3000') {
      return `${protocol}//${hostname}`;
    }
    
    return `${protocol}//${hostname}${port ? ':' + port : ''}`;
  }
  return ''; // Fallback for server-side rendering
}

// Runtime configuration that can be overridden by config.json
let runtimeConfig = { ...defaultConfig };

// Function to get the config URL based on the current environment
function getConfigUrl() {
 
  
  try {
   
    const baseUrl = new URL(window.location.href);
    const isDev = import.meta.env.DEV;
    const isPreview = import.meta.env.MODE === 'production' && !import.meta.env.PROD;
    
    // Determine the base path based on the current URL
    let basePath = '';
    
    // If we're in development or preview, use the root
    if (isDev || isPreview) {
     
      basePath = '';
    } else {
      
      // In production, use the current path up to /frontend
      const pathParts = window.location.pathname.split('/');
      const frontendIndex = pathParts.indexOf('zcbs_frontend');
      if (frontendIndex !== -1) {
        basePath = pathParts.slice(0, frontendIndex + 1).join('/');
      
      } else {
        // Fallback to /zcbs_frontend if not found in path
        basePath = '/zcbs_frontend';
      }
    }
    
    // Ensure basePath ends with a single slash
    basePath = basePath.replace(/\/+$/, '');
    if (basePath && !basePath.startsWith('/')) {
      basePath = `/${basePath}`;
      
    }
    
    // Build the full URL without cache buster
    const configPath = `${basePath}/config.json`;
    const fullUrl = `${baseUrl.origin}${configPath}`;
    
  
    return fullUrl;
  } catch (error) {
    console.error('Error determining config URL:', error);
    
    return '/zcbs_frontend/config.json';
  }
}

// Global variable to track if config is already loaded
let configLoaded = false;
let configLoadPromise = null;

// Function to ensure config is loaded
export function ensureConfigLoaded() {
 
  if (!configLoadPromise) {
    configLoadPromise = loadRuntimeConfig();
  }
  return configLoadPromise;
}

// Function to load runtime configuration
async function loadRuntimeConfig() {
  
  // Return if config is already loaded
  if (configLoaded) {
    //console.log('Config already loaded, returning cached config');
    return runtimeConfig;
  }

  try {
    const configUrl = getConfigUrl();
    
    
    // Try to load the config with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    // Add a timestamp to prevent caching
    const timestamp = new Date().getTime();
    const urlWithCacheBust = `${configUrl}${configUrl.includes('?') ? '&' : '?'}_=${timestamp}`;
    //console.log ('config.js  regel 113 urlWithCacheBust', urlWithCacheBust);
    //console.log ('config.js  regel 114 configUrl', configUrl);
    const response = await fetch(urlWithCacheBust, {
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      credentials: 'same-origin',
      cache: 'no-store'
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.status} ${response.statusText}`);
    }
    
    const config = await response.json();
    
    
    // Create a normalized config with all values properly handled
    const normalizedConfig = {
      // Include default CK value
      ...(defaultConfig.CK && { CK: defaultConfig.CK }),
      
      // Handle FIRST_START (accept both string '1' and number 1)
      ...(config.FIRST_START !== undefined && { 
        FIRST_START: config.FIRST_START === '1' || config.FIRST_START === 1 ? 1 : 0 
      }),
      
      // Handle LOGIN_EXCEPTION (accept both string 'true' and boolean true)
      ...(config.LOGIN_EXCEPTION !== undefined && { 
        LOGIN_EXCEPTION: config.LOGIN_EXCEPTION === 'true' || config.LOGIN_EXCEPTION === true 
      }),
      
      // Normalize all paths
      ...(config.APP_ROOT && { APP_ROOT: normalizePath(config.APP_ROOT) }),
      // In production, UPLOAD_ROOT should be combined with PUBLIC_PATH
      ...(config.UPLOAD_ROOT && { 
        UPLOAD_ROOT: process.env.NODE_ENV === 'production' && config.PUBLIC_PATH
          ? normalizePath(`${config.UPLOAD_ROOT}${config.PUBLIC_PATH}`)
          : normalizePath(config.UPLOAD_ROOT)
      }),
      ...(config.PUBLIC_PATH && { 
        PUBLIC_PATH: normalizePath(config.PUBLIC_PATH) 
      }),
      ...(config.PATH_SMALL && { PATH_SMALL: normalizePath(config.PATH_SMALL) }),
      ...(config.PATH_LARGE && { PATH_LARGE: normalizePath(config.PATH_LARGE) }),
      ...(config.PATH_100PC && { PATH_100PC: normalizePath(config.PATH_100PC) }),
      ...(config.PATH_ORIGINEEL && { PATH_ORIGINEEL: normalizePath(config.PATH_ORIGINEEL) }),
      ...(config.PATH_WATERMERK && { PATH_WATERMERK: normalizePath(config.PATH_WATERMERK) }),
      
      // Handle API_BASE (ensure it has http/https and no trailing slash)
      ...(config.API_BASE !== undefined && { 
        API_BASE: config.API_BASE 
          ? (config.API_BASE.startsWith('http') ? '' : 'http://') + 
            config.API_BASE.replace(/\/+$/, '')
          : (() => {
              const defaultApi = getDefaultApiBase();
              console.log('API_BASE is leeg in config.json, gebruik default:', defaultApi);
              return defaultApi;
            })() // Fallback to current domain if empty
      }),
      // Als API_BASE helemaal niet in config staat, gebruik default
      ...(config.API_BASE === undefined && {
        API_BASE: (() => {
          const defaultApi = getDefaultApiBase();
          console.log('API_BASE niet gevonden in config.json, gebruik default:', defaultApi);
          return defaultApi;
        })()
      }),
       // Handle disableSmallUpload (accept both string and boolean)
      ...(config.disableSmallUpload !== undefined && {
        disableSmallUpload: config.disableSmallUpload === 'true' || config.disableSmallUpload === true
      }),
      // Handle JPEG_QUALITY (accept both string and number)
      ...(config.JPEG_QUALITY !== undefined && {
        JPEG_QUALITY: typeof config.JPEG_QUALITY === 'string' 
          ? parseFloat(config.JPEG_QUALITY) 
          : Number(config.JPEG_QUALITY)
      }),
      // Handle FONT_SIZE (accept both string and number)
      ...(config.FONT_SIZE !== undefined && {
        FONT_SIZE: typeof config.FONT_SIZE === 'string' 
          ? parseInt(config.FONT_SIZE, 10) 
          : Number(config.FONT_SIZE)
      }),
      // Handle BEELDBANKEN (accept both array of objects and legacy string/array format)
      ...(config.BEELDBANKEN !== undefined && { 
        BEELDBANKEN: (() => {
          if (!config.BEELDBANKEN) return [];
          
          // If it's already in the new format (array of objects)
          if (Array.isArray(config.BEELDBANKEN) && config.BEELDBANKEN.length > 0 && typeof config.BEELDBANKEN[0] === 'object') {
            return config.BEELDBANKEN.map(bank => ({
              naam: String(bank.naam || '').trim(),
              format: String(bank.format || '0').trim()
            })).filter(bank => bank.naam);
          }
          
          // Legacy format (array of strings or comma-separated string)
          const bankArray = Array.isArray(config.BEELDBANKEN) 
            ? config.BEELDBANKEN 
            : String(config.BEELDBANKEN).split(',').map(s => s.trim()).filter(Boolean);
            
          // Convert to new format
          return bankArray.map(naam => ({
            naam: String(naam).trim(),
            format: '0' // Default format
          }));
        })()
      })
    };
    
    // Merge with defaults and normalized values
    runtimeConfig = { 
      ...defaultConfig,
      ...config,
      ...normalizedConfig
    };
    
    configLoaded = true;
    //console.log('Runtime config loaded with FIRST_START:', runtimeConfig.FIRST_START);
    
    return runtimeConfig;
  } catch (error) {
    // console.warn('Failed to load runtime config, using defaults', error);
    console.log('Config.json not found or failed to load, starting FIRST_START');
    runtimeConfig = { 
      ...defaultConfig,
      FIRST_START: 1 // Force first start when config is missing
    };
    return runtimeConfig;
  }
}

// Load the runtime configuration when the module loads
ensureConfigLoaded().catch(console.error);

// Function to get the current config
function getConfig() {
  return { ...runtimeConfig };
}

/**
 * Helper: build a full URL for a given logical target and filename
 * @param {string} target - logical target (e.g. 'small', 'large', '100pc')
 * @param {string} filename - filename to encode and append to URL
 * @returns {string} full URL for the given target and filename
 */
function getFileUrl(target, filename) {
  const { API_BASE, PATH_SMALL, PATH_LARGE, PATH_100PC } = runtimeConfig;
  const name = encodeURIComponent(filename);
  switch (target) {
    case 'small':
      return `${API_BASE}${PATH_SMALL}/${name}`;
    case 'large':
      return `${API_BASE}${PATH_LARGE}/${name}`;
    case '100pc':
    case '100pct':
      return `${API_BASE}${PATH_100PC}/${name}`;
    default:
      return `${API_BASE}/${name}`;
  }
}

// Create a config object with getters to ensure we always have the latest values
const config = {
  get API_BASE() { 
    const apiBase = runtimeConfig.API_BASE || defaultConfig.API_BASE;
    if (!apiBase) {
      const fallback = getDefaultApiBase();
      console.log('API_BASE getter: runtimeConfig en defaultConfig zijn leeg, gebruik fallback:', fallback);
      return fallback;
    }
    
    // If API_BASE is "/", use the default with proper port handling
    if (apiBase === '/') {
      const fallback = getDefaultApiBase();
      console.log('API_BASE getter: API_BASE is "/", gebruik fallback:', fallback);
      return fallback;
    }
    
    return apiBase;
  },
  get CK() { return runtimeConfig.CK || defaultConfig.CK; },
  get paths() {
    return {
      small: runtimeConfig.PATH_SMALL || defaultConfig.PATH_SMALL,
      large: runtimeConfig.PATH_LARGE || defaultConfig.PATH_LARGE,
      '100pc': runtimeConfig.PATH_100PC || defaultConfig.PATH_100PC,
      origineel: runtimeConfig.PATH_ORIGINEEL || defaultConfig.PATH_ORIGINEEL,
      watermerk: runtimeConfig.PATH_WATERMERK || defaultConfig.PATH_WATERMERK,
    };
  },
  get disableSmallUpload() { 
    return runtimeConfig.disableSmallUpload !== undefined 
      ? runtimeConfig.disableSmallUpload 
      : defaultConfig.disableSmallUpload; 
  },
  get JPEG_QUALITY() {
    return runtimeConfig.JPEG_QUALITY !== undefined 
      ? runtimeConfig.JPEG_QUALITY 
      : defaultConfig.JPEG_QUALITY;
  },
  get FONT_SIZE() {
    return runtimeConfig.FONT_SIZE !== undefined 
      ? runtimeConfig.FONT_SIZE 
      : defaultConfig.FONT_SIZE;
  },
  getFileUrl,
  get endpoints() {
  
    const { API_BASE } = runtimeConfig;
    return {
      upload: `${API_BASE}/misc/api/zcbs_backend.php?endpoint=/api/upload`,
      subdirs: `${API_BASE}/misc/api/zcbs_backend.php?endpoint=/api/subdirs`,
     saveRecords : (beeldbank) => `${API_BASE}/misc/api/zcbs_backend.php?endpoint=/api/beeldbank/${beeldbank}/updates`,
    };
  },
  get uploadRoot() { return runtimeConfig.UPLOAD_ROOT; },
  get appRoot() {
    if (typeof window !== 'undefined') {
      // In browser environment, use the current origin with /zcbs_frontend/ path
      return window.location.origin + '/zcbs_frontend/';
    }
    // Fallback for server-side rendering
    return runtimeConfig.APP_ROOT || '/';
  },
  get beeldbanken() { 
    // Return just the names for backward compatibility
    return runtimeConfig.BEELDBANKEN.map(bank => bank.naam); 
  },
  get beeldbankenData() { 
    // Return full objects for new code
    return [...runtimeConfig.BEELDBANKEN]; 
  },
  // Function to update config at runtime if needed
  updateConfig: (newConfig) => {
    runtimeConfig = { ...runtimeConfig, ...newConfig };
  },
  // Function to reset to defaults
  resetToDefaults: () => {
    runtimeConfig = { ...defaultConfig };
  },
  // Function to reload config from server
 
  reload: loadRuntimeConfig,
};

// Functie om te controleren of de gebruiker is ingelogd in ZCBS
function checkLoginStatus() {
  // Controleer of we in een browser-omgeving zitten
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    // console.log('Niet in een browser-omgeving, login status kan niet worden gecontroleerd');
    return false;
  }

  // Debug: Toon alle beschikbare cookies
  // console.log('Alle cookies:', document.cookie);

  // Zoek specifiek naar de zcbs-app-user cookie
  const cookie = document.cookie
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('zcbs-app-user='));

  // console.log('Gevonden zcbs-app-user cookie:', cookie);
// console.log('LOGIN_EXCEPTION:', config.LOGIN_EXCEPTION);
  // Controleer of de cookie geldig is
  let isLoggedIn = false;
  let username = '';
  
  if (cookie) {
    const userValue = cookie.split('=')[1];
    isLoggedIn = userValue && userValue !== 'deleted' && userValue !== 'undefined' && userValue !== '';
    username = userValue || '';
    // console.log('Inlogstatus:', isLoggedIn ? `Ingelogd (${username})` : 'Cookie gevonden maar ongeldige waarde');
  } else {
    // console.log('Geen zcbs-app-user cookie gevonden');
  }

  // Toon melding en redirect indien niet ingelogd, maar niet voor debug pagina
  if (!isLoggedIn) {
    // Controleer of we op de debug pagina zijn
    const isDebugPage = window.location.search.includes('debug=');
    
    if (!isDebugPage) {
      // Toon melding na een korte vertraging om te voorkomen dat de popup wordt geblokkeerd
      setTimeout(() => {
        const userConfirmed = confirm('U moet ingelogd zijn in het ZCBS-systeem om deze applicatie te gebruiken.\n\nKlik op OK om naar de inlogpagina te gaan.');
        if (userConfirmed || !userConfirmed) { // Altijd doorsturen, ongeacht of op OK of Annuleren wordt geklikt
          window.location.href = window.location.origin;
        }
      }, 100);
    }
    return false;
  }

  return true;
}

// Add docRoot getter to runtime config with enhanced logging
Object.defineProperty(runtimeConfig, 'docRoot', {
  get() {
    //console.log('Getting docRoot...');
    
    // Check if __DOC_ROOT__ is defined (from Vite's define)
    if (typeof __DOC_ROOT__ !== 'undefined' && __DOC_ROOT__) {
      //console.log('Using __DOC_ROOT__:', __DOC_ROOT__);
      return __DOC_ROOT__;
    }
    
    // Check if running in browser environment
    if (typeof document !== 'undefined') {
      // Try to get from meta tag
      const meta = document.querySelector('meta[name="doc-root"]');
      if (meta && meta.content) {
       // console.log('Found doc-root in meta tag:', meta.content);
        return meta.content;
      }
      
      // Try to get from data attribute
      const rootElement = document.documentElement;
      if (rootElement?.dataset?.docRoot) {
        //console.log('Found doc-root in dataset:', rootElement.dataset.docRoot);
        return rootElement.dataset.docRoot;
      }
      
      console.warn('No doc-root found in meta tag or dataset');
    } else {
      console.warn('document is not available (server-side rendering?)');
    }
    
    // Fallback to environment variable if available
    const envDocRoot = process?.env?.DOC_ROOT;
    if (envDocRoot) {
      //console.log('Using DOC_ROOT from environment:', envDocRoot);
      return envDocRoot;
    }
    
    console.warn('Using empty string as fallback for docRoot');
    return '';
  }
});

// Add docRoot to the config object
Object.defineProperty(config, 'docRoot', {
  get() {
    return runtimeConfig.docRoot;
  }
});

// Add checkLoginStatus to config
config.checkLoginStatus = checkLoginStatus;

// Export the config object and other utilities
export { 
  config, 
  runtimeConfig,
  getConfig, 
  checkLoginStatus, 
  loadRuntimeConfig 
};
export default config;
