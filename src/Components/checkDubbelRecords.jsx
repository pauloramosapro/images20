import React, { useState, useEffect, useRef, useCallback } from 'react';
import { formatRecordNumber } from '../utils/configParser';
import { config } from '../config.js';

const Popup = ({ onClose, children }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50">
    <div className="bg-white p-2 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto text-sm">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-base font-bold">Dubbele Records</h3>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          ✕
        </button>
      </div>
      <div className="space-y-2">
        {children}
      </div>
      <div className="mt-3 text-right">
        <button
          onClick={onClose}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Sluiten
        </button>
      </div>
    </div>
  </div>
);

const CheckDubbelRecords = ({ selectedBeeldbank, recordInfoMap = {}, onDuplicatesFound, triggerDuplicateCheck, onDuplicateStatusChanged, hasTypeC = false, hasTypeE = false }) => {
  const [processedRecords, setProcessedRecords] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState([]);
  const checkedCombinations = useRef(new Set());

  // Log when recordInfoMap changes
  useEffect(() => {
    //console.log('recordInfoMap updated:', recordInfoMap);
    
    if (!recordInfoMap || Object.keys(recordInfoMap).length === 0) {
      setProcessedRecords([]);
      return;
    }

    // Convert recordInfoMap to an array of record numbers to check
    const recordNumbers = Object.values(recordInfoMap)
      .filter(info => info.recordNumber)
      .map(info => info.recordNumber);

    //console.log('Record numbers to check:', recordNumbers);
    setProcessedRecords(recordNumbers);
  }, [recordInfoMap]);

  // Memoized function to check for duplicates using backend API
  const checkForDuplicates = useCallback(async (recordNumbersToCheck, beeldbankToCheck) => {
    // console.log('=== START BACKEND DUBBELRECORDS CONTROLE ===');
    // console.log('Beeldbank:', beeldbankToCheck);
    // console.log('Aantal te controleren records:', recordNumbersToCheck.length);
    // console.log('Record numbers:', recordNumbersToCheck);
    
    if (!recordNumbersToCheck.length || !beeldbankToCheck) return;

    try {
      const response = await fetch(`${config.API_BASE}/misc/api/zcbs_backend.php?endpoint=/api/check-duplicate-records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.CK || 'ZCBSSystemimages2.0'
        },
        body: JSON.stringify({
          beeldbank: beeldbankToCheck,
          recordNumbers: recordNumbersToCheck
        })
      });

      //console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      //console.log('Backend result:', result);

      if (result.success && result.duplicates.length > 0) {
        // console.log('=== DUBBELRECORDS GEVONDEN VIA BACKEND ===');
        // console.log('Aantal dubbelrecords gevonden:', result.duplicates.length);
        
        const updatedRecords = { ...recordInfoMap };
        let hasUpdates = false;
        
        result.duplicates.forEach(dup => {
          // console.log('Processing duplicate from backend:', dup);
          
          // Find the record key by record number
          const recordKey = Object.keys(recordInfoMap).find(key => {
            const record = recordInfoMap[key];
            return record?.recordNumber === dup.recordNumber;
          });
          
          // console.log('Found recordKey for duplicate:', recordKey);
          
          if (recordKey && !updatedRecords[recordKey]?.duplicate) {
            // console.log('Setting duplicate flag for:', recordKey);
            updatedRecords[recordKey] = {
              ...updatedRecords[recordKey],
              duplicate: true,
              status: 'Duplicaat',
              duplicateInfo: {
                source: dup.source,
                location: dup.location
              }
            };
            hasUpdates = true;
          }
        });
        
        // console.log('Updated records with duplicates:', updatedRecords);
        // console.log('Has updates:', hasUpdates);
        
        if (hasUpdates && onDuplicatesFound) {
          // console.log('Calling onDuplicatesFound with updated records');
          onDuplicatesFound(updatedRecords);
        }
        
        // Inform parent about duplicate status change
        if (onDuplicateStatusChanged) {
          const hasDuplicates = result.duplicates.length > 0;
          console.log('Calling onDuplicateStatusChanged with:', hasDuplicates);
          onDuplicateStatusChanged(hasDuplicates);
        }
        
        // Set duplicate info for popup display
        const duplicateDisplayInfo = result.duplicates.map(dup => ({
          recordNumber: dup.recordNumber,
          source: dup.source,
          location: dup.location,
          // Find the original record info for display
          originalRecord: Object.values(recordInfoMap).find(record => record.recordNumber === dup.recordNumber)
        }));
        
        // console.log('Setting duplicateInfo:', duplicateDisplayInfo);
        setDuplicateInfo(duplicateDisplayInfo);
        // console.log('Setting showPopup to true');
        setShowPopup(true);
      } else {
        // console.log('Geen dubbelrecords gevonden via backend');
        if (onDuplicatesFound) {
          onDuplicatesFound(recordInfoMap);
        }
        
        // Inform parent about duplicate status change (no duplicates)
        if (onDuplicateStatusChanged) {
          console.log('Calling onDuplicateStatusChanged with: false (no duplicates)');
          onDuplicateStatusChanged(false);
        }
      }
    } catch (error) {
      console.error('Error checking duplicates via backend:', error);
      // Fallback to original method if backend fails
      // console.log('Backend failed, falling back to original method');
      // Here you could call the original frontend method as fallback
    }
  }, [recordInfoMap, onDuplicatesFound]);

  // Trigger duplicate check when conditions are met (only if no Type C or E files)
  useEffect(() => {
    // Skip automatic check if Type C or Type E files exist
    if (hasTypeC || hasTypeE) {
      return;
    }
    
    const combinationKey = `${selectedBeeldbank}-${processedRecords.length}`;
    
    if (!selectedBeeldbank || processedRecords.length === 0) return;
    if (checkedCombinations.current.has(combinationKey)) return;
    
    checkedCombinations.current.add(combinationKey);
    checkForDuplicates(processedRecords, selectedBeeldbank);
  }, [selectedBeeldbank, processedRecords.length, checkForDuplicates, hasTypeC, hasTypeE]);

  // Manual trigger for duplicate check (called from parent)
  useEffect(() => {
    if (triggerDuplicateCheck && selectedBeeldbank && processedRecords.length > 0) {
      //console.log('=== MANUAL TRIGGER DUBBELRECORDS CHECK ===');
      // Clear the combination cache to allow re-checking
      checkedCombinations.current.clear();
      checkForDuplicates(processedRecords, selectedBeeldbank);
    }
  }, [triggerDuplicateCheck, selectedBeeldbank, processedRecords, checkForDuplicates]);

  return (
    <>
      <div></div>
      
      {showPopup && (
        <>
         
          <Popup onClose={() => setShowPopup(false)}>
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Dubbele records gevonden:</h4>
              <div className="overflow-x-auto">
                <table className="w-full bg-white border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm">Record</th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm">Bestandsnaam</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {duplicateInfo.map((dup, index) => (
                      <tr key={index} className="border-t border-gray-100">
                        <td className="border border-gray-300 px-3 py-2">
                          <span className="font-medium">{dup.recordNumber || 'N/A'}</span>
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          <span className="text-gray-600">
                            {dup.originalRecord?.fileName || dup.originalRecord?.originalName || `Record ${index + 1}`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Popup>
        </>
      )}
    </>
  );
};

export default CheckDubbelRecords;