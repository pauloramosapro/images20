// RecordNumberDetector
// --------------------
// Doel: Het bepalen van het "recordnummer" op basis van de bestandsnaam volgens
// de vijf typen (A t/m E) uit de specificatie. Dit component wordt aangeroepen
// NA het kiezen van de bestanden, maar VOORDAT een formaat gekozen kan worden.

import React, { useState, useEffect, useMemo } from 'react';

import { formatRecordNumber, getConfig, getMaxObject, resetMaxObjectErrorFlag } from '../utils/configParser';

// Pure helper: bepaal type en recordnummer obv bestandsnaam
export function inferRecordInfo(name, config = {}, overrideFlag = null, allFiles = []) {
  const notes = [];
  // Normaliseer invoer: trim spaties en maak lower-case, ondersteun zowel '/' als '\\' als scheiding
  const raw = String(name || '');
  const lower = raw.trim().toLowerCase();

  // Laat alleen de bestandsnaam over, strip pad
  const justName = lower.split(/[\\/]/).pop().trim();

  // Global flag to prevent multiple popups in one session
  if (typeof window !== 'undefined' && !window.hasShownMaxObjectError) {
    window.hasShownMaxObjectError = false;
  }

  // Strip extensie en trim opnieuw
  const base = justName.replace(/\.[^/.]+$/, '').trim();

  // Console log: Input gegevens voor detectie
  // console.log('=== TYPE DETECTIE INPUT ===');
  // console.log('Originele naam:', raw);
  // console.log('Normalized naam:', lower);
  // console.log('Bestandsnaam (zonder pad):', justName);
  // console.log('Bestandsnaam (zonder extensie):', base);
  // console.log('Config:', config);
  // console.log('Override Flag:', overrideFlag || 'null');
  // console.log('All files count:', allFiles.length);

  // Controleer op uitzondering: pyz variant (-p, -y, -z) met bijbehorend basis bestand
  const variantMatch = base.match(/^(.+)-([pyz])$/);
  // Controleer ook op individuele varianten (-p, -y, -z) zonder basis bestand
  const individualVariantMatch = base.match(/^(.+)-([pyz])$/);
  const isIndividualVariant = individualVariantMatch && !allFiles.some(file => {
    const fileName = (file.webkitRelativePath || file.name).split(/[\\/]/).pop().toLowerCase();
    const baseFileName = individualVariantMatch[1] + '.jpg';
    return fileName === baseFileName;
  });
  
  // console.log('=== DEBUG VARIANT CHECK ===');
  // console.log('Bestandsnaam:', name);
  // console.log('Basisnaam:', base);
  // console.log('Variant match:', variantMatch);
  // console.log('Individual variant match:', individualVariantMatch);
  // console.log('Is individual variant:', isIndividualVariant);
  
  if ((variantMatch && allFiles.length > 0) || isIndividualVariant) {
    const baseName = variantMatch ? variantMatch[1] : individualVariantMatch[1];
    const variantSuffix = variantMatch ? variantMatch[2] : individualVariantMatch[2];
    
    // console.log('BaseName:', baseName);
    // console.log('VariantSuffix:', variantSuffix);
    
    // Zoek naar het basis bestand (zonder suffix) - geldt voor alle types
    const baseFileName = baseName + '.jpg';
    const baseFileExists = allFiles.some(file => {
      const fileName = (file.webkitRelativePath || file.name).split(/[\\/]/).pop().toLowerCase();
      return fileName === baseFileName;
    });
    
    // console.log('Zoek naar basisbestand:', baseFileName);
    // console.log('Basisbestand gevonden:', baseFileExists);
    
    if (baseFileExists) {
      // Dit is een uitzondering: pyz variant met bijbehorend basis bestand
      // Genegeerd voor recordnummer omdat deze alleen wordt geupload
      // console.log('=== VARIANT DETECTION DEBUG ===');
      // console.log('Filename:', name);
      // console.log('BaseName:', baseName);
      // console.log('VariantSuffix:', variantSuffix);
      // console.log('BaseFileName:', baseFileName);
      
      // Zoek het recordnummer van het basisbestand
      const baseFileKey = allFiles.find(file => {
        const fileName = (file.webkitRelativePath || file.name).split(/[\\/]/).pop().toLowerCase();
        return fileName === baseFileName;
      });
      
      // Probeer het recordnummer te krijgen van het basisbestand via recordInfoMap
      let baseRecordNumber = baseName; // Fallback
      const digitsMatch = baseName.match(/^(\d+)/);
      if (digitsMatch) {
        baseRecordNumber = digitsMatch[1];
        //console.log('Extracted digits from base name:', baseRecordNumber);
      } else {
        //console.log('No digits found in base name, using full base name:', baseRecordNumber);
      }
      
      //console.log('Final baseRecordNumber for variant:', baseRecordNumber);
      //console.log('==============================');
      
      const result = {
        type: 'pyz_variant',
        recordNumber: null, // Geen recordnummer voor varianten
        needsRenameTable: false,
        isException: true,
        variantSuffix: variantSuffix,
        baseRecordNumber: baseRecordNumber, // Gebruik basisnaam voor nu
        notes: [...notes, `pyz uitzondering: ${variantSuffix} variant met bijbehorend basis bestand (${baseName}.jpg) - GENEGERD voor recordnummer`],
        overrideFlag: overrideFlag || null,
        ignoredForRecordNumber: true // Genegeerd voor recordnummer
      };
      
      //console.log('=== PYZ VARIANT DETECTED ===');
      //console.log('Result:', result);
      //console.log('================================');

      // console.log('=== TYPE DETECTIE RESULTAAT ===');
      // console.log('Gedetecteerd type:', result.type);
      // console.log('Recordnummer:', result.recordNumber);
      // console.log('Needs rename table:', result.needsRenameTable);
      // console.log('Is exception:', result.isException);
      // console.log('Notes:', result.notes);
      // console.log('============================');

      return result;
    } else if (isIndividualVariant) {
      // Dit is een individuele pyz variant zonder basisbestand
      // Ook genegeerd voor recordnummer omdat dit een variant is
      // Probeer het recordnummer te extraheren uit de basisnaam
      let baseRecordNumber = baseName;
      const digitsMatch = baseName.match(/^(\d+)/);
      if (digitsMatch) {
        baseRecordNumber = digitsMatch[1];
      }
      
      const result = {
        type: 'pyz_variant',
        recordNumber: null, // Geen recordnummer voor varianten
        needsRenameTable: false,
        isException: true,
        variantSuffix: variantSuffix,
        baseRecordNumber: baseRecordNumber, // Gebruik het geëxtraheerde recordnummer voor bestandsnaam
        notes: [...notes, `pyz uitzondering: individuele ${variantSuffix} variant zonder basisbestand - GENEGERD voor recordnummer`],
        overrideFlag: overrideFlag || null,
        ignoredForRecordNumber: true // Genegeerd voor recordnummer
      };
      
      // console.log('=== INDIVIDUELE PYZ VARIANT DETECTED ===');
      // console.log('Result:', result);
      // console.log('====================================');

      return result;
    }
  }

  // Check override flag - als C of E, sla detectie over en kies type direct
  // MAAR: als er een max_object conversie is, heeft die voorrang
  if (overrideFlag === 'C' && !allFiles.some(file => {
    const fileName = (file.webkitRelativePath || file.name).split(/[\\/]/).pop().toLowerCase();
    const fileBase = fileName.replace(/\.[^/.]+$/, '').trim();
    const onlyDigits = /^\d+$/;
    const lettersThenDigits = /^[a-z]+(\d+)$/i;
    const startsWithDigits = /^(\d+)/;
    
    // Check if this file would trigger max_object conversion
    if (onlyDigits.test(fileBase)) {
      const recordNum = parseInt(fileBase, 10);
      const maxObject = getMaxObject(config);
      return recordNum > maxObject;
    }
    if (lettersThenDigits.test(fileBase)) {
      const match = fileBase.match(lettersThenDigits);
      const recordNum = parseInt(match[1], 10);
      const maxObject = getMaxObject(config);
      return recordNum > maxObject;
    }
    if (startsWithDigits.test(fileBase)) {
      const match = fileBase.match(startsWithDigits);
      const recordNum = parseInt(match[1], 10);
      const maxObject = getMaxObject(config);
      return recordNum > maxObject;
    }
    return false;
  })) {
    const result = {
      type: 'C',
      recordNumber: null,
      needsRenameTable: true,
      notes: ['Type C: geforceerd via override'],
      overrideFlag: 'C' // Override flag toegevoegd aan resultaat
    };

    // console.log('=== TYPE DETECTIE RESULTAAT ===');
    // console.log('Gedetecteerd type:', result.type);
    // console.log('Recordnummer:', result.recordNumber);
    // console.log('Needs rename table:', result.needsRenameTable);
    // console.log('Is valid:', true);
    // console.log('Notes:', result.notes);
    // console.log('Override Flag:', overrideFlag || 'null');
    // console.log('============================');

    return result;
  }

  if (overrideFlag === 'E' && !allFiles.some(file => {
    const fileName = (file.webkitRelativePath || file.name).split(/[\\/]/).pop().toLowerCase();
    const fileBase = fileName.replace(/\.[^/.]+$/, '').trim();
    const onlyDigits = /^\d+$/;
    const lettersThenDigits = /^[a-z]+(\d+)$/i;
    const startsWithDigits = /^(\d+)/;
    
    // Check if this file would trigger max_object conversion
    if (onlyDigits.test(fileBase)) {
      const recordNum = parseInt(fileBase, 10);
      const maxObject = getMaxObject(config);
      return recordNum > maxObject;
    }
    if (lettersThenDigits.test(fileBase)) {
      const match = fileBase.match(lettersThenDigits);
      const recordNum = parseInt(match[1], 10);
      const maxObject = getMaxObject(config);
      return recordNum > maxObject;
    }
    if (startsWithDigits.test(fileBase)) {
      const match = fileBase.match(startsWithDigits);
      const recordNum = parseInt(match[1], 10);
      const maxObject = getMaxObject(config);
      return recordNum > maxObject;
    }
    return false;
  })) {
    const result = {
      type: 'E',
      recordNumber: null,
      needsRenameTable: true,
      notes: ['Type E: geforceerd via override'],
      overrideFlag: 'E' // Override flag toegevoegd aan resultaat
    };

    // console.log('=== TYPE DETECTIE RESULTAAT ===');
    // console.log('Gedetecteerd type:', result.type);
    // console.log('Recordnummer:', result.recordNumber);
    // console.log('Needs rename table:', result.needsRenameTable);
    // console.log('Is valid:', true);
    // console.log('Notes:', result.notes);
    // console.log('Override Flag:', overrideFlag || 'null');
    // console.log('============================');

    return result;
  }

  // Detectiepatronen volgens specificaties
  const onlyDigits = /^\d+$/; // A: vast aantal cijfers, geen letters
  const lettersThenDigits = /^[a-z]+(\d+)$/i; // B: vast aantal letters + vast aantal cijfers
  const validTypeC = /^[a-z0-9_-]+$/i; // C: willekeurige letters/cijfers (alleen - en _ toegestaan)
  const startsWithDigits = /^(\d+)/; // D: begint met vast aantal cijfers
//console.log('Start detectie');
  // Type A: vast aantal cijfers, geen letters (bestandsnaam = recordnummer)
  if (onlyDigits.test(base)) {
    const recordNum = parseInt(base, 10);
    const maxObject = getMaxObject(config);
    const maxObjectResult = checkMaxObject(recordNum, maxObject, 'A', base, overrideFlag);
    if (maxObjectResult) {
      return maxObjectResult; // Geef type E resultaat terug
    }
    
    const recordNumber = config ? formatRecordNumber(base, config) : base;
    const result = {
      type: 'A',
      recordNumber,
      needsRenameTable: false,
      notes: [...notes, 'Type A: vast aantal cijfers, geen letters (bestandsnaam = recordnummer)'],
      overrideFlag: overrideFlag || null // Override flag toegevoegd aan resultaat
    };

    // Console log: Resultaat na detectie
    // console.log('=== TYPE DETECTIE RESULTAAT ===');
    // console.log('Gedetecteerd type:', result.type);
    // console.log('Recordnummer:', result.recordNumber);
    // console.log('Needs rename table:', result.needsRenameTable);
    // console.log('Is valid:', true);
    // console.log('Notes:', result.notes);
    // console.log('Override Flag:', result.overrideFlag);
    // console.log('============================');

    return result;
  }

  // Type B: vast aantal letters + vast aantal cijfers (cijfers = recordnummer)
  const matchB = base.match(lettersThenDigits);
  if (matchB) {
    const recordNum = parseInt(matchB[1], 10);
    const maxObject = getMaxObject(config);
    const maxObjectResult = checkMaxObject(recordNum, maxObject, 'B', base, overrideFlag);
    if (maxObjectResult) {
      return maxObjectResult; // Geef type E resultaat terug
    }
    
    const recordNumber = config ? formatRecordNumber(matchB[1], config) : matchB[1];
    const result = {
      type: 'B',
      recordNumber,
      needsRenameTable: true,
      notes: [...notes, 'Type B: vast aantal letters + vast aantal cijfers (cijfers = recordnummer)'],
      overrideFlag: overrideFlag || null // Override flag toegevoegd aan resultaat
    };

    // Console log: Resultaat na detectie
    // console.log('=== TYPE DETECTIE RESULTAAT ===');
    // console.log('Gedetecteerd type:', result.type);
    // console.log('Recordnummer:', result.recordNumber);
    // console.log('Needs rename table:', result.needsRenameTable);
    // console.log('Is valid:', true);
    // console.log('Notes:', result.notes);
    // console.log('Override Flag:', result.overrideFlag);
    // console.log('============================');

    return result;
  }

  // Type D: begint met vast aantal cijfers (= recordnummer) + willekeurige tekens
  const matchD = base.match(startsWithDigits);
  if (matchD) {
    const recordNum = parseInt(matchD[1], 10);
    const maxObject = getMaxObject(config);
    const maxObjectResult = checkMaxObject(recordNum, maxObject, 'D', base, overrideFlag);
    if (maxObjectResult) {
      return maxObjectResult; // Geef type E resultaat terug
    }
    
    // Extraheer jaar, datum, straat en plaats uit bestandsnaam voor de juiste velden
    const yearMatch = base.match(/\b(19|20)\d{2}\b/);
    const dateMatch = base.match(/\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\d{4}[-\/]\d{1,2}[-\/]\d{1,2})\b/);
    const streetMatch = base.match(/\b(hoofdstraat|straat|weg|laan|pad|dreef|plein|gracht|singel|kade|burg|markt|park|plantsoen|hof|bos|heuvel|dal|vallei|berg|rivier|meer|zee|eiland|dorp|stad|buurt|wijk)\b.*\d+/i);
    const placeMatch = base.match(/\b(amsterdam|rotterdam|den haag|utrecht|eindhoven|tilburg|groningen|alkmaar|breda|nijmegen|apeldoorn|haarlem|arnhem|amersfoort|zaanstad|haarlemmermeer|delft|zoetermeer|hilversum|leiden|maastricht|eindhoven|enschede|tilburg|breda|nijmegen)\b/i);
    
    const year = yearMatch ? yearMatch[0] : '';
    const date = dateMatch ? dateMatch[0] : '';
    const street = streetMatch ? streetMatch[0] : '';
    const place = placeMatch ? placeMatch[0] : '';
    
    const recordNumber = config ? formatRecordNumber(matchD[1], config) : matchD[1];
    const result = {
      type: 'D',
      recordNumber,
      needsRenameTable: true,
      notes: [...notes, 'Type D: begint met cijfers (cijfers = recordnummer)'],
      overrideFlag: overrideFlag || null, // Override flag toegevoegd aan resultaat
      extractedInfo: {
        year: year,
        date: date,
        street: street,
        place: place
      }
    };

    // Console log: Resultaat na detectie
    // console.log('=== TYPE DETECTIE RESULTAAT ===');
    // console.log('Gedetecteerd type:', result.type);
    // console.log('Recordnummer:', result.recordNumber);
    // console.log('Needs rename table:', result.needsRenameTable);
    // console.log('Is valid:', true);
    // console.log('Notes:', result.notes);
    // console.log('Override Flag:', result.overrideFlag);
    // console.log('============================');

    return result;
  }

  // Type C: willekeurige letters en/of cijfers (alleen - en _ toegestaan)
  if (validTypeC.test(base)) {
    const result = {
      type: 'C',
      recordNumber: null, // Wordt later toegewezen
      needsRenameTable: true,
      notes: [...notes, 'Type C: willekeurige letters/cijfers (alleen - en _ toegestaan)'],
      overrideFlag: overrideFlag || null // Override flag toegevoegd aan resultaat
    };

    // Console log: Resultaat na detectie
    // console.log('=== TYPE DETECTIE RESULTAAT ===');
    // console.log('Gedetecteerd type:', result.type);
    // console.log('Recordnummer:', result.recordNumber);
    // console.log('Needs rename table:', result.needsRenameTable);
    // console.log('Is valid:', true);
    // console.log('Notes:', result.notes);
    // console.log('Override Flag:', result.overrideFlag);
    // console.log('============================');

    return result;
  }

  // Type E: willekeurige letters/cijfers/tekens (bestandsnaam wordt recordnummer)
  // Extraheer jaar, datum, straat en plaats uit bestandsnaam voor de juiste velden
  const yearMatch = base.match(/\b(19|20)\d{2}\b/);
  const dateMatch = base.match(/\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\d{4}[-\/]\d{1,2}[-\/]\d{1,2})\b/);
  const streetMatch = base.match(/\b(hoofdstraat|straat|weg|laan|pad|dreef|plein|gracht|singel|kade|burg|markt|park|plantsoen|hof|bos|heuvel|dal|vallei|berg|rivier|meer|zee|eiland|dorp|stad|buurt|wijk)\b.*\d+/i);
  const placeMatch = base.match(/\b(amsterdam|rotterdam|den haag|utrecht|eindhoven|tilburg|groningen|alkmaar|breda|nijmegen|apeldoorn|haarlem|arnhem|amersfoort|zaanstad|haarlemmermeer|delft|zoetermeer|hilversum|leiden|maastricht|eindhoven|enschede|tilburg|breda|nijmegen)\b/i);
  
  // console.log('Type E detectie - base:', base);
  // console.log('Year match:', yearMatch);
  // console.log('Date match:', dateMatch);
  // console.log('Street match:', streetMatch);
  // console.log('Place match:', placeMatch);
  
  const year = yearMatch ? yearMatch[0] : '';
  const date = dateMatch ? dateMatch[0] : '';
  const street = streetMatch ? streetMatch[0] : '';
  const place = placeMatch ? placeMatch[0] : '';
  
  const result = {
    type: 'E',
    recordNumber: null, // Wordt later toegewezen
    overrideFlag: overrideFlag || null, // Override flag toegevoegd aan resultaat
    extractedInfo: {
      year: year,
      date: date,
      street: street,
      place: place
    }
  };

  // Console log: Resultaat na detectie
  // console.log('=== TYPE DETECTIE RESULTAAT ===');
  // console.log('Gedetecteerd type:', result.type);
  // console.log('Recordnummer:', result.recordNumber);
  // console.log('Needs rename table:', result.needsRenameTable);
  // console.log('Is valid:', result.isValid);
  // console.log('Notes:', result.notes);
  // console.log('Override Flag:', result.overrideFlag);
  // console.log('============================');

  return result;
}
//console.log('end detectie');
// Centrale check voor max_object - converteert naar type E met popup
const checkMaxObject = (recordNum, maxObject, originalType, base, overrideFlag) => {
  if (recordNum > maxObject && !window.hasShownMaxObjectError) {
    // Zet de vlag om te voorkomen dat er meer popups verschijnen
    window.hasShownMaxObjectError = true;
    
    // Toon popup waarschuwing
    const warningMessage = `⚠️ Waarschuwing: Recordnummer ${recordNum} is te hoog!\n\nMaximum toegestaan: ${maxObject}\nHuidig recordnummer: ${recordNum}\n\nHet type wordt automatisch gewijzigd naar Type E.\nU kunt ook kiezen voor Type C als alternatief.`;
    
    if (typeof window !== 'undefined') {
      try {
        window.alert(warningMessage);
      } catch (e) {
        // ignore
      }
    }
    
    // Geef resultaat terug met type E in plaats van null
    // BELANGRIJK: overrideFlag wordt gewist om conversie toe te staan
    return {
      type: 'E',
      recordNumber: null, // Wordt later toegewezen
      needsRenameTable: true,
      notes: [`Type ${originalType} geconverteerd naar Type E: recordnummer ${recordNum} is hoger dan maximum ${maxObject}`],
      overrideFlag: null, // OverrideFlag gewist om conversie toe te staan
      convertedFromMaxObject: true // Flag om aan te geven dat dit een conversie is
    };
  }
  return null; // No conversion needed
};

const RecordNumberDetector = ({
  files = [],
  onRecordsReady,
  cStartNumber,
  onChangeCStartNumber,
  summaryOnly = false,
  quiet = false,
  beeldbank,
  recordInfoMap = null,
  overrideFlag = null  // ← Override flag prop toegevoegd
}) => {
  const [hasTypeC, setHasTypeC] = useState(false);
  const [hasTypeD, setHasTypeD] = useState(false);
  const [hasTypeE, setHasTypeE] = useState(false);
  const [hasAnyTypeE, setHasAnyTypeE] = useState(false);
  const [hasTypeCE, setHasTypeCE] = useState(false);
  const [localStartNumber, setLocalStartNumber] = useState(cStartNumber || '');
  const [config, setConfig] = useState({});
  const [currentRecordInfoMap, setCurrentRecordInfoMap] = useState(recordInfoMap || {}); // Lokale state voor recordInfoMap
  
  // Synchroniseer currentRecordInfoMap met recordInfoMap prop
  useEffect(() => {
    if (recordInfoMap) {
      setCurrentRecordInfoMap(recordInfoMap);
      //console.log('currentRecordInfoMap gesynchroniseerd met prop:', Object.keys(recordInfoMap));
    }
  }, [recordInfoMap]);
  
  // Laad configuratie wanneer de beeldbank verandert
  useEffect(() => {
    const loadConfig = async () => {
      if (beeldbank) {
        try {
          const configData = await getConfig(null, beeldbank);
          setConfig(configData);
          
        } catch (error) {
          console.error('Fout bij het laden van de configuratie:', error);
          setConfig({});
        }
      }
    };
    
    loadConfig();
  }, [beeldbank]);
  
  // Update local state when prop changes and trigger re-detection if needed
  useEffect(() => {
    const prevStartNumber = localStartNumber;
    // setLocalStartNumber(cStartNumber || '');
    
    // Synchroniseer currentRecordInfoMap met recordInfoMap prop voordat we processFiles aanroepen
    // if (recordInfoMap && Object.keys(recordInfoMap).length > 0) {
    //   setCurrentRecordInfoMap(recordInfoMap);
    //   console.log('currentRecordInfoMap gesynchroniseerd met prop in cStartNumber useEffect:', Object.keys(recordInfoMap));
    // }
    
    // Als het startnummer is gewijzigd EN we hebben type C of E bestanden, voer dan opnieuw detectie uit
    if ((cStartNumber || '') !== (prevStartNumber || '') && hasTypeCE) {
      // console.log('[RecordNumberDetector] cStartNumber changed, re-processing files:', {
      //   prev: prevStartNumber,
      //   current: cStartNumber,
      //   hasTypeCE,
      //   filesCount: files.length
      // });
      // Gebruik de bijgewerkte currentRecordInfoMap
      // const resultMap = processFiles(files, cStartNumber, currentRecordInfoMap);
      // if (onRecordsReady) {
      //   onRecordsReady(resultMap);
      // }
    }
  }, [cStartNumber, files, hasTypeCE, onRecordsReady, config, recordInfoMap]); // recordInfoMap toegevoegd!

  // Reset de type E status (niet meer nodig maar gehouden voor compatibiliteit)
  useEffect(() => {
    window.hasTypeE = false;
    return () => {
      window.hasTypeE = false;
    };
  }, []);

  // Hulpfunctie om bestanden te verwerken en recordinformatie te genereren
  const processFiles = (filesToProcess, startNumber, existingRecordInfoMap = null, config = null) => {
    //console.log('=== PROCESS FILES DEBUG ===');
    //console.log('existingRecordInfoMap:', existingRecordInfoMap);
    if (existingRecordInfoMap) {
      //console.log('Keys in existingRecordInfoMap:', Object.keys(existingRecordInfoMap));
      Object.keys(existingRecordInfoMap).forEach(key => {
       // console.log(`Key: ${key}, Type: ${existingRecordInfoMap[key]?.type}, Override: ${existingRecordInfoMap[key]?.overrideFlag}, isOverride: ${existingRecordInfoMap[key]?.isOverride}`);
      });
    }
    //console.log('==========================');
    
    const map = {};
    
    for (const file of filesToProcess) {
      const displayName = file.webkitRelativePath || file.name;
      
      // Als we al een override resultaat hebben, gebruik dat dan
      if (existingRecordInfoMap && existingRecordInfoMap[displayName] && existingRecordInfoMap[displayName].isOverride) {
        map[displayName] = {
          ...existingRecordInfoMap[displayName],
          beeldbank,
          hasDubbelImages: false
        };
        //console.log('Override resultaat behouden voor:', displayName, existingRecordInfoMap[displayName].type);
        continue;
      }
      
      // Gebruik override flag: eerst van existingRecordInfoMap, dan van component prop, dan null
      let effectiveOverrideFlag = null;
      if (existingRecordInfoMap && existingRecordInfoMap[displayName] && existingRecordInfoMap[displayName].overrideFlag) {
        effectiveOverrideFlag = existingRecordInfoMap[displayName].overrideFlag;
        //console.log('Override flag gevonden in map voor:', displayName, effectiveOverrideFlag);
      } else if (overrideFlag) {
        // Gebruik component overrideFlag prop als fallback
        effectiveOverrideFlag = overrideFlag;
        //console.log('Override flag gevonden in prop voor:', displayName, effectiveOverrideFlag);
      } else {
        //console.log('Geen override flag gevonden voor:', displayName, existingRecordInfoMap ? 'map exists' : 'no map');
      }
      
      // Roep inferRecordInfo aan met de geladen config (niet {}) en alle bestanden
      let info = inferRecordInfo(displayName, config, effectiveOverrideFlag, filesToProcess);
      
      // Als het resultaat een conversie is vanwege max_object, wis dan de override flag
      if (info.convertedFromMaxObject && info.type === 'E') {
        info.overrideFlag = null; // Wis override flag om conversie toe te staan
      }
      
      map[displayName] = {
        ...info,
        beeldbank,
        hasDubbelImages: false // Initialize with default value
      };
    }
    
    // Als er een startnummer is opgegeven, pas dan de recordnummers aan
    if (startNumber && /^\d+$/.test(String(startNumber))) {
      const startNum = parseInt(startNumber, 10);
      const padLen = String(startNumber).length;
      let current = startNum;
      let hasTypeC = false;
      let hasTypeE = false;
      
      // Eerst controleren of we type C of E bestanden hebben (exclusief pyz_variant)
      for (const info of Object.values(map)) {
        if (info.type === 'C' && !info.isException) hasTypeC = true;
        if (info.type === 'E' && !info.isException) hasTypeE = true;
      }
      
      // Alleen doorgaan als we type C of E bestanden hebben EN de config is geladen en niet leeg is
      if ((hasTypeC || hasTypeE) && config && config.max_object !== undefined) {
        const maxObject = getMaxObject(config);
        
        // Houd de oorspronkelijke volgorde aan
        for (const f of filesToProcess) {
          const key = f.webkitRelativePath || f.name;
          const info = map[key];
          
          // Pas aan als het type C is, of type E (beide krijgen recordnummers)
          if (info && (info.type === 'C' || info.type === 'E')) {
            // Controleer of het toe te wijzen recordnummer binnen de max_object valt
            if (checkMaxObject(current, maxObject)) {
              return null; // Stop de verwerking
            }
            
            const val = String(current).padStart(padLen, '0');
            map[key] = { 
              ...info, 
              recordNumber: val,
              // Update de notities om aan te geven dat het recordnummer is toegewezen
              notes: [...(info.notes || []), `Recordnummer ${val} toegewezen`]
            };
            current += 1;
          }
        }
      }
    }

    // Voeg de config toe aan de map voor latere verwerking
  
    
    
   
    
    return map;
  };

  // Formatteer recordnummers consistent aan het einde
  // Formatteer recordnummers consistent aan het einde
const formatRecordNumbers = (records, config = {}) => {
  const result = { ...records };
  
  Object.entries(result).forEach(([key, info]) => {
    if (info && info.recordNumber) {
      // Format the record number using formatRecordNumber
      const formatted = formatRecordNumber(info.recordNumber, config);
     
      // Only update if the format has changed
      if (formatted !== info.recordNumber) {
        result[key] = {
          ...info,
          recordNumber: formatted,
          notes: [
            ...(info.notes || []),
            `Recordnummer geformatteerd naar ${formatted}`
          ]
        };
      }
    }
  });
  
  return result;
};

  // Verwerk bestanden en detecteer types
  const resultMap = useMemo(() => {
    return processFiles(files, cStartNumber, currentRecordInfoMap, config);
  }, [files, beeldbank, cStartNumber, currentRecordInfoMap, config]); // config toegevoegd!

  // Verwerk de resultaten en formatteer de recordnummers
  const processedMap = useMemo(() => {
    if (!resultMap) return null;
    // Formatteer de recordnummers consistent
    return formatRecordNumbers(resultMap, config);
  }, [resultMap, config]);

  // Hard-stop wanneer max_object overschreden wordt
  useEffect(() => {
    if (!processedMap && typeof window !== 'undefined' && window.maxObjectFatal) {
      if (!window.hasShownMaxObjectPopup) {
        window.hasShownMaxObjectPopup = true;
        const msg = window.maxObjectErrorMessage || '❌ Fout: recordnummer is te hoog (boven maximum).';
        window.alert(msg);
      }
      window.location.reload();
    }
  }, [processedMap, quiet]);

  // Update de status wanneer de resultaten veranderen
  useEffect(() => {
    if (!processedMap) return;
    const types = new Set();
    // console.log('=== MULTITYPE DEBUG ===');
    // console.log('Alle bestanden en hun types:');
    
    Object.values(processedMap).forEach(info => {
      if (info) {
        //console.log(`Bestand: ${info.beeldbank || 'onbekend'}, Type: ${info.type}, IsException: ${info.isException}, Notes: ${info.notes?.join(', ')}`);
        
        // Voor UI doeleinden: tel pyz_variant niet mee voor C/E triggers
        if (!info.isException) {
          types.add(info.type);
          // console.log(`-> Type ${info.type} toegevoegd aan types set`);
        } else {
          // console.log(`-> Type ${info.type} is exception, wordt genegeerd voor types set`);
        }
      }
    });
    
    setHasTypeC(types.has('C'));
    setHasTypeD(types.has('D'));
    setHasTypeE(types.has('E'));
    setHasAnyTypeE(types.has('E'));
    setHasTypeCE(types.has('C') || types.has('E'));
    
    // Roep de callback aan met de verwerkte resultaten
    if (onRecordsReady) {
      onRecordsReady(processedMap);
    }
  }, [processedMap, onRecordsReady]);

  // Toon een samenvatting indien gevraagd
 

  // Toon invoerveld voor startnummer als er type C of E bestanden zijn (exclusief varianten)
  if (hasTypeCE && !summaryOnly && config && config.max_object !== undefined) {
    const maxObjectLabelValue = getMaxObject(config);
    // Bepaal welke types we daadwerkelijk hebben (exclusief varianten)
    const hasCOnly = hasTypeC && !hasTypeE;
    const hasEOnly = hasTypeE && !hasTypeC;
    const hasBothCE = hasTypeC && hasTypeE;
    
    console.log('RecordNumberDetector render - hasTypeC:', hasTypeC, 'hasTypeE:', hasTypeE, 'hasCOnly:', hasCOnly, 'hasEOnly:', hasEOnly, 'hasBothCE:', hasBothCE);
    
    return (
      <div className="mt-2">
        <label className="block text-sm font-medium text-gray-700">
          Start recordnummer voor type {hasBothCE ? 'C/E' : hasCOnly ? 'C' : 'E'}: <span className="text-xs text-gray-500">Hoogste getal is {maxObjectLabelValue}</span>
          <input
            type="text"
            value={cStartNumber || ''}
            onChange={(e) => setLocalStartNumber(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onChangeCStartNumber && onChangeCStartNumber(localStartNumber);
              }
            }}
            onBlur={() => onChangeCStartNumber && onChangeCStartNumber(localStartNumber)}
            placeholder="Bijv. 00001"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </label>
        <p className="mt-1 text-xs text-gray-500">
          Voer een startnummer in om automatisch oplopende nummers toe te kennen aan de images.
          Het formaat bepaalt de lengte van de nummers (bijv. 001 wordt 001, 002, 003...).
        </p>
      </div>
    );
  }

  return null;
};

export default RecordNumberDetector;