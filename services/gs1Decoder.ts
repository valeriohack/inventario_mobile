import { GS1Data } from '../types';

/**
 * Parser GS1 Standard
 * Gestisce AI a lunghezza fissa e variabile con separatori FNC1 (\x1D o |)
 */
export const decodeGS1 = (raw: string): GS1Data => {
  const result: GS1Data = { raw };
  
  // Pulizia iniziale: rimuove prefissi DataMatrix comuni e normalizza i separatori
  let buffer = raw.replace(/^\]d2/, '').replace(/\x1D/g, '|');
  
  let i = 0;
  while (i < buffer.length) {
    let ai = "";
    
    // Identificazione AI (2, 3 o 4 cifre)
    const ai2 = buffer.substring(i, i + 2);
    const ai3 = buffer.substring(i, i + 3);
    const ai4 = buffer.substring(i, i + 4);

    if (['00', '01', '02', '10', '11', '13', '15', '17', '21', '30', '37'].includes(ai2)) {
      ai = ai2;
      i += 2;
    } else if (['240'].includes(ai3)) {
      ai = ai3;
      i += 3;
    } else if (ai4.startsWith('310') || ai4.startsWith('320') || ai4.startsWith('330')) {
      ai = ai4;
      i += 4;
    } else {
      // Se l'AI non è riconosciuto, saltiamo un carattere per evitare loop infiniti
      // ma idealmente qui dovremmo fermarci o gestire l'errore
      i++;
      continue;
    }

    // Estrazione valore in base all'AI
    // 00: SSCC (18 cifre fisso)
    // 01, 02: GTIN (14 cifre fisso)
    // 11, 13, 15, 17: Date (6 cifre fisso YYMMDD)
    // 310n, 320n, 330n: Peso/Misure (6 cifre fisso)
    // 10, 21, 30, 37, 240: Variabile (fino a separatore | o fine stringa)

    const isFixed = ['00', '01', '02', '11', '13', '15', '17'].includes(ai) || ai.length === 4;
    const fixedLength: Record<string, number> = {
      '00': 18,
      '01': 14,
      '02': 14,
      '11': 6,
      '13': 6,
      '15': 6,
      '17': 6
    };

    if (isFixed) {
      const len = fixedLength[ai] || 6; // default 6 per i pesi 310n etc
      const val = buffer.substring(i, i + len);
      i += len;
      applyValue(result, ai, val);
    } else {
      // Variabile: cerca il separatore |
      const nextSep = buffer.indexOf('|', i);
      let val = "";
      if (nextSep === -1) {
        val = buffer.substring(i);
        i = buffer.length;
      } else {
        val = buffer.substring(i, nextSep);
        i = nextSep + 1; // Salta il separatore
      }
      applyValue(result, ai, val);
    }
  }

  return result;
};

const applyValue = (res: GS1Data, ai: string, val: string) => {
  switch (ai) {
    case '00': res.sscc = val; break;
    case '01': 
    case '02': res.gtin = val; break;
    case '10': res.lot = val; break;
    case '11': res.productionDate = formatDate(val); break;
    case '13': /* confezionamento */ break;
    case '15': res.bestBeforeDate = formatDate(val); break;
    case '17': res.expiryDate = formatDate(val); break;
    case '21': res.serial = val; break;
    case '30': 
    case '37': res.quantity = val; break;
    default:
      if (ai.startsWith('310') || ai.startsWith('320')) res.weight = val;
  }
};

const formatDate = (gs1Date: string): string => {
  if (gs1Date.length !== 6) return gs1Date;
  const yy = gs1Date.substring(0, 2);
  const mm = gs1Date.substring(2, 4);
  const dd = gs1Date.substring(4, 6);
  return `20${yy}-${mm}-${dd}`;
};