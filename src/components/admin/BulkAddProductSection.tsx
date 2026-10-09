import React, { useState, useEffect } from 'react';
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
  PackageCheck,
  Cloud,
  ExternalLink,
  Film,
  Eye,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { ChemicalProduct } from '../../types/chemical';
import {
  checkR2Status,
  uploadFileToR2,
  R2StatusInfo,
  UploadProgressEvent,
  UploadStatus,
  formatFileSize,
} from '../../services/r2UploadService';
import { R2UploadProgressBar } from './R2UploadProgressBar';

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

interface UploadTask {
  id: string;
  file: File;
  name: string;
  type: 'image' | 'pdf' | 'video';
  progress: UploadProgressEvent | null;
  status: UploadStatus;
  errorMessage?: string;
  cancel?: () => void;
}

interface ItemUploads {
  thumbnails: UploadTask[];
  sds: UploadTask | null;
  video: UploadTask | null;
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
  
  // Cloudflare R2 Live Status
  const [r2Info, setR2Info] = useState<R2StatusInfo | null>(null);
  const [isCheckingR2, setIsCheckingR2] = useState(false);

  // Active uploads per item ID
  const [uploadTasks, setUploadTasks] = useState<Record<string, ItemUploads>>({});

  useEffect(() => {
    refreshR2Status();
  }, []);

  const refreshR2Status = async () => {
    setIsCheckingR2(true);
    try {
      const status = await checkR2Status();
      setR2Info(status);
    } finally {
      setIsCheckingR2(false);
    }
  };

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

  // Production Multi-thumbnail upload directly to Cloudflare R2
  const handleThumbnailUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentItem = items[index];
    if (!currentItem) return;
    const itemId = currentItem.id;

    const fileList = Array.from(files);
    e.target.value = ''; // Reset input so same file can be re-selected if needed

    fileList.forEach((file) => {
      const taskId = `thumb_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      const newTask: UploadTask = {
        id: taskId,
        file,
        name: file.name,
        type: 'image',
        progress: {
          percent: 0,
          loaded: 0,
          total: file.size,
          speedFormatted: 'Startet...',
          sizeFormatted: `0 B / ${formatFileSize(file.size)}`,
        },
        status: 'uploading',
      };

      // Add to tracking
      setUploadTasks((prev) => {
        const itemUploads = prev[itemId] || { thumbnails: [], sds: null, video: null };
        return {
          ...prev,
          [itemId]: {
            ...itemUploads,
            thumbnails: [...itemUploads.thumbnails, newTask],
          },
        };
      });

      const handle = uploadFileToR2(file, {
        folder: 'thumbnails',
        token,
        onProgress: (prog) => {
          setUploadTasks((prev) => {
            const itemUploads = prev[itemId];
            if (!itemUploads) return prev;
            return {
              ...prev,
              [itemId]: {
                ...itemUploads,
                thumbnails: itemUploads.thumbnails.map((t) =>
                  t.id === taskId ? { ...t, progress: prog, status: 'uploading' } : t
                ),
              },
            };
          });
        },
        onStatusChange: (status, message) => {
          setUploadTasks((prev) => {
            const itemUploads = prev[itemId];
            if (!itemUploads) return prev;
            return {
              ...prev,
              [itemId]: {
                ...itemUploads,
                thumbnails: itemUploads.thumbnails.map((t) =>
                  t.id === taskId ? { ...t, status, errorMessage: status === 'error' ? message : undefined } : t
                ),
              },
            };
          });
        },
      });

      // Save cancel handle
      newTask.cancel = handle.cancel;

      handle.promise
        .then((result) => {
          // Add verified permanent R2 URL to the chemical item
          setItems((prevItems) => {
            const copy = [...prevItems];
            if (!copy[index]) return prevItems;
            const currentThumbs = copy[index].thumbnails || [];
            // Prefer resilient proxy or CDN URL
            const finalUrl = result.url || result.proxyUrl;
            copy[index] = {
              ...copy[index],
              thumbnails: [...currentThumbs, finalUrl],
            };
            return copy;
          });

          // Remove completed task after short celebration display
          setTimeout(() => {
            setUploadTasks((prev) => {
              const itemUploads = prev[itemId];
              if (!itemUploads) return prev;
              return {
                ...prev,
                [itemId]: {
                  ...itemUploads,
                  thumbnails: itemUploads.thumbnails.filter((t) => t.id !== taskId),
                },
              };
            });
          }, 1200);
        })
        .catch((err) => {
          console.error('Thumbnail upload error:', err);
        });
    });
  };

  // Production SDS Document PDF upload directly to Cloudflare R2
  const handleSdsUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const currentItem = items[index];
    if (!currentItem) return;
    const itemId = currentItem.id;
    e.target.value = '';

    const taskId = `sds_${Date.now()}`;
    const newTask: UploadTask = {
      id: taskId,
      file,
      name: file.name,
      type: 'pdf',
      progress: {
        percent: 0,
        loaded: 0,
        total: file.size,
        speedFormatted: 'Startet...',
        sizeFormatted: `0 B / ${formatFileSize(file.size)}`,
      },
      status: 'uploading',
    };

    setUploadTasks((prev) => {
      const itemUploads = prev[itemId] || { thumbnails: [], sds: null, video: null };
      return {
        ...prev,
        [itemId]: {
          ...itemUploads,
          sds: newTask,
        },
      };
    });

    const handle = uploadFileToR2(file, {
      folder: 'sds',
      token,
      onProgress: (prog) => {
        setUploadTasks((prev) => {
          const itemUploads = prev[itemId];
          if (!itemUploads || !itemUploads.sds) return prev;
          return {
            ...prev,
            [itemId]: {
              ...itemUploads,
              sds: { ...itemUploads.sds, progress: prog, status: 'uploading' },
            },
          };
        });
      },
      onStatusChange: (status, message) => {
        setUploadTasks((prev) => {
          const itemUploads = prev[itemId];
          if (!itemUploads || !itemUploads.sds) return prev;
          return {
            ...prev,
            [itemId]: {
              ...itemUploads,
              sds: { ...itemUploads.sds, status, errorMessage: status === 'error' ? message : undefined },
            },
          };
        });
      },
    });

    newTask.cancel = handle.cancel;

    handle.promise
      .then((result) => {
        const finalUrl = result.url || result.proxyUrl;
        setItems((prevItems) => {
          const copy = [...prevItems];
          if (!copy[index]) return prevItems;
          copy[index] = {
            ...copy[index],
            sdsDocumentUrl: finalUrl,
            sdsDocumentName: file.name,
          };
          return copy;
        });

        setTimeout(() => {
          setUploadTasks((prev) => {
            const itemUploads = prev[itemId];
            if (!itemUploads) return prev;
            return {
              ...prev,
              [itemId]: {
                ...itemUploads,
                sds: null,
              },
            };
          });
        }, 1200);
      })
      .catch((err) => {
        console.error('SDS upload error:', err);
      });
  };

  // Production Demonstration Video upload directly to Cloudflare R2
  const handleVideoUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const currentItem = items[index];
    if (!currentItem) return;
    const itemId = currentItem.id;
    e.target.value = '';

    const taskId = `video_${Date.now()}`;
    const newTask: UploadTask = {
      id: taskId,
      file,
      name: file.name,
      type: 'video',
      progress: {
        percent: 0,
        loaded: 0,
        total: file.size,
        speedFormatted: 'Startet...',
        sizeFormatted: `0 B / ${formatFileSize(file.size)}`,
      },
      status: 'uploading',
    };

    setUploadTasks((prev) => {
      const itemUploads = prev[itemId] || { thumbnails: [], sds: null, video: null };
      return {
        ...prev,
        [itemId]: {
          ...itemUploads,
          video: newTask,
        },
      };
    });

    const handle = uploadFileToR2(file, {
      folder: 'videos',
      token,
      onProgress: (prog) => {
        setUploadTasks((prev) => {
          const itemUploads = prev[itemId];
          if (!itemUploads || !itemUploads.video) return prev;
          return {
            ...prev,
            [itemId]: {
              ...itemUploads,
              video: { ...itemUploads.video, progress: prog, status: 'uploading' },
            },
          };
        });
      },
      onStatusChange: (status, message) => {
        setUploadTasks((prev) => {
          const itemUploads = prev[itemId];
          if (!itemUploads || !itemUploads.video) return prev;
          return {
            ...prev,
            [itemId]: {
              ...itemUploads,
              video: { ...itemUploads.video, status, errorMessage: status === 'error' ? message : undefined },
            },
          };
        });
      },
    });

    newTask.cancel = handle.cancel;

    handle.promise
      .then((result) => {
        const finalUrl = result.url || result.proxyUrl;
        setItems((prevItems) => {
          const copy = [...prevItems];
          if (!copy[index]) return prevItems;
          copy[index] = {
            ...copy[index],
            demoVideoUrl: finalUrl,
          };
          return copy;
        });

        setTimeout(() => {
          setUploadTasks((prev) => {
            const itemUploads = prev[itemId];
            if (!itemUploads) return prev;
            return {
              ...prev,
              [itemId]: {
                ...itemUploads,
                video: null,
              },
            };
          });
        }, 1200);
      })
      .catch((err) => {
        console.error('Video upload error:', err);
      });
  };

  // Check if any upload is in progress across all slots
  const hasActiveUploads = Object.values(uploadTasks).some(
    (tasks) =>
      tasks.thumbnails.some((t) => t.status === 'uploading' || t.status === 'verifying') ||
      (tasks.sds && (tasks.sds.status === 'uploading' || tasks.sds.status === 'verifying')) ||
      (tasks.video && (tasks.video.status === 'uploading' || tasks.video.status === 'verifying'))
  );

  // One-click publish all products
  const handlePublishAll = async () => {
    setNotice(null);

    if (hasActiveUploads) {
      setNotice({
        type: 'error',
        text: 'Bitte warten Sie, bis alle Dateien vollständig zu Cloudflare R2 übertragen wurden.',
      });
      return;
    }

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
        text: `Erfolgreich veröffentlicht! ${data.publishedCount} Chemikalien mit verifizierten Cloudflare R2 Medien wurden im System & in der Datenbank hinterlegt.`,
      });

      if (data.savedProducts && onPublishedSuccess) {
        onPublishedSuccess(data.savedProducts);
      }

      // Reset to one fresh empty item
      setItems([createEmptyItem(1)]);
      setExpandedIndex(0);
      setUploadTasks({});
    } catch (err: any) {
      setNotice({
        type: 'error',
        text: err.message || 'Serverfehler beim Veröffentlichen.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Chemikalien Bulk-Erfassung & Katalog-Import
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Erfassen und synchronisieren Sie mehrere chemische Reagenzien zeitgleich mit direkter Cloudflare R2 Medien-Anbindung.
                </p>
              </div>
            </div>

            {/* Cloudflare R2 Storage Status Pill */}
            <div className="flex flex-wrap items-center gap-3 mt-4 text-xs">
              <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono ${
                  r2Info?.configured
                    ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                    : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                }`}
              >
                <Cloud className={`w-3.5 h-3.5 ${r2Info?.configured ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`} />
                <span className="font-sans font-semibold">Cloudflare R2 Storage:</span>
                <span>
                  {r2Info?.configured
                    ? `Aktiv (${r2Info.bucket || 'aniixa-chemicals-storage'})`
                    : 'Wird initialisiert...'}
                </span>
                {r2Info?.publicUrl && (
                  <span className="text-slate-400 text-[11px] hidden sm:inline">
                    · {r2Info.publicUrl}
                  </span>
                )}
                <button
                  type="button"
                  onClick={refreshR2Status}
                  disabled={isCheckingR2}
                  className="ml-1 p-0.5 text-slate-400 hover:text-white transition-colors"
                  title="R2 Status prüfen"
                >
                  <RefreshCw className={`w-3 h-3 ${isCheckingR2 ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="text-slate-400 text-xs flex items-center gap-2">
                <span>Positionen:</span>
                <span className="font-bold text-white font-mono bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                  {items.length}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons Header */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleAddNewSlot}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 border border-slate-700 hover:border-slate-600 transition-all cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Position hinzufügen</span>
            </button>

            <button
              type="button"
              onClick={handlePublishAll}
              disabled={isSubmitting || hasActiveUploads}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Wird veröffentlicht...</span>
                </>
              ) : hasActiveUploads ? (
                <>
                  <Cloud className="w-4 h-4 animate-pulse" />
                  <span>R2-Upload läuft...</span>
                </>
              ) : (
                <>
                  <PackageCheck className="w-4 h-4" />
                  <span>Alle {items.length} veröffentlichen</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status Notice Banner */}
        {notice && (
          <div
            className={`mt-4 p-3.5 rounded-xl text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
              notice.type === 'success'
                ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-200'
                : 'bg-rose-950/80 border border-rose-800 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {notice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{notice.text}</span>
            </div>
            <button
              onClick={() => setNotice(null)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Chemical Product Items List */}
      <div className="space-y-4">
        {items.map((item, index) => {
          const isExpanded = expandedIndex === index;
          const currentUploads = uploadTasks[item.id] || { thumbnails: [], sds: null, video: null };

          return (
            <div
              key={item.id}
              className={`bg-slate-900 border rounded-2xl transition-all overflow-hidden ${
                isExpanded
                  ? 'border-emerald-500/50 shadow-xl shadow-emerald-950/20'
                  : 'border-slate-800 hover:border-slate-700 shadow-md'
              }`}
            >
              {/* Product Header Row */}
              <div
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
                className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer select-none bg-slate-900/90 hover:bg-slate-850 transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-mono text-xs font-bold text-slate-300 shrink-0">
                    {index + 1}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <h4 className="text-sm font-bold text-white truncate">
                        {item.name || (
                          <span className="text-slate-500 italic">
                            Chemikalien-Name eingeben...
                          </span>
                        )}
                      </h4>
                      {item.formula && (
                        <span className="font-mono text-xs text-emerald-400/90 font-medium hidden sm:inline">
                          [{item.formula}]
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>{item.category}</span>
                      <span>·</span>
                      <span>{item.grade}</span>
                      <span>·</span>
                      <span>{item.purity}</span>
                      {item.casNumber && (
                        <>
                          <span>·</span>
                          <span className="font-mono">CAS {item.casNumber}</span>
                        </>
                      )}
                      {item.thumbnails.length > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-emerald-400 font-medium">
                            {item.thumbnails.length} Bild{item.thumbnails.length > 1 ? 'er' : ''} (R2)
                          </span>
                        </>
                      )}
                      {item.sdsDocumentName && (
                        <>
                          <span>·</span>
                          <span className="text-rose-400 font-medium">SDS PDF (R2)</span>
                        </>
                      )}
                      {item.demoVideoUrl && (
                        <>
                          <span>·</span>
                          <span className="text-cyan-400 font-medium">Video (R2)</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right controls: Duplicate, Delete, Expand/Collapse */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateSlot(index);
                    }}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    title="Position duplizieren"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveSlot(index);
                    }}
                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
                    title="Position löschen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="w-8 h-8 rounded-lg bg-slate-800/80 flex items-center justify-center text-slate-400 ml-1">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </div>

              {/* Collapsible Form Body */}
              {isExpanded && (
                <div className="p-5 sm:p-6 border-t border-slate-800/80 space-y-6 bg-slate-950/40">
                  {/* SECTION 1: Primary Chemical Identification */}
                  <div>
                    <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                      1. Chemische Identifikation
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">
                          Chemikalien-Name *
                        </label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateItemField(index, 'name', e.target.value)}
                          placeholder="z.B. Ethanol absolut, Aceton..."
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">
                          Summenformel (Formula)
                        </label>
                        <input
                          type="text"
                          value={item.formula}
                          onChange={(e) => updateItemField(index, 'formula', e.target.value)}
                          placeholder="z.B. C2H5OH, CH3COCH3..."
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-mono text-emerald-300 placeholder-slate-500 focus:outline-hidden transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">
                          CAS Registry Nummer
                        </label>
                        <input
                          type="text"
                          value={item.casNumber}
                          onChange={(e) => updateItemField(index, 'casNumber', e.target.value)}
                          placeholder="z.B. 64-17-5"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-hidden transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">
                          Substanz-Reinheit (Purity)
                        </label>
                        <input
                          type="text"
                          value={item.purity}
                          onChange={(e) => updateItemField(index, 'purity', e.target.value)}
                          placeholder="z.B. ≥ 99.8%, 99.5%..."
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: Quality & Classification Dropdowns */}
                  <div>
                    <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                      2. Klassifizierung & Qualitätsnorm
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">
                          Reagenz-Kategorie (Reagent Category)
                        </label>
                        <select
                          value={item.category}
                          onChange={(e) => updateItemField(index, 'category', e.target.value as ReagentCategoryType)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs text-white focus:outline-hidden transition-colors cursor-pointer"
                        >
                          {REAGENT_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">
                          Markt-Qualitätsgrad (Market Grade)
                        </label>
                        <select
                          value={item.grade}
                          onChange={(e) => updateItemField(index, 'grade', e.target.value as MarketGradeType)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs text-white focus:outline-hidden transition-colors cursor-pointer"
                        >
                          {MARKET_GRADES.map((gr) => (
                            <option key={gr} value={gr}>
                              {gr}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">
                          Aggregatzustand (Physical State)
                        </label>
                        <select
                          value={item.physicalState}
                          onChange={(e) => updateItemField(index, 'physicalState', e.target.value as PhysicalStateType)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs text-white focus:outline-hidden transition-colors cursor-pointer"
                        >
                          {PHYSICAL_STATES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: Commercial & Inventory Parameters */}
                  <div>
                    <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                      3. Kommerzielle Konditionen & Lagerbestand
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">
                          Verkaufspreis (USD $)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-xs text-slate-500">$</span>
                          <input
                            type="text"
                            value={item.price}
                            onChange={(e) => updateItemField(index, 'price', e.target.value)}
                            placeholder="28.50"
                            className="w-full pl-7 pr-3 py-2 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-hidden transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">
                          Gebinde & Verpackungseinheit
                        </label>
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => updateItemField(index, 'unit', e.target.value)}
                          placeholder="z.B. 1.000 ml Glasflasche DIN GL45"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">
                          Verfügbarer Lagerbestand (Einheiten)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={item.stockUnits}
                          onChange={(e) => updateItemField(index, 'stockUnits', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-mono text-white focus:outline-hidden transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 4: Physical & Chemical Constants */}
                  <div>
                    <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                      4. Physikochemische Konstanten
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">
                          Molare Masse (Molecular Weight)
                        </label>
                        <input
                          type="text"
                          value={item.molecularWeight}
                          onChange={(e) => updateItemField(index, 'molecularWeight', e.target.value)}
                          placeholder="z.B. 46.07 g/mol"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-hidden transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">
                          Schmelzpunkt (°C)
                        </label>
                        <input
                          type="text"
                          value={item.meltingPoint}
                          onChange={(e) => updateItemField(index, 'meltingPoint', e.target.value)}
                          placeholder="z.B. -114.1 °C"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-hidden transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">
                          Siedepunkt (°C)
                        </label>
                        <input
                          type="text"
                          value={item.boilingPoint}
                          onChange={(e) => updateItemField(index, 'boilingPoint', e.target.value)}
                          placeholder="z.B. 78.37 °C"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-hidden transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 5: Description & Application */}
                  <div>
                    <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      5. Produktbeschreibung & Verwendungszweck
                    </h5>
                    <textarea
                      rows={2}
                      value={item.description}
                      onChange={(e) => updateItemField(index, 'description', e.target.value)}
                      placeholder="Detaillierte Qualitätsbeschreibung, Reinheitszertifikat, Labor- & Industrieanwendungen..."
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden transition-colors resize-y"
                    />
                  </div>

                  {/* ======================================================== */}
                  {/* SECTION 6: CLOUDFLARE R2 PRODUCTION MEDIA UPLOADS        */}
                  {/* ======================================================== */}
                  <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Cloud className="w-4 h-4 text-emerald-400" />
                          <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                            6. Cloudflare R2 Medien-Upload (Production Ready)
                          </h5>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Alle Dateien werden direkt im Bucket <span className="font-mono text-emerald-300">aniixa-chemicals-storage</span> gespeichert.
                        </p>
                      </div>

                      <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>R2 Direktanbindung aktiv</span>
                      </div>
                    </div>

                    {/* A. PRODUCT THUMBNAILS (MULTI-IMAGE WITH PROGRESS BARS) */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-semibold text-white">
                            Produkt-Thumbnails ({item.thumbnails.length} gespeichert)
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          Mehrere Bilder wählbar · Stern = Primärbild
                        </span>
                      </div>

                      {/* Active Thumbnail Upload Progress Bars */}
                      {currentUploads.thumbnails.length > 0 && (
                        <div className="space-y-2">
                          {currentUploads.thumbnails.map((task) => (
                            <R2UploadProgressBar
                              key={task.id}
                              fileName={task.name}
                              fileType="image"
                              progress={task.progress}
                              status={task.status}
                              errorMessage={task.errorMessage}
                              onCancel={task.cancel}
                              bucketName={r2Info?.bucket || 'aniixa-chemicals-storage'}
                            />
                          ))}
                        </div>
                      )}

                      {/* Thumbnails Gallery & Upload Box */}
                      <div className="flex flex-wrap items-center gap-3">
                        {item.thumbnails.map((thumbUrl, tIdx) => {
                          const isPrimary = tIdx === item.primaryThumbnailIndex;
                          return (
                            <div
                              key={tIdx}
                              onClick={() => updateItemField(index, 'primaryThumbnailIndex', tIdx)}
                              className={`relative w-24 h-24 rounded-xl overflow-hidden border-2 cursor-pointer group bg-slate-950 transition-all ${
                                isPrimary
                                  ? 'border-emerald-500 shadow-lg shadow-emerald-950/50 ring-2 ring-emerald-500/30'
                                  : 'border-slate-800 hover:border-slate-600'
                              }`}
                            >
                              <img
                                src={thumbUrl}
                                alt={`Thumbnail ${tIdx + 1}`}
                                className="w-full h-full object-cover"
                              />

                              {/* Cloudflare R2 indicator pill */}
                              <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-slate-950/80 text-[9px] font-mono text-emerald-300 border border-emerald-900/60 flex items-center gap-1">
                                <Cloud className="w-2.5 h-2.5" />
                                <span>R2</span>
                              </div>

                              {/* Primary badge */}
                              {isPrimary && (
                                <div
                                  className="absolute top-1 left-1 bg-emerald-600 text-white p-1 rounded-md shadow-xs"
                                  title="Primäres Katalogbild"
                                >
                                  <Star className="w-3 h-3 fill-white" />
                                </div>
                              )}

                              {/* Top Right Action: View & Delete */}
                              <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <a
                                  href={thumbUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="bg-slate-950/80 hover:bg-slate-800 text-white p-1 rounded-md transition-colors"
                                  title="In neuem Tab ansehen"
                                >
                                  <Eye className="w-3 h-3" />
                                </a>
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
                                  className="bg-slate-950/80 hover:bg-rose-900 text-white p-1 rounded-md transition-colors"
                                  title="Bild entfernen"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {/* Upload Button Dropzone */}
                        <label className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-700 hover:border-emerald-500 bg-slate-900/60 hover:bg-slate-900 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all text-slate-400 hover:text-emerald-400 group">
                          <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          <span className="text-[10px] font-semibold">Bilder hochladen</span>
                          <span className="text-[9px] text-slate-500">JPG, PNG, WebP</span>
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

                    {/* B. SDS PDF DOCUMENT & DEMONSTRATION VIDEO GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      {/* B1. SDS DOCUMENT (PDF) */}
                      <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-semibold text-white">
                            <FileText className="w-4 h-4 text-rose-400" />
                            <span>Sicherheitsdatenblatt (SDS / REACH PDF)</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">PDF bis 50 MB</span>
                        </div>

                        {/* SDS Uploading Progress Bar */}
                        {currentUploads.sds && (
                          <R2UploadProgressBar
                            fileName={currentUploads.sds.name}
                            fileType="pdf"
                            progress={currentUploads.sds.progress}
                            status={currentUploads.sds.status}
                            errorMessage={currentUploads.sds.errorMessage}
                            onCancel={currentUploads.sds.cancel}
                            bucketName={r2Info?.bucket || 'aniixa-chemicals-storage'}
                          />
                        )}

                        {/* SDS Document Uploaded Card */}
                        {item.sdsDocumentUrl ? (
                          <div className="p-3 bg-slate-900 rounded-xl border border-emerald-900/50 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-rose-950/80 border border-rose-800 flex items-center justify-center shrink-0">
                                  <FileText className="w-4 h-4 text-rose-400" />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-white truncate max-w-[200px]" title={item.sdsDocumentName || 'Sicherheitsdatenblatt.pdf'}>
                                    {item.sdsDocumentName || 'Sicherheitsdatenblatt.pdf'}
                                  </div>
                                  <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                                    <Cloud className="w-2.5 h-2.5" />
                                    <span>In Cloudflare R2 gesichert</span>
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  updateItemField(index, 'sdsDocumentUrl', '');
                                  updateItemField(index, 'sdsDocumentName', '');
                                }}
                                className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                                title="SDS Dokument entfernen"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                              <a
                                href={item.sdsDocumentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors border border-slate-700"
                              >
                                <ExternalLink className="w-3 h-3 text-emerald-400" />
                                <span>PDF im Browser öffnen</span>
                              </a>

                              <label className="px-3 py-1.5 bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700/60">
                                <Upload className="w-3 h-3" />
                                <span>Ersetzen</span>
                                <input
                                  type="file"
                                  accept=".pdf,application/pdf"
                                  onChange={(e) => handleSdsUpload(index, e)}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          </div>
                        ) : (
                          /* Empty SDS Dropzone */
                          <label className="p-4 rounded-xl border-2 border-dashed border-slate-800 hover:border-emerald-500 bg-slate-900/40 hover:bg-slate-900 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors text-slate-400 hover:text-emerald-400 group">
                            <Upload className="w-5 h-5 text-emerald-400/80 group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-semibold text-white">
                              REACH / GHS Sicherheitsdatenblatt hochladen
                            </span>
                            <span className="text-[10px] text-slate-500">
                              PDF anklicken oder ablegen · Direkte Cloudflare R2 Archivierung
                            </span>
                            <input
                              type="file"
                              accept=".pdf,application/pdf"
                              onChange={(e) => handleSdsUpload(index, e)}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>

                      {/* B2. DEMONSTRATION VIDEO */}
                      <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-semibold text-white">
                            <Video className="w-4 h-4 text-cyan-400" />
                            <span>Demonstrations-Video</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">MP4, WebM bis 200 MB</span>
                        </div>

                        {/* Video Uploading Progress Bar */}
                        {currentUploads.video && (
                          <R2UploadProgressBar
                            fileName={currentUploads.video.name}
                            fileType="video"
                            progress={currentUploads.video.progress}
                            status={currentUploads.video.status}
                            errorMessage={currentUploads.video.errorMessage}
                            onCancel={currentUploads.video.cancel}
                            bucketName={r2Info?.bucket || 'aniixa-chemicals-storage'}
                          />
                        )}

                        {/* Video Uploaded Card with HTML5 player */}
                        {item.demoVideoUrl ? (
                          <div className="p-3 bg-slate-900 rounded-xl border border-cyan-950 space-y-2.5">
                            {/* Live video player preview */}
                            <div className="rounded-lg overflow-hidden bg-black border border-slate-800 aspect-video max-h-44 flex items-center justify-center">
                              <video
                                src={item.demoVideoUrl}
                                controls
                                className="w-full h-full object-contain"
                              />
                            </div>

                            <div className="flex items-center justify-between text-xs">
                              <span className="text-emerald-400 font-mono text-[10px] flex items-center gap-1">
                                <Cloud className="w-3 h-3" />
                                <span>Cloudflare R2 Video-Stream aktiv</span>
                              </span>

                              <div className="flex items-center gap-2">
                                <label className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-medium cursor-pointer inline-flex items-center gap-1 transition-colors border border-slate-700">
                                  <Upload className="w-3 h-3 text-cyan-400" />
                                  <span>Ersetzen</span>
                                  <input
                                    type="file"
                                    accept="video/*"
                                    onChange={(e) => handleVideoUpload(index, e)}
                                    className="hidden"
                                  />
                                </label>

                                <button
                                  type="button"
                                  onClick={() => updateItemField(index, 'demoVideoUrl', '')}
                                  className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                                  title="Video entfernen"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Empty Video Dropzone */
                          <div className="space-y-2">
                            <label className="p-4 rounded-xl border-2 border-dashed border-slate-800 hover:border-cyan-500 bg-slate-900/40 hover:bg-slate-900 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors text-slate-400 hover:text-cyan-400 group">
                              <Film className="w-5 h-5 text-cyan-400/80 group-hover:scale-110 transition-transform" />
                              <span className="text-xs font-semibold text-white">
                                Produkt-Demonstrations-Video hochladen
                              </span>
                              <span className="text-[10px] text-slate-500">
                                MP4, WebM, MOV · Direktes Cloudflare R2 Streaming
                              </span>
                              <input
                                type="file"
                                accept="video/*"
                                onChange={(e) => handleVideoUpload(index, e)}
                                className="hidden"
                              />
                            </label>

                            {/* Or direct video URL */}
                            <div className="relative">
                              <input
                                type="url"
                                value={item.demoVideoUrl}
                                onChange={(e) => updateItemField(index, 'demoVideoUrl', e.target.value)}
                                placeholder="Oder externe Video-URL eingeben..."
                                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SECTION 7: NFPA 704 Safety Diamond Parameters */}
                  <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-amber-400" />
                        <h5 className="text-xs font-semibold text-white">
                          7. NFPA 704 Sicherheitsdiamant (0-4)
                        </h5>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        H:{item.nfpaHealth} · F:{item.nfpaFlammability} · I:{item.nfpaInstability} {item.nfpaSpecial ? `· ${item.nfpaSpecial}` : ''}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* Health - Blue */}
                      <div className="p-2.5 rounded-lg bg-blue-950/30 border border-blue-900/40">
                        <label className="block text-[10px] font-bold text-blue-400 mb-1">
                          Gesundheit (Blau: 0-4)
                        </label>
                        <select
                          value={item.nfpaHealth}
                          onChange={(e) => updateItemField(index, 'nfpaHealth', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 bg-slate-900 border border-blue-900/60 rounded text-xs font-mono text-white"
                        >
                          {[0, 1, 2, 3, 4].map((v) => (
                            <option key={v} value={v}>
                              {v} - {v === 0 ? 'Keine Gefahr' : v === 4 ? 'Tödlich' : `Gefahrstufe ${v}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Flammability - Red */}
                      <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-900/40">
                        <label className="block text-[10px] font-bold text-rose-400 mb-1">
                          Entflammbarkeit (Rot: 0-4)
                        </label>
                        <select
                          value={item.nfpaFlammability}
                          onChange={(e) => updateItemField(index, 'nfpaFlammability', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 bg-slate-900 border border-rose-900/60 rounded text-xs font-mono text-white"
                        >
                          {[0, 1, 2, 3, 4].map((v) => (
                            <option key={v} value={v}>
                              {v} - {v === 0 ? 'Nicht brennbar' : v === 4 ? 'FP < 23°C' : `Stufe ${v}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Instability - Yellow */}
                      <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-900/40">
                        <label className="block text-[10px] font-bold text-amber-400 mb-1">
                          Instabilität (Gelb: 0-4)
                        </label>
                        <select
                          value={item.nfpaInstability}
                          onChange={(e) => updateItemField(index, 'nfpaInstability', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 bg-slate-900 border border-amber-900/60 rounded text-xs font-mono text-white"
                        >
                          {[0, 1, 2, 3, 4].map((v) => (
                            <option key={v} value={v}>
                              {v} - {v === 0 ? 'Stabil' : v === 4 ? 'Explosionsfähig' : `Stufe ${v}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Special Codes - White */}
                      <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/60">
                        <label className="block text-[10px] font-bold text-slate-300 mb-1">
                          Spezialcode (Weiß)
                        </label>
                        <select
                          value={item.nfpaSpecial}
                          onChange={(e) => updateItemField(index, 'nfpaSpecial', e.target.value)}
                          className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-white"
                        >
                          <option value="">Keiner (None)</option>
                          <option value="OX">OX (Oxidationsmittel)</option>
                          <option value="W">W-Linie (Reagiert mit Wasser)</option>
                          <option value="SA">SA (Einfaches Erstickungsgas)</option>
                          <option value="COR">COR (Ätzend)</option>
                          <option value="BIO">BIO (Biogefährdung)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 8: GHS Pictogram Classification Tags */}
                  <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 space-y-3">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-emerald-400" />
                      <h5 className="text-xs font-semibold text-white">
                        8. GHS Piktogramm-Gefahrstoffkennzeichnung
                      </h5>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                      {(
                        [
                          { key: 'toxic', label: 'toxic (Giftig)', color: 'text-rose-400 border-rose-900/60' },
                          { key: 'corrosive', label: 'corrosive (Ätzend)', color: 'text-amber-400 border-amber-900/60' },
                          { key: 'flammable', label: 'flammable (Entzündbar)', color: 'text-orange-400 border-orange-900/60' },
                          { key: 'environment', label: 'environment (Umwelt)', color: 'text-emerald-400 border-emerald-900/60' },
                          { key: 'irritant', label: 'irritant (Reizend)', color: 'text-yellow-400 border-yellow-900/60' },
                          { key: 'safe', label: 'safe (Keine Kennz.)', color: 'text-blue-400 border-blue-900/60' },
                        ] as const
                      ).map(({ key, label, color }) => {
                        const checked = item.ghsTags[key];
                        return (
                          <label
                            key={key}
                            className={`p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-colors ${
                              checked
                                ? `bg-slate-800 ${color}`
                                : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const newTags = { ...item.ghsTags, [key]: e.target.checked };
                                if (key !== 'safe' && e.target.checked) {
                                  newTags.safe = false;
                                } else if (key === 'safe' && e.target.checked) {
                                  newTags.toxic = false;
                                  newTags.corrosive = false;
                                  newTags.flammable = false;
                                  newTags.environment = false;
                                  newTags.irritant = false;
                                }
                                updateItemField(index, 'ghsTags', newTags);
                              }}
                              className="rounded border-slate-700 text-emerald-500 focus:ring-0 focus:ring-offset-0"
                            />
                            <span className="text-[11px] font-medium truncate">{label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Bottom Publishing Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 px-6 py-4 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleAddNewSlot}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 border border-slate-700 hover:border-slate-600 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Weitere Chemikalie hinzufügen</span>
            </button>

            <span className="text-xs text-slate-400 hidden md:inline">
              <span className="font-bold text-white">{items.length}</span> Position{items.length > 1 ? 'en' : ''} bereit
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handlePublishAll}
              disabled={isSubmitting || hasActiveUploads}
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Wird veröffentlicht...</span>
                </>
              ) : hasActiveUploads ? (
                <>
                  <Cloud className="w-4 h-4 animate-pulse" />
                  <span>R2 Uploads werden abgeschlossen...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>1-Klick Alle Chemikalien Veröffentlichen ({items.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
