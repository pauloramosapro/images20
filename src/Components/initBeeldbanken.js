// initBeeldbanken.js
// Doel: initialiseert en bepaalt beschikbare beeldbanken ("image banks") op basis van
// omgevingsvariabelen en/of standaardwaarden uit config.
//
// Gebruik (voorbeeld):
//   import { initBeeldbanken } from '../Components/initBeeldbanken';
//   const { banks, defaultBankId } = initBeeldbanken();
//
// Omgevingsvariabelen (optioneel):
// - REACT_APP_BEELDBANKEN
//   Formaat 1 (CSV): "naam1:https://example.com/a,naam2:https://b.example.com"
//   Formaat 2 (JSON):
//     [
//       { "id": "small", "name": "Klein", "baseUrl": "https://...", "enabled": true },
//       { "id": "large", "name": "Groot", "baseUrl": "https://..." }
//     ]
// - REACT_APP_DEFAULT_BEELDBANK_ID
//   Bepaalt de standaard selectie indien aanwezig.

import { config } from '../config';

// Eenvoudige utility voor het laden van beeldbanken uit config.
// Later kunnen hier extra functies bijkomen, zoals het inlezen van
// records die al op een beeldbank staan.

/**
 * Initialiseer beeldbanken (simpel):
 * - Leest de lijst met beeldbank-namen uit `config.beeldbanken`.
 * @returns {string[]} Array met namen, bijv. ["beeldbank1", "beeldbank2", "beeldbank3"]
 */
export function initBeeldbanken() {
  const names = Array.isArray(config.beeldbanken) ? config.beeldbanken : [];
  return names.slice();
}

export default initBeeldbanken;
