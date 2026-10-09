import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileText,
  Video,
  Image as ImageIcon,
  Star,
  Copy,
  ChevronDown,
  ChevronUp,
  Flame,
  ShieldAlert,
  FlaskConical,
  Sparkles,
  Check,
  PackageCheck
} from 'lucide-react';
import { ChemicalProduct } from '../../types/chemical';

export const REAGENT_CATEGORIES = [
  'Solvents',
  'Acids & Bases',
  'Salts & Inorganic Compounds',
  'Buffers',
  'Reagents',
  'Laboratory Reagent',
  'Indicators',
  'Glassware',
  'Organic Compounds',
  'Analytical & Pure Reagents',
] as const;

export const MARKET_GRADES = [
  'ACS Reagent',
  'USP Grade',
  'AR Grade',
  'p.a. (pro analysi)',
  'Ph. Eur. / DAB',
  'Technical Grade',
  'Educational Grade',
  'Pure / Reinst',
] as const;

export const PHYSICAL_STATES = [
  'Flüssig (Liquid)',
  'Feststoff (Solid)',
  'Kristallin / Pulver (Crystalline/Powder)',
  'Gasförmig (Gas)',
] as const;

export type ReagentCategoryType = typeof REAGENT_CATEGORIES[number];
export type MarketGradeType = typeof MARKET_GRADES[number];
export type PhysicalStateType = typeof PHYSICAL_STATES[number];

export interface BulkChemicalItem {
  id: string; // client temporary or generated id
  name: string;
  formula: string;
  casNumber: string;
  category: ReagentCategoryType;
  purity: string;
  grade: MarketGradeType;
  physicalState: PhysicalStateType;
  price: string;
  unit: string;
  stockUnits: number;
  thumbnails: string[];
  primaryThumbnailIndex: number;
  sdsDocumentUrl: string;
  sdsDocumentName: string;
  demoVideoUrl: string;
  molecularWeight: string; // e.g. "46.07 g/mol"
  meltingPoint: string;    // e.g. "-114.1 °C"
  boilingPoint: string;    // e.g. "78.37 °C"
  description: string;
  // NFPA 704 Safety Diamond Parameters (0-4)
  nfpaHealth: number; // Blue (0-4)
  nfpaFlammability: number; // Red (0-4)
  nfpaInstability: number; // Yellow (0-4)
  nfpaSpecial: string; // White (e.g. OX, W, SA, '')
  // GHS Pictogram classification tags
  ghsTags: {
    toxic: boolean;
    corrosive: boolean;
    flammable: boolean;
    environment: boolean;
    irritant: boolean;
    safe: boolean;
  };
}

interface BulkAddProductSectionProps {
  token: string;
  onPublishedSuccess: (products: ChemicalProduct[]) => void;
}

const DEFAULT_CATEGORY: ReagentCategoryType = 'Solvents';
const DEFAULT_GRADE: MarketGradeType = 'ACS Reagent';
const DEFAULT_STATE: PhysicalStateType = 'Flüssig (Liquid)';

function createEmptyItem(index: number): BulkChemicalItem {
  return {
    id: `temp_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 7)}`,
    name: '',
    formula: '',
    casNumber: '',
    category: DEFAULT_CATEGORY,
    purity: '≥ 99.8%',
    grade: DEFAULT_GRADE,
    physicalState: DEFAULT_STATE,
    price: '28.50',
    unit: '1.000 ml Glasflasche DIN GL45',
    stockUnits: 50,
    thumbnails: [],
    primaryThumbnailIndex: 0,
    sdsDocumentUrl: '',
    sdsDocumentName: '',
    demoVideoUrl: '',
    molecularWeight: '',
    meltingPoint: '',
    boilingPoint: '',
    description: '',
    nfpaHealth: 0,
    nfpaFlammability: 0,
    nfpaInstability: 0,
    nfpaSpecial: '',
    ghsTags: {
      toxic: false,
      corrosive: false,
      flammable: false,
      environment: false,
      irritant: false,
      safe: true,
    },
  };
}

export const BulkAddProductSection: React.FC<BulkAddProductSectionProps> = ({
  token,
  onPublishedSuccess,
}) => {
  const [items, setItems] = useState<BulkChemicalItem[]>([
    createEmptyItem(1),
  ]);

  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Field reference updater for specific item slot
  const updateItemField = <K extends keyof BulkChemicalItem>(
    index: number,
    field: K,
    value: BulkChemicalItem[K]
  ) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Add another product slot
  const handleAddNewSlot = () => {
    setItems((prev) => [...prev, createEmptyItem(prev.length + 1)]);
    setExpandedIndex(items.length); // auto-expand newly created slot
  };

  // Duplicate an existing slot's configuration
  const handleDuplicateSlot = (index: number) => {
    const source = items[index];
    const duplicated: BulkChemicalItem = {
      ...source,
      id: `temp_${Date.now()}_${items.length + 1}_${Math.random().toString(36).substring(2, 7)}`,
      name: source.name ? `${source.name} (Kopie)` : '',
    };
    setItems((prev) => [...prev, duplicated]);
    setExpandedIndex(items.length);
  };

  // Remove product slot
  const handleRemoveSlot = (index: number) => {
    if (items.length === 1) {
      if (confirm('Möchten Sie diese Chemikalien-Position zurücksetzen?')) {
        setItems([createEmptyItem(1)]);
      }
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
    if (expandedIndex === index) {
      setExpandedIndex(Math.max(0, index - 1));
    } else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1);
    }
  };

  // Multi-thumbnail upload
  const handleThumbnailUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const readers: Promise<string>[] = [];
    Array.from(files).forEach((file) => {
      readers.push(
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        })
      );
    });

    Promise.all(readers).then((newUrls) => {
      setItems((prev) => {
        const copy = [...prev];
        const currentThumbnails = copy[index].thumbnails || [];
        copy[index] = {
          ...copy[index],
          thumbnails: [...currentThumbnails, ...newUrls],
        };
        return copy;
      });
    });
  };

  // Handle SDS document upload
  const handleSdsUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setItems((prev) => {
        const copy = [...prev];
        copy[index] = {
          ...copy[index],
          sdsDocumentUrl: reader.result as string,
          sdsDocumentName: file.name,
        };
        return copy;
      });
    };
    reader.readAsDataURL(file);
  };

  // Handle Demo Video upload
  const handleVideoUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setItems((prev) => {
        const copy = [...prev];
        copy[index] = {
          ...copy[index],
          demoVideoUrl: reader.result as string,
        };
        return copy;
      });
    };
    reader.readAsDataURL(file);
  };

  // One-click publish all products
  const handlePublishAll = async () => {
    setNotice(null);

    // Validate that every product has at least a Chemical Name
    const emptyNames = items.filter((item) => !item.name.trim());
    if (emptyNames.length > 0) {
      setNotice({
        type: 'error',
        text: `Bitte geben Sie für alle ${items.length} Positionen mindestens den Chemikalien-Namen ein.`,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payloadProducts = items.map((item) => {
        const selectedGhsTags = Object.entries(item.ghsTags)
          .filter(([, val]) => val)
          .map(([tag]) => tag);

        const validThumbs = item.thumbnails.filter(
          (t) => Boolean(t && typeof t === 'string' && t.trim())
        );

        const fallbackImg =
          'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=600&q=80';

        const primaryThumb =
          validThumbs.length > 0
            ? validThumbs[item.primaryThumbnailIndex] || validThumbs[0]
            : fallbackImg;

        return {
          id: `DE-CHEM-${1000 + Math.floor(Math.random() * 9000)}`,
          name: item.name.trim(),
          formula: item.formula.trim(),
          casNumber: item.casNumber.trim() || 'N/A',
          category: item.category,
          purity: item.purity.trim(),
          grade: item.grade,
          physicalState: item.physicalState,
          price: item.price.startsWith('$') ? item.price : `$ ${item.price}`,
          unit: item.unit.trim(),
          stockUnits: Number(item.stockUnits) || 1,
          thumbnails: validThumbs.length > 0 ? validThumbs : [primaryThumb],
          primaryThumbnail: primaryThumb,
          thumbnail: primaryThumb,
          sdsDocumentUrl: item.sdsDocumentUrl,
          sdsDocumentName: item.sdsDocumentName,
          demoVideoUrl: item.demoVideoUrl,
          molarMass: item.molecularWeight.trim(),
          meltingPoint: item.meltingPoint.trim(),
          boilingPoint: item.boilingPoint.trim(),
          description:
            item.description.trim() ||
            `${item.name} (${item.casNumber || 'CAS N/A'}) in zertifizierter ${item.grade} Qualität.`,
          nfpaDiamond: {
            health: Number(item.nfpaHealth),
            flammability: Number(item.nfpaFlammability),
            instability: Number(item.nfpaInstability),
            special: item.nfpaSpecial,
          },
          ghsPictograms: selectedGhsTags,
          inStock: (Number(item.stockUnits) || 0) > 0,
        };
      });

      const res = await fetch('/api/admin/products/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ products: payloadProducts }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Fehler beim Veröffentlichen der Produkte.');
      }

      setNotice({
        type: 'success',
        text: `Erfolgreich veröffentlicht! ${data.publishedCount} Chemikalien wurden im System & in der Neon PostgreSQL-Datenbank hinterlegt.`,
      });

      if (data.savedProducts && onPublishedSuccess) {
        onPublishedSuccess(data.savedProducts);
      }

      // Reset to a clean single slot
      setItems([createEmptyItem(1)]);
      setExpandedIndex(0);
    } catch (err: any) {
      setNotice({
        type: 'error',
        text: err.message || 'Serverfehler beim Veröffentlichen der Produkte.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Clean Professional Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <FlaskConical className="w-4 h-4 text-emerald-400" />
            <span>Katalog-Management · Chemikalien-Stammdaten</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Bulk-Produkterfassung (Mehrere Chemikalien)
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Erfassen Sie beliebig viele Chemikalien-Positionen in einem Durchgang. Alle Spezifikationen 
            (Name, Summenformel, CAS-Nr., Reagenz-Kategorie, Qualitätsnorm, Aggregatzustand, Sicherheitsdaten und Mehrfach-Thumbnails) 
            sind fest pro Position verknüpft und werden mit einem Klick publiziert.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleAddNewSlot}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700/80 text-emerald-400 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/40 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Position hinzufügen</span>
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handlePublishAll}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-950/40 disabled:opacity-50 active:scale-[0.98]"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Wird gespeichert ({items.length})...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Alle {items.length} Produkte veröffentlichen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notice Message */}
      {notice && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-3 border shadow-sm transition-all ${
            notice.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
              : 'bg-rose-950/40 border-rose-800/80 text-rose-200'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span className="font-medium">{notice.text}</span>
        </div>
      )}

      {/* Position Navigator (Clean Tab Strip) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-medium text-slate-400 shrink-0 mr-1">
          Positionen:
        </span>
        {items.map((item, idx) => {
          const isCurrent = expandedIndex === idx;
          const isFilled = Boolean(item.name.trim());
          return (
            <button
              key={item.id}
              onClick={() => setExpandedIndex(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer shrink-0 border ${
                isCurrent
                  ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200 shadow-xs'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
              }`}
            >
              <span className="text-[11px] font-mono text-slate-400 font-bold">
                #{idx + 1}
              </span>
              <span className="truncate max-w-[140px]">
                {item.name.trim() || `Position ${idx + 1}`}
              </span>
              {isFilled && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
            </button>
          );
        })}

        <button
          onClick={handleAddNewSlot}
          className="p-1.5 text-slate-400 hover:text-emerald-400 bg-slate-900 border border-dashed border-slate-700 hover:border-emerald-500/60 rounded-lg text-xs transition-colors shrink-0"
          title="Neue Position anfügen"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Product Items List */}
      <div className="space-y-4">
        {items.map((item, index) => {
          const isExpanded = expandedIndex === index;
          const positionNumber = index + 1;

          return (
            <div
              key={item.id}
              className={`border rounded-2xl transition-all duration-200 overflow-hidden ${
                isExpanded
                  ? 'bg-slate-950 border-slate-700 shadow-lg'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Header Bar */}
              <div
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
                className="p-4 sm:px-6 flex items-center justify-between gap-3 cursor-pointer select-none bg-slate-900/60 hover:bg-slate-900 transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-slate-700">
                    {positionNumber}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white text-sm sm:text-base truncate">
                        {item.name.trim() || `Chemikalien-Position ${positionNumber}`}
                      </h3>
                      {item.formula && (
                        <span className="font-mono text-xs text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                          {item.formula}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 font-normal">
                      <span>CAS: {item.casNumber || '–'}</span>
                      <span>·</span>
                      <span>{item.category}</span>
                      <span>·</span>
                      <span>{item.grade}</span>
                      <span>·</span>
                      <span>{item.physicalState}</span>
                      <span>·</span>
                      <span className="text-emerald-400 font-mono font-medium">${item.price}</span>
                    </div>
                  </div>
                </div>

                {/* Right Controls */}
                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => handleDuplicateSlot(index)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Diese Position duplizieren"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveSlot(index)}
                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                    title="Diese Position löschen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setExpandedIndex(isExpanded ? null : index)}
                    className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Form Body */}
              {isExpanded && (
                <div className="p-5 sm:p-6 space-y-6 border-t border-slate-800">
                  {/* SECTION 1: Chemical Identification & Purity */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>1. Primäre Identifikation & Reinheit</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Chemical Name */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                          Chemikalien-Name <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={item.name}
                          onChange={(e) => updateItemField(index, 'name', e.target.value)}
                          placeholder="z.B. Ethanol absolut ≥ 99.8%"
                          className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white placeholder-slate-500 transition-colors focus:outline-hidden"
                        />
                      </div>

                      {/* Formula */}
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                          Summenformel
                        </label>
                        <input
                          type="text"
                          value={item.formula}
                          onChange={(e) => updateItemField(index, 'formula', e.target.value)}
                          placeholder="z.B. C₂H₅OH"
                          className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white font-mono placeholder-slate-500 transition-colors focus:outline-hidden"
                        />
                      </div>

                      {/* CAS Registry ID */}
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                          CAS Registry ID No.
                        </label>
                        <input
                          type="text"
                          value={item.casNumber}
                          onChange={(e) => updateItemField(index, 'casNumber', e.target.value)}
                          placeholder="z.B. 64-17-5"
                          className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white font-mono placeholder-slate-500 transition-colors focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: Category, Quality Grade & Physical State */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <FlaskConical className="w-3.5 h-3.5 text-emerald-400" />
                      <span>2. Spezifikation & Klassifizierung</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Reagent Category */}
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                          Reagenz-Kategorie
                        </label>
                        <select
                          value={item.category}
                          onChange={(e) => updateItemField(index, 'category', e.target.value as ReagentCategoryType)}
                          className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white transition-colors focus:outline-hidden cursor-pointer"
                        >
                          {REAGENT_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Substance Purity */}
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                          Reinheitsgrad
                        </label>
                        <input
                          type="text"
                          value={item.purity}
                          onChange={(e) => updateItemField(index, 'purity', e.target.value)}
                          placeholder="z.B. ≥ 99.8% (GC)"
                          className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white placeholder-slate-500 transition-colors focus:outline-hidden"
                        />
                      </div>

                      {/* Market Grade */}
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                          Qualitätsnorm (Market Grade)
                        </label>
                        <select
                          value={item.grade}
                          onChange={(e) => updateItemField(index, 'grade', e.target.value as MarketGradeType)}
                          className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white transition-colors focus:outline-hidden cursor-pointer"
                        >
                          {MARKET_GRADES.map((grd) => (
                            <option key={grd} value={grd}>
                              {grd}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Physical State */}
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                          Aggregatzustand
                        </label>
                        <select
                          value={item.physicalState}
                          onChange={(e) => updateItemField(index, 'physicalState', e.target.value as PhysicalStateType)}
                          className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white transition-colors focus:outline-hidden cursor-pointer"
                        >
                          {PHYSICAL_STATES.map((state) => (
                            <option key={state} value={state}>
                              {state}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: Pricing, Packaging & Stock Units */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <PackageCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>3. Kommerzielle Angaben & Lagerbestand</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Sales Price (USD $) */}
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                          Verkaufspreis (USD $)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-2 text-xs font-mono text-emerald-400 font-bold">$</span>
                          <input
                            type="text"
                            value={item.price}
                            onChange={(e) => updateItemField(index, 'price', e.target.value)}
                            placeholder="28.50"
                            className="w-full pl-8 pr-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white font-mono placeholder-slate-500 transition-colors focus:outline-hidden"
                          />
                        </div>
                      </div>

                      {/* Packaging Unit */}
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                          Gebindegröße & Verpackung
                        </label>
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => updateItemField(index, 'unit', e.target.value)}
                          placeholder="z.B. 1.000 ml Glasflasche DIN GL45"
                          className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white placeholder-slate-500 transition-colors focus:outline-hidden"
                        />
                      </div>

                      {/* Stock Units */}
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                          Verfügbare Lagereinheiten
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={item.stockUnits}
                          onChange={(e) => updateItemField(index, 'stockUnits', parseInt(e.target.value, 10) || 0)}
                          placeholder="50"
                          className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white font-mono placeholder-slate-500 transition-colors focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 4: Molecular & Physical Constants */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <span>4. Physikalische & Chemische Konstanten</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                          Molekulargewicht (Molar Mass)
                        </label>
                        <input
                          type="text"
                          value={item.molecularWeight}
                          onChange={(e) => updateItemField(index, 'molecularWeight', e.target.value)}
                          placeholder="z.B. 46.07 g/mol"
                          className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white font-mono placeholder-slate-500 transition-colors focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                          Schmelzpunkt (°C)
                        </label>
                        <input
                          type="text"
                          value={item.meltingPoint}
                          onChange={(e) => updateItemField(index, 'meltingPoint', e.target.value)}
                          placeholder="z.B. -114.1 °C"
                          className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white font-mono placeholder-slate-500 transition-colors focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                          Siedepunkt (°C)
                        </label>
                        <input
                          type="text"
                          value={item.boilingPoint}
                          onChange={(e) => updateItemField(index, 'boilingPoint', e.target.value)}
                          placeholder="z.B. 78.37 °C"
                          className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white font-mono placeholder-slate-500 transition-colors focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 5: Description */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      Spezifikation & Produktbeschreibung
                    </label>
                    <textarea
                      rows={2}
                      value={item.description}
                      onChange={(e) => updateItemField(index, 'description', e.target.value)}
                      placeholder="Detaillierte Beschreibung der Chemikalie, Reinheitsnachweis, Syntheseanwendungen, Qualitätsgarantien..."
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white placeholder-slate-500 transition-colors focus:outline-hidden"
                    />
                  </div>

                  {/* SECTION 6: Multi-Thumbnail Upload */}
                  <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-emerald-400" />
                        <h5 className="text-xs font-semibold text-white">
                          Produkt-Thumbnails (Mehrfachauswahl)
                        </h5>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {item.thumbnails.length} Bilder hinterlegt · Stern anklicken für Hauptbild
                      </span>
                    </div>

                    {/* Thumbnail Grid */}
                    <div className="flex flex-wrap items-center gap-3">
                      {item.thumbnails
                        .filter((thumbUrl) => Boolean(thumbUrl && typeof thumbUrl === 'string' && thumbUrl.trim()))
                        .map((thumbUrl, tIdx) => {
                          const isPrimary = item.primaryThumbnailIndex === tIdx;
                          return (
                            <div
                              key={tIdx}
                              onClick={() => updateItemField(index, 'primaryThumbnailIndex', tIdx)}
                              className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                                isPrimary
                                  ? 'border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                                  : 'border-slate-800 hover:border-slate-600'
                              }`}
                            >
                              <img
                                src={thumbUrl}
                                alt={`Vorschau ${tIdx}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                              {isPrimary && (
                                <div
                                  className="absolute top-1 left-1 bg-emerald-600 text-white p-1 rounded-md shadow-xs"
                                  title="Primäres Produktbild"
                                >
                                  <Star className="w-3 h-3 fill-white" />
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const filtered = item.thumbnails.filter((_, i) => i !== tIdx);
                                  updateItemField(index, 'thumbnails', filtered);
                                  if (item.primaryThumbnailIndex >= filtered.length) {
                                    updateItemField(index, 'primaryThumbnailIndex', 0);
                                  }
                                }}
                                className="absolute top-1 right-1 bg-slate-950/80 hover:bg-rose-900 text-white p-1 rounded-md transition-colors"
                                title="Bild entfernen"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}

                      {/* Upload Button */}
                      <label className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-900/80 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors text-slate-400 hover:text-emerald-400">
                        <Upload className="w-4 h-4" />
                        <span className="text-[10px] font-medium">Upload</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => handleThumbnailUpload(index, e)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* SECTION 7: SDS PDF & Demonstration Video */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* SDS Document */}
                    <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-white">
                        <FileText className="w-4 h-4 text-emerald-400" />
                        <span>Sicherheitsdatenblatt (SDS / REACH PDF)</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Laden Sie das offizielle REACH / GHS Sicherheitsdatenblatt als PDF hoch.
                      </p>
                      <div className="flex items-center gap-3 pt-1">
                        <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer inline-flex items-center gap-2">
                          <Upload className="w-3.5 h-3.5 text-emerald-400" />
                          <span>PDF auswählen</span>
                          <input
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={(e) => handleSdsUpload(index, e)}
                            className="hidden"
                          />
                        </label>
                        {item.sdsDocumentName && (
                          <span className="text-xs font-mono text-emerald-400 truncate max-w-[200px] flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>{item.sdsDocumentName}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Demonstration Video */}
                    <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-white">
                        <Video className="w-4 h-4 text-emerald-400" />
                        <span>Demonstrations-Video</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Laden Sie ein Produktvideo (MP4/WebM) hoch oder hinterlegen Sie eine Video-URL.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0">
                          <Upload className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Video-Datei</span>
                          <input
                            type="file"
                            accept="video/*"
                            onChange={(e) => handleVideoUpload(index, e)}
                            className="hidden"
                          />
                        </label>
                        <input
                          type="url"
                          value={item.demoVideoUrl?.startsWith('data:') ? 'Video-Datei hochgeladen' : item.demoVideoUrl}
                          onChange={(e) => updateItemField(index, 'demoVideoUrl', e.target.value)}
                          placeholder="Oder Video-URL einfügen"
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 8: NFPA 704 Safety Diamond Parameters */}
                  <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-amber-400" />
                        <h5 className="text-xs font-semibold text-white">
                          NFPA 704 Sicherheitsdiamant (0-4)
                        </h5>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Standardisierte Gefahreneinstufung nach Brandschutz- und Chemikaliensicherheit
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      {/* Health (Blue) */}
                      <div className="p-3 bg-blue-950/20 border border-blue-900/40 rounded-xl space-y-1.5">
                        <label className="block text-[11px] font-semibold text-blue-300">
                          Gesundheit (Blau 0-4)
                        </label>
                        <select
                          value={item.nfpaHealth}
                          onChange={(e) => updateItemField(index, 'nfpaHealth', parseInt(e.target.value, 10))}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-blue-900/50 rounded-lg text-white font-mono text-xs focus:outline-hidden cursor-pointer"
                        >
                          <option value="0">0 - Normales Material</option>
                          <option value="1">1 - Geringe Gefahr</option>
                          <option value="2">2 - Mäßige Gefahr</option>
                          <option value="3">3 - Schwere Gefahr</option>
                          <option value="4">4 - Tödliche Gefahr</option>
                        </select>
                      </div>

                      {/* Flammability (Red) */}
                      <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-xl space-y-1.5">
                        <label className="block text-[11px] font-semibold text-rose-300">
                          Entflammbarkeit (Rot 0-4)
                        </label>
                        <select
                          value={item.nfpaFlammability}
                          onChange={(e) => updateItemField(index, 'nfpaFlammability', parseInt(e.target.value, 10))}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-rose-900/50 rounded-lg text-white font-mono text-xs focus:outline-hidden cursor-pointer"
                        >
                          <option value="0">0 - Nicht brennbar</option>
                          <option value="1">1 - Flammpunkt &gt; 93 °C</option>
                          <option value="2">2 - Flammpunkt &lt; 93 °C</option>
                          <option value="3">3 - Flammpunkt &lt; 38 °C</option>
                          <option value="4">4 - Extrem flüchtig / &lt; 23 °C</option>
                        </select>
                      </div>

                      {/* Instability (Yellow) */}
                      <div className="p-3 bg-amber-950/20 border border-amber-900/40 rounded-xl space-y-1.5">
                        <label className="block text-[11px] font-semibold text-amber-300">
                          Reaktivität (Gelb 0-4)
                        </label>
                        <select
                          value={item.nfpaInstability}
                          onChange={(e) => updateItemField(index, 'nfpaInstability', parseInt(e.target.value, 10))}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-amber-900/50 rounded-lg text-white font-mono text-xs focus:outline-hidden cursor-pointer"
                        >
                          <option value="0">0 - Stabil</option>
                          <option value="1">1 - Instabil bei Erwärmung</option>
                          <option value="2">2 - Heftige Reaktion</option>
                          <option value="3">3 - Explosionsfähig bei Stoß</option>
                          <option value="4">4 - Kann detonieren</option>
                        </select>
                      </div>

                      {/* Special Codes (White) */}
                      <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1.5">
                        <label className="block text-[11px] font-semibold text-slate-300">
                          Sondergefahr (Weiß)
                        </label>
                        <select
                          value={item.nfpaSpecial}
                          onChange={(e) => updateItemField(index, 'nfpaSpecial', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono text-xs focus:outline-hidden cursor-pointer"
                        >
                          <option value="">Keine Angabe</option>
                          <option value="OX">OX (Oxidationsmittel)</option>
                          <option value="W">W̶ (Reagiert mit Wasser)</option>
                          <option value="SA">SA (Erstickungsgas)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 9: GHS Pictogram classification tags */}
                  <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-emerald-400" />
                        <h5 className="text-xs font-semibold text-white">
                          GHS Piktogramm-Einstufung
                        </h5>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Zutreffende Gefahrensymbole per Klick aktivieren
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                      {[
                        { key: 'toxic', label: 'Giftig (Toxic)', color: 'text-rose-300 border-rose-800/80 bg-rose-950/40' },
                        { key: 'corrosive', label: 'Ätzend (Corrosive)', color: 'text-amber-300 border-amber-800/80 bg-amber-950/40' },
                        { key: 'flammable', label: 'Entzündbar (Flammable)', color: 'text-orange-300 border-orange-800/80 bg-orange-950/40' },
                        { key: 'environment', label: 'Umweltgefährlich', color: 'text-teal-300 border-teal-800/80 bg-teal-950/40' },
                        { key: 'irritant', label: 'Reizend (Irritant)', color: 'text-yellow-300 border-yellow-800/80 bg-yellow-950/40' },
                        { key: 'safe', label: 'Unbedenklich (Safe)', color: 'text-emerald-300 border-emerald-800/80 bg-emerald-950/40' },
                      ].map(({ key, label, color }) => {
                        const isActive = item.ghsTags[key as keyof typeof item.ghsTags];
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              const updated = {
                                ...item.ghsTags,
                                [key]: !isActive,
                              };
                              updateItemField(index, 'ghsTags', updated);
                            }}
                            className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-between gap-1 transition-all cursor-pointer ${
                              isActive
                                ? `${color} shadow-xs font-semibold`
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <span>{label}</span>
                            <span
                              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                isActive ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-500'
                              }`}
                            >
                              {isActive ? '✓' : ''}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleRemoveSlot(index)}
                      className="px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg border border-rose-900/30 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Position entfernen</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAddNewSlot}
                      className="px-4 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 rounded-lg border border-slate-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nächste Chemikalie anlegen</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Bottom Publishing Bar */}
      <div className="sticky bottom-4 z-30 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 text-emerald-400 flex items-center justify-center font-mono font-bold text-xs border border-slate-700">
            {items.length}
          </div>
          <div>
            <div className="text-xs font-semibold text-white">
              {items.length} {items.length === 1 ? 'Chemikalie' : 'Chemikalien'} erfasst
            </div>
            <div className="text-[11px] text-slate-400">
              Alle Felder & Bindungen aktiv · Direkte Speicherung in Neon PostgreSQL
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleAddNewSlot}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium inline-flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Weitere Chemikalie</span>
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handlePublishAll}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-950/40 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Wird gespeichert...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Alle {items.length} Produkte veröffentlichen</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
