// ImageTypeDetector
// -----------------
// Doel: op basis van de BESTANDSNAAM een type/rol voor afbeeldingen afleiden
// (bijv. 'small' / 'large' / '100pc' of een mogelijke doel-resolutie uit de naam).
//
// Dit component wordt na het kiezen van de bestanden aangeroepen en vóórdat
// een formaatcombinatie gekozen kan worden. Het is puur adviserend op basis
// van naam-patronen; er wordt géén beeldinhoud gelezen en geen EXIF gebruikt.
//
// Gebruik:
// <ImageTypeDetector
//   files={selectedFiles}
//   onTypesReady={(map) => {/* { [fileName]: inferredMeta } */}}
// />
//
// Daarnaast exporteren we de pure helper inferImageType(name) zodat je de logica
// ook los kunt hergebruiken of testen.

import React, { useEffect, useMemo } from 'react';

// Pure helper: leid type-info af uit de bestandsnaam
// - name: string (bijv. "product_700x500.jpg", "logo_small.png")
// Retourneert een object met nuttige hints:
// {
//   baseName: string,    // bestandsnaam zonder extensie
//   ext: string,         // extensie (zonder punt)
//   sizeHint: {w,h}|null // eventuele WxH in naam
//   suggestedTarget: 'small'|'large'|'100pc'|null // target-hint obv naam
//   matched: string[]    // lijst van trefwoorden/regexen die matchten
// }
export function inferImageType(name) {
  const matched = [];
  const lower = String(name || '').toLowerCase();

  // Extensie bepalen
  const extMatch = lower.match(/\.([a-z0-9]+)$/);
  const ext = extMatch ? extMatch[1] : '';

  // Basisnaam zonder extensie
  const baseName = lower.replace(/\.[^/.]+$/, '');

  // Zoek patroon WxH (bijv 100x100 of 3000x2000)
  let sizeHint = null;
  const sizeRegex = /(\d{2,4})x(\d{2,4})/;
  const sizeMatch = baseName.match(sizeRegex);
  if (sizeMatch) {
    sizeHint = { w: Number(sizeMatch[1]), h: Number(sizeMatch[2]) };
    matched.push(`${sizeMatch[1]}x${sizeMatch[2]}`);
  }

  // Keywords
  const hasSmall = /(small|thumb|thumbnail|icon|100x100|250x250)\b/.test(baseName);
  const hasLarge = /(large|big|700x500)\b/.test(baseName);
  const hasOriginal = /(orig|original|100pc)\b/.test(baseName);
  if (hasSmall) matched.push('small-like');
  if (hasLarge) matched.push('large-like');
  if (hasOriginal) matched.push('original-like');

  // Afleiden suggestedTarget
  let suggestedTarget = null;
  if (hasSmall) suggestedTarget = 'small';
  else if (hasLarge) suggestedTarget = 'large';
  else if (hasOriginal) suggestedTarget = '100pc';
  else if (sizeHint) {
    // Eenvoudige mapping o.b.v. gevonden afmeting
    const { w, h } = sizeHint;
    if ((w === 100 && h === 100) || (w === 250 && h === 250)) suggestedTarget = 'small';
    else if (w === 700 && h === 500) suggestedTarget = 'large';
    else suggestedTarget = '100pc';
  }

  return { baseName, ext, sizeHint, suggestedTarget, matched };
}

// Presentational + side-effect component:
// - Toont een beknopt overzicht van de afgeleide types per bestand
// - Roept onTypesReady terug met een map: { [displayName]: inferredMeta }
export default function ImageTypeDetector({ files = [], onTypesReady }) {
  // Bouw een stabiele representatie van de resultaten
  const results = useMemo(() => {
    const map = {};
    for (const f of files) {
      const displayName = f.webkitRelativePath || f.name;
      map[displayName] = inferImageType(displayName);
    }
    return map;
  }, [files]);

  // Meld resultaten omhoog zodra files wijzigen
  useEffect(() => {
    if (typeof onTypesReady === 'function') onTypesReady(results);
  }, [results, onTypesReady]);

  if (!files || files.length === 0) return null;

  return (
    <div>
      {/* Overzicht van afgeleide types op basis van naam */}
      <div>Voorlopige type-indeling (o.b.v. bestandsnaam)</div>
      <div>
        Dit is een suggestie. Je kunt hierna het gewenste formaat kiezen en uploaden.
      </div>
      <div>
        {Object.entries(results).map(([name, meta]) => (
          <div key={name}>
            <code>{name}</code>
            <span>ext: {meta.ext || '-'}</span>
            <span>
              size: {meta.sizeHint ? `${meta.sizeHint.w}x${meta.sizeHint.h}` : '-'}
            </span>
            <span>
              <span>
                {meta.suggestedTarget || 'onbekend'}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
