export interface GS1Data {
  gtin?: string;
  sscc?: string;
  lot?: string;
  expiryDate?: string;
  productionDate?: string;
  bestBeforeDate?: string;
  serial?: string;
  quantity?: string;
  weight?: string;
  raw: string;
}

export interface InventoryItem {
  id: string;
  code: string;
  gtin: string;
  sscc: string;
  lot: string;
  expiry: string;
  serial: string;
  quantity: number;
  timestamp: string;
}

export type AppState = 'HOME' | 'SCANNING' | 'LIST';