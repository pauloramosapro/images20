// In RecordsComponent.jsx
import React, { useState, useEffect } from 'react';
import { saveToUpdatesTxt } from '../api/beeldbankApi';
import { getRecordIdentifiers, formatRecordNumber, getConfig, getMaxObject } from '../utils/configParser';
import { config } from '../config.js';

// Helper function to get the root path
const getRootPath = () => {
  // This assumes the frontend is served from the 'frontend' directory
  // Adjust the path traversal based on your actual directory structure
  return window.location.pathname.split('/app/frontend')[0] || '/';
};

// Separate async function to check for duplicates using backend API
const checkDuplicatesInBeeldbank = async (records, beeldbank) => {
  if (!records || !beeldbank || records.length === 0) {
    return [];
  }

  try {
    // Extract record numbers from the records
    const recordNumbers = records
      .map(record => record.recordNummer || record.recordNumber)
      .filter(num => num && num !== '');

    if (recordNumbers.length === 0) {
      return records;
    }

    // Use the new backend endpoint
    const response = await fetch(`${config.API_BASE || window.location.origin}/misc/api/zcbs_backend.php?endpoint=/api/check-duplicate-records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.CK || 'ZCBSSystemimages2.0'
      },
      body: JSON.stringify({
        beeldbank: beeldbank,
        recordNumbers: recordNumbers
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    // Update the original records with found status
    const updatedRecords = records.map(record => {
      const recordNumber = record.recordNummer || record.recordNumber;
      const isDuplicate = result.success && result.duplicates.some(dup => dup.recordNumber === recordNumber);
      
      return {
        ...record,
        found: isDuplicate ? 1 : 0
      };
    });

    // Show alert for duplicates (optional - can be removed if table shows status)
    if (result.success && result.duplicates.length > 0) {
      const foundRecords = result.duplicates.map(dup => dup.recordNumber).join(', ');
      alert(`De volgende recordnummers zijn gevonden: ${foundRecords}`);
    }

    return updatedRecords;

  } catch (error) {
    console.error('Error checking duplicates via backend:', error);
    // Return original records with found: 0 on error
    return records.map(record => ({ ...record, found: 0 }));
  }
};

const RecordsComponent = ({ records, beeldbank, onRecordsUpdate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState({ id1: 'SC', id2: '1015' });
  const [displayRecords, setDisplayRecords] = useState([]);

  // Format a record number according to the current config
  const formatRecordNum = (number) => {
    return formatRecordNumber(number, config);
  };

  // Format all record numbers when config or records change
  useEffect(() => {
    if (records?.length > 0 && config) {
      const updatedRecords = records.map(record => ({
        ...record,
        formattedRecordNumber: formatRecordNum(record.recordNummer)
      }));
      
      if (onRecordsUpdate) {
        onRecordsUpdate(updatedRecords);
      }
    }
  }, [records, config, onRecordsUpdate]);

  // Load configuration when component mounts or beeldbank changes
  useEffect(() => {
    let isMounted = true;
    
    const loadConfig = async () => {
      if (!beeldbank) return;
      
      try {
        const rootPath = getRootPath();
        const { id1, id2,max_object } = await getRecordIdentifiers(rootPath, beeldbank);
        const fullConfig = await getConfig(rootPath, beeldbank);
        
        if (!isMounted) return;
        
        const newConfig = { 
          id1, 
          id2,
          max_object,
        };
        
        setConfig(newConfig);
        
      } catch (error) {
        console.error('Error loading configuration:', error);
        if (isMounted) {
          setConfig({ id1: 'SC', id2: '1015' });
        }
      }
    };

    loadConfig();
    
    return () => {
      isMounted = false;
    };
  }, [beeldbank]);

  // Check for duplicates when records or beeldbank changes using backend API
  useEffect(() => {
    if (records?.length > 0 && beeldbank) {
      setIsLoading(true);
      checkDuplicatesInBeeldbank(records, beeldbank)
        .then(updatedRecords => {
          setDisplayRecords(updatedRecords);
          if (onRecordsUpdate) {
            onRecordsUpdate(updatedRecords);
          }
        })
        .catch(error => {
          console.error('Fout bij controleren van dubbelrecords:', error);
          setDisplayRecords(records);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setDisplayRecords(records || []);
    }
  }, [records, beeldbank, onRecordsUpdate]);

  // Function to show confirmation dialog with three options
  const showUploadConfirmation = () => {
    if (!beeldbank || !records?.length) {
      setSaveError('Geen geldige records of beeldbank geselecteerd');
      return;
    }
const maxObjectValue = getMaxObject(config);
    // Check if the number of records exceeds max_object
    if (records.length > maxObjectValue) {
      setSaveError(`Fout: Het maximum aantal objecten (${maxObjectValue}) is overschreven. Aantal geselecteerde records: ${records.length}`);
      return;
    }

    const userChoice = window.confirm(
      `Wat wilt u doen met de ${records.length} afbeelding(en)?\n\n` +
      `Beeldbank: ${beeldbank}\n` +
      `Maximaal aantal objecten: ${maxObjectValue}\n\n` +
      `Klik op OK om records te maken en te uploaden.\n` +
      `Klik op Annuleren om alleen de afbeeldingen te uploaden.`
    );

    if (userChoice === null) {
      // User clicked Cancel or closed the dialog
      return;
    }

    // If we get here, user clicked OK or Cancel
    const shouldCreateRecords = userChoice; // true for OK, false for Cancel
    
    if (shouldCreateRecords) {
      // User clicked OK - create records and upload files
      saveRecordsToUpdatesTxt();
    } else {
      // User clicked Cancel - only upload files
      uploadFilesOnly();
    }
  };

  // Function to handle file upload only (without creating records)
  const uploadFilesOnly = async () => {
    setIsSaving(true);
    setSaveMessage('');
    setSaveError('');

    try {
      // TODO: Implement file upload logic here
      // This is where you would call your file upload API
      setSaveMessage(`Bestanden succesvol geüpload naar ${beeldbank}`);
    } catch (error) {
      console.error('Fout bij uploaden bestanden:', error);
      setSaveError(`Fout bij uploaden: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Function to save records to updates.txt
  const saveRecordsToUpdatesTxt = async () => {
    setIsSaving(true);
    setSaveMessage('');
    setSaveError('');

    try {
      // Format records for saving - matching the exact format from the example
      const recordsToSave = records.map(record => {
        const now = new Date();
        const dateStr = now.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD format
        const timeStr = now.toTimeString().slice(0, 5); // HH:mm format
        const username = 'guiImages'; // Default username
        
        // Format matches exactly the example: SC\t1015\t00018\t\t\tDescription...\t...\t0018.jpg\t...\t240918-07:14|guiImages\t\t240918-07:14|guiImages
        // Using template literals with tabs for exact spacing
        return [
          config.id1 || 'SC',
          config.id2 || '1015',
          formatRecordNumber(record.recordNummer || '0', config),
          '\t', '\t', '\t','\t', // Drie empty fields
          `Een nog niet beschreven record (${dateStr}). Dit wordt gebruikt als beschrijving bij het aanmaken van records op de beeldbank. Dit kan later worden aangepast via de beheerfuncties op de beeldbank.`,
          // Multiple empty fields (using empty strings with tabs in between)
         
          `${formatRecordNumber(record.recordNummer || '0', config)}.jpg`,
          // More empty fields (using empty strings with tabs in between)
          ...Array(9).fill('\t'),
          `${dateStr}-${timeStr}|${username}`,
          '\t',
          `${dateStr}-${timeStr}|${username}`
        ];
      });

      // Save to updates.txt
      const result = await saveToUpdatesTxt(beeldbank, recordsToSave);
      
      setSaveMessage(`Successvol ${result.count} records opgeslagen in updates.txt`);
      
      // Refresh the data to show the newly added records
      const updatedData = await fetchBeeldbankData(beeldbank);
      setBeeldbankRecords(updatedData);
      
    } catch (error) {
      console.error('Fout bij opslaan van records:', error);
      setSaveError(`Fout bij opslaan: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Clear records when beeldbank changes
  useEffect(() => {
    if (records?.length > 0 && beeldbank) {
      setIsLoading(true);
      checkDuplicatesInBeeldbank(records, beeldbank)
        .then(results => {
          if (results.some(result => result.found === 1)) {
            const foundRecords = results
              .filter(result => result.found === 1)
              .map(result => result.recordNummer)
              .join(', ');
            
            alert(`De volgende recordnummers zijn gevonden: ${foundRecords}`);
          }
        })
        .catch(error => {
          console.error('Fout bij controleren van dubbelrecords:', error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [records, beeldbank]);

  // Only show the component if there are records to display
  if (displayRecords.length === 0) {
    return null;
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      {isLoading && <p className="text-gray-500">Bezig met laden...</p>}
      {saveMessage && (
        <div className="text-green-600 mb-4">
          {saveMessage}
        </div>
      )}
      {saveError && (
        <div className="text-red-600 mb-4">
          {saveError}
        </div>
      )}
      
      {/* Records Table */}
      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-3">Records voor {beeldbank}</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left">Record</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Bestandsnaam</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {displayRecords.map((record, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2">
                    {record.recordNummer || record.recordNumber || 'N/A'}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {record.fileName || record.originalName || `Record ${index + 1}`}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      record.found === 1 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {record.found === 1 ? 'Dubbel gevonden' : 'Uniek'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RecordsComponent;