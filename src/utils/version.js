/**
 * Utility functions for version handling
 */

// Get frontend version from package.json
export const getFrontendVersion = () => {
  try {
    // Import package.json dynamically to get the actual version
    // In production, this should be replaced with a build-time constant by Vite
    return import.meta.env.PACKAGE_VERSION || '1.0.3 07-04-26';
  } catch (error) {
    console.warn('Could not determine frontend version:', error);
    return 'unknown';
  }
};

// Get backend version from API response
export const getBackendVersion = async () => {
  try {
    const response = await fetch('/misc/api/zcbs_backend.php?endpoint=/api/health');
    if (response.ok) {
      const data = await response.json();
      return data.backendVersion || 'unknown';
    }
  } catch (error) {
    console.warn('Could not fetch backend version:', error);
  }
  return 'unknown';
};
