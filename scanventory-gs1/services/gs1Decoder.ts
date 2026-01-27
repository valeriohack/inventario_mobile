
import { GS1Data } from '../types';

/**
 * Basic GS1 Parser for common AIs:
 * (01) GTIN - 14 chars
 * (17) Expiry Date - 6 chars (YYMMDD)
 * (10) Batch/Lot - Variable length (terminated by GS or end of string)
 * (21) Serial Number - Variable length
 */
export const decodeGS1 = (raw: string): GS1Data => {
  const result: GS1Data = { raw };
  
  // Clean string from common prefixes if present (like ]d2 for DataMatrix)
  let clean = raw.replace(/^\]d2/, '').replace(/\x1D/g, '|'); // Replace GS with pipe for easier regex
  
  // Search for GTIN (01)
  const gtinMatch = clean.match(/01(\d{14})/);
  if (gtinMatch) result.gtin = gtinMatch[1];

  // Search for Expiry (17)
  const expiryMatch = clean.match(/17(\d{6})/);
  if (expiryMatch) {
    const yy = expiryMatch[1].substring(0, 2);
    const mm = expiryMatch[1].substring(2, 4);
    const dd = expiryMatch[1].substring(4, 6);
    result.expiryDate = `20${yy}-${mm}-${dd}`;
  }

  // Search for Lot (10) - usually variable, let's look for what follows AI 10
  // Note: This is simplified. Proper GS1 parsing requires AI length tables.
  const lotMatch = clean.match(/10([^|]{1,20})/);
  if (lotMatch) result.lot = lotMatch[1];

  // Search for Serial (21)
  const serialMatch = clean.match(/21([^|]{1,20})/);
  if (serialMatch) result.serial = serialMatch[1];

  return result;
};
