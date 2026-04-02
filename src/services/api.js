export let config = {};

import { getFrontendVersion } from '../utils/version';
export let API_BASE_URL = '/api';
export let API_KEY = '';

// Function to get default API base from current domain
function getDefaultApiBase() {
  if (typeof window !== 'undefined' && window.location) {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}`;
  }
  return ''; // Fallback for server-side rendering
}

// Load configuration at runtime
export const loadConfig = async () => {
  try {
   // Eerst laden we de configuratie van de root
   const initialConfigPath = process.env.NODE_ENV === 'development' 
  ? '/public/config.json'
  : '/zcbs_frontend/config.json';
    //console.log('api.js  regel 15 initialConfigPath', initialConfigPath);
    //console.log ('initialConfigPath = ', initialConfigPath);
    //console.log ('process env = ', process.env.NODE_ENV);
    const response = await fetch(initialConfigPath);
    config = await response.json();
    //console.log('process env = ',process.env.NODE_ENV );
    // Als we in productie zitten en er is een PUBLIC_PATH, laden we de configuratie opnieuw met het juiste pad
    if (process.env.NODE_ENV === 'production' && config.PUBLIC_PATH) {
      try {
        
        const prodConfigPath = `${config.PUBLIC_PATH}/config.json`;
        //console.log('api.js  regel 28 prodConfigPath', prodConfigPath);
        const prodResponse = await fetch(prodConfigPath);
        // Alleen overschrijven als de tweede fetch succesvol is
        const prodConfig = await prodResponse.json();
        config = { ...config, ...prodConfig };
      } catch (e) {
        console.warn('Could not load config from public path, using root config', e);
      }
      
      API_BASE_URL = config.API_BASE || getDefaultApiBase();
    }
    
    API_KEY = config.KEY || '';
  } catch (error) {
    console.error('Failed to  load configuration:', error);
    throw new Error('Configuration could not be loaded');
  }
};

// Initialize config when the module loads
const configPromise = loadConfig();

// Helper function to make authenticated API calls
async function apiRequest(endpoint, options = {}) {
  // Ensure config is loaded
  await configPromise;
  const headers = {
    'x-api-key': API_KEY,
    'Content-Type': 'application/json',
    ...options.headers,
  };
//console.log ('api.js  regel 55 API_BASE_URL', endpoint);
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'API request failed');
  }

  return response.json();
}

function getCookieValue(name) {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie ? document.cookie.split(';') : [];
  for (let i = 0; i < cookies.length; i += 1) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith(`${name}=`)) {
      return decodeURIComponent(cookie.substring(name.length + 1));
    }
  }
  return null;
}

async function getPublicIp() {
  return null; // Laat backend zelf REMOTE_ADDR gebruiken
}

// Example API methods
export const beeldbankApi = {
  // Get all beeldbanken
  getAll: () => apiRequest('/misc/api/zcbs_backend.php?endpoint=/api/beeldbank'),
  
  // Get specific beeldbank
  getById: (id) => apiRequest(`/misc/api/zcbs_backend.php?endpoint=/api/beeldbank/${id}`),
  
  // Update beeldbank
  update: (id, data) => {
    const rawUsername = getCookieValue('zcbs-app-user');
    const username = rawUsername ? String(rawUsername).split('|')[0] : '';
    
    return apiRequest(`/misc/api/zcbs_backend.php?endpoint=/api/beeldbank/${id}`, {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        username
      }),
    });
  },
  
  // Upload images
  uploadImages: async (formData) => {
    // Tijdelijke debug: markeer dat uploadImages wordt aangeroepen
    
    const uploadResponse = await fetch(`${API_BASE_URL}/misc/api/zcbs_backend.php?endpoint=/api/upload`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
      },
      body: formData,
    });

    // Tijdelijke debug: status van de uploadresponse
    

    if (uploadResponse.ok) {
      try {
        const rawUsername = getCookieValue('zcbs-app-user');
        const username = rawUsername ? String(rawUsername).split('|')[0] : '';
        const clientIp = await getPublicIp();

        let imageCount = 0;
        let beeldbank = null;
        let id1 = null;
        let id2 = null;
        let beeldbankt = null;

        if (formData && typeof formData.forEach === 'function') {
          formData.forEach((value, key) => {
            if (key === 'images[]') {
              imageCount += 1;
            }
            if (key === 'beeldbank') {
              beeldbank = typeof value === 'string' ? value : String(value.name || '');
            }
            if (key === 'ID1' || key === 'id1') {
              id1 = typeof value === 'string' ? value : String(value);
            }
            if (key === 'ID2' || key === 'id2') {
              id2 = typeof value === 'string' ? value : String(value);
            }
            if (key === 'beeldbankt') {
              beeldbankt = typeof value === 'string' ? value : String(value);
            }
          });
        }

        const logPayload = {
          username,
          clientIp,
          id1,
          id2,
          beeldbank,
          beeldbankt,
          imageCount,
          frontendVersion: getFrontendVersion()
        };

        // Expose voor debugging in de browserconsole
        if (typeof window !== 'undefined') {
          window.lastUploadLogPayload = logPayload;
          // console.log('Preparing to send upload log to ip.vossius.info', logPayload);
        }

        fetch('http://ip.vossius.info:81/upload_log.php', {
          method: 'POST',
          headers: {
            'x-api-key': API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(logPayload),
        }).catch(() => {});
      } catch (e) {
      }
    }

    return uploadResponse;
  },
};
