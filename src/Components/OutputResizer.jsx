// Output_resizer
// --------------
// Deze component bevat ALLE UI/HTML. Hij is 'presentational' en heeft geen eigen state.
// Alle data en handlers komen via props binnen vanuit `Functie_resizer`.
// Zo blijft de UI losgekoppeld van de logica en kun je deze component makkelijk vervangen.

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { version as frontendVersion } from '../../package.json';
import { initBeeldbanken } from './initBeeldbanken';
import RecordsComponent from './RecordsComponent.jsx';
import CheckDubbelRecords from './checkDubbelRecords';
import CheckDubbelImages from './checkDubbelImages';
import TypeOverride from './TypeOverride.jsx';
import { config as appConfig } from '../config.js';
import { STEPS } from './constants';
import './StepIndicator.css';
import SettingsModal from './SettingsModal';
import { getConfig, getMaxObject } from '../utils/configParser';
// Debug function (empty in production)
const useDebugProps = () => {};

export default function Output_resizer({
  sizeOptions,
  selectedOption,
  setSelectedOption,
  uploadProgress,
  message,
  savedInfo,
  // Step management
  currentStep,
  setCurrentStep,
  completedSteps,
  completeStep,
  goToStep,
  // Beeldbank veld
  beeldbank,
  setBeeldbank,
  formatRestriction,
  // Submap selectie props (voor 'large')
  subdirMode = '',
  setSubdirMode,
  subdirs,
  loadingSubdirs,
  subdirsError,
  selectedSubdir,
  setSelectedSubdir,
  newSubdir,
  setNewSubdir,
  selectedFilesCount,
  selectedFiles,
  isUploading,
  onFileChange,
  onUpload,
  RecordNumberDetectorComponent,
  recordInfoMap,
  setRecordInfoMap,
  setHasDuplicateRecords,
  cStartNumber,
  setCStartNumber,
  // Selectiemodus: 'directory' | 'files'
  selectMode,
  setSelectMode,
  recordsArray = [],
  // Type override props
  typeOverride,
  setTypeOverride,
  typeOverrideRecordNumber,
  setTypeOverrideRecordNumber,
  updateRecordNumbersForTypeOverride,
  // Small upload control props
  disabledSmallUpload = false,
  onDisabledSmallUploadChange = () => {},
}) {
  // Backend status state - default to offline until we confirm connection
  const [backendStatus, setBackendStatus] = useState('offline');
  const [backendVersion, setBackendVersion] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [duplicateFilenames, setDuplicateFilenames] = useState([]);
  const [beeldbankConfig, setBeeldbankConfig] = useState({});
  const [triggerDuplicateCheck, setTriggerDuplicateCheck] = useState(0);
  const [statusBarKey, setStatusBarKey] = useState(0); // For refreshing status bar
  const [selectedOverrideType, setSelectedOverrideType] = useState(''); // Track selected type for dynamic labels
  const [localCStartNumber, setLocalCStartNumber] = useState(''); // Local state for record number input

  // Handle selected type change for dynamic label updates
  const handleSelectedTypeChange = (newType) => {
    setSelectedOverrideType(newType);
    
    // Update record numbers based on the new type override
    if (updateRecordNumbersForTypeOverride) {
      const overrideFlag = (newType === 'C' || newType === 'E') ? newType : null;
      updateRecordNumbersForTypeOverride(newType, typeOverrideRecordNumber, overrideFlag);
    }
  };

  // Get max object value for validation
  const maxObjectValue = useMemo(() => {
    return getMaxObject(beeldbankConfig);
  }, [beeldbankConfig]);

  // Validate record number against MAX_OBJECT
  const isValidRecordNumber = useCallback((recordNumber) => {
    if (!recordNumber || !/^\d+$/.test(String(recordNumber))) {
      return false;
    }
    const num = parseInt(String(recordNumber), 10);
    return num <= maxObjectValue;
  }, [maxObjectValue]);

  // Calculate type counts and check for Type C/E files
  const { typeCounts, hasInvalidType } = useMemo(() => {
    if (!recordInfoMap || Object.keys(recordInfoMap).length === 0) {
      return { typeCounts: {}, hasInvalidType: false };
    }

    const counts = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    let hasInvalid = false;
    
    Object.values(recordInfoMap).forEach(info => {
      // Ignore variant files (isException) for type counting
      if (info && info.type && !info.isException) {
        counts[info.type] = (counts[info.type] || 0) + 1;
      }
    });
    
    // Type E is alleen invalid als er andere types naast E bestaan
    const nonZeroTypes = Object.keys(counts).filter(type => counts[type] > 0);
    const hasOnlyTypeE = nonZeroTypes.length === 1 && nonZeroTypes[0] === 'E';
    
    if (!hasOnlyTypeE && counts.E > 0) {
      hasInvalid = true; // Type E is alleen invalid als er andere types zijn
    }
    
    return { typeCounts: counts, hasInvalidType: hasInvalid };
  }, [recordInfoMap]);

  // Extract hasTypeC and hasE from type counts
  const hasTypeC = (typeCounts.C || 0) > 0;
  const hasE = (typeCounts.E || 0) > 0;

  // Valid C start number check
  const validCStart = !!(cStartNumber && /^\d+$/.test(String(cStartNumber)));

  // Check if next button should be enabled
  const canProceedToNext = useMemo(() => {
    // If no Type C files, always allow (Type D/E don't need start number)
    if (!hasTypeC) {
      return true;
    }
    
    // If Type C files exist, need valid record number
    return cStartNumber && isValidRecordNumber(cStartNumber);
  }, [hasTypeC, cStartNumber, isValidRecordNumber]);

  // Check if upload should be enabled based on format configuration
  const canUpload = useMemo(() => {
    // Basic requirements
    if (selectedFilesCount === 0) {
      return false;
    }
    
    // Check Type C start number requirement (only Type C needs start number)
    if (hasTypeC && !validCStart) {
      return false;
    }
    
    // If format restriction exists in config, format is already selected
    if (formatRestriction && formatRestriction !== '0') {
      return true; // Format is fixed, start number is validated above
    }
    
    // If no format restriction, need explicit format selection
    return !!selectedOption;
  }, [selectedOption, selectedFilesCount, formatRestriction, hasTypeC, validCStart]);

  // Update record numbers when record number changes (for Types C and E)
  useEffect(() => {
    if (selectedOverrideType && updateRecordNumbersForTypeOverride && typeOverrideRecordNumber) {
      const overrideFlag = (selectedOverrideType === 'C' || selectedOverrideType === 'E') ? selectedOverrideType : null;
      updateRecordNumbersForTypeOverride(selectedOverrideType, typeOverrideRecordNumber, overrideFlag);
    }
  }, [selectedOverrideType, typeOverrideRecordNumber]);

  // Update password status when the modal is opened/closed or when the config might have changed
  useEffect(() => {
    const checkPassword = async () => {
      try {
        const initialConfigPath = process.env.NODE_ENV === 'development' 
  ? '/public/config.json'
  : '/zcbs_frontend/config.json';
        const response = await fetch(initialConfigPath);
        const config = await response.json();
        // Check for both CKP and SETTINGS_PASSWORD for backward compatibility
        setHasPassword(!!(config.CKP || config.SETTINGS_PASSWORD));
      } catch (error) {
        console.error('Error checking password status:', error);
      }
    };
    
    checkPassword();
  }, [isSettingsOpen]);

  // Load beeldbank config when selected beeldbank changes
  useEffect(() => {
    const loadBeeldbankConfig = async () => {
      if (beeldbank) {
        try {
          const config = await getConfig(null, beeldbank);
          setBeeldbankConfig(config);
        } catch (error) {
          console.error('Fout bij het laden van de beeldbank configuratie:', error);
          setBeeldbankConfig({});
        }
      }
    };
    
    loadBeeldbankConfig();
  }, [beeldbank]);
  
  // Function to check if a step is active
  const isStepActive = (step) => {
    return currentStep === step;
  };
  
  // Function to check if a step is completed
  const isStepCompleted = (step) => {
    return completedSteps[step] || false;
  };
  
const getStepClass = (stepKey) => {
  const stepValue = STEPS[stepKey];
  if (!stepValue) return '';
  
  // Only mark as active if it's the current step and not completed yet
  if (stepValue === currentStep && !completedSteps[stepValue]) {
    return 'active';
  }
  
  // Check if the step is completed by checking both the step key and value
  if ((completedSteps && completedSteps[stepValue]) || 
      (completedSteps && completedSteps[STEPS[stepKey]])) {
    return 'completed';
  }
  
  return '';
};

  // Debug log to check current step
//  console.log('Current step:', currentStep, 'STEPS:', STEPS);

  // Check if a step is clickable
  const isStepClickable = (stepKey) => {
    const stepValue = STEPS[stepKey];
    if (!stepValue) return false;
    
    // First step is always clickable
    if (stepKey === 'SELECT_BEELDBANK') return true;
    
    // Check if a blocked image bank is selected
    if (beeldbank) {
      const selectedBank = beeldbankenMetFormaat.find(bank => bank.naam === beeldbank);
      if (selectedBank?.isBlocked) {
        // If a blocked image bank is selected, disable all steps after SELECT_BEELDBANK
        return false;
      }
    }
    
    // Other steps are clickable if they are completed or the next in sequence
    const stepOrder = Object.values(STEPS);
    const currentIndex = stepOrder.indexOf(currentStep);
    const targetIndex = stepOrder.indexOf(stepValue);
    
    return targetIndex <= currentIndex || (completedSteps && completedSteps[stepValue]);
  };
  
  // Get API base URL from the centralized config
  const getApiBase = () => {
    try {
      //console.log('OutputResizer - appConfig.API_BASE:', appConfig.API_BASE);
      //console.log('OutputResizer - appConfig:', appConfig);
      
      let apiBase = appConfig.API_BASE;
      
      // If API_BASE is just "/", use the current origin
      if (apiBase === '/') {
        apiBase = window.location.origin;
        console.log('API_BASE is "/", using window.location.origin:', apiBase);
      }
      // If API_BASE is empty or undefined, use fallback
      else if (!apiBase) {
        apiBase = window.location.origin;
        console.log('API_BASE is empty, using fallback:', apiBase);
      }
      
      // Clean up the URL (remove trailing slashes)
      const cleanedBase = apiBase.replace(/\/+$/, '');
      //console.log('Final API base after cleaning:', cleanedBase);
      return cleanedBase;
    } catch (error) {
      console.error('Error getting API base URL:', error);
      setBackendStatus('offline');
      return '';
    }
  };

  // Fetch backend version from /api/health
  const fetchBackendVersion = async () => {
    try {
      //console.log('beeldbank api beeldbank updates regel 68')
      const base = getApiBase();
      const response = await fetch(`${base}/misc/api/zcbs_backend.php?endpoint=/api/health`);
      if (response.ok) {
        const data = await response.json();
        return data.version || 'unknown';
      }
      return 'unknown';
    } catch (error) {
      console.error('Error fetching backend version:', error);
      return 'error';
    }
  };

  // Check backend status on component mount and periodically
  useEffect(() => {
    let isMounted = true;
    let intervalId = null;

    const checkBackendStatus = async () => {
      try {
        // Get API base URL from centralized config
        const base = getApiBase();
        if (!base) {
          throw new Error('API base URL not available');
        }

        // Use the dedicated health check endpoint
        const healthCheckUrl = `${base}/misc/api/zcbs_backend.php?endpoint=/api/health`;
        // console.log('Checking backend health at:', healthCheckUrl);
        //console.log('base url is ',window.location.origin);
        // GET request to check the health endpoint
       // console.log('Checking backend health at:', healthCheckUrl);
        const response = await fetch(healthCheckUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          cache: 'no-store',
          signal: AbortSignal.timeout(5000)
        });
        
        const isOnline = response.ok;
        
        if (!isMounted) return;
        
        setBackendStatus(isOnline ? 'online' : 'offline');
        
        // Fetch and set backend version if online
        if (isOnline) {
          try {
            const data = await response.json();
            setBackendVersion(data.version || 'unknown');
          } catch (e) {
            console.error('Error parsing version:', e);
            setBackendVersion('error');
          }
        } else {
          setBackendVersion('');
        }
        
        // Update the status indicator
        const indicator = document.getElementById('backend-status');
        const statusText = document.querySelector('#backend-status + span');
        
        if (indicator && statusText) {
          indicator.className = `w-3 h-3 rounded-full ${
            isOnline ? 'bg-green-500' : 'bg-red-500'
          }`;
          statusText.textContent = isOnline ? 'Backend online' : 'Backend offline';
          statusText.className = `text-xs ${isOnline ? 'text-green-700' : 'text-red-700'}`;
        }
      } catch (error) {
        if (!isMounted) return;
        
        console.error('Error checking backend status:', error);
        setBackendStatus('offline');
        const indicator = document.getElementById('backend-status');
        const statusText = document.querySelector('#backend-status + span');
        if (indicator && statusText) {
          indicator.className = 'w-3 h-3 rounded-full bg-red-500';
          statusText.textContent = 'Backend offline';
          statusText.className = 'text-xs text-red-700';
        }
      }
    };

    // Initial check with a small delay to ensure config is loaded
    const initialCheck = async () => {
      await checkBackendStatus();
      // Set up periodic checking (every 30 seconds)
      if (isMounted) {
        intervalId = setInterval(checkBackendStatus, 30000);
      }
    };
    
    initialCheck();
    
    // Clean up on component unmount
    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  // Debug props
  useDebugProps({
    sizeOptions,
    selectedOption,
    uploadProgress,
    message,
    savedInfo,
    beeldbank,
    subdirMode,
    subdirs,
    loadingSubdirs,
    subdirsError,
    selectedSubdir,
    newSubdir,
    selectedFilesCount,
    selectedFiles,
    isUploading,
    recordInfoMap,
    cStartNumber,
    selectMode
  });
  
  // Get image banks from config with their formats
  const beeldbankenMetFormaat = useMemo(() => {
    try {
      // First try to get from appConfig.BEELDBANKEN
      let banks = [];
      
      if (Array.isArray(appConfig.BEELDBANKEN)) {
        banks = appConfig.BEELDBANKEN;
      } 
      // Fallback to appConfig.beeldbankenData if available
      else if (Array.isArray(appConfig.beeldbankenData)) {
        banks = appConfig.beeldbankenData;
      }
      
      
      
      return banks.map(bank => ({
        naam: bank.naam || bank,
        format: bank.format || '0',
        isBlocked: bank.format === '-'
      }));
    } catch (error) {
      console.error('Error loading image banks:', error);
      console.error('Error details:', {
        BEELDBANKEN: appConfig.BEELDBANKEN,
        beeldbankenData: appConfig.beeldbankenData,
        error: error.message
      });
      return [];
    }
  }, []);
  
  
  // Debug log om te controleren of de component wordt gerenderd
  
  
  // Is er minimaal één type C-bestand?
  // (hasTypeC en validCStart zijn al hierboven gedefinieerd)

  // Use type counts for display and logic
  const displayTypeCounts = typeCounts;
  
  const nonZeroTypes = Object.entries(displayTypeCounts)
    .filter(([, n]) => n > 0)
    .map(([t]) => t);
    
  const isSingleType = nonZeroTypes.length === 1;
  const singleType = isSingleType ? nonZeroTypes[0] : '';
  // (hasE is al hierboven gedefinieerd)
  
  // Label voor getoond gedetecteerd type
  const detectedLabel = isSingleType ? singleType : '';
  
  // Check for type conflicts
  const multiTypeConflict = selectedFilesCount > 0 && (
    nonZeroTypes.length > 1 || hasInvalidType
  );
  
  // State for success popup
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [uploadedFilesCount, setUploadedFilesCount] = useState(0);

  // State for type conflict popup
  const [showTypeConflictPopup, setShowTypeConflictPopup] = useState(false);

  // Handle multiTypeConflict: show popup and auto-select type E
  useEffect(() => {
    if (multiTypeConflict && !typeOverride) {
      // Show popup alleen als er nog geen override is
      setShowTypeConflictPopup(true);
      
      // Auto-select type E
      setTypeOverride('E');
      handleSelectedTypeChange('E');
      
      console.log('Multi-type conflict detected. Auto-selected type E.');
    }
  }, [multiTypeConflict, typeOverride]);

  // Show success popup when upload is complete
  useEffect(() => {
    if (savedInfo && Object.keys(savedInfo).length > 0) {
      // Calculate total number of uploaded files
      const totalFiles = Object.values(savedInfo).reduce(
        (sum, files) => sum + files.length, 0
      );
      setUploadedFilesCount(totalFiles);
      setShowSuccessPopup(true);
    }
  }, [savedInfo]);

  // Render upload status based on current state
  const renderUploadStatus = () => {
    const uploadsInProgress = uploadProgress && Object.keys(uploadProgress).length > 0;
    const hasSavedInfo = savedInfo && Object.keys(savedInfo).length > 0;
    
    // Show upload progress if there are active uploads
    if (uploadsInProgress) {
      // Calculate total progress percentage
      const progressValues = Object.values(uploadProgress);
      const totalProgress = progressValues.reduce((sum, val) => sum + val, 0) / progressValues.length;
      
      const totalFiles = Object.keys(uploadProgress).length;
      
      return (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Upload Voortgang</h3>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="font-medium text-gray-800">Totaal voortgang</span>
              <span className="font-semibold text-blue-600">{Math.round(totalProgress)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, totalProgress))}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {totalFiles} bestand{totalFiles !== 1 ? 'en' : ''} zijn verwerkt...
            </p>
          </div>
        </div>
      );
    }

    // Show uploaded files if available
    if (hasSavedInfo) {
      return (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Geüploade bestanden</h3>
          {Object.entries(savedInfo).map(([target, files]) => (
            <div key={target} className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="font-medium text-sm text-gray-900 mb-2">
                {target === 'root' ? 'Hoofdmap' : `Map: ${target}`}
              </div>
              <ul className="space-y-1">
                {files.map((file, fileIdx) => (
                  <li key={fileIdx} className="text-sm text-gray-600 flex items-center">
                    <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {file.filename}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  // Step indicator steps configuration
  const steps = [
    { id: 'SELECT_BEELDBANK', label: 'Beeldbank', number: 1 },
    { id: 'SELECT_FOLDER', label: 'Map', number: 2 },
    { id: 'SELECT_FILES', label: 'IMAGES', number: 3 },
    { id: 'TYPE_OVERRIDE', label: 'Image Type', number: 4 },
    { id: 'SELECT_FORMAT', label: 'Formaat', number: 5 },
    { id: 'UPLOAD', label: 'Uploaden', number: 6 },
  ];

  // STEPS constant is already imported from Functie_resizer
  // goToStep is passed as a prop from Functie_resizer

  return (
    <div className="app-container">
      {/* Step Indicator */}
      <div className="step-indicator">
        {steps.map((step) => {
          const stepValue = STEPS[step.id];
          const isClickable = isStepClickable(step.id);
          
          return (
            <div 
              key={step.id}
              className={`step ${getStepClass(step.id)} ${isClickable ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
              onClick={() => isClickable ? goToStep(stepValue) : null}
            >
              <div className="step-number">{step.number}</div>
              <div className="step-label">{step.label}</div>
            </div>
          );
        })}
      </div>

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-3">Upload voltooid!</h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Er {uploadedFilesCount/3 === 1 ? 'is' : 'zijn'} succesvol {uploadedFilesCount/3} bestand{uploadedFilesCount/3 !== 1 ? 'en' : ''} geüpload.
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  (naar small/large en 100pct formaat)
                </p>
              </div>
              <div className="mt-5">
                <button
                  type="button"
                  className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                  onClick={() => {
                    setShowSuccessPopup(false);
                    window.close();
                  }}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Type Conflict Popup */}
      {showTypeConflictPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
                Meerdere typen gedetecteerd
              </h3>
              <div className="text-sm text-gray-500 mb-4">
                <p>Er zijn meerdere bestandstypen gedetecteerd in uw selectie.</p>
                <p>Dit is niet toegestaan. Er is automatisch gekozen voor type E.</p>
              </div>
              <div className="mt-5">
                <button
                  type="button"
                  className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-yellow-600 text-base font-medium text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 sm:text-sm"
                  onClick={() => {
                    setShowTypeConflictPopup(false);
                  }}
                >
                  Begrepen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex w-full" style={{ height: 'calc(100vh - 100px)' }}>
        {/* LEFT COLUMN: inputs and controls */}
        <div className="bg-blue-200 w-1/2 p-3 box-border overflow-y-auto">
          <div className="space-y-4">
            {/* Backend status indicator */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500" id="backend-status"></div>
                <span className="text-xs text-red-700" id="backend-status-text">Backend offline</span>
                {backendStatus === 'online' && (
                  <span className="text-xs text-green-800 ml-2">
                    BackEnd versie: <b>{backendVersion}</b> | FrontEnd versie: <b>{frontendVersion}</b>
                  </span>
                )}
              </div>
              <div className="relative flex items-center space-x-2">
                <a 
                  href="./help.html" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-1 text-gray-500 hover:text-gray-700"
                  title="Help"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-6 w-6" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                    />
                  </svg>
                </a>
                <button 
                  onClick={(e) => {
                    if (e.altKey) {
                      e.preventDefault();
                      window.location.href = '/zcbs_frontend/?debug=1';
                    } else {
                      setIsSettingsOpen(true);
                    }
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                  className="p-1 text-gray-500 hover:text-gray-700 relative"
                  title="Instellingen (Alt+klik voor debug modus)"
                >
                  {hasPassword ? (
                    <div className="relative h-7 w-7">
                      {/* Lock icon */}
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-7 w-7 absolute" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
                        />
                      </svg>
                      {/* Small gear icon */}
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-7 w-7 absolute text-gray-400" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
                        />
                      </svg>
                    </div>
                  ) : (
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-7 w-7" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
                      />
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
                      />
                    </svg>
                  )}
                </button>
              </div>
              <SettingsModal 
                isOpen={isSettingsOpen} 
                onClose={() => {
                  setIsSettingsOpen(false);
                  // Update password status when modal is closed
                  setHasPassword(!!appConfig.SETTINGS_PASSWORD);
                }}
                onSave={() => {
                  setIsSettingsOpen(false);
                  setHasPassword(!!appConfig.SETTINGS_PASSWORD);
                  setStatusBarKey(prev => prev + 1); // Refresh status bar
                  window.location.reload();
                }}
              />
            </div>
{/* Small Image Upload Control */}
         
            {/* Beeldbank selectie */}
            <div 
              id="beeldbankSelectContainer" 
              className={`w-full bg-blue-200 py-2 mb-4 relative ${currentStep === STEPS.SELECT_BEELDBANK ? 'active-section' : ''}`}
            >
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="beeldbankSelect" className="text-sm font-medium text-gray-700">
                  Beeldbank:
                </label>
                {beeldbank && (
                  <button
                    onClick={() => window.location.reload()}
                    className="text-xs bg-red-100 hover:bg-red-200 text-red-700 py-1 px-2 rounded flex items-center"
                    title="Pagina verversen en alles resetten"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reset alles
                  </button>
                )}
              </div>
              <div className="relative">
                <select 
                  className={`w-full border rounded bg-white text-xs ${beeldbank ? 'pr-8' : ''}`}
                  id="beeldbankSelect"
                  value={beeldbank || ''}
                  onChange={(e) => {
                    if (setBeeldbank) {
                      setBeeldbank(e.target.value);
                      if (e.target.value && completeStep) {
                        completeStep(STEPS.SELECT_BEELDBANK);
                      }
                    }
                  }}
                  disabled={!!beeldbank}
                >
                  <option value="">-- Kies een beeldbank --</option>
                  {beeldbankenMetFormaat.map((bank) => (
                    <option 
                      key={bank.naam} 
                      value={bank.naam}
                      disabled={bank.isBlocked}
                      className={bank.isBlocked ? 'text-gray-400' : ''}
                      title={bank.isBlocked ? 'Deze beeldbank is geblokkeerd' : ''}
                    >
                      {bank.naam} {bank.isBlocked ? '(geblokkeerd)' : ''}
                    </option>
                  ))}
                </select>
                {beeldbank && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              {beeldbank && (
                <p className="text-xs text-green-700 mt-1">
                  Beeldbank geselecteerd. Klik op 'Reset alles' om de pagina te verversen.
                  {beeldbankenMetFormaat.some(b => b.naam === beeldbank && b.isBlocked) && (
                    <span className="text-red-600 block mt-1">
                      Waarschuwing: Deze beeldbank is momenteel geblokkeerd in de instellingen.
                    </span>
                  )}
                </p>
              )}
            </div>
                          {/* Add the CheckDubbelRecords component here */}
            {beeldbank && !isUploading && (
              <CheckDubbelRecords 
                selectedBeeldbank={beeldbank} 
                recordInfoMap={recordInfoMap}
                triggerDuplicateCheck={triggerDuplicateCheck}
                onDuplicateStatusChanged={setHasDuplicateRecords}
                onDuplicatesFound={(updatedRecords) => {
                  // console.log('=== ON DUPLICATES FOUND CALLBACK ===');
                  // console.log('Updated records received:', updatedRecords);
                  // console.log('Records with duplicate flag:', 
                  //   Object.entries(updatedRecords || {})
                  //     .filter(([key, value]) => value.duplicate)
                  //     .map(([key, value]) => ({ file: key, recordNumber: value.recordNumber, duplicate: value.duplicate }))
                  // );
                  // Update de recordInfoMap in de parent component
                  if (setRecordInfoMap) {
                    setRecordInfoMap(updatedRecords);
                    // console.log('RecordInfoMap bijgewerkt met duplicaten:', updatedRecords);
                  }
                }}
              />
            )}
            {/* Submap keuze voor 'large' */}
            {beeldbank && (
              <div className='w-full p-3 mb-4'>
                <div className={`w-full p-3 rounded ${currentStep === STEPS.SELECT_FOLDER ? 'border-2 border-red-500' : ''} ${
                  // Check if the current image bank is blocked
                  (() => {
                    const selectedBank = beeldbankenMetFormaat.find(bank => bank.naam === beeldbank);
                    return selectedBank?.isBlocked ? 'bg-gray-200' : 'bg-blue-200';
                  })()
                }`}>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <label className='flex items-center space-x-2 whitespace-nowrap'>
                      <input
                        type="radio"
                        name="subdirMode"
                        value="root"
                        checked={subdirMode === 'root'}
                        onChange={(e) => {
                          const selectedBank = beeldbankenMetFormaat.find(bank => bank.naam === beeldbank);
                          if (selectedBank?.isBlocked) {
                            e.preventDefault();
                            return;
                          }
                          if (setSubdirMode) {
                            setSubdirMode(e.target.value);
                            // Complete current step and immediately move to file selection
                            completeStep(STEPS.SELECT_FOLDER);
                            // Force move to the next step (file selection)
                            setCurrentStep && setCurrentStep(STEPS.SELECT_FILES);
                          }
                        }}
                        className='h-3 w-3'
                        disabled={beeldbankenMetFormaat.find(bank => bank.naam === beeldbank)?.isBlocked}
                      />
                      <span>Naar root</span>
                    </label>
                    
                    {subdirs.length > 0 && (
                      <label className='flex items-center space-x-2 whitespace-nowrap'>
                        <input
                          type="radio"
                          name="subdirMode"
                          value="existing"
                          checked={subdirMode === 'existing'}
                          onChange={(e) => {
                            const selectedBank = beeldbankenMetFormaat.find(bank => bank.naam === beeldbank);
                            if (selectedBank?.isBlocked) {
                              e.preventDefault();
                              return;
                            }
                            if (setSubdirMode) {
                              setSubdirMode(e.target.value);
                              // Don't complete the step here, wait for folder selection
                            }
                          }}
                          className='h-3 w-3'
                          disabled={beeldbankenMetFormaat.find(bank => bank.naam === beeldbank)?.isBlocked}
                        />
                        <span>Bestaande map kiezen</span>
                      </label>
                    )}

                    <label className='flex items-center space-x-2 whitespace-nowrap'>
                      <input
                        type="radio"
                        name="subdirMode"
                        value="new"
                        checked={subdirMode === 'new'}
                        onChange={(e) => {
                          const selectedBank = beeldbankenMetFormaat.find(bank => bank.naam === beeldbank);
                          if (selectedBank?.isBlocked) {
                            e.preventDefault();
                            return;
                          }
                          setSubdirMode && setSubdirMode(e.target.value);
                        }}
                        className='h-3 w-3'
                        disabled={beeldbankenMetFormaat.find(bank => bank.naam === beeldbank)?.isBlocked}
                      />
                      <span>Nieuwe map maken</span>
                    </label>
                  </div>

                  {subdirsError && <div className="text-red-500 text-xs mt-2">{subdirsError}</div>}
                  
                  {subdirMode === 'existing' && subdirs.length > 0 && (
                    <div className="mt-2">
                      <select
                        value={selectedSubdir}
                        onChange={(e) => {
                          if (setSelectedSubdir) {
                            const selectedValue = e.target.value;
                            setSelectedSubdir(selectedValue);
                            // When a folder is selected, update the current step to SELECT_FOLDER
                            if (selectedValue) {
                              setCurrentStep && setCurrentStep(STEPS.SELECT_FOLDER);
                              // Also mark the folder selection step as completed
                              completeStep && completeStep(STEPS.SELECT_FOLDER);
                            }
                          }
                        }}
                        className={`w-full border rounded text-sm p-1 ${currentStep === STEPS.SELECT_FOLDER && subdirMode === 'existing' ? 'border-2 border-red-500' : ''}`}
                      >
                        <option value="">-- Kies een map --</option>
                        {subdirs?.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {subdirMode === 'new' && (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={newSubdir}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^\w\-\s]/g, '');
                          if (setNewSubdir) {
                            setNewSubdir(value);
                            // Complete current step when a new folder name is entered
                            if (value.trim() !== '') {
                              completeStep(STEPS.SELECT_FOLDER);
                            }
                          }
                        }}
                        placeholder="bijv. 2025-09-30"
                        className={`w-full border rounded text-sm p-1 ${currentStep === STEPS.SELECT_FOLDER && subdirMode === 'new' ? 'border-2 border-red-500' : ''}`}
                      />
                      <div className="text-xs text-gray-600 mt-1">
                        Toegestane tekens: letters, cijfers, streepje en underscore.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            
          
                    
                    )}
            {/* File/Directory Selection */}
            {beeldbank && isStepCompleted(STEPS.SELECT_FOLDER) && (
            <div className={`mt-4 ${(currentStep === STEPS.SELECT_FOLDER && subdirMode === 'root') || currentStep === STEPS.SELECT_FILES ? 'border-2 border-red-500 p-4 rounded' : ''}`}>
              <div className="flex items-center">
                <div className="flex items-center space-x-4 text-xs">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="selectMode"
                      value="files"
                      checked={selectMode === 'files'}
                      onChange={(e) => setSelectMode && setSelectMode(e.target.value)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="ml-2 ">Images selecteren</span>
                    <div className="relative ml-4 group">
                  <div className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 text-gray-600 cursor-help">
                    ?
                  </div>
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-white border border-gray-200 rounded shadow-lg text-sm text-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    {selectMode === 'files'
                      ? 'Kies de afbeelding(en) die je wilt uploaden, daarna kies je het formaat en druk je op Upload.'
                      : 'Kies hieronder één of meerdere afbeeldingen, daarna kies je het formaat en druk je op Upload.'}
                  </div>
                </div>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="selectMode"
                      value="directory"
                      checked={selectMode === 'directory'}
                      onChange={(e) => setSelectMode && setSelectMode(e.target.value)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="ml-2">Map selecteren</span>
                  </label>
                </div>
                
                <div className="relative ml-4 group">
                  <div className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 text-gray-600 cursor-help">
                    ?
                  </div>
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-white border border-gray-200 rounded shadow-lg text-sm text-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    {selectMode === 'directory'
                      ? 'Kies eerst een map hieronder (alle submappen en bestanden worden meegenomen), daarna kies je het formaat en druk je op Upload.'
                      : 'Kies hieronder één of meerdere afbeeldingen, daarna kies je het formaat en druk je op Upload.'}
                  </div>
                </div>
              </div>
            
              <div className="mt-2">
                {selectMode == 'directory' && (
                <label className="cursor-pointer flex items-center justify-center border-2 border-dashed border-gray-300 rounded p-3 mt-2">
                  <input
                      type="file"
                      className="hidden"
                      webkitdirectory=""
                      directory=""
                      multiple
                      accept="image/*"
                      onChange={onFileChange}
                    />
                  <div className="text-center">
                    <svg className="w-6 h-6 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <span className="text-sm">Map selecteren</span>
                    <p className="text-xs text-gray-500 mt-1">Klik hier en selecteer een map (browser kan om bevestiging vragen)</p>
                  </div>
                </label>
                )}
                {selectMode == 'files' && (
                <label className="cursor-pointer flex items-center justify-center border-2 border-dashed border-gray-300 rounded p-3">
                  <input
                      type="file"
                      className="hidden"
                      multiple
                      accept="image/*"
                      onChange={onFileChange}
                    />
                  <div className="text-center">
                    <svg className="h-6 w-6 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-sm">Images selecteren</span>
                  </div>
                </label>
                )}
                
              </div>
               
              <div className="mt-4 grid grid-cols-3 gap-4 items-center">
                {/* Selected files count */}
                <div className="text-center">
                  <span className="text-green-600 font-medium">
                    {selectedFilesCount} {selectMode === 'directory' ? 'bestanden geselecteerd' : 'afbeelding(en) geselecteerd'}
                  </span>
                </div>
                
                {/* Check for duplicate images */}
                <div className="flex justify-center">
                  {selectedFilesCount > 0 && (
                    <CheckDubbelImages 
                      imageList={selectedFiles || []}
                      beeldbank={beeldbank}
                      subdir={subdirMode === 'existing' ? selectedSubdir : newSubdir}
                      onDuplicatesFound={(duplicateFilenames) => {
                        // Update the duplicate filenames state
                        setDuplicateFilenames(duplicateFilenames);
                        
                        if (recordInfoMap && setRecordInfoMap) {
                          // Create a new copy of the recordInfoMap
                          const updatedMap = { ...recordInfoMap };
                          
                          // Update hasDubbelImages for all files in the recordInfoMap
                          Object.keys(updatedMap).forEach(filename => {
                            if (updatedMap[filename]) {
                              updatedMap[filename] = {
                                ...updatedMap[filename],
                                hasDubbelImages: duplicateFilenames.includes(filename)
                              };
                            }
                          });
                          
                          // Update the recordInfoMap in the parent component
                          setRecordInfoMap(updatedMap);
                        }
                      }}
                    />
                  )}
                </div>
                
                {/* Record number detector */}
                <div className="flex items-center justify-end space-x-2">
                  <RecordNumberDetectorComponent
                    key={`detector-${cStartNumber || 'none'}`}
                    files={selectedFiles || []}
                    onRecordsReady={setRecordInfoMap}
                    cStartNumber={cStartNumber}
                    onChangeCStartNumber={setCStartNumber}
                    beeldbank={beeldbank}
                    quiet={true}
                    summaryOnly={true}
                    className="hidden"
                  />
                  <span className="font-medium">Gedetecteerde typen:</span>
                  <span className="text-blue-800">
                    {['A', 'B', 'C', 'D', 'E']
                      .filter(type => typeCounts[type] > 0)
                      .map(type => `${typeCounts[type]}x ${type}`)
                      .join(', ')}
                  </span>
                </div>
              </div>
              
              {/* Type Override Step - Show after files are selected and current step is TYPE_OVERRIDE */}
              {selectedFilesCount > 0 && currentStep === STEPS.TYPE_OVERRIDE && (
                <div className="mt-4 p-4 border-2 border-blue-500 rounded-lg bg-blue-50">
                  <h3 className="text-lg font-medium text-blue-900 mb-4">Image Type</h3>
                  <TypeOverride
                    files={selectedFiles || []}
                    detectedType={detectedLabel}
                    onTypeOverride={setTypeOverride}
                    onSelectedTypeChange={handleSelectedTypeChange}
                    beeldbankConfig={beeldbankConfig}
                    multiTypeConflict={multiTypeConflict}
                  />
                  
                  {/* Start record number for type C/E files - moved here */}
                  {((selectedOverrideType === 'C') || (selectedOverrideType === 'E') || 
                    (!selectedOverrideType && ((detectedLabel === 'C') || (detectedLabel === 'E')))) && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start recordnummer voor type {selectedOverrideType || detectedLabel} bestanden: <span>Hoogste getal is {maxObjectValue}</span>
                      </label>
                      <input
                        type="text"
                        value={localCStartNumber}
                        onChange={(e) => {
                          // Only allow numbers and update the local state
                          const value = e.target.value.replace(/\D/g, '');
                          setLocalCStartNumber(value);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            // Update the parent component's state
                            if (setCStartNumber) {
                              setCStartNumber(localCStartNumber);
                              // Trigger a re-detection of record numbers with the new start number
                              if (RecordNumberDetectorComponent && selectedFiles) {
                                const detector = document.querySelector('.record-number-detector');
                                if (detector && detector.detectRecords) {
                                  detector.detectRecords(selectedFiles, localCStartNumber);
                                }
                              }
                            }
                            // Trigger duplicate check
                            setTriggerDuplicateCheck(prev => prev + 1);
                            // Move focus to next element (like Tab would)
                            const formElements = Array.from(document.querySelectorAll('input, button, select, textarea, [tabindex]:not([tabindex="-1"])'));
                            const currentIndex = formElements.indexOf(e.target);
                            if (currentIndex < formElements.length - 1) {
                              formElements[currentIndex + 1].focus();
                            }
                          }
                        }}
                        onBlur={() => {
                          // When the input loses focus, update the parent component's state
                          // console.log('Input lost focus ourputresizer, localCStartNumber:', localCStartNumber);
                          // console.log('Current override flag:', selectedOverrideType);
                          // console.log('Current cStartNumber:', cStartNumber);
                          // console.log('Current Veld cStartNumber:', localCStartNumber);
                          if (setCStartNumber) {
                            // Alleen cStartNumber bijwerken als het niet leeg is OF als er geen override actief is
                            //if (localCStartNumber && (!selectedOverrideType || (selectedOverrideType !== 'C' && selectedOverrideType !== 'E')))
                            if (localCStartNumber )   
                            {
                              setCStartNumber(localCStartNumber, selectedOverrideType);  // ← Override flag mee sturen
                              // Trigger a re-detection of record numbers with the new start number
                              if (RecordNumberDetectorComponent && selectedFiles) {
                                const detector = document.querySelector('.record-number-detector');
                                if (detector && detector.detectRecords) {
                                  detector.detectRecords(selectedFiles, localCStartNumber);
                                }
                              }
                              // Trigger duplicate check
                              setTriggerDuplicateCheck(prev => prev + 1);
                            } else {
                              console.log('cStartNumber NIET bijgewerkt - override actief of input leeg');
                              // Stuur override flag mee zelfs als cStartNumber niet wordt bijgewerkt
                              if (selectedOverrideType && (selectedOverrideType === 'C' || selectedOverrideType === 'E')) {
                                setCStartNumber(cStartNumber, selectedOverrideType);  // ← Override flag mee sturen
                              }
                            }
                          }
                        }}
                        placeholder="Bijv. 1000"
                        className="w-full border rounded"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Voer het startnummer in dat gebruikt moet worden voor de type {selectedOverrideType || detectedLabel} bestanden.
                      </p>
                    </div>
                  )}
                  
                  {/* Navigation buttons */}
                  <div className="flex justify-end mt-6">
                    <button
                      onClick={() => {
                        completeStep && completeStep(STEPS.TYPE_OVERRIDE);
                        goToStep && goToStep(STEPS.SELECT_FORMAT);
                      }}
                      disabled={!canProceedToNext}
                      className={`px-4 py-2 rounded ${
                        canProceedToNext 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      Volgende
                    </button>
                  </div>
                </div>
              )}
              
              {/* Formaat selectie - Alleen tonen als er bestanden zijn geselecteerd en TYPE_OVERRIDE stap is voltooid */}
              {selectedFilesCount > 0 && isStepCompleted(STEPS.TYPE_OVERRIDE) && (((!hasTypeC && !hasE) || (hasTypeC && cStartNumber))|| ((!hasTypeC && !hasE) || (hasE && cStartNumber))) && (
                <fieldset className="text-sm">
                  <legend className="bg-sky-300">
                    {formatRestriction && formatRestriction !== '0' 
                      ? 'Vaste formaatcombinatie:' 
                      : 'Kies een formaatcombinatie:'}
                  </legend>
                  {hasTypeC && !cStartNumber && (
                    <p className="text-red-500 text-sm mt-2">
                      Vul een startnummer in voor type C bestanden om door te gaan.
                    </p>
                  )}
                  {hasE && !cStartNumber && (
                    <p className="text-red-500 text-sm mt-2">
                      Vul een startnummer in voor type E bestanden om door te gaan.
                    </p>
                  )}
                  {(hasTypeC || hasE) && cStartNumber && !isValidRecordNumber(cStartNumber) && (
                    <p className="text-red-500 text-sm mt-2">
                      Startnummer {cStartNumber} is te hoog! Maximum toegestaan: {maxObjectValue}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Linkerkolom: opties 1, 2, 3 */}
                    <div className="space-y-2">
                      {[1, 2, 3].map(option => {
                        const sizes = sizeOptions[option];
                        if (!sizes) return null;
                        
                        const isSelected = selectedOption === String(option);
                        const isForced = formatRestriction && formatRestriction !== '0';
                        
                        return (
                          <label
                            key={option}
                            className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer border transition-colors text-xs ${
                              isSelected
                                ? isForced 
                                  ? 'border-green-500 bg-green-50' 
                                  : 'border-blue-500 bg-blue-50'
                                : isForced
                                  ? 'cursor-not-allowed bg-gray-100 border-gray-200 opacity-75'
                                  : 'border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name="formatOption"
                              value={option}
                              checked={isSelected}
                              onChange={(e) => {
                                if (!isForced && setSelectedOption) {
                                  setSelectedOption(e.target.value);
                                  
                                  // Try to mark the step as completed
                                  if (completeStep) {
                                    completeStep(STEPS.SELECT_FORMAT);
                                    completeStep('select_format');
                                    
                                    // Also try to update the local completedSteps reference
                                    if (completedSteps && typeof completedSteps === 'object') {
                                      completedSteps[STEPS.SELECT_FORMAT] = true;
                                      completedSteps['select_format'] = true;
                                    }
                                  }
                                  
                                  // If there's a next step, automatically proceed to it
                                  if (goToStep) {
                                    // Find the next step after SELECT_FORMAT
                                    const stepOrder = Object.values(STEPS);
                                    const currentIndex = stepOrder.indexOf(STEPS.SELECT_FORMAT);
                                    if (currentIndex < stepOrder.length - 1) {
                                      goToStep(stepOrder[currentIndex + 1]);
                                    }
                                  }
                                }
                              }}
                              className={`h-3 w-3 ${isForced ? 'text-green-600' : 'text-blue-600'} focus:ring-${isForced ? 'green' : 'blue'}-500`}
                              disabled={isForced}
                            />
                            <span className={`text-xs font-medium ${isForced ? 'text-gray-600' : 'text-gray-800'}`}>
                              {option} - {
                                Array.isArray(sizes) 
                                  ? sizes
                                      .map((s, index) => {
                                        if (index === sizes.length - 1 && (s === 'compressed' || s === 'original')) {
                                          return 'origineel';
                                        } else if (index === sizes.length - 1) {
                                          return `max. ${s.w}x${s.h}`;
                                        } else {
                                          return `${s.w}x${s.h}`;
                                        }
                                      })
                                      .join(' ')
                                  : `Ongeldig formaat`
                              }
                              {isForced && <span className="ml-1 text-green-600">(vastgezet)</span>}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    
                    {/* Rechterkolom: opties 6, 7, 8 */}
                    <div className="space-y-2">
                      {[6, 7, 8].map(option => {
                        const sizes = sizeOptions[option];
                        if (!sizes) return null;
                        
                        const isSelected = selectedOption === String(option);
                        const isForced = formatRestriction && formatRestriction !== '0';
                        
                        return (
                          <label
                            key={option}
                            className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer border transition-colors text-xs ${
                              isSelected
                                ? isForced 
                                  ? 'border-green-500 bg-green-50' 
                                  : 'border-blue-500 bg-blue-50'
                                : isForced
                                  ? 'cursor-not-allowed bg-gray-100 border-gray-200 opacity-75'
                                  : 'border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name="formatOption"
                              value={option}
                              checked={isSelected}
                              onChange={(e) => {
                                if (!isForced && setSelectedOption) {
                                  setSelectedOption(e.target.value);
                                  
                                  // Try to mark the step as completed
                                  if (completeStep) {
                                    completeStep(STEPS.SELECT_FORMAT);
                                    completeStep('select_format');
                                    
                                    // Also try to update the local completedSteps reference
                                    if (completedSteps && typeof completedSteps === 'object') {
                                      completedSteps[STEPS.SELECT_FORMAT] = true;
                                      completedSteps['select_format'] = true;
                                    }
                                  }
                                  
                                  // If there's a next step, automatically proceed to it
                                  if (goToStep) {
                                    // Find the next step after SELECT_FORMAT
                                    const stepOrder = Object.values(STEPS);
                                    const currentIndex = stepOrder.indexOf(STEPS.SELECT_FORMAT);
                                    if (currentIndex < stepOrder.length - 1) {
                                      goToStep(stepOrder[currentIndex + 1]);
                                    }
                                  }
                                }
                              }}
                              className={`h-3 w-3 ${isForced ? 'text-green-600' : 'text-blue-600'} focus:ring-${isForced ? 'green' : 'blue'}-500`}
                              disabled={isForced}
                            />
                            <span className={`text-xs font-medium ${isForced ? 'text-gray-600' : 'text-gray-800'}`}>
                              {option} - {
                                Array.isArray(sizes) 
                                  ? sizes
                                      .map((s, index) => {
                                        if (index === sizes.length - 1 && (s === 'compressed' || s === 'original')) {
                                          return 'origineel';
                                        } else if (index === sizes.length - 1) {
                                          return `max. ${s.w}x${s.h}`;
                                        } else {
                                          return `${s.w}x${s.h}`;
                                        }
                                      })
                                      .join(' ')
                                  : `Ongeldig formaat`
                              }
                              {isForced && <span className="ml-1 text-green-600">(vastgezet)</span>}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </fieldset>
              )}
              
            

              

              {/* Upload Button */}
              <button
                onClick={onUpload}
                disabled={
                  !canUpload || 
                  !isStepCompleted(STEPS.TYPE_OVERRIDE) || 
                  (!formatRestriction && !isStepCompleted(STEPS.SELECT_FORMAT))
                }
                className={`w-full mt-4 py-2 px-4 rounded text-white font-medium ${
                  !canUpload || 
                  !isStepCompleted(STEPS.TYPE_OVERRIDE) || 
                  (!formatRestriction && !isStepCompleted(STEPS.SELECT_FORMAT))
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isUploading ? 'Bezig met uploaden...' : 'Upload images'}
              </button>
            </div>)}
          </div>
        </div>

        {/* RIGHT COLUMN: upload status and file grid */}
        <div className="bg-gray-100 w-1/2 p-3 box-border overflow-y-auto">
          {/* Status Bar */}
          <div key={statusBarKey} className="mb-4 bg-blue-200 p-2 rounded border border-gray-200 shadow-sm" style={{ height: '50px' }}>
            <div className="flex justify-between items-center h-full text-xs">
              <span className="text-gray-700">
                <span className="font-medium">Upload small :</span>
                <span className="ml-1">{!appConfig.disableSmallUpload ? 'aan' : 'uit'}</span>
              </span>
              <span className="text-gray-700">
                <span className="font-medium">JPEG:</span>
                <span className="ml-1">{Math.round((appConfig.JPEG_QUALITY || 0.5) * 100)}%</span>
              </span>
              <span className="text-gray-700">
                <span className="font-medium">Lettertype:</span>
                <span className="ml-1">{appConfig.FONT_SIZE || 18}px</span>
              </span>
            </div>
          </div>
          {!uploadProgress || Object.keys(uploadProgress).length === 0 ? (
            <div className="mb-4 bg-white p-3 rounded-lg border border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Te uploaden bestanden ({selectedFilesCount || 0})</h3>
              
              {recordsArray.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {recordsArray.map((record, index) => (
                    <div 
                      key={index} 
                      className={`border rounded-lg overflow-hidden shadow-sm hover:shadow transition-shadow ${
                        duplicateFilenames.includes(record.bestandsnaam) 
                          ? 'bg-red-50 border-red-200' 
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="h-24 bg-gray-100 flex items-center justify-center overflow-hidden">
                        {record.bestandsnaam.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                          (() => {
                            const file = selectedFiles?.find(f => f.name === record.bestandsnaam);
                            return file ? (
                              <img 
                                src={URL.createObjectURL(file)}
                                alt="Thumbnail"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="text-gray-400">
                                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            );
                          })()
                        ) : (
                          <div className="text-gray-400">
                            <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <div className="flex items-center">
                          {duplicateFilenames.includes(record.bestandsnaam) && (
                            <span className="text-red-500 mr-1" title="Dit bestand bestaat al">
                              ⚠️
                            </span>
                          )}
                          <div className="text-xs font-medium text-gray-900 truncate flex-1" title={record.bestandsnaam}>
                            {record.bestandsnaam}
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-gray-500">{record.type}</span>
                          <span className="text-xs font-mono bg-gray-100 px-1 rounded">{record.recordNummer}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  Selecteer bestanden om ze hier te zien
                </p>
              )}
            </div>
          ) : null}
          
          {/* Show upload status (progress or completed) */}
          {renderUploadStatus()}
        </div>
      </div>
    </div>
  );
}
