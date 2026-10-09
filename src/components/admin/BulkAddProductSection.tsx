import React, { useState, useRef } from 'react';
import {
  Plus,
  Trash2,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileText,
  Video,
  Image as ImageIcon,
  Sparkles,
  Layers,
  Star,
  Copy,
  ChevronDown,
  ChevronUp,
  Flame,
  ShieldAlert,
  Save,
  HelpCircle
} from 'lucide-react';
import { ChemicalProduct } from '../../types/chemical';

export interface BulkChemicalItem {
  id: string; // client temporary or generated id
  name: string;
  formula: string;
  casNumber: string;
  category: 'Solvents' | 'Acids & Bases' | 'Salts & Reagents' | 'Organic Compounds' | 'Buffering & Pure Reagents';
  purity: string;
  grade: 'p.a. (pro analysi)' | 'Ph. Eur. / DAB' | 'ACS Reagent' | 'Reinst (Pure)';
  physicalState: 'Flüssig (Liquid)' | 'Feststoff / Pulver (Solid/Powder)' | 'Kristallin (Crystalline)' | 'Gasförmig (Gas)';
  price: string;
  unit: string;
  stockUnits: number;
  thumbnails: string[];
  primaryThumbnailIndex: number;
  sdsDocumentUrl: string;
  sdsDocumentName: string;
  demoVideoUrl: string;
  molecularWeight: string; // e.g. "46.07 g/mol"
  meltingPoint: string;    // e.g. "-114 °C"
  boilingPoint: string;    // e.g. "78.37 °C"
  description: string;
  // NFPA 704 Safety Diamond Parameters (0-4)
  nfpaHealth: number; // Blue (0-4)
  nfpaFlammability: number; // Red (0-4)
  nfpaInstability: number; // Yellow (0-4)
  nfpaSpecial: string; // White (e.g. OX, W-line, SA, none)
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

const DEFAULT_CATEGORY = 'Solvents';
const DEFAULT_GRADE = 'p.a. (pro analysi)';
const DEFAULT_STATE = 'Flüssig (Liquid)';

function createEmptyItem(index: number): BulkChemicalItem {
  return {
    id: `temp_${Date.now()}_${index}`,
    name: '',
    formula: '',
    casNumber: '',
    category: DEFAULT_CATEGORY,
    purity: '≥ 99.8%',
    grade: DEFAULT_GRADE,
    physicalState: DEFAULT_STATE,
    price: '28.50',
    unit: '1.000 ml',
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
  // Array of chemical items that dynamically expand and bind together
  const [items, setItems] = useState<BulkChemicalItem[]>([
    createEmptyItem(1),
  ]);

  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Field reference updater for specific slot
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

  // Add another product slot bound to index + 1
  const handleAddNewSlot = () => {
    setItems((prev) => [...prev, createEmptyItem(prev.length + 1)]);
    setExpandedIndex(items.length); // open newly created slot
  };

  // Duplicate an existing slot's configuration
  const handleDuplicateSlot = (index: number) => {
    const source = items[index];
    const duplicated: BulkChemicalItem = {
      ...source,
      id: `temp_${Date.now()}_${items.length + 1}`,
      name: source.name ? `${source.name} (Kopie)` : '',
    };
    setItems((prev) => [...prev, duplicated]);
    setExpandedIndex(items.length);
  };

  // Remove product slot
  const handleRemoveSlot = (index: number) => {
    if (items.length === 1) {
      if (confirm('Möchten Sie das einzige Produkt leeren?')) {
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

  // Handle multi-thumbnail file upload for specific item
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

  // Handle SDS document file upload
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

  // Handle Demo Video file upload
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

  // One-click publish all bulk products
  const handlePublishAll = async () => {
    setNotice(null);

    // Basic client validation
    const invalidNames = items.filter((item) => !item.name.trim());
    if (invalidNames.length > 0) {
      setNotice({
        type: 'error',
        text: `Bitte tragen Sie bei allen ${items.length} Chemikalien mindestens den Chemikalien-Namen ein.`,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Map to server payload
      const payloadProducts = items.map((item, idx) => {
        const selectedGhsTags = Object.entries(item.ghsTags)
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .filter(([_, val]) => val)
          .map(([tag]) => tag);

        const primaryThumb =
          item.thumbnails.length > 0
            ? item.thumbnails[item.primaryThumbnailIndex] || item.thumbnails[0]
            : 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=600&q=80';

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
          thumbnails: item.thumbnails.length > 0 ? item.thumbnails : [primaryThumb],
          primaryThumbnail: primaryThumb,
          thumbnail: primaryThumb,
          sdsDocumentUrl: item.sdsDocumentUrl,
          sdsDocumentName: item.sdsDocumentName,
          demoVideoUrl: item.demoVideoUrl,
          molarMass: item.molecularWeight.trim(),
          meltingPoint: item.meltingPoint.trim(),
          boilingPoint: item.boilingPoint.trim(),
          description: item.description.trim() || `${item.name} (${item.casNumber}) in Reagenzqualität für Industrie- und Laborbedarf.`,
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
        text: `Erfolg! ${data.publishedCount} Chemikalien wurden erfolgreich im System & Neon DB veröffentlicht!`,
      });

      if (data.savedProducts && onPublishedSuccess) {
        onPublishedSuccess(data.savedProducts);
      }

      // Reset slots to single empty slot after successful publishing
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
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Banner / Section Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs uppercase tracking-wider">
            <Layers className="w-4 h-4" />
            <span>Bulk Chemical Product Upload · System synchronisiert</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
            Mehrere Chemikalien gleichzeitig erfassen
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Fügen Sie beliebig viele Chemikalien-Positionen hinzu. Alle Felder (Name, CAS-Nr., Formel, Reinheit, 
            NFPA 704 Sicherheitsdiamant, GHS-Piktogramme, SDS-Dokumente & Mehrfach-Thumbnails) sind pro Chemikalie fest verknüpft und werden mit einem Klick veröffentlicht.
          </p>
        </div>

        {/* Global Controls & Add Option Button */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleAddNewSlot}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/60 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>+ Weitere Chemikalie #{items.length + 1} hinzufügen</span>
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handlePublishAll}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/40 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Veröffentliche {items.length} Produkte...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Alle {items.length} Produkte mit 1 Klick veröffentlichen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-3 border shadow-sm ${
            notice.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/60 border-rose-800 text-rose-300'
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

      {/* Slot Summary Tabs / Quick Pill Navigator */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        <span className="text-[11px] font-mono text-slate-500 uppercase shrink-0">
          Positionen ({items.length}):
        </span>
        {items.map((item, idx) => {
          const isCurrent = expandedIndex === idx;
          const isFilled = Boolean(item.name.trim());
          return (
            <button
              key={item.id}
              onClick={() => setExpandedIndex(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 transition-all cursor-pointer shrink-0 border ${
                isCurrent
                  ? 'bg-emerald-950 border-emerald-500 text-emerald-300 shadow-xs'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] flex items-center justify-center font-bold text-slate-300">
                {idx + 1}
              </span>
              <span className="truncate max-w-[130px]">
                {item.name.trim() || `Chemikalie #${idx + 1}`}
              </span>
              {isFilled && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
            </button>
          );
        })}

        <button
          onClick={handleAddNewSlot}
          className="p-1.5 text-slate-400 hover:text-emerald-400 bg-slate-900 border border-dashed border-slate-700 hover:border-emerald-500/50 rounded-lg text-xs transition-colors shrink-0"
          title="Neue Chemikalie anfügen"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Loop Through Product Slots */}
      <div className="space-y-4">
        {items.map((item, index) => {
          const isExpanded = expandedIndex === index;
          const itemNum = index + 1;

          return (
            <div
              key={item.id}
              className={`border rounded-2xl transition-all duration-200 overflow-hidden ${
                isExpanded
                  ? 'bg-slate-950 border-emerald-700/60 shadow-xl'
                  : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700'
              }`}
            >
              {/* Slot Header Bar (Collapsible with Quick Info) */}
              <div
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
                className="p-4 sm:px-6 flex items-center justify-between gap-3 cursor-pointer select-none bg-slate-900/60 hover:bg-slate-900/90 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    #{itemNum}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-sm sm:text-base truncate">
                        {item.name.trim() || `Chemikalien-Position #${itemNum}`}
                      </h3>
                      {item.formula && (
                        <span className="font-mono text-xs text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                          {item.formula}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                      <span>CAS: {item.casNumber || '–'}</span>
                      <span>·</span>
                      <span>{item.category}</span>
                      <span>·</span>
                      <span>{item.grade}</span>
                      <span>·</span>
                      <span className="text-emerald-400 font-bold">${item.price}</span>
                    </div>
                  </div>
                </div>

                {/* Right controls inside slot header */}
                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => handleDuplicateSlot(index)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Als Vorlage duplizieren"
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

              {/* Slot Detailed Form Fields (Visible when expanded) */}
              {isExpanded && (
                <div className="p-5 sm:p-6 space-y-6 border-t border-slate-800">
                  
                  {/* GROUP 1: Primary Chemical Identification */}
                  <div>
                    <h4 className="text-xs font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-3">
                      <span>1. Primäre Identifikation & Reagenz-Parameter (#{itemNum})</span>
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Chemical Name */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Chemikalien-Name #{itemNum} <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={item.name}
                          onChange={(e) => updateItemField(index, 'name', e.target.value)}
                          placeholder="z.B. Ethanol absolut >= 99.8%"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:border-emerald-500 focus:outline-hidden"
                        />
                      </div>

                      {/* Chemical Formula */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Summenformel #{itemNum}
                        </label>
                        <input
                          type="text"
                          value={item.formula}
                          onChange={(e) => updateItemField(index, 'formula', e.target.value)}
                          placeholder="z.B. C₂H₅OH"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:border-emerald-500 focus:outline-hidden"
                        />
                      </div>

                      {/* CAS Registry ID */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          CAS Registry ID No. #{itemNum}
                        </label>
                        <input
                          type="text"
                          value={item.casNumber}
                          onChange={(e) => updateItemField(index, 'casNumber', e.target.value)}
                          placeholder="z.B. 64-17-5"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:border-emerald-500 focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* GROUP 2: Grade, Category, Purity & Physical State */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Reagent Category */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Reagenz-Kategorie #{itemNum}
                      </label>
                      <select
                        value={item.category}
                        onChange={(e) => updateItemField(index, 'category', e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:border-emerald-500 focus:outline-hidden"
                      >
                        <option value="Solvents">Solvents (Lösungsmittel)</option>
                        <option value="Acids & Bases">Acids & Bases (Säuren & Laugen)</option>
                        <option value="Salts & Reagents">Salts & Reagents (Salze & Reagenzien)</option>
                        <option value="Organic Compounds">Organic Compounds (Organische Verbindungen)</option>
                        <option value="Buffering & Pure Reagents">Buffering & Pure Reagents</option>
                      </select>
                    </div>

                    {/* Substance Purity */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Reinheit #{itemNum}
                      </label>
                      <input
                        type="text"
                        value={item.purity}
                        onChange={(e) => updateItemField(index, 'purity', e.target.value)}
                        placeholder="z.B. ≥ 99.8% (GC)"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:border-emerald-500 focus:outline-hidden"
                      />
                    </div>

                    {/* Market Grade */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Qualitätsnorm (Grade) #{itemNum}
                      </label>
                      <select
                        value={item.grade}
                        onChange={(e) => updateItemField(index, 'grade', e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:border-emerald-500 focus:outline-hidden"
                      >
                        <option value="p.a. (pro analysi)">p.a. (pro analysi)</option>
                        <option value="Ph. Eur. / DAB">Ph. Eur. / DAB (Pharmakopöe)</option>
                        <option value="ACS Reagent">ACS Reagent (American Chemical Society)</option>
                        <option value="Reinst (Pure)">Reinst (Pure)</option>
                      </select>
                    </div>

                    {/* Physical State */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Aggregatzustand #{itemNum}
                      </label>
                      <select
                        value={item.physicalState}
                        onChange={(e) => updateItemField(index, 'physicalState', e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:border-emerald-500 focus:outline-hidden"
                      >
                        <option value="Flüssig (Liquid)">Flüssig (Liquid)</option>
                        <option value="Feststoff / Pulver (Solid/Powder)">Feststoff / Pulver (Solid/Powder)</option>
                        <option value="Kristallin (Crystalline)">Kristallin (Crystalline)</option>
                        <option value="Gasförmig (Gas)">Gasförmig (Gas)</option>
                      </select>
                    </div>
                  </div>

                  {/* GROUP 3: Commercial & Logistics (Price, Packaging, Stock) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Sales Price (USD $) */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Verkaufspreis (USD $) #{itemNum}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-xs font-mono text-emerald-400 font-bold">$</span>
                        <input
                          type="text"
                          value={item.price}
                          onChange={(e) => updateItemField(index, 'price', e.target.value)}
                          placeholder="28.50"
                          className="w-full pl-7 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:border-emerald-500 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    {/* Unit Size Packaging */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Gebindegröße & Verpackung #{itemNum}
                      </label>
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => updateItemField(index, 'unit', e.target.value)}
                        placeholder="z.B. 1.000 ml Glasflasche DIN GL45"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:border-emerald-500 focus:outline-hidden"
                      />
                    </div>

                    {/* Available Stock Units */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Verfügbare Lagereinheiten #{itemNum}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={item.stockUnits}
                        onChange={(e) => updateItemField(index, 'stockUnits', parseInt(e.target.value, 10) || 0)}
                        placeholder="50"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:border-emerald-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* GROUP 4: Molecular & Physical Constants */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Molekulargewicht (Molar Mass) #{itemNum}
                      </label>
                      <input
                        type="text"
                        value={item.molecularWeight}
                        onChange={(e) => updateItemField(index, 'molecularWeight', e.target.value)}
                        placeholder="z.B. 46.07 g/mol"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:border-emerald-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Schmelzpunkt (Melting Point °C) #{itemNum}
                      </label>
                      <input
                        type="text"
                        value={item.meltingPoint}
                        onChange={(e) => updateItemField(index, 'meltingPoint', e.target.value)}
                        placeholder="z.B. -114.1 °C"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:border-emerald-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Siedepunkt (Boiling Point °C) #{itemNum}
                      </label>
                      <input
                        type="text"
                        value={item.boilingPoint}
                        onChange={(e) => updateItemField(index, 'boilingPoint', e.target.value)}
                        placeholder="z.B. 78.37 °C"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:border-emerald-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Product Description */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Registry Beschreibung / Produktdetails #{itemNum}
                    </label>
                    <textarea
                      rows={2}
                      value={item.description}
                      onChange={(e) => updateItemField(index, 'description', e.target.value)}
                      placeholder="Detaillierte Beschreibung der Chemikalie, Syntheseanwendungen, Qualitätsgarantien und Zertifikate..."
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:border-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  {/* GROUP 5: Multi-Thumbnail Upload & Primary Selection */}
                  <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-emerald-400" />
                        <h5 className="text-xs font-bold text-white">
                          Mehrere Produkt-Thumbnails #{itemNum}
                        </h5>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {item.thumbnails.length} Bilder hochgeladen · Klicken für Primärbild
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
                            className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                              isPrimary
                                ? 'border-emerald-500 shadow-lg shadow-emerald-950 ring-2 ring-emerald-500/30'
                                : 'border-slate-800 hover:border-slate-600'
                            }`}
                          >
                            <img
                              src={thumbUrl}
                              alt={`Thumb ${tIdx}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            {isPrimary && (
                              <div className="absolute top-1 left-1 bg-emerald-600 text-white p-0.5 rounded shadow-xs" title="Primäres Thumbnail">
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
                              className="absolute top-1 right-1 bg-slate-950/80 hover:bg-rose-900 text-white p-0.5 rounded transition-colors"
                              title="Entfernen"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}

                      {/* Upload Button */}
                      <label className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-950 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors text-slate-400 hover:text-emerald-400">
                        <Upload className="w-4 h-4" />
                        <span className="text-[9px] font-mono">Upload</span>
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

                  {/* GROUP 6: Documents & Demonstration Video */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* SDS Document PDF */}
                    <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-white">
                        <FileText className="w-4 h-4 text-emerald-400" />
                        <span>Sicherheitsdatenblatt (SDS PDF) #{itemNum}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Laden Sie das offizielle REACH / GHS Sicherheitsdatenblatt als PDF hoch.
                      </p>
                      <div className="flex items-center gap-3">
                        <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs border border-slate-700 transition-colors cursor-pointer inline-flex items-center gap-2">
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
                          <span className="text-xs font-mono text-emerald-400 truncate max-w-[200px]">
                            ✓ {item.sdsDocumentName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Demonstration Video */}
                    <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-white">
                        <Video className="w-4 h-4 text-emerald-400" />
                        <span>Demonstrations-Video #{itemNum}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Laden Sie ein Laborvideo (MP4/WebM) hoch oder verlinken Sie ein Video.
                      </p>
                      <div className="flex items-center gap-3">
                        <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs border border-slate-700 transition-colors cursor-pointer inline-flex items-center gap-2 shrink-0">
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
                          value={item.demoVideoUrl?.startsWith('data:') ? 'Video hochgeladen' : item.demoVideoUrl}
                          onChange={(e) => updateItemField(index, 'demoVideoUrl', e.target.value)}
                          placeholder="Oder Video-URL (z.B. Cloudflare R2 / S3)"
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:border-emerald-500 focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* GROUP 7: NFPA 704 Safety Diamond Parameters (0-4) */}
                  <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-amber-400" />
                        <h5 className="text-xs font-bold text-white">
                          NFPA 704 Safety Diamond Parameters (0-4) #{itemNum}
                        </h5>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        Standardisierter Gefahrendiamant nach US- & Int. Sicherheitsnorm
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      {/* Health (Blue) */}
                      <div className="p-3 bg-blue-950/40 border border-blue-800/60 rounded-xl space-y-1.5">
                        <label className="block text-[11px] font-bold text-blue-300">
                          Gesundheit (Health - Blau 0-4)
                        </label>
                        <select
                          value={item.nfpaHealth}
                          onChange={(e) => updateItemField(index, 'nfpaHealth', parseInt(e.target.value, 10))}
                          className="w-full px-2 py-1.5 bg-slate-900 border border-blue-700/60 rounded-lg text-white font-mono text-xs focus:outline-hidden"
                        >
                          <option value="0">0 - Normales Material</option>
                          <option value="1">1 - Geringe Gefahr</option>
                          <option value="2">2 - Mäßige Gefahr</option>
                          <option value="3">3 - Schwere Gefahr</option>
                          <option value="4">4 - Tödliche Gefahr</option>
                        </select>
                      </div>

                      {/* Flammability (Red) */}
                      <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl space-y-1.5">
                        <label className="block text-[11px] font-bold text-rose-300">
                          Entflammbarkeit (Red 0-4)
                        </label>
                        <select
                          value={item.nfpaFlammability}
                          onChange={(e) => updateItemField(index, 'nfpaFlammability', parseInt(e.target.value, 10))}
                          className="w-full px-2 py-1.5 bg-slate-900 border border-rose-700/60 rounded-lg text-white font-mono text-xs focus:outline-hidden"
                        >
                          <option value="0">0 - Brennt nicht</option>
                          <option value="1">1 - Über 93 °C entflammbar</option>
                          <option value="2">2 - Unter 93 °C entflammbar</option>
                          <option value="3">3 - Unter 38 °C entflammbar</option>
                          <option value="4">4 - Extrem flüchtig / unter 23 °C</option>
                        </select>
                      </div>

                      {/* Instability (Yellow) */}
                      <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl space-y-1.5">
                        <label className="block text-[11px] font-bold text-amber-300">
                          Reaktionsfähigkeit (Gelb 0-4)
                        </label>
                        <select
                          value={item.nfpaInstability}
                          onChange={(e) => updateItemField(index, 'nfpaInstability', parseInt(e.target.value, 10))}
                          className="w-full px-2 py-1.5 bg-slate-900 border border-amber-700/60 rounded-lg text-white font-mono text-xs focus:outline-hidden"
                        >
                          <option value="0">0 - Normal stabil</option>
                          <option value="1">1 - Instabil bei Erhitzung</option>
                          <option value="2">2 - Heftige chemische Reaktion</option>
                          <option value="3">3 - Explosionsfähig bei Stoß</option>
                          <option value="4">4 - Kann detonieren</option>
                        </select>
                      </div>

                      {/* Special Codes (White) */}
                      <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-300">
                          Sondergefahr (Special Weiß)
                        </label>
                        <select
                          value={item.nfpaSpecial}
                          onChange={(e) => updateItemField(index, 'nfpaSpecial', e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-hidden"
                        >
                          <option value="">Keine Sondergefahr</option>
                          <option value="OX">OX (Oxidierend)</option>
                          <option value="W">W̶ (Reagiert mit Wasser)</option>
                          <option value="SA">SA (Einfaches Erstickungsgas)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* GROUP 8: GHS Pictogram classification tags */}
                  <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-emerald-400" />
                        <h5 className="text-xs font-bold text-white">
                          GHS Piktogramm-Klassifizierung #{itemNum}
                        </h5>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        Klicken Sie die zutreffenden Gefahrensymbole an
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                      {[
                        { key: 'toxic', label: 'Toxic (Giftig)', color: 'text-rose-400 border-rose-800 bg-rose-950/40' },
                        { key: 'corrosive', label: 'Corrosive (Ätzend)', color: 'text-amber-400 border-amber-800 bg-amber-950/40' },
                        { key: 'flammable', label: 'Flammable (Entzündbar)', color: 'text-orange-400 border-orange-800 bg-orange-950/40' },
                        { key: 'environment', label: 'Environment (Umwelt)', color: 'text-teal-400 border-teal-800 bg-teal-950/40' },
                        { key: 'irritant', label: 'Irritant (Reizend)', color: 'text-yellow-400 border-yellow-800 bg-yellow-950/40' },
                        { key: 'safe', label: 'Safe / Unbedenklich', color: 'text-emerald-400 border-emerald-800 bg-emerald-950/40' },
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
                                ? `${color} shadow-sm font-bold`
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <span>{label}</span>
                            <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                              isActive ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-500'
                            }`}>
                              {isActive ? '✓' : ''}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Slot Footer Controls */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleRemoveSlot(index)}
                      className="px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-950/50 rounded-lg border border-rose-900/40 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Position #{itemNum} entfernen</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAddNewSlot}
                      className="px-4 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg border border-slate-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nächste Chemikalie #{itemNum + 1} anfügen</span>
                    </button>
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Bottom Action Bar */}
      <div className="sticky bottom-4 z-30 bg-slate-950/95 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center font-mono font-bold text-xs">
            {items.length}
          </div>
          <div>
            <div className="text-xs font-bold text-white">
              {items.length} {items.length === 1 ? 'Chemikalie' : 'Chemikalien'} zur Veröffentlichung bereit
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Alle Felder & Bindungen aktiv · Direkte Speicherung in Neon PostgreSQL
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleAddNewSlot}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl text-xs font-medium inline-flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">+ Weitere Chemikalie</span>
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handlePublishAll}
            className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/50 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Veröffentliche...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Alle {items.length} Produkte mit 1 Klick veröffentlichen</span>
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  );
};
