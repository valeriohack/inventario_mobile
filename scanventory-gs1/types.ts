
export interface GS1Data {
  gtin?: string;
  lot?: string;
  expiryDate?: string;
  serial?: string;
  raw: string;
}

export interface InventoryItem {
  id: string;
  code: string;
  gtin: string;
  lot: string;
  expiry: string;
  quantity: number;
  timestamp: string;
}

export type AppState = 'HOME' | 'SCANNING' | 'LIST';
