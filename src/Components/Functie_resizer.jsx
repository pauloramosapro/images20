  // Functie_resizer
// ----------------
// Deze component bevat ALLE LOGICA (state en functies) voor het selecteren,
// resizen en uploaden van afbeeldingen. De daadwerkelijke HTML/UI staat in
// de presentational component `Output_resizer` en wordt via props aangestuurd.
// Zo kun je de logica makkelijk hergebruiken of de UI vervangen.

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { config, runtimeConfig } from '../config.js';
import { getFrontendVersion } from '../utils/version';
import { formatRecordNumber, getMaxObject, getConfig } from '../utils/configParser';
import OutputResizer from './OutputResizer.jsx';
import RecordNumberDetector from './RecordNumberDetector.jsx';
import RecordsComponent from './RecordsComponent.jsx';
import TypeOverride from './TypeOverride.jsx';
import { inferRecordInfo } from './RecordNumberDetector';
import { STEPS } from './constants';
import UTIF from 'utif';

// Simple function to generate unique IDs
const generateUploadId = () => {
  return 'upload_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

function getCookieValue(name) {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie ? document.cookie.split(';') : [];
  for (let i = 0; i < cookies.length; i += 1) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith(`${name}=`)) {
      return decodeURIComponent(cookie.substring(name.length + 1));
    }
  }
  return null;
}

async function getPublicIp() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    if (!response.ok) return null;
    const data = await response.json();
    return data.ip || null;
  } catch (e) {
    return null;
  }
}

// Function to convert TIFF, BMP, WebP, and PNG to JPEG using UTIF.js for real parsing
async function convertToJpeg(file, baseName) {
  try {
    const fileExtension = baseName.split('.').pop().toLowerCase();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = function(e) {
        try {
          const arrayBuffer = e.target.result;
          
          // Handle different formats
          if (fileExtension === 'tiff' || fileExtension === 'tif') {
            // Parse TIFF using UTIF.js
            const ifds = UTIF.decode(arrayBuffer);
            
            if (ifds.length === 0) {
              throw new Error('Geen geldige TIFF data gevonden');
            }
            
            // Get the first page/image
            const ifd = ifds[0];
            
            // Decode the image data
            UTIF.decodeImage(arrayBuffer, ifd);
            
            // Create canvas for conversion
            const canvas = document.createElement('canvas');
            canvas.width = ifd.width;
            canvas.height = ifd.height;
            const ctx = canvas.getContext('2d');
            
            // Create ImageData from TIFF data
            const rgba = UTIF.toRGBA8(ifd);
            const imageData = new ImageData(new Uint8ClampedArray(rgba), ifd.width, ifd.height);
            
            // Put the image data on canvas
            ctx.putImageData(imageData, 0, 0);
            
            // Convert to JPEG
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error(`Kon ${fileExtension.toUpperCase()} niet converteren naar JPEG blob`));
                  return;
                }
                
                createJpegFile(blob, baseName, fileExtension, resolve);
              },
              'image/jpeg',
              0.95 // High quality
            );
            
          } else if (fileExtension === 'bmp' || fileExtension === 'webp' || fileExtension === 'png') {
            // For BMP, WebP, and PNG, we can use the standard Image API
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);
            
            img.onload = function() {
              try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                
                // Set white background for transparency
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Draw the original image
                ctx.drawImage(img, 0, 0);
                
                // Convert to JPEG
                canvas.toBlob(
                  (blob) => {
                    if (!blob) {
                      reject(new Error(`Kon ${fileExtension.toUpperCase()} niet converteren naar JPEG blob`));
                      return;
                    }
                    
                    URL.revokeObjectURL(objectUrl);
                    createJpegFile(blob, baseName, fileExtension, resolve);
                  },
                  'image/jpeg',
                  0.95 // High quality
                );
                
              } catch (error) {
                console.error(`Fout bij canvas verwerking voor ${fileExtension.toUpperCase()}:`, error);
                URL.revokeObjectURL(objectUrl);
                reject(error);
              }
            };
            
            img.onerror = function() {
              console.error(`Fout bij laden ${fileExtension.toUpperCase()} afbeelding`);
              URL.revokeObjectURL(objectUrl);
              reject(new Error(`Kon ${fileExtension.toUpperCase()} niet laden als afbeelding`));
            };
            
            img.src = objectUrl;
            
          } else {
            throw new Error(`Niet-ondersteund bestandsformaat: ${fileExtension}`);
          }
          
        } catch (error) {
          console.error(`Fout bij ${fileExtension.toUpperCase()} parsing:`, error);
          reject(error);
        }
      };
      
      reader.onerror = function(error) {
        console.error(`Fout bij lezen ${fileExtension.toUpperCase()} bestand:`, error);
        reject(error);
      };
      
      // Read the file as ArrayBuffer
      reader.readAsArrayBuffer(file);
    });
    
  } catch (error) {
    console.error(`Fout bij ${fileExtension.toUpperCase()} conversie setup:`, error);
    throw error;
  }
}

// Helper function to create the JPEG file with temporary URL
function createJpegFile(blob, baseName, originalFormat, resolve) {
  // Create temporary URL for client-side viewing
  const tempUrl = URL.createObjectURL(blob);
  
  // Create a new File object with .jpg extension
  const jpegFile = new File([blob], baseName.replace(/\.(tiff?|tif|bmp|webp|png)$/i, '.jpg'), {
    type: 'image/jpeg',
    lastModified: Date.now()
  });
  
  // Store the temporary URL for debugging/viewing
  jpegFile._tempUrl = tempUrl;
  
  resolve(jpegFile);
}

// Hulpfunctie: verklein afbeelding met behoud van aspect ratio
// - file: het originele bestand (File)
// - maxWidth/maxHeight: maximale afmetingen waarbinnen de foto past
// - quality: kwaliteit van de JPEG (tussen 0 en 1)
function resizeImageWithAspectRatio(file, maxWidth, maxHeight, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
      const newWidth = Math.round(img.width * scale);
      const newHeight = Math.round(img.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext('2d');
      
      // Zet de achtergrond wit voor afbeeldingen met transparantie
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Teken de afbeelding
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      // Gebruik de opgegeven kwaliteit, of de waarde uit de config
      const configQuality = config.JPEG_QUALITY !== undefined ? config.JPEG_QUALITY : 0.7;
      const jpegQuality = typeof quality === 'number' ? quality : configQuality;
      const finalQuality = Math.max(0.1, Math.min(1.0, jpegQuality)); // Ensure between 0.1 and 1.0
     
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Kon afbeelding niet verwerken'));
            return;
          }
          resolve(blob);
        },
        'image/jpeg',
        finalQuality
      );
    };
    img.onerror = (error) => {
      console.error('Fout bij het laden van de afbeelding:', error);
      reject(error);
    };
    img.src = URL.createObjectURL(file);
  });
}

// Vooraf gedefinieerde formaat-combinaties voor de resize
const sizeOptions = {
  1: [{ w: 100, h: 100 }, { w: 700, h: 500 }, 'compressed'],
  2: [{ w: 100, h: 100 }, { w: 700, h: 500 }, { w: 3000, h: 2000 }],
  3: [{ w: 100, h: 100 }, { w: 700, h: 500 }, { w: 4000, h: 3000 }],
  6: [{ w: 250, h: 250 }, { w: 700, h: 500 }, 'compressed'],
  7: [{ w: 250, h: 250 }, { w: 700, h: 500 }, { w: 3000, h: 2000 }],
  8: [{ w: 250, h: 250 }, { w: 700, h: 500 }, { w: 4000, h: 3000 }]
};

// Function to get URL parameters
const getUrlParameter = (name) => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
};

export default function FunctieResizer() {
  // UI/keuzes
  const [selectedOption, setSelectedOption] = useState(''); // gekozen formaat-combinatie
  // Standaard op 'files' gezet zodat 'images selecteren' de standaardkeuze is
  const [selectMode, setSelectMode] = useState('files');
  // Beeldbank (verplicht veld voor upload)
  const [beeldbank, setBeeldbank] = useState('');
  // Format restriction from selected image bank
  const [formatRestriction, setFormatRestriction] = useState(null);
  // Submap selectie (alleen voor 'large')
  const [subdirMode, setSubdirMode] = useState(''); // '' | 'root' | 'existing' | 'new'
  const [subdirs, setSubdirs] = useState([]); // bestaande submappen onder 'large'
  const [loadingSubdirs, setLoadingSubdirs] = useState(false);
  const [subdirsError, setSubdirsError] = useState('');
  const [selectedSubdir, setSelectedSubdir] = useState('');
  const [newSubdir, setNewSubdir] = useState('');
  const [recordsArray, setRecordsArray] = useState([]);
  const [records, setRecords] = useState([]);
  const [availableBeeldbanken, setAvailableBeeldbanken] = useState([]);

  // Track the current step in the selection process
  const [currentStep, setCurrentStep] = useState(STEPS.SELECT_BEELDBANK);

  // Check for 'beeldbank' URL parameter on component mount
  useEffect(() => {
    const urlBeeldbank = getUrlParameter('beeldbank');
    if (urlBeeldbank) {
      // Fetch available beeldbanken first
      const fetchBeeldbanken = async () => {
        try {
          const response = await fetch(`${config.API_BASE}/misc/api/zcbs_backend.php?endpoint=/api/beeldbanken`, {
            headers: {
              'Accept': 'application/json',
              'X-API-Key': config.CK || 'ZCBSSystemimages2.0'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.beeldbanken) {
              setAvailableBeeldbanken(data.beeldbanken);
              
              // Check if the URL parameter matches an available beeldbank (case insensitive)
              const foundBeeldbank = data.beeldbanken.find(
                bank => bank.naam.toLowerCase() === urlBeeldbank.toLowerCase()
              );
              
              if (foundBeeldbank) {
                // Set the selected bank
                setBeeldbank(foundBeeldbank.naam);
                
                // Set format restriction based on the selected bank
                if (foundBeeldbank.format && foundBeeldbank.format !== '0') {
                  setFormatRestriction(foundBeeldbank.format);
                  setSelectedOption(foundBeeldbank.format);
                } else {
                  setFormatRestriction(null);
                  setSelectedOption('');
                }
                
                // Check if the image bank is blocked
                if (foundBeeldbank.format === '-') {
                  // Don't proceed to next step if image bank is blocked
                  setCurrentStep(STEPS.SELECT_BEELDBANK);
                  setCompletedSteps({});
                  console.warn(`Beeldbank '${foundBeeldbank.naam}' is geblokkeerd en kan niet worden geselecteerd`);
                  return;
                }
                
                // Only proceed to next step if image bank is not blocked
                await fetchSubdirs(foundBeeldbank.naam);
                
                // Mark the first step as completed
                setCompletedSteps(prev => ({
                  ...prev,
                  [STEPS.SELECT_BEELDBANK]: true
                }));
                
                // Move to the folder selection step (step 2) when an image bank is selected via URL parameter
                setCurrentStep(STEPS.SELECT_FOLDER);
                
                //console.log(`Automatisch geselecteerde beeldbank: ${foundBeeldbank.naam}`);
              } else {
                console.warn(`Beeldbank '${urlBeeldbank}' niet gevonden in beschikbare beeldbanken`);
              }
            }
          } else {
            console.error('Fout bij ophalen beeldbanken:', response.statusText);
          }
        } catch (error) {
          console.error('Fout bij ophalen beeldbanken:', error);
        }
      };
      
      fetchBeeldbanken();
    }
  }, []);
  
  // Track if each step is completed
  const [completedSteps, setCompletedSteps] = useState({});
  
  // Handle step completion
  const completeStep = (step) => {
    
    
    // Update completed steps
    setCompletedSteps(prev => ({
      ...prev,
      [step]: true
    }));
    
    // Only proceed to next step if it's not the SELECT_FORMAT or TYPE_OVERRIDE step
    if (step === STEPS.SELECT_FORMAT || step === STEPS.TYPE_OVERRIDE) {
      //console.log('Reached stop step, stopping navigation');
      
      return; // Stop here, don't proceed to next step
    }
    
    // For other steps, proceed with normal navigation
    const stepKeys = Object.values(STEPS);
    const currentIndex = stepKeys.indexOf(step);
    if (currentIndex < stepKeys.length - 1) {
      setCurrentStep(stepKeys[currentIndex + 1]);
    }
  };
  
  // Handle going back to a previous step
  const goToStep = (step) => {
    // Check if trying to go to any step after SELECT_BEELDBANK with a blocked image bank
    if (beeldbank && step !== STEPS.SELECT_BEELDBANK) {
      // Get the current image bank info
      const selectedBank = appConfig.BEELDBANKEN?.find(bank => bank.naam === beeldbank);
      if (selectedBank?.format === '-') {
        // Don't allow navigation to any step after SELECT_BEELDBANK if image bank is blocked
        alert('Deze beeldbank is momenteel geblokkeerd. Selecteer een andere beeldbank of neem contact op met de beheerder.');
        return;
      }
    }
    setCurrentStep(step);
  };
  
  // Handle records update from RecordsComponent
  const handleRecordsUpdate = (updatedRecords) => {
    setRecords(updatedRecords);
    // Mark the records step as completed if we have records
    if (updatedRecords.length > 0) {
      completeStep(STEPS.SELECT_FILES);
    }
  };

// Bestanden en upload-status
const [selectedFiles, setSelectedFiles] = useState([]); // This is line 67
  // Bestanden en upload-status
  
  const [isUploading, setIsUploading] = useState(false); // true tijdens upload
  const [uploadProgress, setUploadProgress] = useState({}); // voortgang per bestand
  const [message, setMessage] = useState(''); // algemene melding
  const [savedInfo, setSavedInfo] = useState({}); // backend-terugkoppeling opgeslagen paden
  const [showSuccessPopup, setShowSuccessPopup] = useState(false); // Toon succes popup
  const [showResizeProgress, setShowResizeProgress] = useState(false); // Toon resize progress popup
  const [resizeProgressText, setResizeProgressText] = useState(''); // Resize progress tekst
  const [showConversionProgress, setShowConversionProgress] = useState(false); // Toon conversion progress popup
  const [conversionProgress, setConversionProgress] = useState({ current: 0, total: 0, currentFile: '' }); // Conversion progress data
  const [showUploadComplete, setShowUploadComplete] = useState(false); // Toon upload completion popup
  // Record-informatie en type C startwaarde (voor oplopende nummering)
  const [recordInfoMap, setRecordInfoMap] = useState({});
  
  const [cStartNumber, setCStartNumber] = useState('');
  const [cStartNumberOverrideFlag, setCStartNumberOverrideFlag] = useState('');  // ← Override flag state toegevoegd
  
  // Wrapper functie om setCStartNumber aan te roepen met override flag
  const handleSetCStartNumber = (newStartNumber, overrideFlag = null) => {
    //console.log('in handlesetcstartnumber in functie_resizer');
    setCStartNumber(newStartNumber);
    if (overrideFlag) {
      setCStartNumberOverrideFlag(overrideFlag);
     // console.log('cStartNumber bijgewerkt:', newStartNumber, 'met override flag:', overrideFlag);
    }
  };
  // Type override state
  const [typeOverride, setTypeOverride] = useState('');
  const [typeOverrideRecordNumber, setTypeOverrideRecordNumber] = useState('');
  
  // State voor bevestigingsdialoog
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const [duplicateImages, setDuplicateImages] = useState([]);
  const [pendingUpload, setPendingUpload] = useState(null);
  const [hasDuplicateRecords, setHasDuplicateRecords] = useState(false);
  const [uploadSettings, setUploadSettings] = useState({ createRecords: false });
  // State voor appConfiguratie
  const [appConfig, setAppConfig] = useState({ id1: 'SC', id2: '1015' });
  
  // State voor het uitschakelen van kleine uploads
  const [disabledSmallUpload, setDisabledSmallUpload] = useState(false);
  
  // Handler voor het wijzigen van de disabledSmallUpload state
  const handleDisabledSmallUploadChange = (value) => {
    setDisabledSmallUpload(value);
  };

  // Laad de configuratie
  const loadConfig = useCallback(async () => {
    try {
      // Laad algemene configuratie - probeer beide paden voor dev en prod
      let generalConfig = {};
      let configLoaded = false;
      
      try {
        // Probeer eerst het development pad
        let configResponse = await fetch('/config.json');
        
        if (configResponse.ok) {
          generalConfig = await configResponse.json();
          configLoaded = true;
          //console.log('Config loaded from /config.json');
        } else {
          // Als dat niet werkt, probeer het productie pad
          configResponse = await fetch('./config.json');
          
          if (configResponse.ok) {
            generalConfig = await configResponse.json();
            configLoaded = true;
            console.log('Config loaded from ./config.json');
          } else {
            // Als dat ook niet werkt, probeer met cache-busting headers
            configResponse = await fetch('/config.json', {
              headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            });
            
            if (configResponse.ok) {
              generalConfig = await configResponse.json();
              configLoaded = true;
              console.log('Config loaded from /config.json with cache-busting');
            }
          }
        }
        
        if (!configLoaded) {
          console.warn('Kon config.json niet laden op geen enkel pad');
        }
      } catch (e) {
        console.warn('Fout bij laden van config.json:', e);
      }
      
      // Laad beeldbank-specifieke configuratie (zonder INSERT_CONFIGS)
      const beeldbankConfig = await getConfig(null, beeldbank);
      
      // Combineer configuraties, maar behoud INSERT_CONFIGS uit generalConfig
      const combinedConfig = {
        ...generalConfig,
        ...beeldbankConfig,
        // Zorg ervoor dat INSERT_CONFIGS uit generalConfig behouden blijft
        INSERT_CONFIGS: generalConfig.INSERT_CONFIGS || {}
      };
      
      // Debug: log de INSERT_CONFIGS
      // console.log('INSERT_CONFIGS loaded:', combinedConfig.INSERT_CONFIGS);
      // console.log('Beeldbank:', beeldbank);
      // console.log('Insert config for beeldbank:', combinedConfig.INSERT_CONFIGS?.[beeldbank]);
      
      setAppConfig(combinedConfig);
    } catch (error) {
      console.error('Fout bij het laden van de configuratie:', error);
    }
  }, [beeldbank]);

  // Laad configuratie bij het laden van de component
  useEffect(() => {
    if (beeldbank) {
      loadConfig();
    }
  }, [beeldbank, loadConfig]);
  // Update recordsArray wanneer recordInfoMap verandert
  useEffect(() => {
    const newRecordsArray = Object.entries(recordInfoMap)
      .filter(([key]) => key !== '_config') // Skip the _config property
      .map(([filename, info]) => ({
        bestandsnaam: filename ? filename.split('/').pop() || 'onbekend' : 'onbekend',
        type: info.type === 'A_variant' ? 'A_variant' : (info.type || 'onbekend'),
        recordNummer: info.recordNumber || 'onbekend',
        heeftHernoemTabel: info.needsRenameTable,
        beeldbank: info.beeldbank || 'onbekend',
        duplicate: info.duplicate || false,
        isException: info.isException || false
      }));
      
    setRecordsArray(newRecordsArray);
    
    // Check for any duplicate records
    const hasDuplicates = newRecordsArray.some(record => record.duplicate);
    setHasDuplicateRecords(hasDuplicates);
  }, [recordInfoMap]);

  // Handler: gebruiker kiest bestanden of map
  const handleFileChange = (event) => {
    // Get all files from the file input
    const all = Array.from(event.target.files);
    
    // Check if this is a directory selection (will have webkitRelativePath)
    const isDirectorySelection = all.some(f => f.webkitRelativePath && f.webkitRelativePath.includes('/'));
    
    // Filter only images
    const files = all.filter(f => {
      // For directory selection, we need to check the file extension from the name
      const name = f.webkitRelativePath ? f.webkitRelativePath.split('/').pop() : f.name;
      return (f.type && f.type.startsWith('image/')) || 
             /\.(png|jpe?g|gif|webp|bmp|tiff?|tif)$/i.test((name || '').trim());
    });
    
    // console.log('Selected files:', files); // Debug log
    
    if (files.length > 0) {
      // Process files and convert TIFF to JPEG before setting selectedFiles
      const processAndConvertFiles = async () => {
        const convertedFiles = [];
        const filesToConvert = files.filter(file => {
          const displayName = file.webkitRelativePath || file.name;
          const baseName = displayName.split(/[\\/]/).pop();
          const fileExtension = baseName.split('.').pop().toLowerCase();
          return fileExtension === 'tiff' || fileExtension === 'tif' || fileExtension === 'bmp' || fileExtension === 'webp' || fileExtension === 'png';
        });
        
        if (filesToConvert.length > 0) {
          setShowConversionProgress(true);
          setConversionProgress({ current: 0, total: filesToConvert.length, currentFile: '' });
        }
        
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const displayName = file.webkitRelativePath || file.name;
          const baseName = displayName.split(/[\\/]/).pop();
          const fileExtension = baseName.split('.').pop().toLowerCase();
          
          if (fileExtension === 'tiff' || fileExtension === 'tif' || fileExtension === 'bmp' || fileExtension === 'webp' || fileExtension === 'png') {
            // Update progress
            const currentProgress = filesToConvert.indexOf(file) + 1;
            setConversionProgress({ 
              current: currentProgress, 
              total: filesToConvert.length, 
              currentFile: baseName 
            });
            
            try {
              const convertedFile = await convertToJpeg(file, baseName);
              
              // Create a new File object with the same webkitRelativePath but JPEG extension
              const finalFile = new File([convertedFile], convertedFile.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              
              // Preserve webkitRelativePath for directory selections
              if (file.webkitRelativePath) {
                Object.defineProperty(finalFile, 'webkitRelativePath', {
                  value: file.webkitRelativePath.replace(/\.(tiff?|tif|bmp|webp|png)$/i, '.jpg'),
                  writable: false
                });
              }
              
              // Copy the temporary URL from the converted file
              finalFile._tempUrl = convertedFile._tempUrl;
              
              convertedFiles.push(finalFile);
            } catch (error) {
              console.error(`Fout bij ${fileExtension.toUpperCase()} conversie, bestand overslaan:`, error);
              // Skip this file if conversion fails
            }
          } else {
            // Non-convertible files, keep as-is
            convertedFiles.push(file);
          }
        }
        
        // Hide conversion progress
        setShowConversionProgress(false);
        setConversionProgress({ current: 0, total: 0, currentFile: '' });
        
        // Set selectedFiles with converted files
        setSelectedFiles(convertedFiles);
        completeStep(STEPS.SELECT_FILES);
        
        // Reset previous status for new selection
        setUploadProgress({});
        setMessage('');
        setSavedInfo({});
        
        // Process the files to detect record numbers (using converted files)
        const processFiles = async () => {
          let effectiveConfig = appConfig;
          if (
            beeldbank &&
            (typeof effectiveConfig?.MAX_OBJECT === 'undefined' && typeof effectiveConfig?.max_object === 'undefined')
          ) {
            try {
              // Laad algemene configuratie direct uit config.json
              let generalConfig = {};
              try {
                const configResponse = await fetch('/config.json');
                if (configResponse.ok) {
                  generalConfig = await configResponse.json();
                }
              } catch (e) {
                console.warn('Kon algemene config.json niet laden:', e);
              }
              
              // Laad beeldbank-specifieke configuratie
              const beeldbankConfig = await getConfig(null, beeldbank);
              
              // Combineer beide configuraties
              const combinedConfig = {
                ...generalConfig,
                ...beeldbankConfig
              };
              
              setAppConfig(combinedConfig);
              effectiveConfig = combinedConfig;
            } catch (e) {
              // keep existing appConfig
            }
          }

          const resultMap = {};
          let hasTypeE = false;
          
          for (const file of convertedFiles) {
            const displayName = file.webkitRelativePath || file.name;
            const baseName = displayName.split(/[\\/]/).pop();
            
            // Check of er al een override resultaat bestaat
            let recordInfo = null;
            if (recordInfoMap && recordInfoMap[displayName] && recordInfoMap[displayName].isOverride) {
              recordInfo = recordInfoMap[displayName];
            } else {
              recordInfo = inferRecordInfo(baseName, effectiveConfig, null, convertedFiles);
            }

            if (!recordInfo) {
              const msg = (typeof window !== 'undefined' && window.maxObjectErrorMessage)
                ? window.maxObjectErrorMessage
                : '❌ Fout: recordnummer is te hoog (boven maximum). Verwerking gestopt.';
              setMessage(msg);
              return;
            }
            
            // Store file with its record info
            resultMap[displayName] = {
              ...recordInfo,
              file,
              displayName: baseName,
              originalName: baseName,
              needsRenameTable: recordInfo.needsRenameTable || false,
              recordNumber: recordInfo.recordNumber || null,
              type: recordInfo.type || 'E',
            };
            
            if (recordInfo.type === 'E') {
              hasTypeE = true;
            }
          }
          
          // Update de record info map, maar behoud override resultaten
          const finalMap = { ...resultMap };
          
          // Controleer of er override resultaten zijn en behoud deze
          Object.keys(recordInfoMap).forEach(filename => {
            if (recordInfoMap[filename] && recordInfoMap[filename].isOverride) {
              finalMap[filename] = {
                ...recordInfoMap[filename],
                beeldbank: resultMap[filename]?.beeldbank || recordInfoMap[filename].beeldbank,
                hasDubbelImages: resultMap[filename]?.hasDubbelImages || recordInfoMap[filename].hasDubbelImages
              };
            }
          });
          
          setRecordInfoMap(finalMap);
        };
        
        processFiles();
      };
      
      processAndConvertFiles();
    }
  };

  // Function to update record numbers based on type override
  const updateRecordNumbersForTypeOverride = (overrideType, startNumber, overrideFlag = null) => {
    // console.log('=== UPDATE RECORD NUMBERS FOR TYPE OVERRIDE ===');
    // console.log('overrideType:', overrideType);
    // console.log('startNumber:', startNumber);
    // console.log('overrideFlag:', overrideFlag);
    // console.log('selectedFiles length:', selectedFiles?.length);
    // console.log('recordInfoMap keys:', Object.keys(recordInfoMap || {}));
    
    // Update the typeOverride state
    setTypeOverride(overrideType);
    
    // Gebruik de cStartNumberOverrideFlag als die beschikbaar is, anders de parameter
    const effectiveOverrideFlag = cStartNumberOverrideFlag || overrideFlag;
    const effectiveStartNumber = cStartNumberOverrideFlag ? cStartNumber : startNumber;
    
    // if (!recordInfoMap || Object.keys(recordInfoMap).length === 0) {
    //   console.log('No recordInfoMap, returning early');
    //   return;
    // }
    
    const updatedMap = { ...recordInfoMap };
//    console.log('updatedMap keys before:', Object.keys(updatedMap));
    
    // Verkrijg de daadwerkelijke file objecten voor inferRecordInfo
    const allFiles = selectedFiles || [];
    
    Object.keys(updatedMap).forEach(filename => {
      const info = updatedMap[filename];
      if (!info) return;
      
     // console.log(`Processing file: ${filename}, current type: ${info.type}, isOverride: ${info.isOverride}`);
      
      // Als dit een override is en we veranderen naar hetzelfde type, werk alleen recordnummer bij
      if (info.isOverride && (info.type === 'C' || info.type === 'E') && info.type === overrideType) {
        // Bereken recordnummer op basis van startnummer en MAX_OBJECT
        let newRecordNumber = null;
        if (effectiveStartNumber && /^\d+$/.test(String(effectiveStartNumber))) {
          const start = parseInt(effectiveStartNumber);  // <-- effectiveStartNumber gebruiken
          const maxObject = getMaxObject(appConfig);
          
          // Bereken de index van dit bestand (0-gebaseerd)
          const allKeys = Object.keys(updatedMap).filter(key => 
            updatedMap[key]?.type === info.type && updatedMap[key]?.isOverride
          );
          const currentIndex = allKeys.indexOf(filename);
          newRecordNumber = start + currentIndex;
          
          // Format het recordnummer
          const digits = String(maxObject).length;
          newRecordNumber = String(newRecordNumber).padStart(digits, '0');
        }
        
        updatedMap[filename] = {
          ...info,
          recordNumber: newRecordNumber,
          overrideFlag: overrideFlag || info.overrideFlag,
          notes: [...(info.notes || []), `Recordnummer bijgewerkt naar ${newRecordNumber}`]
        };
        
        console.log(`Recordnummer bijgewerkt voor ${filename}: ${info.type} -> ${newRecordNumber}`);
        return;
      }
      
      // Voor alle andere gevallen (inclusief type verandering), voer detectie uit met de juiste override
      const finalOverrideFlag = overrideFlag || ((overrideType === 'C' || overrideType === 'E') ? overrideType : null);
      //console.log(`Calling inferRecordInfo for ${filename} with overrideFlag: ${finalOverrideFlag}`);
      const detectionResult = inferRecordInfo(filename, appConfig, finalOverrideFlag, allFiles);
      
      //console.log(`Detection result for ${filename}:`, detectionResult);
      
      if (detectionResult) {
        updatedMap[filename] = {
          ...info,
          type: detectionResult.type,
          recordNumber: detectionResult.recordNumber,
          needsRenameTable: detectionResult.needsRenameTable,
          overrideFlag: detectionResult.overrideFlag,
          isOverride: true, // Vlag om aan te geven dat dit een override is
          notes: [...(info.notes || []), `Type overridden naar ${overrideType}`]
        };
        //console.log(`Updated ${filename} from ${info.type} to ${detectionResult.type}`);
      }
    });
    
    //console.log('updatedMap keys after:', Object.keys(updatedMap));
    //console.log('Setting recordInfoMap with updatedMap...');
    setRecordInfoMap(updatedMap);
    //console.log('=== END UPDATE RECORD NUMBERS FOR TYPE OVERRIDE ===');
  };

  // Laad submappen wanneer beeldbank verandert of op verzoek
  const fetchSubdirs = async (bank) => {
   // console.log('fetchSubdirs called with bank:', bank);
    
    if (!bank) {
     // console.log('Geen bank opgegeven, lege subdirs ingesteld');
      setSubdirs([]);
      setFormatRestriction(null);
      return;
    }
    
    // Find the selected image bank config
    const selectedBank = config.beeldbankenData?.find(b => b.naam === bank);
    if (selectedBank?.format && selectedBank.format !== '0') {
      setFormatRestriction(selectedBank.format);
      setSelectedOption(selectedBank.format);
    } else {
      setFormatRestriction(null);
      setSelectedOption('');
    }
    
    try {
      setLoadingSubdirs(true);
      setSubdirsError('');
      
      // Get the document root
      const docRoot = runtimeConfig.docRoot || config.docRoot;
     // console.log('Using document root for sub-dir path:', docRoot);
      
      // Clean up the path for Windows
      const rootPath = docRoot ? docRoot.replace(/^[\\/]+/, '') : '';
//console.log ('api key in functie_resizer is :',config.CK);
      const res = await axios.get(config.endpoints.subdirs, {
        headers: {
          'X-API-Key': config.CK,
          'Content-Type': 'application/json'
        },
        params: { 
          beeldbank: bank, 
          target: 'large', 
          root: rootPath
        },
      });
      //console.log('subdirs',subdirs);
      const list = Array.isArray(res?.data?.subdirs) ? res.data.subdirs : [];
      setSubdirs(list);
      
      // Reset selectie als huidige niet meer bestaat
      if (!list.includes(selectedSubdir)) setSelectedSubdir('');
    } catch (e) {
      setSubdirsError(e?.response?.data?.error || e.message || 'Kon submappen niet laden');
      setSubdirs([]);
    } finally {
      setLoadingSubdirs(false);
    }
  };

  useEffect(() => {
    // Bij wisselen van beeldbank: reset submapkeuze en laad lijst
    
    setSubdirMode('');
    setSelectedSubdir('');
    setNewSubdir('');
    fetchSubdirs(beeldbank);
    //console.log('Subdirs na fetchSubdirs loaded for bank:', beeldbank);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beeldbank]);

  // Functie om records op te slaan in updates.txt
  const saveRecordsToFile = async (recordsToSave) => {
  try {
  

    // Format the records to match the 34-field tab-separated format
    const formattedRecords = recordsToSave.map(record => {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0].replace(/-/g, '').slice(2); // YYMMDD
      const timeStr = now.toTimeString().slice(0, 5); // HH:MM
      const timestamp = `${dateStr}-${timeStr}`;
      
      // Create array with 35 fields, all empty by default
      const fields = new Array(35).fill('');
      
      // Set specific fields using appConfig and match the exact tab-separated format
      fields[0] = appConfig.id1 || 'SC';
      fields[1] = appConfig.id2 || '1015';
      fields[2] = record.recordNummer ? formatRecordNumber(record.recordNummer, appConfig) : formatRecordNumber('0', appConfig);
      fields[5] = `Een nog niet beschreven record (${dateStr})`;
      
      // Use extractedInfo to populate fields if available
      // console.log(`ExtractedInfo check for record ${record.recordNummer}:`, {
      //   hasExtractedInfo: !!record.extractedInfo,
      //   extractedInfo: record.extractedInfo,
      //   extractedInfoType: typeof record.extractedInfo
      // });
      
      if (record.extractedInfo) {
       // console.log(`Processing extractedInfo for record ${record.recordNummer}:`, record.extractedInfo);
        
        // Field 8: datum (date) - gebruik year als date niet beschikbaar is
        //console.log(`Checking field 8 - date: "${record.extractedInfo.date}", year: "${record.extractedInfo.year}"`);
        if (record.extractedInfo.date) {
          fields[8] = record.extractedInfo.date;
         // console.log(`Set field 8 (datum) to: ${record.extractedInfo.date}`);
        } else if (record.extractedInfo.year) {
          fields[8] = record.extractedInfo.year;
         // console.log(`Set field 8 (datum) to year: ${record.extractedInfo.year}`);
        } else {
         // console.log(`No date or year found for field 8`);
        }
        
        // Field 12: plaats (city/location)
        if (record.extractedInfo.place) {
          fields[12] = record.extractedInfo.place;
         // console.log(`Set field 12 (plaats) to: ${record.extractedInfo.place}`);
        }
        
        // Field 14: straat (street)  
        if (record.extractedInfo.street) {
          fields[14] = record.extractedInfo.street;
          //console.log(`Set field 14 (straat) to: ${record.extractedInfo.street}`);
        }
      }
      
      // Field 27: volledige originele bestandsnaam (voordat hernoemd naar recordnummer)
      if (record.type === 'D' || record.type === 'E') {
        fields[27] = record.bestandsnaam;
        //console.log(`Set field 27 (index 27) for Type ${record.type} to original filename: ${record.bestandsnaam}`);
      }
      
      // For Type D and E, use the new filename (record number) and add extension
      // For other types (A, B, C), use the original filename as-is (already has extension)
      let filenameToSave;
      if (record.type === 'D' || record.type === 'E') {
        // Type D/E: filename is record number, add extension
        const recordNumber = record.recordNummer || record.bestandsnaam;
        filenameToSave = recordNumber + '.' + (record.fileExtension || 'jpg');
      } else {
        // Type A/B/C: use original filename as-is (already has extension)
        filenameToSave = record.bestandsnaam;
      }
      
      // Include subfolder in path if it exists, otherwise just use the filename
      // Use loc_image from config if available, otherwise default to field 15
      const imageFieldIndex = appConfig.loc_image ? parseInt(appConfig.loc_image) : 15;
      const imagePath = appConfig.folder ? `${appConfig.folder}/${filenameToSave || ''}` : (filenameToSave || '');
      fields[imageFieldIndex] = imagePath;
      
      // Log which field is being used for the image path
      if (appConfig.loc_image) {
        console.log(`Using loc_image field ${imageFieldIndex} for image path:`, imagePath);
      } else {
       // console.log(`Using default field 15 for image path:`, imagePath);
      }
      
      fields[32] = `${timestamp}|images2.0`;  
      fields[34] = `${timestamp}|images2.0`;
      
      // Apply insert logic for new records (fixed fields only)
      const insertConfig = appConfig.INSERT_CONFIGS?.[beeldbank];
      if (insertConfig && insertConfig.active) {
        console.log('Applying insert config to new record:', insertConfig);
        
        // Apply fixed fields (velden 3-30)
        if (insertConfig.fixedFields && Array.isArray(insertConfig.fixedFields)) {
          console.log('Applying fixed fields to new record...');
          insertConfig.fixedFields.forEach(fieldConfig => {
            const fieldIndex = parseInt(fieldConfig.field);
            const fieldValue = fieldConfig.value;
            
            if (fieldIndex >= 3 && fieldIndex <= 30) {
              fields[fieldIndex] = fieldValue;
            }
          });
        }
      }
      
      return fields.join('\t');
    });

    // Get username from cookie
    function getCookieValue(name) {
      if (typeof document === 'undefined') return null;
      const cookies = document.cookie ? document.cookie.split(';') : [];
      for (let i = 0; i < cookies.length; i += 1) {
        const cookie = cookies[i].trim();
        if (cookie.startsWith(`${name}=`)) {
          return decodeURIComponent(cookie.substring(name.length + 1));
        }
      }
      return null;
    }
    
    const rawUsername = getCookieValue('zcbs-app-user');
    const username = rawUsername ? String(rawUsername).split('|')[0] : '';
    
    const typeValue = typeOverride || 'Z';
    
   
    const response = await axios.post(
      config.endpoints.saveRecords(beeldbank),
      { 
        records: formattedRecords,
        format: 'tab',
        username,
        beeldbank,
        Type: typeValue,
        id1: appConfig.id1 || '',
        id2: appConfig.id2 || '',
        imageCount: formattedRecords.length,
        recordsCreated: formattedRecords.length,
        frontendVersion: getFrontendVersion()
      },
      {
        headers: {
          'x-api-key': config.CK || 'ZCBSSystemimages2.0'
        }
      }
    );
    
    //console.log('Save response:', response.data);
    return response.data.success;
  } catch (error) {
    console.error('Fout bij het opslaan van records:', {
      error: error.message,
      response: error.response?.data
    });
    return false;
  }
};

  // Functie om bestaande records (met insert) op te slaan in updates.txt
  const saveExistingRecordsToFile = async (recordsToSave) => {
    try {
      console.log('=== SAVE EXISTING RECORDS TO FILE ===');
      console.log('Records to save:', recordsToSave.length);
      
      // Gebruik exact dezelfde logica als saveRecordsToFile voor nieuwe records
      const formattedRecords = recordsToSave.map((record, index) => {
        console.log(`Processing existing record ${index}:`, record);
        
        // Converteer naar array indien nodig
        let recordArray;
        if (Array.isArray(record)) {
          recordArray = record;
        } else if (typeof record === 'object' && record !== null) {
          recordArray = Object.values(record);
        } else {
          recordArray = [record];
        }
        
        console.log(`Record array length: ${recordArray.length}`);
        console.log(`Record array contents:`, recordArray);
        
        // Specifiek controleren op velden die in de insert logica worden gebruikt
        console.log(`Veld 21 waarde: "${recordArray[21] || '[empty]'}"`);
        console.log(`Veld 7 waarde: "${recordArray[7] || '[empty]'}"`);
        
        // Toon alle velden 3-30 om te zien welke er zijn ingesteld
        for (let i = 3; i <= 30; i++) {
          if (recordArray[i]) {
            console.log(`Veld ${i}: "${recordArray[i]}"`);
          }
        }
        
        // Gebruik dezelfde logica als de backup: direct join
        const tabSeparated = recordArray.join('\t');
        console.log(`Tab-separated record: "${tabSeparated}"`);
        
        return tabSeparated;
      });
      
      console.log('All existing records processed with backup logic');
      
      // Get username from cookie
    function getCookieValue(name) {
      if (typeof document === 'undefined') return null;
      const cookies = document.cookie ? document.cookie.split(';') : [];
      for (let i = 0; i < cookies.length; i += 1) {
        const cookie = cookies[i].trim();
        if (cookie.startsWith(`${name}=`)) {
          return decodeURIComponent(cookie.substring(name.length + 1));
        }
      }
      return null;
    }
    
    const rawUsername = getCookieValue('zcbs-app-user');
    const username = rawUsername ? String(rawUsername).split('|')[0] : '';

      const response = await axios.post(
        config.endpoints.saveRecords(beeldbank),
        { 
          records: formattedRecords,
          format: 'tab',
          username,
          beeldbank,
          Type: 'Z',
          id1: appConfig.id1 || '',
          id2: appConfig.id2 || '',
          imageCount: formattedRecords.length,
          recordsCreated: 0, // Existing records, not new ones
          frontendVersion: getFrontendVersion()
        },
        {
          headers: {
            'x-api-key': config.CK || 'ZCBSSystemimages2.0'
          }
        }
      );
      
      console.log('Save response:', response.data);
      return response.data.success;
    } catch (error) {
      console.error('Fout bij het opslaan van bestaande records:', {
        error: error.message,
        response: error.response?.data
      });
      return false;
    }
  };

  // Helper functie om record op te halen uit updates.txt (altijd de laatste)
  const fetchRecordFromUpdates = async (beeldbank, recordNumber) => {
    try {
      console.log(`🔍 Zoek LAATSTE record ${recordNumber} in updates.txt...`);
      
      const response = await fetch(`${config.API_BASE}/misc/api/zcbs_backend.php/api/beeldbank/${beeldbank}/updates`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.CK || 'ZCBSSystemimages2.0'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.records) {
          // Zoek alle records met het juiste recordnummer (veld 2)
          const matchingRecords = data.records.filter(record => {
            const fields = record.split('\t');
            return fields[2] === recordNumber;
          });
          
          if (matchingRecords.length > 0) {
            // Neem de LAATSTE (meest recente) record
            const latestRecord = matchingRecords[matchingRecords.length - 1];
            const fields = latestRecord.split('\t');
            console.log(`✅ Laatste record gevonden in updates.txt: ${fields.length} velden`);
            console.log(`📊 Totaal ${matchingRecords.length} records gevonden, laatste gebruikt`);
            console.log('📋 Updates.txt record details:');
            fields.forEach((field, index) => {
              const isEmpty = field === '' || field === null || field === undefined;
              const display = isEmpty ? '[empty]' : `"${field}"`;
              console.log(`  Field ${index.toString().padStart(2)}: ${display}`);
            });
            return fields;
          }
        }
      }
      
      console.log('❌ Geen records gevonden in updates.txt');
      return null;
    } catch (error) {
      console.error('Fout bij ophalen uit updates.txt:', error);
      return null;
    }
  };

  // Helper functie om record op te halen uit <beeldbank>.txt
  const fetchRecordFromBeeldbank = async (beeldbank, recordNumber) => {
    try {
      console.log(`🔍 Zoek record ${recordNumber} in ${beeldbank}.txt...`);
      
      const response = await fetch(`${config.API_BASE}/misc/api/zcbs_backend.php/api/get-record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.CK || 'ZCBSSystemimages2.0'
        },
        body: JSON.stringify({
          beeldbank: beeldbank,
          recordNumber: recordNumber
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.record) {
          console.log(`✅ Record gevonden in ${beeldbank}.txt: ${result.record.length} velden`);
          console.log('📋 Beeldbank.txt record details:');
          result.record.forEach((field, index) => {
            const isEmpty = field === '' || field === null || field === undefined;
            const display = isEmpty ? '[empty]' : `"${field}"`;
            console.log(`  Field ${index.toString().padStart(2)}: ${display}`);
          });
          return result.record;
        }
      }
      
      console.log(`❌ Record niet gevonden in ${beeldbank}.txt`);
      return null;
    } catch (error) {
      console.error(`Fout bij ophalen uit ${beeldbank}.txt:`, error);
      return null;
    }
  };

  // Functie om bestaande records op te halen en insert logica toe te passen
  const applyInsertToExistingRecords = async (records) => {
    try {
      const insertConfig = appConfig.INSERT_CONFIGS?.[beeldbank];
      
      console.log('Insert config found:', insertConfig);
      
      const updatedRecords = [];
      
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        // Record kan een object zijn met recordNummer property of een array
        const recordNumber = record.recordNummer || record[2]; // Probeer beide formaten
        
        if (!recordNumber) {
          console.log('No record number found in record:', record);
          updatedRecords.push(record);
          continue;
        }
        
        console.log('=== PROCESSING RECORD:', recordNumber, '===');
        
        // STAP 1: Record ophalen volgens prioriteit
        let existingRecord = null;
        
        // Als er geen insert config is, haal dan toch het bestaande record op voor datum-tijd velden
        if (!insertConfig || !insertConfig.active) {
          console.log('No active insert config, but fetching existing record for timestamp update...');
          // Eerst proberen uit updates.txt (laatste record)
          console.log('STAP 1a: Proberen record uit updates.txt...');
          existingRecord = await fetchRecordFromUpdates(beeldbank, recordNumber);
          
          if (!existingRecord) {
            // Als niet in updates.txt, dan uit <beeldbank>.txt
            console.log('STAP 1b: Record niet in updates.txt, proberen uit <beeldbank>.txt...');
            existingRecord = await fetchRecordFromBeeldbank(beeldbank, recordNumber);
          }
          
          if (!existingRecord) {
            console.log('STAP 1c: Record nergens gevonden, maak nieuw record');
            // Maak een nieuw record met 35 velden
            existingRecord = new Array(35).fill('');
            existingRecord[2] = recordNumber;
          }
          
          console.log('Record gevonden/aangemaakt met', existingRecord.length, 'velden');
          
          // STAP 2: Alleen datum-tijd velden bijwerken (geen insert logica)
          const updatedRecord = [...existingRecord];
          
          // STAP 3: Datum-tijd velden vervangen (index 32 en 34)
          console.log('STAP 3: Datum-tijd velden vervangen...');
          const now = new Date();
          const dateStr = now.toISOString().split('T')[0].replace(/-/g, '').slice(2);
          const timeStr = now.toTimeString().slice(0, 5);
          const timestamp = `${dateStr}-${timeStr}`;
          
          updatedRecord[32] = `${timestamp}|images2.0`;
          updatedRecord[34] = `${timestamp}|images2.0`;
          
          console.log(`  Datum-tijd: ${timestamp}`);
          console.log(`  Veld 32: "${updatedRecord[32]}"`);
          console.log(`  Veld 34: "${updatedRecord[34]}"`);
          
          // STAP 4: Garandeer 35 velden
          while (updatedRecord.length < 35) {
            updatedRecord.push('');
          }
          if (updatedRecord.length > 35) {
            updatedRecord.splice(35);
          }
          
          console.log('STAP 4: Final record length:', updatedRecord.length);
          console.log('=== END PROCESSING RECORD', recordNumber, '===');
          
          updatedRecords.push(updatedRecord);
          continue;
        }
        
        // STAP 1: Record ophalen volgens prioriteit (met insert logica)
        console.log('STAP 1a: Proberen record uit updates.txt...');
        existingRecord = await fetchRecordFromUpdates(beeldbank, recordNumber);
        
        if (!existingRecord) {
          // Als niet in updates.txt, dan uit <beeldbank>.txt
          console.log('STAP 1b: Record niet in updates.txt, proberen uit <beeldbank>.txt...');
          existingRecord = await fetchRecordFromBeeldbank(beeldbank, recordNumber);
        }
        
        if (!existingRecord) {
          console.log('STAP 1c: Record nergens gevonden, maak nieuw record');
          // Maak een nieuw record met 35 velden
          existingRecord = new Array(35).fill('');
          existingRecord[2] = recordNumber;
        }
        
        console.log('Record gevonden/aangemaakt met', existingRecord.length, 'velden');
        
        // STAP 2: Insert logica toepassen
        const updatedRecord = [...existingRecord];
        
        // STAP 2a: Fixed fields vervangen (velden 3-30) - altijd als eerste
        if (insertConfig.fixedFields && Array.isArray(insertConfig.fixedFields)) {
          console.log('STAP 2a: Fixed fields toepassen...');
          insertConfig.fixedFields.forEach(fieldConfig => {
            const fieldIndex = parseInt(fieldConfig.field);
            const fieldValue = fieldConfig.value;
            
            if (fieldIndex >= 3 && fieldIndex <= 30) {
              updatedRecord[fieldIndex] = fieldValue;
              console.log(`  Veld ${fieldIndex}: "${existingRecord[fieldIndex]}" -> "${fieldValue}"`);
            }
          });
        }
        
        // STAP 3: Datum-tijd velden vervangen (index 32 en 34 voor 35 velden structuur)
        console.log('STAP 3: Datum-tijd velden vervangen...');
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0].replace(/-/g, '').slice(2);
        const timeStr = now.toTimeString().slice(0, 5);
        const timestamp = `${dateStr}-${timeStr}`;
        
        // Gebruik index 32 en 34 voor 35 velden structuur
        updatedRecord[32] = `${timestamp}|images2.0`;
        updatedRecord[34] = `${timestamp}|images2.0`;
        
        console.log(`  Datum-tijd: ${timestamp}`);
        console.log(`  Veld 32: "${updatedRecord[32]}"`);
        console.log(`  Veld 34: "${updatedRecord[34]}"`);
        
        // STAP 4: Garandeer 35 velden (omdat we veld 34 gebruiken)
        while (updatedRecord.length < 35) {
          updatedRecord.push('');
        }
        if (updatedRecord.length > 35) {
          updatedRecord.splice(35);
        }
        
        console.log('STAP 4: Final record length:', updatedRecord.length);
        console.log('=== END PROCESSING RECORD', recordNumber, '===');
        
        updatedRecords.push(updatedRecord);
      }
      
      console.log('=== ALL RECORDS PROCESSED ===');
      return updatedRecords;
    } catch (error) {
      console.error('Fout bij toepassen van insert op bestaande records:', error);
      return records;
    }
  };

  // Hulpfunctie om bestaande record op te halen
  const fetchExistingRecord = async (beeldbank, recordNumber, retryCount = 0) => {
    try {
      console.log('=== FETCH EXISTING RECORD ===');
      console.log('Beeldbank:', beeldbank);
      console.log('RecordNumber:', recordNumber);
      console.log('Retry count:', retryCount);
      
      // Gebruik de nieuwe /api/get-record endpoint
      const response = await fetch(`${config.API_BASE}/misc/api/zcbs_backend.php/api/get-record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.CK || 'ZCBSSystemimages2.0'
        },
        body: JSON.stringify({
          beeldbank: beeldbank,
          recordNumber: recordNumber
        })
      });
      
      console.log('Get record response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Get record result:', result);
        
        if (result.success && result.record) {
          console.log('Record found with full data:', result.record);
          console.log('Record length:', result.record.length);
          return result.record; // Dit is al een array met 34 velden
        } else {
          console.log('Record not found or no success');
        }
      } else {
        console.log('Get record failed with status:', response.status);
        
        // Retry mechanism voor 500 errors
        if (response.status === 500 && retryCount < 2) {
          console.log(`Retrying in 1 second... (attempt ${retryCount + 1}/3)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchExistingRecord(beeldbank, recordNumber, retryCount + 1);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Fout bij ophalen bestaande record:', error);
      
      // Retry mechanism voor network errors
      if (retryCount < 2) {
        console.log(`Retrying in 1 second due to error... (attempt ${retryCount + 1}/3)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchExistingRecord(beeldbank, recordNumber, retryCount + 1);
      }
      
      return null;
    }
  };

  // Bevestigingsdialoog voor record creatie
  const handleConfirmUpload = async (createRecords, typeOverride) => {
    setShowConfirmDialog(false);
    
    if (!pendingUpload) return;

    if (typeof window !== 'undefined' && (window.maxObjectFatal || window.hasShownMaxObjectError)) {
      const msg = window.maxObjectErrorMessage || '❌ Fout: recordnummer is te hoog (boven maximum). Upload gestopt.';
      setMessage(msg);
      setPendingUpload(null);
      return;
    }
    
    // Controleer op dubbele afbeeldingen
    const duplicates = Object.values(recordInfoMap).filter(item => item && item.hasDubbelImages === true);
    
    if (duplicates.length > 0) {
      // console.log(`Waarschuwing: ${duplicates.length} afbeelding(en) zijn gedupliceerd.`);
      
      // Update state voor de bevestigingsdialoog
      setDuplicateImages(duplicates);
      setUploadSettings({ 
        ...uploadSettings, 
        createRecords,
        filesToProcess: pendingUpload.filesToProcess,
        formData: pendingUpload.formData
      });
      setShowDuplicateConfirm(true);
      return;
    }
    
    // Geen dubbele afbeeldingen, ga door met uploaden
    processUpload(pendingUpload.filesToProcess, pendingUpload.formData, createRecords, typeOverride);
  };
  
  // Verwerk de upload na bevestiging van de gebruiker
  const processUpload = async (filesToProcess, formData, createRecords, overrideType) => {
    setShowDuplicateConfirm(false);
    
    try {
      setIsUploading(true);
      const fileCount = filesToProcess.length;
      
      // Show detailed progress for large uploads
      if (fileCount > 50) {
        setMessage(`Bezig met verwerken van ${fileCount} bestanden... Dit kan even duren.`);
      } else {
        setMessage('Bezig met uploaden...');
      }
      
      // Als de gebruiker heeft gekozen om records aan te maken
      if (createRecords) {
        if (fileCount > 50) {
          setMessage(`${fileCount} bestanden verwerken, records aanmaken...`);
        }
        
        // Maak een array van records om op te slaan (filter uitzonderingen eruit)
        const recordsToSave = filesToProcess
          .filter(file => {
            // Use webkitRelativePath if available (for directory selection), otherwise use name
            const fileKey = file.webkitRelativePath || file.name;
            const recordInfo = recordInfoMap[fileKey];
            // Sla records over voor uitzonderingen (varianten met isException flag)
            return recordInfo && !recordInfo.isException;
          })
          .map(file => {
            // Use webkitRelativePath if available (for directory selection), otherwise use name
            const fileKey = file.webkitRelativePath || file.name;
            const displayName = file.webkitRelativePath ? file.webkitRelativePath.split('/').pop() : file.name;
            
            return {
              bestandsnaam: displayName,
              type: recordInfoMap[fileKey]?.type || 'onbekend',
              recordNummer: recordInfoMap[fileKey]?.recordNumber || '',
              fileExtension: 'jpg', // Always jpg after resize conversion
              beeldbank: beeldbank,
              datum: new Date().toISOString(),
              extractedInfo: recordInfoMap[fileKey]?.extractedInfo || {}
            };
          });
        
        // Sla de records op in updates.txt
        const saved = await saveRecordsToFile(recordsToSave);
        if (!saved) {
          setMessage('Waarschuwing: kon records niet opslaan in updates.txt');
        }
      } else {
        // Gebruiker koos "Nee - Alleen bestanden uploaden"
        // Niets doen met updates.txt - alleen bestanden uploaden
        if (fileCount > 50) {
          setMessage(`${fileCount} bestanden verwerken...`);
        }
      }
      
      if (fileCount > 50) {
        setMessage(`${fileCount} bestanden voorbereiden, upload starten...`);
      }
      
      // Initialize progress for all files
      const initialProgress = {};
      filesToProcess.forEach(file => {
        const fileKey = file.webkitRelativePath || file.name;
        initialProgress[fileKey] = 0;
      });
      setUploadProgress(initialProgress);
      
      // Check if we need to use chunked upload (more than 15 files in FormData)
      const filesPerImage = disabledSmallUpload ? 2 : 3;
      const totalFilesInFormData = fileCount * filesPerImage;
      const MAX_FILES_THRESHOLD = 15;
      const needsChunking = totalFilesInFormData > MAX_FILES_THRESHOLD;
      
      let response;
      if (needsChunking) {
        // Chunked upload for large batches
        response = await performChunkedUpload(filesToProcess, formData, fileCount, MAX_FILES_THRESHOLD);
      } else {
        // Single upload for small batches
        response = await performSingleUpload(formData, fileCount);
      }

      // Upload voltooid, logging starten
      if (fileCount > 50) {
        setMessage(`Alle ${fileCount} bestanden zijn geupload, bezig met logging...`);
      }

      // Na succesvolle upload: logging naar externe backend sturen
      try {
        
        const rawUsername = getCookieValue('zcbs-app-user');
        const username = rawUsername ? String(rawUsername).split('|')[0] : '';
        const clientIp = null; // IP wordt door backend bepaald

        let imageCount = 0;
        let logBeeldbank = null;

        // Gebruik ID1/ID2 uit de merged config (appConfig)
        const id1 = appConfig?.id1 || '';
        const id2 = appConfig?.id2 || '';

        if (formData && typeof formData.forEach === 'function') {
          formData.forEach((value, key) => {
            if (key === 'images[]') {
              imageCount += 1;
            }
            if (key === 'beeldbank') {
              logBeeldbank = typeof value === 'string' ? value : String(value?.name || '');
            }
          });
        }

        // Bepaal het aantal originele bestanden op basis van imageCount en small-targets
        let originalCount = imageCount;
        if (imageCount > 0) {
          let hasSmallTarget = false;
          if (formData && typeof formData.forEach === 'function') {
            formData.forEach((value, key) => {
              if (key === 'targets[]' && value === 'small') {
                hasSmallTarget = true;
              }
            });
          }
          const divisor = hasSmallTarget ? 3 : 2;
          originalCount = Math.round(imageCount / divisor);
        }

        // Get backend version dynamically
        const getBackendVersion = async () => {
          try {
            const response = await fetch(`${config.API_BASE}/misc/api/zcbs_backend.php?endpoint=/api/health`, {
              headers: {
                'Accept': 'application/json',
                'X-API-Key': config.CK || 'ZCBSSystemimages2.0'
              }
            });
            if (response.ok) {
              const data = await response.json();
              return data.version || "1.0.0";
            }
          } catch (error) {
            console.warn('Failed to fetch backend version:', error);
          }
          return "1.0.0";
        };

        const backendVersion = await getBackendVersion();

        const logPayload = {
          username,
          clientIp,
          id1,
          id2,
          beeldbank: logBeeldbank,
           Type: overrideType || 'Z',
          imageCount: originalCount,
          recordsCreated: createRecords ? 1 : 0,
          frontendVersion: import.meta.env.PACKAGE_VERSION || "0.0.18 26-12-25",
          backendVersion,
        };

        if (typeof window !== 'undefined') {
          window.lastUploadLogPayload = logPayload;
        }

        fetch('https://ip.vossius.info/upload_log.php', {
          method: 'POST',
          headers: {
            'x-api-key': config.CK,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(logPayload),
        }).catch(() => {});

      } catch (e) {
        console.error('Fout bij logging:', e);
      }

      // Toon uploadresultaat en succes popup
      const successMessage = `Upload voltooid: ${fileCount} images succesvol geupload`;
      setMessage(successMessage);
      
      setShowUploadComplete(true);
      
      
      // Backup: also show alert as fallback
      setTimeout(() => {
       
      }, 1000);
      
      // Reset geselecteerde bestanden na succesvolle upload
      setSelectedFiles([]);
      setRecordInfoMap({});
      
    } catch (error) {
      setShowSuccessPopup(false);
      setShowUploadComplete(false);
      const backendError = error.response?.data?.error || error.response?.data?.message;
      setMessage(`Fout bij uploaden: ${backendError || error.message}`);
    } finally {
      setIsUploading(false);
      setPendingUpload(null);
    }
  };

  // Helper functie voor single upload (kleine batches)
  const performSingleUpload = async (formData, fileCount) => {
    const response = await axios.post(config.endpoints.upload, formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
        'X-API-Key': config.CK 
      },
      onUploadProgress: (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        
        // Show detailed progress for large uploads
        if (fileCount > 50) {
          if (percent === 100) {
            setMessage(`Alle ${fileCount} bestanden zijn geupload.`);
          } else {
            setMessage(`${fileCount} bestanden worden geupload...`);
          }
        }
        
        // Update progress for all files with the same percentage
        setUploadProgress(prev => {
          const newProgress = {};
          Object.keys(prev).forEach(key => {
            newProgress[key] = percent;
          });
          return newProgress;
        });
      }
    });

    return response;
  };

  // Helper functie voor chunked upload (grote batches)
  const performChunkedUpload = async (filesToProcess, originalFormData, fileCount, MAX_FILES_THRESHOLD) => {
    // Bepaal het aantal bestanden per image (afhankelijk van small upload setting)
    const filesPerImage = disabledSmallUpload ? 2 : 3;
    const totalFilesInFormData = fileCount * filesPerImage;
    
    // Bereken chunk size op basis van het totale aantal bestanden in FormData
    const MAX_FILES_PER_CHUNK = MAX_FILES_THRESHOLD; // Maximum aantal bestanden per chunk
    const imagesPerChunk = Math.floor(MAX_FILES_PER_CHUNK / filesPerImage);
    const totalChunks = Math.ceil(fileCount / imagesPerChunk);
    const uploadId = generateUploadId();
    
    // Extract common form data from the original form data
    const commonData = {};
    for (let [key, value] of originalFormData.entries()) {
      if (key !== 'images[]' && key !== 'targets[]') {
        commonData[key] = value;
      }
    }

    // Split files into chunks based on images per chunk
    const chunks = [];
    for (let i = 0; i < filesToProcess.length; i += imagesPerChunk) {
      chunks.push(filesToProcess.slice(i, i + imagesPerChunk));
    }

    setMessage(`Upload starten in ${totalChunks} bundels van maximaal ${imagesPerChunk} images (${imagesPerChunk * filesPerImage} bestanden per bundel)...`);

    // Initialiseer progress - zet alle bestanden op 0%
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      chunks.forEach(chunk => {
        chunk.forEach(file => {
          const fileKey = file.webkitRelativePath || file.name;
          newProgress[fileKey] = 0;
        });
      });
      return newProgress;
    });

    // Upload each chunk
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      const chunkNumber = chunkIndex + 1;
      
      setMessage(`${fileCount} bestanden worden geupload... (Start bundel ${chunkNumber}/${totalChunks})`);
      
      // Create new FormData for this chunk
      const chunkFormData = new FormData();
      
      // Add common data
      Object.entries(commonData).forEach(([key, value]) => {
        chunkFormData.append(key, value);
      });
      
      // Add chunk-specific data
      chunkFormData.append('chunk', chunkIndex.toString());
      chunkFormData.append('totalChunks', totalChunks.toString());
      chunkFormData.append('uploadId', uploadId);
      
      // Add files and targets for this chunk
      // We need to extract the corresponding images and targets from the original formData
      const originalImages = [];
      const originalTargets = [];
      
      for (let [key, value] of originalFormData.entries()) {
        if (key === 'images[]') {
          originalImages.push(value);
        } else if (key === 'targets[]') {
          originalTargets.push(value);
        }
      }
      
      // Calculate the start and end indices for this chunk's images
      // Each image generates 'filesPerImage' entries in the FormData
      const startIdx = chunkIndex * imagesPerChunk * filesPerImage;
      const endIdx = Math.min(startIdx + (chunk.length * filesPerImage), originalImages.length);
      
      // Add the images and targets for this chunk
      for (let i = startIdx; i < endIdx; i++) {
        if (originalImages[i]) {
          chunkFormData.append('images[]', originalImages[i]);
        }
        if (originalTargets[i]) {
          chunkFormData.append('targets[]', originalTargets[i]);
        }
      }
      
      try {
        const response = await axios.post(config.endpoints.upload, chunkFormData, {
          headers: { 
            'Content-Type': 'multipart/form-data',
            'X-API-Key': config.CK 
          },
          onUploadProgress: (progressEvent) => {
            const chunkPercent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            
            // Bereken de overall progress: (voltooide chunks * 100) + huidige chunk progress
            const completedChunksWeight = chunkIndex * 100;
            const currentChunkWeight = chunkPercent;
            const totalWeight = totalChunks * 100;
            const overallPercent = Math.round((completedChunksWeight + currentChunkWeight) / totalWeight * 100);
            
            setMessage(`Uploaden bundel ${chunkNumber}/${totalChunks}: ${chunkPercent}% (Totaal: ${overallPercent}%)`);
            
            // Toon duidelijke melding over voortgang
            if (overallPercent === 100) {
              setMessage(`Alle ${fileCount} bestanden zijn geupload.`);
            } else {
              setMessage(`${fileCount} bestanden worden geupload... (Bundel ${chunkNumber}/${totalChunks}: ${chunkPercent}%)`);
            }
            
            // Update progress voor ALLE bestanden - niet alleen de huidige chunk
            setUploadProgress(prev => {
              const newProgress = { ...prev };
              
              // Update progress voor bestanden in eerdere chunks (100% voltooid)
              for (let i = 0; i < chunkIndex; i++) {
                const prevChunk = chunks[i];
                prevChunk.forEach(file => {
                  const fileKey = file.webkitRelativePath || file.name;
                  newProgress[fileKey] = 100;
                });
              }
              
              // Update progress voor bestanden in huidige chunk
              chunk.forEach(file => {
                const fileKey = file.webkitRelativePath || file.name;
                newProgress[fileKey] = overallPercent;
              });
              
              // Reset progress voor toekomstige chunks (0%)
              for (let i = chunkIndex + 1; i < chunks.length; i++) {
                const futureChunk = chunks[i];
                futureChunk.forEach(file => {
                  const fileKey = file.webkitRelativePath || file.name;
                  newProgress[fileKey] = 0;
                });
              }
              
              return newProgress;
            });
          }
        });

        // Na voltooiing van deze chunk, zet alle bestanden in deze chunk op 100%
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          chunk.forEach(file => {
            const fileKey = file.webkitRelativePath || file.name;
            newProgress[fileKey] = 100;
          });
          return newProgress;
        });

        // Check if this was the last chunk
        const isLastChunk = chunkIndex === chunks.length - 1;
        if (response.data.isLastChunk || isLastChunk) {
          setMessage(`Alle ${fileCount} bestanden zijn geupload.`);
          return response;
        }
        
        // Small delay between chunks to prevent overwhelming the server
        if (chunkIndex < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
      } catch (error) {
        console.error(`Fout bij uploaden van bundel ${chunkNumber}/${totalChunks}:`, error);
        throw new Error(`Fout bij uploaden van bundel ${chunkNumber}: ${error.response?.data?.error || error.message}`);
      }
    }
    
    // Zet alle bestanden op 100% aan het einde van de upload
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      chunks.forEach(chunk => {
        chunk.forEach(file => {
          const fileKey = file.webkitRelativePath || file.name;
          newProgress[fileKey] = 100;
        });
      });
      return newProgress;
    });
    
    return { data: { message: `Upload voltooid: ${fileCount} images geupload` } };
  };

  // Handler: start het uploadproces voor alle gekozen bestanden o.b.v. gekozen formaat
  const handleUpload = async () => {
    // console.log('=== UPLOAD START ===');
    // console.log('Files count:', selectedFiles.length);
    // console.log('Files:', selectedFiles.map(f => f.name));
    
    // Check of er bestanden zijn geselecteerd
    if (!selectedFiles.length) return;

    if (typeof window !== 'undefined' && (window.maxObjectFatal || window.hasShownMaxObjectError)) {
      const msg = window.maxObjectErrorMessage || '❌ Fout: recordnummer is te hoog (boven maximum). Upload gestopt.';
      setMessage(msg);
      return;
    }
    
    // Check for missing format selection
    const formatToUse = formatRestriction || selectedOption;
    if (!formatToUse) return;
    if (!beeldbank) {
      setMessage('Vul eerst een beeldbank in.');
      return;
    }
    
    // Log de status van hasDubbel voor elk bestand bij het uploaden
    // console.log('=== UPLOAD KNOP GEKLIKT ===');
    // console.log('Status van hasDubbel voor bestanden:');
    // selectedFiles.forEach(file => {
    //   // Gebruik webkitRelativePath als die er is, anders de bestandsnaam
    //   const fileKey = file.webkitRelativePath || file.name;
    //   const fileInfo = recordInfoMap[fileKey] || {};
      
    //   console.log(`- Bestand: ${fileKey}`);
    //   console.log(`  Recordnummer: ${fileInfo.recordNumber || 'Niet gevonden'}`);
    //   console.log(`  Type: ${fileInfo.type || 'Niet gespecificeerd'}`);
    //   console.log(`  hasDubbel: ${!!fileInfo.duplicate}`);
    //   console.log(`  Bestandspad: ${fileKey.includes('/') ? 'Map: ' + fileKey : 'Enkel bestand'}`);
    //   console.log('-------------------');
    // });
    // console.log('Volledige recordInfoMap:', JSON.parse(JSON.stringify(recordInfoMap)));
    // console.log('===========================');

    // Bepaal de submapnaam op basis van de geselecteerde opties
    let folderName = '';
    if (subdirMode === 'existing' && selectedSubdir) {
      folderName = selectedSubdir;
    } else if (subdirMode === 'new' && newSubdir) {
      folderName = newSubdir;
    }
    
    // Update appConfig met de folder naam
    setAppConfig(prevConfig => ({
      ...prevConfig,
      folder: folderName
    }));

    // Controleer of er type C bestanden zijn die een startnummer nodig hebben
    const hasTypeC = selectedFiles.some(file => {
      const info = recordInfoMap[file.name];
      return info && info.type === 'C';
    });

    if (hasTypeC && (!cStartNumber || !/^\d+$/.test(String(cStartNumber)))) {
      setMessage('Geef een geldig startnummer op voor de type C bestanden.');
      return;
    }

    // Maak formulierdata aan voor de upload
    const formData = new FormData();

    // Add common form fields once, outside the file loop
    formData.append('beeldbank', beeldbank);
    if (config.uploadRoot) {
      formData.append('root', config.uploadRoot);
    }
    
    // Submap voor 'large' (optioneel)
    if (folderName) {
      formData.append('largeSubdir', folderName);
      formData.append('applySubdirToAll', '1');
      if (subdirMode === 'new') {
        formData.append('createLargeSubdir', '1');
      }
    }

    // console.log('=== UPLOAD START ===');
    // console.log('Files count:', selectedFiles.length);
    // console.log('Files:', selectedFiles.map(f => f.name));
    
    // Process each file and add to formData
    let processedFiles = 0;
    const totalFiles = selectedFiles.length;
    let showProgress = false;
    let progressTimer = null;
    const filesToProcess = [];
    
    // Start timer to show progress only after 1 second
    if (totalFiles > 50) {
      progressTimer = setTimeout(() => {
        showProgress = true;
        setShowResizeProgress(true);
        setResizeProgressText(`Starten met resizen van ${totalFiles} bestanden...`);
      }, 1000);
    }
    
    for (const file of selectedFiles) {
      // Use webkitRelativePath if available (for directory selection), otherwise use name
      const fileKey = file.webkitRelativePath || file.name;
      
      // Get the converted file from recordInfoMap (this will be JPEG for TIFF files)
      const recordInfo = recordInfoMap[fileKey];
      const actualFile = recordInfo?.file || file; // Use converted file if available
      
      const displayName = file.webkitRelativePath ? file.webkitRelativePath.split('/').pop() : file.name;
      const originalName = displayName.replace(/\.[^/.]+$/, '').trim();
      const fileExtension = displayName.split('.').pop() || 'jpg'; // Get original extension
      const fileType = recordInfo?.type || 'E';
      const recordNumber = recordInfo?.recordNumber;
      
      // Determine filename based on type
      let uploadFilename;
      if (fileType === 'D' && recordNumber) {
        // Type D: use only the digits from the beginning as filename
        uploadFilename = recordNumber;
      } else if (fileType === 'E' && recordNumber) {
        // Type E: use the assigned record number as filename
        uploadFilename = recordNumber;
      } else if (recordInfo?.isException && recordInfo?.variantSuffix) {
        // Variant files: check base type to determine naming convention
        // console.log('=== VARIANT UPLOAD DEBUG ===');
        // console.log('Original filename:', originalName);
        // console.log('RecordInfo:', recordInfo);
        // console.log('baseRecordNumber:', recordInfo.baseRecordNumber);
        // console.log('variantSuffix:', recordInfo.variantSuffix);
        
        // Probeer verschillende manieren om het basisbestand te vinden
        let baseRecordInfo = null;
        let baseRecordNumber = recordInfo.baseRecordNumber;
        
        // Methode 1: Zoek met de exacte baseRecordNumber + .jpg
        let baseFileName = recordInfo.baseRecordNumber + '.jpg';
        //console.log('Looking for base file (method 1):', baseFileName);
        baseRecordInfo = recordInfoMap[baseFileName];
        //console.log('Base record info found (method 1):', baseRecordInfo);
        
        // Methode 2: Als niet gevonden, probeer met hoofdletter varianten
        if (!baseRecordInfo) {
          const baseFileNameUpper = recordInfo.baseRecordNumber.charAt(0).toUpperCase() + recordInfo.baseRecordNumber.slice(1) + '.jpg';
          //console.log('Looking for base file (method 2):', baseFileNameUpper);
          baseRecordInfo = recordInfoMap[baseFileNameUpper];
          //console.log('Base record info found (method 2):', baseRecordInfo);
        }
        
        // Methode 3: Als nog niet gevonden, doorzoek alle keys
        if (!baseRecordInfo) {
          //console.log('Searching through all recordInfoMap keys...');
          Object.keys(recordInfoMap).forEach(key => {
            if (key.toLowerCase() === baseFileName.toLowerCase()) {
              baseRecordInfo = recordInfoMap[key];
              //console.log('Found base file with case-insensitive search:', key);
            }
          });
        }
        
        // Bepaal de basis type van de variant
        const baseType = baseRecordInfo?.type || 'E'; // Fallback naar Type E
        
        // Bepaal de upload naam van het basisbestand
        let baseUploadFilename;
        if (baseType === 'D' && baseRecordInfo?.recordNumber) {
          baseUploadFilename = baseRecordInfo.recordNumber; // Type D gebruikt recordnummer
        } else if (baseType === 'E' && baseRecordInfo?.recordNumber) {
          baseUploadFilename = baseRecordInfo.recordNumber; // Type E gebruikt recordnummer
        } else {
          baseUploadFilename = recordInfo.baseRecordNumber; // Andere types behouden originele naam
        }
        
        // Type B varianten: behoud originele naam ALLEEN als basis ook origineel blijft
        if (baseType === 'B') {
          uploadFilename = originalName; // Type B varianten behouden altijd originele naam
          // console.log('Type B variant: keeping original filename:', uploadFilename);
        } else {
          // Andere varianten: gebruik altijd de hernoemde naam van het basisbestand
          uploadFilename = baseUploadFilename + '-' + recordInfo.variantSuffix;
          // console.log('Non-Type B variant: using base upload filename with variant:', uploadFilename);
        }
        // console.log('==========================');
      } else if (recordInfo?.isException) {
        // Other exception files: use original name
        uploadFilename = originalName;
      } else {
        // Other types: use original name
        uploadFilename = originalName;
      }
      
      const formatToUse = formatRestriction || selectedOption;
      const selectedSizes = sizeOptions[formatToUse];
      
      // Log the quality value being used
      const currentQuality = config.JPEG_QUALITY !== undefined ? config.JPEG_QUALITY : 0.7;
      
      // Add file to formData for each size
      for (const size of selectedSizes) {
        let blob, filename, target;
        
        // Voor Type B varianten: alleen large verwerken
        if (recordInfo?.isException && recordInfo?.variantSuffix) {
          // Zoek basisbestand om type te bepalen
          let baseRecordInfo = null;
          let baseFileName = recordInfo.baseRecordNumber + '.jpg';
          baseRecordInfo = recordInfoMap[baseFileName];
          
          if (!baseRecordInfo) {
            const baseFileNameUpper = recordInfo.baseRecordNumber.charAt(0).toUpperCase() + recordInfo.baseRecordNumber.slice(1) + '.jpg';
            baseRecordInfo = recordInfoMap[baseFileNameUpper];
          }
          
          if (!baseRecordInfo) {
            Object.keys(recordInfoMap).forEach(key => {
              if (key.toLowerCase() === baseFileName.toLowerCase()) {
                baseRecordInfo = recordInfoMap[key];
              }
            });
          }
          
          const baseType = baseRecordInfo?.type || 'E';
          
          // Type B varianten: alleen large uploaden
          if (baseType === 'B') {
            if (size === 'compressed') {
              continue; // Sla compressed over
            }
            if (size.w !== 700 || size.h !== 500) {
              continue; // Sla alle andere formaten over behalve 700x500 (large)
            }
          }
        }
        
        // Gebruik de actuele JPEG kwaliteit uit de config, met een fallback naar 0.7
        const currentQuality = config.JPEG_QUALITY !== undefined ? config.JPEG_QUALITY : 0.7;
        
        if (size === 'compressed') {
          // Behoud originele afmetingen maar pas compressie toe
          //console.log(`  -> Compressing original size with quality ${currentQuality}`);
          
          // Get original image dimensions
          const img = new Image();
          const originalDimensions = await new Promise((resolve) => {
            img.onload = () => {
              resolve({ width: img.width, height: img.height });
            };
            img.src = URL.createObjectURL(actualFile);
          });
          
          blob = await resizeImageWithAspectRatio(actualFile, originalDimensions.width, originalDimensions.height, currentQuality);
          // Gebruik uploadFilename zonder extra extensie als die al een extensie heeft
          filename = uploadFilename.endsWith('.jpg') ? uploadFilename : `${uploadFilename}.jpg`;
          target = '100pct';
        } else {
          // Normale resize naar specifieke afmetingen
          //console.log(`  -> Resizing to ${size.w}x${size.h}`);
          blob = await resizeImageWithAspectRatio(actualFile, size.w, size.h, currentQuality);
          // Gebruik uploadFilename zonder extra extensie als die al een extensie heeft
          filename = uploadFilename.endsWith('.jpg') ? uploadFilename : `${uploadFilename}.jpg`;
          
          if ((size.w === 100 && size.h === 100) || (size.w === 250 && size.h === 250)) {
            target = 'small';
          } else if (size.w === 700 && size.h === 500) {
            target = 'large';
          } else {
            target = '100pct';
          }
        }
        //console.log(`  -> Processed: ${filename} (target: ${target})`);
        
        // Skip small images if disableSmallUpload is true
        if (!(config.disableSmallUpload === true && target === 'small')) {
          // Add subdirectory to filename if needed
          if (subdirMode === 'existing' && selectedSubdir) {
            filename = `${selectedSubdir}/${filename}`;
          } else if (subdirMode === 'new' && newSubdir) {
            filename = `${newSubdir}/${filename}`;
          }
          
          formData.append('targets[]', target);
          formData.append('images[]', blob, filename);
        }
      }
  
      processedFiles++;
      filesToProcess.push(file);
      
      // Show progress for large uploads during resizing (only after 3 seconds)
      if (showProgress && totalFiles > 50 && processedFiles % 10 === 0) {
        const percent = Math.round((processedFiles / totalFiles) * 100);
        const progressText = `Resizen: ${percent}% (${processedFiles}/${totalFiles} bestanden)...`;
        setResizeProgressText(progressText);
        // Add small delay to ensure message is visible
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    formData.append('doSmall', disabledSmallUpload ? 'true' : 'false');  // Already strings here
    formData.append('ConfSmall', config.disableSmallUpload ? 'true' : 'false');
    
    // Show completion of resizing phase (only if progress was shown)
    if (showProgress && totalFiles > 50) {
      const completionText = `Resizen voltooid: ${totalFiles} bestanden verwerkt.`;
      setResizeProgressText(completionText);
      // Add delay to ensure message is visible before next phase
      await new Promise(resolve => setTimeout(resolve, 1000));
      setShowResizeProgress(false);
    }
    
    // Clear the timer if resizing finished quickly
    if (progressTimer) {
      clearTimeout(progressTimer);
    }

    //console.log('=== RESIZING DONE, CHECKING RECORDS ===');

    // Check if there are any records to save (all types except Type E and variants get records)
    const hasRecordsToSave = filesToProcess.some(file => {
      const fileKey = file.webkitRelativePath || file.name;
      const recordInfo = recordInfoMap[fileKey];
      if (!recordInfo) return false;
      
      // Skip variant files (they have isException flag) - never save to database
      if (recordInfo.isException) return false;
      
      const t = recordInfo.type;
      if (!t) return false;
      
      // Types A, B, C, D, E hebben allemaal recordnummers die opgeslagen moeten worden
      return ['A', 'B', 'C', 'D', 'E'].includes(t);
    });

    // Check if we can save records (no duplicates for types that need saving)
    const canSaveRecords = hasRecordsToSave ? !hasDuplicateRecords : true;
    
    // console.log('=== HANDLE UPLOAD DECISION ===');
    // console.log('Has records to save:', hasRecordsToSave);
    // console.log('Has duplicate records:', hasDuplicateRecords);
    // console.log('Can save records:', canSaveRecords);
    // console.log('Files to process:', filesToProcess.length);

    // Always show confirmation dialog if we have records to save (even with duplicates)
    if (hasRecordsToSave) {
      // console.log('Showing confirm dialog (with or without duplicates)');
      setPendingUpload({ filesToProcess, formData });
      setShowConfirmDialog(true);
    } else {
      // console.log('No records to save, proceeding directly to upload');
      // No records to save, proceed with upload
      setPendingUpload({ filesToProcess, formData });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <RecordsComponent 
        records={records}
        beeldbank={beeldbank}
        onRecordsUpdate={handleRecordsUpdate}
      />
      
      {/* Resize Progress Popup */}
      {showResizeProgress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Bezig met verwerken</h3>
                <p className="text-sm text-gray-600 mt-1">{resizeProgressText}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conversion Progress Popup */}
      {showConversionProgress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Bezig met converteren</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {conversionProgress.current} van {conversionProgress.total} bestanden
                </p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${(conversionProgress.current / conversionProgress.total) * 100}%` }}
              ></div>
            </div>
            
            {/* Current File */}
            {conversionProgress.currentFile && (
              <div className="text-sm text-gray-600 truncate">
                Huidig bestand: <span className="font-medium">{conversionProgress.currentFile}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Completion Popup */}
      { showUploadComplete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Upload Voltooid!</h3>
                <p className="text-sm text-gray-600 mt-1">{message}</p>
              </div>
            </div>
            <div className="mt-4">
              <button
                type="button"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:text-sm"
                onClick={() => {
               
                  setShowUploadComplete(false);
                  try {
                    window.open('', '_self');
                    window.close();
                  } catch (e) {
                    window.location.href = 'about:blank';
                  }
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bevestigingsdialoog */}
      {showConfirmDialog && (
        (() => {
          // console.log('=== CONFIRM DIALOG RENDERED ===');
          // console.log('hasDuplicateRecords value:', hasDuplicateRecords);
          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                <h3 className="text-lg font-bold mb-4">Records aanmaken</h3>
                
                {/* Insert actief melding */}
                {(() => {
                  const insertConfig = appConfig.INSERT_CONFIGS?.[beeldbank];
                  if (insertConfig && insertConfig.active) {
                    return (
                      <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4" role="alert">
                        <p className="font-bold">Insert is actief!</p>
                        <p>
                          {insertConfig.fixedFields?.length > 0 && (
                            <span>Vaste velden: {insertConfig.fixedFields.map(f => `VELD ${f.field}="${f.value}"`).join(', ')}<br/></span>
                          )}
                          De insert waarden worden toegepast op de records.
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}
                
                {hasDuplicateRecords && (
                  <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
                    <p className="font-bold">Let op!</p>
                    <p>Er zijn dubbelrecords gevonden, aanmaken van records is niet mogelijk.</p>
                  </div>
                )}
                <p className="mb-4">
                  {hasDuplicateRecords 
                    ? "Er zijn dubbele records gevonden. U kunt alleen bestanden uploaden (geen nieuwe records aanmaken)."
                    : "Wilt u records aanmaken voor de geüploade bestanden?"
                  }
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => handleConfirmUpload(true, typeOverride)}
                    disabled={hasDuplicateRecords}
                    className={`px-4 py-2 rounded ${
                      hasDuplicateRecords 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                    title={hasDuplicateRecords ? "Kan geen records aanmaken vanwege dubbele records" : ""}
                  >
                    Ja - Images uploaden en records aanmaken
                  </button>
                  <button
                    onClick={() => handleConfirmUpload(false, typeOverride)}
                    className={`px-4 py-2 rounded ${
                      hasDuplicateRecords 
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    {hasDuplicateRecords 
                      ? "Alleen bestanden uploaden" 
                      : "Nee - Alleen Images uploaden"
                    }
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirmDialog(false);
                      setPendingUpload(null);
                    }}
                    className="text-red-600 px-4 py-2 hover:bg-gray-100 rounded"
                  >
                    Annuleren
                  </button>
                </div>
              </div>
            </div>
          );
        })()
      )}
      
      {/* Bevestigingsdialoog voor dubbele afbeeldingen */}
      {showDuplicateConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Waarschuwing</h3>
            <p className="mb-4">Er zijn {duplicateImages.length} afbeeldingen die mogelijk overschreven zullen worden:</p>
            <div className="max-h-40 overflow-y-auto mb-4 p-2 bg-gray-100 rounded">
              <ul className="list-disc pl-5">
                {duplicateImages.map((img, index) => (
                  <li key={index} className="text-sm">
                    {img.bestandsnaam} (Record: {img.recordNumber || 'N/A'})
                  </li>
                ))}
              </ul>
            </div>
            <p className="mb-4">Weet u zeker dat u door wilt gaan?</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => processUpload(pendingUpload.filesToProcess, pendingUpload.formData, uploadSettings.createRecords)}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Ja, overschrijven
              </button>
              <button
                onClick={() => {
                  setShowDuplicateConfirm(false);
                  setPendingUpload(null);
                }}
                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Hoofdinhoud */}
      <OutputResizer
        sizeOptions={sizeOptions}
        selectedOption={selectedOption}
        setSelectedOption={setSelectedOption}
        uploadProgress={uploadProgress}
        message={message}
        savedInfo={savedInfo}
        // Step management
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        completedSteps={completedSteps}
        completeStep={completeStep}
        goToStep={goToStep}
        // Beeldbank veld
        beeldbank={beeldbank}
        setBeeldbank={setBeeldbank}
        formatRestriction={formatRestriction}
        // Submap selectie props
        subdirMode={subdirMode}
        setSubdirMode={setSubdirMode}
        subdirs={subdirs}
        loadingSubdirs={loadingSubdirs}
        subdirsError={subdirsError}
        selectedSubdir={selectedSubdir}
        setSelectedSubdir={setSelectedSubdir}
        newSubdir={newSubdir}
        setNewSubdir={setNewSubdir}
        selectMode={selectMode}
        setSelectMode={setSelectMode}
        selectedFilesCount={selectedFiles.length}
        selectedFiles={selectedFiles}
        isUploading={isUploading}
        onFileChange={handleFileChange}
        onUpload={handleUpload}
        // Small upload control
        disabledSmallUpload={disabledSmallUpload}
        onDisabledSmallUploadChange={handleDisabledSmallUploadChange}
        // Record detectie doorgeven
        RecordNumberDetectorComponent={useCallback((props) => (
          <RecordNumberDetector
            {...props}
            beeldbank={beeldbank}
            recordInfoMap={recordInfoMap}
            overrideFlag={cStartNumberOverrideFlag}  // ← Override flag doorgeven
          />
        ), [beeldbank, cStartNumberOverrideFlag])} // cStartNumberOverrideFlag toegevoegd!
        
        recordInfoMap={recordInfoMap}
        setRecordInfoMap={setRecordInfoMap}
        setHasDuplicateRecords={setHasDuplicateRecords}
        cStartNumber={cStartNumber}
        setCStartNumber={handleSetCStartNumber}  // ← Wrapper functie gebruiken
        recordsArray={recordsArray}
        // Type override props
        typeOverride={typeOverride}
        setTypeOverride={setTypeOverride}
        typeOverrideRecordNumber={typeOverrideRecordNumber}
        setTypeOverrideRecordNumber={setTypeOverrideRecordNumber}
        // Record number update function
        updateRecordNumbersForTypeOverride={updateRecordNumbersForTypeOverride}
      />
      
      {/* Footer */}
      <footer className="mt-auto py-4 bg-gray-50 border-t border-gray-200">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          &copy; 2025 Paulo Ramos contact: pramosapro@gmail.com
        </div>
      </footer>
    </div>
  );
}
