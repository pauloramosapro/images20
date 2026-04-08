// TypeOverride
// ----------
// Component that allows users to override the detected type for their files
// with a dropdown selection. Types C and E are always available, other types
// are only available if the filename meets the criteria.

import React, { useState, useEffect, useMemo } from 'react';
import { inferRecordInfo } from './RecordNumberDetector';

// Helper function to check if a filename meets criteria for a specific type
const canUseType = (filename, type, detectionCache, beeldbankConfig = {}, overrideFlag = null, allFiles = []) => {
  // Gebruik cache key die override flag bevat
  const maxObjectKey = (typeof beeldbankConfig?.MAX_OBJECT !== 'undefined'
    ? beeldbankConfig.MAX_OBJECT
    : beeldbankConfig?.max_object);
  const cacheKey = `${filename}_${overrideFlag || 'null'}_${String(maxObjectKey ?? 'null')}`;
  
  // Gebruik cache als beschikbaar, anders detecteer en sla op
  if (!detectionCache[cacheKey]) {
    detectionCache[cacheKey] = inferRecordInfo(filename, beeldbankConfig, overrideFlag, allFiles);
  }
  const info = detectionCache[cacheKey];
  
  // Voor Type A: accepteer zowel Type A als A_variant
  if (type === 'A') {
    return info && (info.type === 'A' || info.type === 'A_variant');
  }
  
  return info && info.type === type;
};

// Get available types based on filename criteria
const getAvailableTypes = (filenames, detectedType, detectionCache, beeldbankConfig = {}, overrideFlag = null, allFiles = [], multiTypeConflict = false) => {
  // console.log('=== GET AVAILABLE TYPES ===');
  // console.log('Override Flag in getAvailableTypes:', overrideFlag);
  // console.log('Detection Cache keys:', Object.keys(detectionCache));
  // console.log('Filenames:', filenames);
  // console.log('Multi-type conflict:', multiTypeConflict);
  // console.log('============================');
  
  const types = [];
  
  // Types C and E are always available
  types.push({ value: 'C', label: 'Type C - Willekeurige letters/cijfers (alleen - en _)', alwaysAvailable: true });
  types.push({ value: 'E', label: 'Type E - Willekeurige bestandsnaam', alwaysAvailable: true });
  
  // If there's a multi-type conflict, only show C and E
  if (multiTypeConflict) {
    return types;
  }
  
  // Check other types (A, B, D) based on filename criteria only
  const otherTypes = ['A', 'B', 'D'];
  
  for (const type of otherTypes) {
    // Check if any file meets the criteria for this type
    const hasMatchingFile = filenames.some(filename => canUseType(filename, type, detectionCache, beeldbankConfig, overrideFlag, allFiles));
    
    if (hasMatchingFile) {
      let label = '';
      switch (type) {
        case 'A':
          label = 'Type A - Vast aantal cijfers, geen letters';
          break;
        case 'B':
          label = 'Type B - Letters + cijfers';
          break;
        case 'D':
          label = 'Type D - Begint met cijfers';
          break;
        default:
          label = `Type ${type}`;
      }
      
      types.push({ value: type, label, alwaysAvailable: false });
    }
  }
  
  return types;
};

const TypeOverride = ({
  files = [],
  detectedType = '',
  onTypeOverride,
  onSelectedTypeChange, // Callback for type changes
  beeldbankConfig = {},
  multiTypeConflict = false // New prop to detect type conflicts
}) => {
  const [selectedType, setSelectedType] = useState(detectedType || '');
  const [availableTypes, setAvailableTypes] = useState([]);
  const [currentOverrideFlag, setCurrentOverrideFlag] = useState(null);
  const [detectionCache, setDetectionCache] = useState({}); // Cache verplaatst naar component level
  const [hasUserOverridden, setHasUserOverridden] = useState(false); // Nieuwe state variabele
  const [previousDetectedType, setPreviousDetectedType] = useState(detectedType); // Houd vorige detected type bij

  // Get filenames from files
  const filenames = useMemo(() => {
    return files.map(file => file.webkitRelativePath || file.name);
  }, [files]);

  // Update available types when files or detected type changes
  useEffect(() => {
    const types = getAvailableTypes(filenames, detectedType, detectionCache, beeldbankConfig, currentOverrideFlag, files, multiTypeConflict);
    setAvailableTypes(types);
    
    // Alleen de initial type bepalen als de gebruiker nog niet heeft geselecteerd
    if (!hasUserOverridden) {
      // Determine the best initial selection
      let initialType = detectedType;
      
      // If there's a multi-type conflict, force type E
      if (multiTypeConflict) {
        initialType = 'E';
      }
      // If no detected type or detected type not available, try to find a suitable default
      else if (!initialType || !types.some(t => t.value === initialType)) {
        // Check if Type A is available (includes A_variant files)
        if (types.some(t => t.value === 'A')) {
          initialType = 'A';
        }
        // Otherwise use the first available non-always type (A, B, D)
        else {
          const nonAlwaysType = types.find(t => !t.alwaysAvailable);
          if (nonAlwaysType) {
            initialType = nonAlwaysType.value;
          }
          // Fallback to C if nothing else available
          else if (types.some(t => t.value === 'C')) {
            initialType = 'C';
          }
        }
      }
      
      // Set initial selected type alleen als gebruiker nog niet heeft geselecteerd
      if (initialType && types.some(t => t.value === initialType)) {
        setSelectedType(initialType);
        // Notify parent of initial selected type
        onSelectedTypeChange && onSelectedTypeChange(initialType);
        // Reset hasUserOverridden only when detectedType actually changes
        if (previousDetectedType !== detectedType) {
          setHasUserOverridden(false);
          setPreviousDetectedType(detectedType);
        }
      }
    }
  }, [filenames, detectedType, currentOverrideFlag, beeldbankConfig, files, multiTypeConflict, previousDetectedType, hasUserOverridden]); // hasUserOverridden toegevoegd

  // Update available types when override flag changes (to refresh cache)
  useEffect(() => {
    const types = getAvailableTypes(filenames, detectedType, detectionCache, beeldbankConfig, currentOverrideFlag, files, multiTypeConflict);
    setAvailableTypes(types);
  }, [currentOverrideFlag, beeldbankConfig, files, multiTypeConflict]); // detectionCache verwijderd!

  // Handle type selection change
  const handleTypeChange = (newType) => {
    // console.log('=== TYPE CHANGE HANDLER ===');
    // console.log('Nieuw type:', newType);
    // console.log('Huidige override flag:', currentOverrideFlag);
    
    setSelectedType(newType);
    
    // Mark that the user has overridden if:
    // 1. The new type is different from the initially detected type, OR
    // 2. The detected type was '?' (representing multiple types), OR
    // 3. The user is changing from one override type to another (C to E or E to C)
    const isChangingOverride = (currentOverrideFlag === 'C' || currentOverrideFlag === 'E') && (newType === 'C' || newType === 'E');
    
    if (newType !== detectedType || detectedType === '?' || isChangingOverride) {
      console.log('Setting hasUserOverridden to true - newType:', newType, 'detectedType:', detectedType, 'isChangingOverride:', isChangingOverride);
      setHasUserOverridden(true);
    }
    
    // Set override flag based on selected type
    const overrideFlag = (newType === 'C' || newType === 'E') ? newType : null;
    //console.log('Nieuwe override flag:', overrideFlag);
    setCurrentOverrideFlag(overrideFlag);
    
    // Clear cache when override flag changes to force re-detection
    if (overrideFlag !== currentOverrideFlag) {
      //console.log('Cache wordt gewist - override flag veranderd');
      setDetectionCache({});
    }
    
    //console.log('==========================');
    
    // Notify parent of type override
    onTypeOverride && onTypeOverride(newType);
    
    // Notify parent of selected type change for dynamic label updates
    onSelectedTypeChange && onSelectedTypeChange(newType);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          
        </label>
        
        <div className="space-y-2">
          <div className="text-xs text-gray-600 mb-2">
            Gedetecteerd type: <span className="font-semibold text-blue-600">{detectedType || 'Onbekend'}</span>
          </div>
          
          <select
            value={selectedType}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="w-full border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
          >
            <option value="">-- Kies een type --</option>
            {availableTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
                {type.alwaysAvailable && ' (altijd beschikbaar)'}
              </option>
            ))}
          </select>
          
          <div className="text-xs text-gray-500">
            {multiTypeConflict && !hasUserOverridden ? (
              <p className="text-yellow-600 font-medium">• Multi-type conflict gedetecteerd: alleen types C en E beschikbaar</p>
            ) : (
              <>
                <p>• Types C en E zijn altijd beschikbaar</p>
                <p>• Andere types zijn alleen beschikbaar als de bestandsnaam voldoet aan de criteria</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypeOverride;
