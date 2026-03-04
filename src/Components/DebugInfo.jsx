import { useEffect } from 'react';
import { config, runtimeConfig } from '../config';

export function DebugInfo() {
  useEffect(() => {
 
    // Log the response from the /api/config/doc-root endpoint
    const fetchDocRoot = async () => {
      try {
        const response = await fetch('/api/config/doc-root');
        const data = await response.json();
        //console.log('API /api/config/doc-root response:', data);
      } catch (error) {
        console.error('Error fetching doc-root from API:', error);
      }
    };
    
    fetchDocRoot();
  }, []);

  return null; // This component doesn't render anything
}
