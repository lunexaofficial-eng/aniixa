export interface ChemicalProduct {
  id: string; // e.g. "DE-CH-1042"
  casNumber: string; // e.g. "64-17-5"
  name: string; // e.g. "Ethanol absolut >= 99.8%"
  iupacName: string; // e.g. "Ethanol"
  formula: string; // e.g. "C2H5OH"
  molarMass: string; // e.g. "46.07 g/mol"
  grade:
    | 'p.a. (pro analysi)'
    | 'Ph. Eur. / DAB'
    | 'ACS Reagent'
    | 'Reinst (Pure)'
    | 'USP Grade'
    | 'Technical Grade'
    | 'Educational Grade'
    | 'AR Grade'
    | string;
  purity: string; // e.g. ">= 99.8%"
  price: string; // e.g. "€ 28.50"
  unit: string; // e.g. "1.000 ml"
  pricePerLiterOrKg: string; // e.g. "€ 28.50 / L"
  thumbnail: string; // image path
  category:
    | 'Solvents'
    | 'Acids & Bases'
    | 'Salts & Reagents'
    | 'Organic Compounds'
    | 'Buffering & Pure Reagents'
    | 'Buffers'
    | 'Glassware'
    | 'Indicators'
    | 'Laboratory Reagent'
    | 'Reagents'
    | 'Analytical & Pure Reagents'
    | string;
  inStock: boolean;
  leadTime: string; // e.g. "1-2 Werktage"
  packaging: string; // e.g. "Glasflasche DIN GL45" or "HDPE Kanister"
  unNumber?: string; // e.g. "UN 1170"
  hazardSummary: string; // e.g. "GHS02 Flamme"
  description: string;
  applications: string[];
  // Extended properties for bulk uploads & comprehensive specs
  physicalState?:
    | 'Flüssig (Liquid)'
    | 'Feststoff (Solid)'
    | 'Kristallin / Pulver (Crystalline/Powder)'
    | 'Gasförmig (Gas)'
    | 'Feststoff / Pulver (Solid/Powder)'
    | 'Kristallin (Crystalline)'
    | string;
  stockUnits?: number;
  thumbnails?: string[];
  primaryThumbnail?: string;
  sdsDocumentUrl?: string;
  sdsDocumentName?: string;
  demoVideoUrl?: string;
  meltingPoint?: string; // e.g. "-114 °C"
  boilingPoint?: string; // e.g. "78.37 °C"
  nfpaDiamond?: {
    health: number; // 0-4
    flammability: number; // 0-4
    instability: number; // 0-4
    special: string; // 'OX', 'W', 'SA', ''
  };
  ghsPictograms?: ('toxic' | 'corrosive' | 'flammable' | 'environment' | 'irritant' | 'safe')[];
  createdAt?: string;
}

export interface EnquirySubmission {
  productId: string;
  productName: string;
  productPrice: string;
  productThumbnail: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  notes?: string;
  countryCode?: string;
}

export interface StoredEnquiry {
  id: number | string;
  product_id: string;
  product_name: string;
  product_price: string;
  product_thumbnail: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  notes?: string;
  created_at: string;
  whatsapp_sent: boolean;
}
