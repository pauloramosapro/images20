import React, { useState, useEffect, useMemo } from 'react';
import ErrorBoundary from './ErrorBoundary';
import { config } from '../config';

// Reusable Popup component
const Popup = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center border-b px-6 py-4">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
            aria-label="Sluiten"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>
        <div className="bg-gray-50 px-6 py-3 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Sluiten
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Component to display and handle duplicate image checks
 * @param {Object} props - Component props
 * @param {Array<string>} props.imageList - Array of image filenames to check for duplicates
 * @param {string} props.beeldbank - Beeldbank identifier
 * @param {string} props.subdir - Subdirectory path
 * @param {Function} props.onDuplicatesFound - Callback when duplicates are found
 */
// Ensure we don't duplicate the base URL
const getApiUrl = () => {
  const base = config.API_BASE.replace(/\/$/, ''); // Remove trailing slash if present
  return `${base}/misc/api/zcbs_backend.php?endpoint=/api/check-existing-images`;
};

const CheckDubbelImages = ({ imageList = [], beeldbank, subdir = '', onDuplicatesFound }) => {
  const [existingFiles, setExistingFiles] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Extract just the filename from a file object or path
  const getFilename = (file) => {
    // If it's a string, use it directly
    if (typeof file === 'string') return file;
    // For directory uploads, use webkitRelativePath if available, otherwise use name
    return file.webkitRelativePath ? file.webkitRelativePath.split('/').pop() : file.name;
  };

  // Check for existing images when imageList or other dependencies change
  useEffect(() => {
    //console.log('CheckDubbelImages - useEffect triggered', { 
    //   heeftBeeldbank: !!beeldbank, 
    //   heeftImageList: !!imageList, 
    //   imageListLength: imageList?.length || 0,
    //   subdir,
    //   currentExistingFiles: existingFiles, // Add current existingFiles to the log
    //   currentTotalExisting: Object.keys(existingFiles).length // Add current count to the log
    // });

    const checkExistingImages = async () => {
      if (!beeldbank || !imageList || imageList.length === 0) {
        // console.log('CheckDubbelImages - Missing required data:', { 
        //   heeftBeeldbank: !!beeldbank, 
        //   heeftImageList: !!imageList, 
        //   imageListLength: imageList?.length || 0 
        // });
        setExistingFiles({});
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Convert file objects to filenames, handling both single files and directory uploads
        const filenames = imageList.map(file => getFilename(file));
        
        const apiUrl = getApiUrl();
        // console.log('CheckDubbelImages - Making API request to:', apiUrl);
        // console.log('CheckDubbelImages - Request payload:', {
        //   beeldbank,
        //   filenames: imageList.map(file => getFilename(file)),
        //   subdir
        // });
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            beeldbank,
            filenames,
            subdir
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        
        // Enhanced debug logging
        //console.group('CheckDubbelImages - API Response');
        //console.log('Full response:', responseData);
        //console.log('API response data:', JSON.stringify(responseData, null, 2));

        // Process the API response with the expected structure
        let existingFilesData = {};

        if (responseData && responseData.results) {
          // Extract the different image sizes from the response
          const { small = {}, large = {}, '100pct': hundredPct = {} } = responseData.results;
          
          // Collect all unique filenames from all sizes
          const allFiles = new Set([
            ...Object.keys(small),
            ...Object.keys(large),
            ...Object.keys(hundredPct)
          ]);
          
          // Build the correct structure
          allFiles.forEach(filename => {
            existingFilesData[filename] = {
              small: small[filename] || [],
              large: large[filename] || [],
              '100pct': hundredPct[filename] || []
            };
          });
        }
        
        const duplicateFilenames = Object.keys(existingFilesData);
        const duplicatesCount = duplicateFilenames.length;
        
        console.groupEnd();
        //console.log ('duplicatesCount', duplicatesCount);
        // Update the state with the new data
        setExistingFiles(existingFilesData);
        
        // If there are duplicates and we have a callback, call it with the list of duplicate filenames
        if (onDuplicatesFound && duplicatesCount > 0) {
          
          // For directory uploads, we need to match the full webkitRelativePath
          const duplicateFullPaths = [];
          
          imageList.forEach(file => {
            const filename = getFilename(file);
            const isDuplicate = duplicateFilenames.includes(filename);
            
            if (isDuplicate) {
              // For directory uploads, use the full path to match with recordInfoMap
              const fullPath = file.webkitRelativePath || file.name;
              duplicateFullPaths.push(fullPath);
              
              // Debug log for each duplicate found
              // console.log('Found duplicate file:', {
              //   originalName: file.name,
              //   filename,
              //   fullPath,
              //   locations: existingFilesData[filename]
              // });
            }
          });
          
          onDuplicatesFound(duplicateFullPaths);
        }
      } catch (err) {
        console.error('Error checking existing images:', err);
        setError('Kan geen verbinding maken met de server. Probeer het later opnieuw.');
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingImages();
  }, [imageList, beeldbank, subdir]);

  const [showPopup, setShowPopup] = useState(false);
  
  // Count total existing files with actual duplicates
  const totalExisting = useMemo(() => {
    if (!existingFiles || typeof existingFiles !== 'object') return 0;
    return Object.entries(existingFiles).filter(([_, value]) => {
      // Check if there are any actual files in any of the size variants
      return (
        (value.small && Object.keys(value.small).length > 0) ||
        (value.large && Object.keys(value.large).length > 0) ||
        (value['100pct'] && Object.keys(value['100pct']).length > 0)
      );
    }).length;
  }, [existingFiles]);
  
  // Debug log for totalExisting
  useEffect(() => {
    // console.log('CheckDubbelImages - totalExisting updated:', totalExisting, 'existingFiles:', existingFiles);
  }, [totalExisting, existingFiles]);

  // Debug log for showPopup state and totalExisting
  useEffect(() => {
    
    // Auto-close popup if all duplicates are removed
    if (showPopup && totalExisting === 0) {
      setShowPopup(false);
    }
  }, [showPopup, totalExisting]);

  // Only show the popup if there are existing files and the popup is open
  const showResultsInPopup = showPopup && totalExisting > 0;
  
  // Handle popup open/close
  const handleOpenPopup = () => {
    if (totalExisting > 0) {
      setShowPopup(true);
    }
  };
  
  const handleClosePopup = () => {
    setShowPopup(false);
  };

  // Debug logs
  //console.log('CheckDubbelImages - Render:', {
  //   existingFiles,
  //   totalExisting,
  //   showPopup,
  //   showResultsInPopup,
  //   imageList: imageList?.map(f => typeof f === 'string' ? f : f.name || f.webkitRelativePath)
  // });

  return (
    <ErrorBoundary>
      <div className="mt-2">
      {totalExisting > 0 && (
        <button
          onClick={handleOpenPopup}
          disabled={isLoading}
          className={`m-2 px-3 py-1 text-sm rounded-md transition-colors ${
            isLoading 
              ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
              : 'bg-yellow-500 text-white hover:bg-yellow-600'
          }`}
        >
          {isLoading ? 'Controleren...' : `Toon ${totalExisting} ${totalExisting === 1 ? 'duplicaat' : 'dupplicaten'}`}
        </button>
      )}

      {/* Popup for showing duplicate files */}
      <Popup 
        isOpen={showResultsInPopup} 
        onClose={handleClosePopup}
        title={`${totalExisting} dubbel bestand${totalExisting !== 1 ? 'en' : ''} gevonden`}
      >
        <div className="space-y-3">
          {error ? (
            <div className="text-red-600 p-3 bg-red-50 rounded-md">
              {error}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-gray-500 mb-2">
                De volgende bestanden bestaan al in de geselecteerde map:
              </div>
              <div className="max-h-96 overflow-y-auto border rounded-md">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dubbele bestanden</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(existingFiles).map(([filename, sizes]) => {
                      // Debug log voor elke file
                     // console.log(`Rendering file: ${filename}`, sizes);
                      
                      return (
                        <tr key={filename} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{filename}</div>
                            <div className="mt-1 space-y-1 text-xs">
                              {Object.entries(sizes).map(([size, files]) => {
                                if (!files || !Array.isArray(files) || files.length === 0) {
                                  return null;
                                }
                                
                                return (
                                  <div key={size} className="flex items-start">
                                    <span className="inline-block w-12 text-gray-500">{size}:</span>
                                    <div className="flex-1">
                                      {files.map((file, idx) => (
                                        <div key={idx} className="text-gray-700 break-words" title={file}>
                                          {file}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="text-sm text-yellow-700 bg-yellow-50 p-3 rounded-md border border-yellow-200">
                ⚠️ Let op: Deze bestanden worden niet opnieuw geüpload om duplicaten te voorkomen.
              </div>
            </div>
          )}
        </div>
      </Popup>
      </div>
    </ErrorBoundary>
  );
};

export default CheckDubbelImages;
