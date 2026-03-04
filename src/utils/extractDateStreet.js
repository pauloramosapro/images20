// extractDateStreet.js
// Utility functions to extract date and street from filenames for types D and E

/**
 * Extract 4-digit year from filename
 * @param {string} filename - The filename to extract from
 * @returns {string|null} - The year if found, null otherwise
 */
export function extractYearFromFilename(filename) {
  if (!filename || typeof filename !== 'string') return null;
  
  // Pattern: \b(20[0-9]{2}|19[0-9]{2})\b/ - matches 1900-2099
  const yearMatch = filename.match(/\b(20[0-9]{2}|19[0-9]{2})\b/);
  return yearMatch ? yearMatch[1] : null;
}

/**
 * Extract street name from filename
 * @param {string} filename - The filename to extract from
 * @returns {string|null} - The street name if found, null otherwise
 */
export function extractStreetFromFilename(filename) {
  if (!filename || typeof filename !== 'string') return null;
  
  const streetTypes = ["straat", "weg", "plein", "steeg", "laan", "einde"];
  
  for (const streetType of streetTypes) {
    // Pattern: ([A-Z]*[a-z]+$streetType)( *\d*) - matches street name + optional numbers
    // Updated pattern to handle dots before extension: ([A-Z]*[a-z]+$streetType)( *\d*)(?=\s*\.|\s*$)
    const pattern = new RegExp(`([A-Z]*[a-z]+${streetType})( *\\d*)(?=\\s*\\.|\\s*$)`, 'i');
    const match = filename.match(pattern);
    
    if (match) {
      let street = match[1] + (match[2] || '');
      
      // Clean up: multiple spaces to single space, trim edges
      street = street.replace(/\s+/g, ' ').trim();
      
      // Capitalize first letter
      street = street.charAt(0).toUpperCase() + street.slice(1).toLowerCase();
      
      return street;
    }
  }
  
  return null;
}

/**
 * Extract both date and street from filename
 * @param {string} filename - The filename to extract from
 * @returns {object} - Object with year and street properties
 */
export function extractDateAndStreet(filename) {
  // console.log('extractDateAndStreet called with filename:', filename);
  
  const result = {
    year: extractYearFromFilename(filename),
    street: extractStreetFromFilename(filename)
  };
  
  // console.log('extractDateAndStreet result:', result);
  return result;
}

/**
 * Test function to verify extraction patterns
 */
export function testExtractionPatterns() {
  const testCases = [
    {
      filename: "0307 Lichtenvoorde van Heijdenstraat 26-8-1993.jpg",
      expected: { year: "1993", street: "Heijdenstraat 26" }
    },
    {
      filename: "Hoofdstraat 123 2020.jpg",
      expected: { year: "2020", street: "Hoofdstraat 123" }
    },
    {
      filename: "Kerkplein 2021-2022.jpg",
      expected: { year: "2021", street: "Kerkplein" }
    },
    {
      filename: "Molenweg 45 1950 foto.jpg",
      expected: { year: "1950", street: "Molenweg 45" }
    },
    {
      filename: "Geen straat hier 1999.jpg",
      expected: { year: "1999", street: null }
    },
    {
      filename: "Stationstraat zonder jaar.jpg",
      expected: { year: null, street: "Stationstraat" }
    }
  ];

  // console.log("Testing extraction patterns:");
  testCases.forEach((testCase, index) => {
    const result = extractDateAndStreet(testCase.filename);
    const yearMatch = result.year === testCase.expected.year;
    const streetMatch = result.street === testCase.expected.street;
    
    // console.log(`Test ${index + 1}: ${testCase.filename}`);
    // console.log(`  Expected: year=${testCase.expected.year}, street=${testCase.expected.street}`);
    // console.log(`  Got:      year=${result.year}, street=${result.street}`);
    // console.log(`  Result:   ${yearMatch && streetMatch ? 'PASS' : 'FAIL'}`);
    // console.log('');
  });
}
