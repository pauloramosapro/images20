/**
 * Fetches configuration from the backend API
 * @param {string} beeldbank - The name of the beeldbank
 * @returns {Promise<Object>} Configuration object
 */
import config from '../config';

const fetchConfig = async (beeldbank) => {
  try {
    //console.log('configParser regel 10', beeldbank)
    //console.log('configParser regel 12 CK', config.CK)
    const apiUrl = `${config.API_BASE}/misc/api/zcbs_backend.php?endpoint=/api/beeldbank/${beeldbank}/config`;
    //console.log('Making request to:', apiUrl);
    const response = await fetch(apiUrl, {
      headers: {
        'x-api-key': config.CK || 'ZCBSSystemimages2.0'
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching config:', error);
    throw error;
  }
};

/**
 * Gets the ID1 and ID2 values for a specific beeldbank
 * @param {string} root - Root directory path (not used, kept for backward compatibility)
 * @param {string} [beeldbank] - Beeldbank name
 * @returns {Promise<{id1: string, id2: string}>} Object with id1 and id2 values
 */
export const getRecordIdentifiers = async (root, beeldbank) => {
  if (!beeldbank) {
    console.warn('No beeldbank provided, using default values');
    return { id1: 'SC', id2: '1015' };
  }

  try {
    const config = await fetchConfig(beeldbank);
    
    // Toon loc_image variabele uit de backend config
    // if (config.loc_image) {
    //   console.log('loc_image uit backend config:', config.loc_image);
    // } else {
    //   console.log('loc_image niet gevonden in config voor beeldbank:', beeldbank);
    // }
    
    return {
      id1: config.ID1 || 'XX',
      id2: config.ID2 || '0000',
      max_object: (typeof config?.MAX_OBJECT !== 'undefined' ? config.MAX_OBJECT : config?.max_object)
      
    };
  } catch (error) {
    console.error('Error getting record identifiers:', error);
    // Return default values if there's an error
    return { id1: 'SC', id2: '1015' };
  }
};

/**
 * Gets the configuration for a specific beeldbank
 * @param {string} root - Root directory path (not used, kept for backward compatibility)
 * @param {string} [beeldbank] - Beeldbank name
 * @returns {Promise<Object>} Configuration object
 */
export const getConfig = async (root, beeldbank) => {
  if (!beeldbank) {
    console.warn('No beeldbank provided, returning empty config');
    return {};
  }

  try {
    return await fetchConfig(beeldbank);
  } catch (error) {
    console.error('Error getting config:', error);
    return {};
  }
};

/**
 * Gets the MAX_OBJECT value from config
 * @param {Object} config - The configuration object
 * @returns {number} The MAX_OBJECT value or 9999 if not found
 */
export const getMaxObject = (config) => {
  const rawMaxObject = (typeof config?.MAX_OBJECT !== 'undefined' ? config.MAX_OBJECT : config?.max_object);
  if (rawMaxObject === undefined || rawMaxObject === null || rawMaxObject === '') return 9999;

  const maxObjectStr = String(rawMaxObject);
  
  // If 4 or more digits and all are 9s, use count of 9s as positions
  if (maxObjectStr.length >= 4 && /^9+$/.test(maxObjectStr)) {
    return parseInt('9'.repeat(maxObjectStr.length), 10);
  }
  
  // If 2 or fewer digits, use the value as positions
  if (maxObjectStr.length <= 2) {
    const positions = parseInt(maxObjectStr, 10);
    return parseInt('9'.repeat(positions), 10);
  }
  // Default case: parse as number
  return parseInt(maxObjectStr, 10);
};

/**
 * Formats a record number with leading zeros based on MAX_OBJECT from config
 * @param {number|string} number - The record number to format
 * @param {Object} config - The configuration object containing MAX_OBJECT
 * @returns {string} Formatted record number with leading zeros
 */
// Track which numbers have triggered an alert
const alertedNumbers = new Set();

// Global flag to prevent multiple popups in one session
let hasShownMaxObjectError = false;

// Export function to reset the global flag
export const resetMaxObjectErrorFlag = () => {
  hasShownMaxObjectError = false;
};

export const formatRecordNumber = (number, config) => {
  
  const maxObject = getMaxObject(config);
  const maxLength = maxObject.toString().length;
  const num = parseInt(number, 10);
  
  if (isNaN(num)) {
    console.warn(`Invalid number provided to formatRecordNumber: ${number}`);
    return String(number);
  }
  
  // Controleer of het nummer groter is dan max_object - alleen loggen, geen fatale error meer
  if (num > maxObject && !alertedNumbers.has(num)) {
    const warningMsg = `⚠️ Waarschuwing: Recordnummer ${num} is te hoog!\n\nMaximum toegestaan: ${maxObject}\nHuidig recordnummer: ${num}\n\nDit wordt afgehandeld door type conversie in de RecordNumberDetector.`;
    console.warn(warningMsg);
    
    // Voeg het nummer toe aan de set zodat we het niet opnieuw tonen
    alertedNumbers.add(num);
    
    // Geen fatale error meer - geen browser herstart
    // De conversie naar type E wordt nu in RecordNumberDetector afgehandeld
  }
  
  return String(num).padStart(maxLength, '0');
};

// Exporteer een functie om de set leeg te maken indien nodig
export const resetAlertedNumbers = () => {
  alertedNumbers.clear();
};