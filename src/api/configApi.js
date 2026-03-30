import { config, ensureConfigLoaded } from '../config';

/**
 * Updates the upload root path on the backend
 * @param {string} path - The new upload root path (e.g., '/mnt/userhtml/public_html')
 * @returns {Promise<Object>} The response from the server
 */
export async function setUploadRoot(uploadPath) {
  try {
    // Ensure config is loaded before making the API call
    await ensureConfigLoaded();
    //console.log('on setuploadRoot');
    if (!uploadPath) {
      const errorMsg = 'Geen upload pad opgegeven';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    // Remove any leading slashes from the upload path
    const cleanUploadPath = uploadPath.replace(/^\/+/, '');
    
    //console.log(`Sending configapi regel 22 to: ${config.API_BASE}/api/config/upload-root`);
    
    const response = await fetch(`${config.API_BASE || window.location.origin}/api/config/upload-root`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: cleanUploadPath })
    });
    
    //console.log('Response status:', response.status, response.statusText);
   // console.log("Config is ",config.API_BASE);
    //console.log("Upload path is ",uploadPath);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.message || `HTTP fout: ${response.status} ${response.statusText}`;
      console.error('Fout bij instellen upload root:', errorMsg);
      throw new Error(errorMsg);
    }
    
    const result = await response.json();
    //console.log('Upload root succesvol ingesteld:', result);
    
    // Update de lokale configuratie
    config.updateConfig({ UPLOAD_ROOT: uploadPath });
    
    return result;
  } catch (error) {
    console.error('Error updating upload root:', error);
    throw error;
  }
}

/**
 * Gets the current upload root path from the backend
 * @returns {Promise<string>} The current upload root path
 */
export async function getUploadRoot() {
  try {
   // console.log('config api upload root regel 62');
    const response = await fetch(`${config.API_BASE || window.location.origin}/api/config/upload-root`);
    
    //console.log('Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.message || `HTTP fout: ${response.status} ${response.statusText}`;
      console.error('Fout bij ophalen upload root:', errorMsg);
      throw new Error(errorMsg);
    }
    
    const result = await response.json();
    //console.log('Huidig upload pad op de server:', result.path || 'Niet ingesteld');
    return result.path || '';
  } catch (error) {
    console.error('Fout bij ophalen upload root:', error);
    throw error;
    return config.uploadRoot;
  }
}
