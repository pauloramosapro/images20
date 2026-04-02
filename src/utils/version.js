/**
 * Utility functions for version handling
 */

// Get frontend version from package.json
export const getFrontendVersion = () => {
  try {
    // In development, we can try to read from package.json
    if (typeof window !== 'undefined' && window.location) {
      // For production, this should be replaced with a build-time constant
      return '1.0.2 31-03-26'; // This should match package.json version
    }
    return '1.0.2 31-03-26';
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
