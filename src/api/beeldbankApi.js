/**
 * Fetches records from a specific beeldbank database and any updates
 * @param {string} beeldbank - The name of the beeldbank
 * @returns {Promise<Object>} - Object containing separate data and updates arrays
 */
import { config } from '../config';

// Simple cache to prevent duplicate calls within 500ms
const fetchCache = new Map();
const CACHE_DURATION = 500;

export const fetchBeeldbankRecords = async (beeldbank) => {
 //console.log('[fetchBeeldbankRecords] start for beeldbank:', beeldbank);
 
 // Check cache
 const now = Date.now();
 const cached = fetchCache.get(beeldbank);
 if (cached && (now - cached.timestamp) < CACHE_DURATION) {
   //console.log('[fetchBeeldbankRecords] returning cached result for beeldbank:', beeldbank);
   return cached.promise;
 }
 
 // Create and cache the promise
 const promise = (async () => {
   try {
     // Log de ingang van de functie
     //console.log('=== FETCH BEELDBANK RECORDS ===');
     //console.log('Beeldbank parameter:', beeldbank);
     //console.log('API_BASE:', config.API_BASE);
     
     // Controleer of beeldbank een geldige waarde heeft
     if (!beeldbank) {
       const errorMsg = 'Geen beeldbank opgegeven';
       console.error(errorMsg);
       throw new Error(errorMsg);
     }
     
     // Maak de volledige URL
     const url = `${config.API_BASE}/misc/api/zcbs_backend.php?endpoint=/api/beeldbank/${encodeURIComponent(beeldbank)}`;
     //console.log('Aanroepen beeldbank api r24 van URL:', url);
     
     
     // Voer de fetch uit
     //console.log('Fetch gestart...');
     const response = await fetch(url , {
       headers: {
         'X-API-Key': config.CK
       }
     });
     //console.log('Response ontvangen. Status:', response.status, response.statusText);
     
     if (!response.ok) {
       const errorText = await response.text();
       console.error('Fout bij ophalen gegevens:', {
         status: response.status,
         statusText: response.statusText,
         url: response.url,
         error: errorText
       });
       throw new Error(`Fout ${response.status}: ${response.statusText}`);
     }
     
     //console.log('Response wordt verwerkt...');
     const result = await response.json();
     //console.log('Aantal records ontvangen:', result.data?.length || 0);
     
     // Return data and updates as separate arrays
     const data = Array.isArray(result.data) ? result.data : [];
     const updates = Array.isArray(result.updates) ? result.updates : [];
     
     //console.log('[fetchBeeldbankRecords] completed for beeldbank:', beeldbank, {
     //  dataCount: data.length,
     //  updatesCount: updates.length,
     //  sampleData: data.slice(0, 2),
     //  sampleUpdates: updates.slice(0, 2)
     //});
     
     return { data, updates };
   } catch (error) {
     console.error('Error fetching beeldbank records:', error);
     throw error;
   } finally {
     // Clean cache after completion
     setTimeout(() => {
       fetchCache.delete(beeldbank);
     }, CACHE_DURATION);
   }
 })();
 
 fetchCache.set(beeldbank, { promise, timestamp: now });
 return promise;
};

/**
 * Saves records to updates.txt for a specific beeldbank
 * @param {string} beeldbank - The name of the beeldbank
 * @param {Array} records - Array of records to save
 * @returns {Promise<Object>} - Response from the server
 */
export const saveToUpdatesTxt = async (beeldbank, records) => {
 // console.log('beeldbank api beeldbank updates regel 68', beeldbank);
 
  try {
    //console.log('beeldbank api beeldbank updates regel 72');
    const response = await fetch(`${config.API_BASE}/misc/api/zcbs_backend.php?endpoint=/api/beeldbank/${beeldbank}/updates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.CK,
      },
      body: JSON.stringify({ records })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error saving to updates.txt');
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving to updates.txt:', error);
    throw error;
  }
};
