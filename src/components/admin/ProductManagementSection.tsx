import React, { useState, useMemo } from 'react';
import {
  Package,
  Search,
  Eye,
  EyeOff,
  Edit3,
  Trash2,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  FileText,
  Video,
  Image as ImageIcon,
  Flame,
  ShieldAlert,
  Upload,
  ExternalLink,
  Filter,
  Check
} from 'lucide-react';
import { ChemicalProduct } from '../../types/chemical';
import {
  REAGENT_CATEGORIES,
  MARKET_GRADES,
  PHYSICAL_STATES,
  ReagentCategoryType,
  MarketGradeType,
  PhysicalStateType,
} from './BulkAddProductSection';
import { uploadFileToR2 } from '../../services/r2UploadService';
import { R2UploadProgressBar } from './R2UploadProgressBar';

interface ProductManagementSectionProps {
  token: string;
  products: ChemicalProduct[];
  onRefresh: () => void;
  onNavigateToBulkAdd: () => void;
}

type PublishFilter = 'all' | 'published' | 'unpublished';

export const ProductManagementSection: React.FC<ProductManagementSectionProps> = ({
  token,
  products,
  onRefresh,
  onNavigateToBulkAdd,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [publishFilter, setPublishFilter] = useState<PublishFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('Alle');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<ChemicalProduct | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fallback image
  const fallbackImg = 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=400&q=80';

  const showNotice = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 5000);
  };

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      // 1. Publish status filter
      const isPublished = prod.published !== false;
      if (publishFilter === 'published' && !isPublished) return false;
      if (publishFilter === 'unpublished' && isPublished) return false;

      // 2. Category filter
      if (selectedCategory !== 'Alle' && prod.category !== selectedCategory) return false;

      // 3. Search query (matches name, CAS, formula, or ID)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = prod.name?.toLowerCase().includes(q);
        const matchesCas = prod.casNumber?.toLowerCase().includes(q);
        const matchesFormula = prod.formula?.toLowerCase().includes(q);
        const matchesId = prod.id?.toLowerCase().includes(q);
        return matchesName || matchesCas || matchesFormula || matchesId;
      }

      return true;
    });
  }, [products, publishFilter, selectedCategory, searchQuery]);

  // Counts for status tabs
  const stats = useMemo(() => {
    const total = products.length;
    const published = products.filter((p) => p.published !== false).length;
    const unpublished = total - published;
    return { total, published, unpublished };
  }, [products]);

  // Toggle publish / unpublish status
  const handleTogglePublish = async (product: ChemicalProduct) => {
    const currentPublished = product.published !== false;
    const newTarget = !currentPublished;

    setTogglingId(product.id);
    try {
      const res = await fetch(`/api/admin/products/${encodeURIComponent(product.id)}/publish-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ published: newTarget }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Statusänderung fehlgeschlagen');

      showNotice(
        'success',
        `"${product.name}" wurde ${newTarget ? 'veröffentlicht (im Shop sichtbar)' : 'unveröffentlicht (im Shop verborgen)'}.`
      );
      onRefresh();
    } catch (err: any) {
      showNotice('error', err.message || 'Fehler beim Ändern des Veröffentlichungsstatus');
    } finally {
      setTogglingId(null);
    }
  };

  // Delete product with confirmation
  const handleDeleteProduct = async (product: ChemicalProduct) => {
    if (!confirm(`Möchten Sie das Produkt "${product.name}" (${product.id}) wirklich dauerhaft löschen?`)) {
      return;
    }

    setDeletingId(product.id);
    try {
      const res = await fetch(`/api/admin/products/${encodeURIComponent(product.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Löschen fehlgeschlagen');

      showNotice('success', `Produkt "${product.name}" wurde gelöscht.`);
      onRefresh();
    } catch (err: any) {
      showNotice('error', err.message || 'Fehler beim Löschen des Produkts');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Katalog & Produktverwaltung
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verwalten Sie alle veröffentlichten Chemikalien: Bearbeiten, Veröffentlichen, Deaktivieren & Löschen.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onNavigateToBulkAdd}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-md transition-all self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Neue Chemikalien (Bulk) hinzufügen</span>
          </button>
        </div>

        {/* Notice alert */}
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

        {/* Status Filter & Search Controls */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setPublishFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
                publishFilter === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>Alle</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-900/60 font-bold">
                {stats.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPublishFilter('published')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
                publishFilter === 'published'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Veröffentlicht (Live)</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-900/60 font-bold">
                {stats.published}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPublishFilter('unpublished')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
                publishFilter === 'unpublished'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <span>Unveröffentlicht</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-900/60 font-bold">
                {stats.unpublished}
              </span>
            </button>
          </div>

          {/* Search & Category Filter */}
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name, CAS, Formel suchen..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-500 hover:text-white"
                >
                  ×
                </button>
              )}
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg text-xs text-slate-300 focus:outline-hidden transition-colors cursor-pointer"
            >
              <option value="Alle">Alle Kategorien</option>
              {REAGENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Product Items List */}
      {filteredProducts.length === 0 ? (
        <div className="p-12 text-center bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
          <Package className="w-8 h-8 text-slate-600 mx-auto" />
          <div className="text-sm font-semibold text-white">Keine Chemikalien gefunden</div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? `Keine Suchergebnisse für "${searchQuery}". Überprüfen Sie Ihre Filtereinstellungen.`
              : 'Aktuell sind in dieser Kategorie keine Produkte vorhanden.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((prod) => {
            const isPublished = prod.published !== false;
            const isToggling = togglingId === prod.id;
            const isDeleting = deletingId === prod.id;

            const safeThumb =
              (prod.thumbnail && prod.thumbnail.trim()) ||
              (prod.primaryThumbnail && prod.primaryThumbnail.trim()) ||
              (Array.isArray(prod.thumbnails) && prod.thumbnails.find((t) => t && t.trim())) ||
              fallbackImg;

            return (
              <div
                key={prod.id}
                className={`p-4 bg-slate-950/90 border rounded-2xl space-y-3.5 text-xs relative transition-all ${
                  isPublished
                    ? 'border-slate-800 hover:border-slate-700 shadow-md'
                    : 'border-slate-800/60 opacity-85 bg-slate-950/50'
                }`}
              >
                {/* Top Row: Thumbnail + Product Identifiers */}
                <div className="flex items-start gap-3">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shrink-0">
                    <img
                      src={safeThumb}
                      alt={prod.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        if (e.currentTarget.src !== fallbackImg) {
                          e.currentTarget.src = fallbackImg;
                        }
                      }}
                    />
                    {!isPublished && (
                      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px] flex items-center justify-center">
                        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider">
                          Entwurf
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-mono text-[10px] text-emerald-400 flex items-center gap-1.5 truncate">
                        <span>{prod.id}</span>
                        {prod.casNumber && prod.casNumber !== 'N/A' && (
                          <>
                            <span>·</span>
                            <span>CAS {prod.casNumber}</span>
                          </>
                        )}
                      </div>

                      {/* Status indicator pill */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 border ${
                          isPublished
                            ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
                            : 'bg-slate-800/80 border-slate-700 text-slate-400'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isPublished ? 'bg-emerald-400' : 'bg-slate-500'
                          }`}
                        />
                        <span>{isPublished ? 'Veröffentlicht' : 'Entwurf'}</span>
                      </span>
                    </div>

                    <div className="font-bold text-white truncate text-sm mt-0.5" title={prod.name}>
                      {prod.name}
                    </div>

                    <div className="text-slate-400 text-[11px] truncate mt-0.5">
                      <span>{prod.purity}</span>
                      <span> · </span>
                      <span>{prod.grade}</span>
                      {prod.category && (
                        <>
                          <span> · </span>
                          <span className="text-slate-500">{prod.category}</span>
                        </>
                      )}
                    </div>

                    {prod.formula && (
                      <div className="font-mono text-[11px] text-emerald-400/90 font-medium">
                        {prod.formula}
                      </div>
                    )}
                  </div>
                </div>

                {/* Price, Packaging & Stock Units */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 font-mono text-xs">
                  <div>
                    <div className="text-emerald-400 font-bold text-sm">{prod.price}</div>
                    <div className="text-[10px] text-slate-500 font-sans truncate max-w-[150px]">
                      {prod.unit}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`font-medium ${prod.inStock ? 'text-slate-300' : 'text-rose-400'}`}>
                      {prod.inStock ? `${prod.stockUnits || 0} Einheiten` : 'Nicht auf Lager'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-sans">
                      {prod.physicalState || 'Flüssig'}
                    </div>
                  </div>
                </div>

                {/* Action Buttons Row: Publish / Unpublish, Edit, Delete */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                  {/* Publish / Unpublish Toggle */}
                  <button
                    type="button"
                    onClick={() => handleTogglePublish(prod)}
                    disabled={isToggling}
                    className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                      isPublished
                        ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/80 hover:text-white'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-sm'
                    }`}
                    title={isPublished ? 'Im Shop verbergen' : 'Im Shop veröffentlichen'}
                  >
                    {isToggling ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isPublished ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                        <span>Verbergen</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Veröffentlichen</span>
                      </>
                    )}
                  </button>

                  {/* Edit Button */}
                  <button
                    type="button"
                    onClick={() => setEditingProduct(prod)}
                    className="p-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Produkt bearbeiten"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Bearbeiten</span>
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(prod)}
                    disabled={isDeleting}
                    className="p-1.5 px-2.5 bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-900/60 rounded-lg transition-colors cursor-pointer"
                    title="Produkt löschen"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <EditProductModal
          token={token}
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSaved={() => {
            setEditingProduct(null);
            showNotice('success', 'Produktänderungen erfolgreich gespeichert.');
            onRefresh();
          }}
        />
      )}
    </div>
  );
};

// -------------------------------------------------------------
// EDIT PRODUCT MODAL COMPONENT
// -------------------------------------------------------------

interface EditProductModalProps {
  token: string;
  product: ChemicalProduct;
  onClose: () => void;
  onSaved: () => void;
}

const EditProductModal: React.FC<EditProductModalProps> = ({
  token,
  product,
  onClose,
  onSaved,
}) => {
  const [formData, setFormData] = useState<ChemicalProduct>({
    ...product,
    thumbnails: product.thumbnails || (product.thumbnail ? [product.thumbnail] : []),
    published: product.published !== false,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Uploading state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingSds, setUploadingSds] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const handleUpdateField = <K extends keyof ChemicalProduct>(
    field: K,
    value: ChemicalProduct[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Upload new image to Cloudflare R2
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const handle = uploadFileToR2(file, { folder: 'thumbnails', token });
    handle.promise
      .then((res) => {
        const url = res.url || res.proxyUrl;
        const prevThumbs = formData.thumbnails || [];
        setFormData((prev) => ({
          ...prev,
          thumbnail: url,
          primaryThumbnail: url,
          thumbnails: [url, ...prevThumbs],
        }));
      })
      .catch((err) => {
        setErrorMsg('Bild-Upload fehlgeschlagen: ' + err.message);
      })
      .finally(() => {
        setUploadingImage(false);
      });
  };

  // Upload new SDS PDF to Cloudflare R2
  const handleSdsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSds(true);
    const handle = uploadFileToR2(file, { folder: 'sds', token });
    handle.promise
      .then((res) => {
        const url = res.url || res.proxyUrl;
        setFormData((prev) => ({
          ...prev,
          sdsDocumentUrl: url,
          sdsDocumentName: file.name,
        }));
      })
      .catch((err) => {
        setErrorMsg('SDS-Upload fehlgeschlagen: ' + err.message);
      })
      .finally(() => {
        setUploadingSds(false);
      });
  };

  // Upload new Demo Video to Cloudflare R2
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingVideo(true);
    const handle = uploadFileToR2(file, { folder: 'videos', token });
    handle.promise
      .then((res) => {
        const url = res.url || res.proxyUrl;
        setFormData((prev) => ({
          ...prev,
          demoVideoUrl: url,
        }));
      })
      .catch((err) => {
        setErrorMsg('Video-Upload fehlgeschlagen: ' + err.message);
      })
      .finally(() => {
        setUploadingVideo(false);
      });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('Bitte geben Sie einen Chemikalien-Namen ein.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/admin/products/${encodeURIComponent(product.id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Speichern fehlgeschlagen');

      onSaved();
    } catch (err: any) {
      setErrorMsg(err.message || 'Fehler beim Speichern der Änderungen.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-emerald-400 font-bold">{product.id}</span>
              <span className="text-slate-600">·</span>
              <h3 className="text-base font-bold text-white">Produkt bearbeiten</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Änderungen werden in Neon PostgreSQL und im Katalog live aktualisiert.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Form Body */}
        <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-6 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-xs text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* SECTION 1: Basic Identifiers */}
          <div>
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
              1. Chemische Identifikation
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Chemikalien-Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleUpdateField('name', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Summenformel (Formula)
                </label>
                <input
                  type="text"
                  value={formData.formula}
                  onChange={(e) => handleUpdateField('formula', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-mono text-emerald-300 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  CAS Registry Nummer
                </label>
                <input
                  type="text"
                  value={formData.casNumber}
                  onChange={(e) => handleUpdateField('casNumber', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-mono text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Reinheit (Purity)
                </label>
                <input
                  type="text"
                  value={formData.purity}
                  onChange={(e) => handleUpdateField('purity', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs text-white focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Category, Grade & Physical State */}
          <div>
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
              2. Klassifikation & Spezifikation
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Reagenz-Kategorie
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleUpdateField('category', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs text-white focus:outline-hidden cursor-pointer"
                >
                  {REAGENT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Markt-Qualitätsgrad
                </label>
                <select
                  value={formData.grade}
                  onChange={(e) => handleUpdateField('grade', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs text-white focus:outline-hidden cursor-pointer"
                >
                  {MARKET_GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Aggregatzustand
                </label>
                <select
                  value={formData.physicalState}
                  onChange={(e) => handleUpdateField('physicalState', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs text-white focus:outline-hidden cursor-pointer"
                >
                  {PHYSICAL_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 3: Price, Packaging & Stock */}
          <div>
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
              3. Preis, Gebinde & Lagerbestand
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Verkaufspreis (USD $)
                </label>
                <input
                  type="text"
                  value={formData.price}
                  onChange={(e) => handleUpdateField('price', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-mono text-emerald-300 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Verpackungseinheit
                </label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => handleUpdateField('unit', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Bestand (Einheiten)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.stockUnits ?? 10}
                  onChange={(e) => handleUpdateField('stockUnits', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-mono text-white focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-3 pt-6">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.inStock !== false}
                    onChange={(e) => handleUpdateField('inStock', e.target.checked)}
                    className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span className="text-xs font-medium text-slate-300">Sofort lieferbar</span>
                </label>
              </div>
            </div>
          </div>

          {/* SECTION 4: Description */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Produktbeschreibung & Spezifikationsdetails
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => handleUpdateField('description', e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs text-white focus:outline-hidden resize-y"
            />
          </div>

          {/* SECTION 5: Media & Cloudflare R2 Uploads */}
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-4">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
              4. Medien & Cloudflare R2 Dateien
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Product Thumbnail */}
              <div className="space-y-2">
                <span className="text-[11px] text-slate-400 block font-medium">Produktbild</span>
                <div className="flex items-center gap-3">
                  <img
                    src={formData.thumbnail || formData.primaryThumbnail}
                    alt="Preview"
                    className="w-14 h-14 rounded-lg object-cover bg-slate-900 border border-slate-800"
                  />
                  <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium cursor-pointer inline-flex items-center gap-1.5 border border-slate-700">
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{uploadingImage ? 'Upload...' : 'Neues Bild'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingImage}
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* SDS PDF */}
              <div className="space-y-2">
                <span className="text-[11px] text-slate-400 block font-medium">Sicherheitsdatenblatt (PDF)</span>
                <div className="space-y-1.5">
                  {formData.sdsDocumentUrl ? (
                    <div className="flex items-center gap-2">
                      <a
                        href={formData.sdsDocumentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-emerald-400 underline truncate max-w-[140px] inline-flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3 text-rose-400 shrink-0" />
                        <span className="truncate">{formData.sdsDocumentName || 'SDS anzeigen'}</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          handleUpdateField('sdsDocumentUrl', '');
                          handleUpdateField('sdsDocumentName', '');
                        }}
                        className="text-slate-500 hover:text-rose-400 text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 italic">Kein SDS hinterlegt</span>
                  )}

                  <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium cursor-pointer inline-flex items-center gap-1.5 border border-slate-700">
                    <Upload className="w-3.5 h-3.5 text-rose-400" />
                    <span>{uploadingSds ? 'Upload...' : 'PDF hochladen'}</span>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      disabled={uploadingSds}
                      onChange={handleSdsUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Demonstration Video */}
              <div className="space-y-2">
                <span className="text-[11px] text-slate-400 block font-medium">Demonstrations-Video</span>
                <div className="space-y-1.5">
                  {formData.demoVideoUrl ? (
                    <div className="flex items-center gap-2">
                      <a
                        href={formData.demoVideoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-cyan-400 underline truncate max-w-[140px] inline-flex items-center gap-1"
                      >
                        <Video className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span>Video Stream</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleUpdateField('demoVideoUrl', '')}
                        className="text-slate-500 hover:text-rose-400 text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 italic">Kein Video hinterlegt</span>
                  )}

                  <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium cursor-pointer inline-flex items-center gap-1.5 border border-slate-700">
                    <Upload className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{uploadingVideo ? 'Upload...' : 'Video hochladen'}</span>
                    <input
                      type="file"
                      accept="video/*"
                      disabled={uploadingVideo}
                      onChange={handleVideoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 6: Publication Status Switch */}
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Veröffentlichungsstatus (Shop-Sichtbarkeit)</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                    formData.published !== false
                      ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {formData.published !== false ? 'Live im Shop' : 'Entwurf (verborgen)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Steuert, ob Besucher der Plattform diese Chemikalie im Katalog sehen und anfragen können.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleUpdateField('published', !formData.published)}
              className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer border ${
                formData.published !== false
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              {formData.published !== false ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Veröffentlicht</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                  <span>Unveröffentlicht</span>
                </>
              )}
            </button>
          </div>

          {/* Modal Footer Controls */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Abbrechen
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Wird gespeichert...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Änderungen speichern</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
