import React, { useState, useEffect } from 'react';
import { ChemicalProduct } from '../types/chemical';
import { X, MessageSquare, Shield, CheckCircle, FileText, FlaskConical, AlertTriangle, Box } from 'lucide-react';

interface ProductDetailModalProps {
  product: ChemicalProduct | null;
  onClose: () => void;
  onEnquire: (product: ChemicalProduct) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onEnquire,
}) => {
  const fallbackModalImg = 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=800&q=80';
  
  const validThumbnails = product?.thumbnails
    ? product.thumbnails.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
    : [];

  const initialImg =
    (product?.thumbnail && product.thumbnail.trim()) ||
    (product?.primaryThumbnail && product.primaryThumbnail.trim()) ||
    (validThumbnails.length > 0 ? validThumbnails[0] : '') ||
    fallbackModalImg;

  const [activeImg, setActiveImg] = useState<string>(initialImg);

  useEffect(() => {
    if (product) {
      const vThumbs = product.thumbnails
        ? product.thumbnails.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
        : [];
      const chosen =
        (product.thumbnail && product.thumbnail.trim()) ||
        (product.primaryThumbnail && product.primaryThumbnail.trim()) ||
        (vThumbs.length > 0 ? vThumbs[0] : '') ||
        fallbackModalImg;
      setActiveImg(chosen);
    }
  }, [product]);

  if (!product) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-slate-500 uppercase">
              Produktdatenblatt · {product.id}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Main Top Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-5 space-y-2">
              <div className="bg-slate-100 rounded-xl overflow-hidden border border-slate-200 aspect-4/3">
                <img
                  src={activeImg || fallbackModalImg}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    if (e.currentTarget.src !== fallbackModalImg) {
                      e.currentTarget.src = fallbackModalImg;
                    }
                  }}
                />
              </div>

              {/* Multi-thumbnails gallery */}
              {validThumbnails.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {validThumbnails.map((imgUrl, i) => (
                    <img
                      key={i}
                      src={imgUrl}
                      alt={`Gallery ${i}`}
                      onClick={() => setActiveImg(imgUrl)}
                      className={`w-12 h-12 object-cover rounded-lg border cursor-pointer hover:border-emerald-500 shrink-0 transition-all ${
                        activeImg === imgUrl ? 'border-emerald-600 ring-2 ring-emerald-500/30' : 'border-slate-200'
                      }`}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="md:col-span-7 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="bg-slate-900 text-white px-2 py-0.5 rounded">
                  {product.id}
                </span>
                <span className="border border-slate-200 bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                  CAS {product.casNumber}
                </span>
                <span className="text-emerald-700 font-semibold">
                  {product.grade}
                </span>
                {product.physicalState && (
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                    {product.physicalState}
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                {product.name}
              </h2>
              {product.iupacName && (
                <p className="text-xs font-mono text-slate-500">
                  IUPAC: {product.iupacName}
                </p>
              )}

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-slate-400 font-mono">Summenformel</div>
                  <div className="font-mono font-bold text-slate-900">{product.formula || '–'}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-mono">Molmasse</div>
                  <div className="font-mono font-bold text-slate-900">{product.molarMass || '–'}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-mono">Garantierte Reinheit</div>
                  <div className="font-semibold text-emerald-700">{product.purity}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-mono">Gebindegröße</div>
                  <div className="font-semibold text-slate-900">{product.unit}</div>
                </div>
                {product.meltingPoint && (
                  <div>
                    <div className="text-slate-400 font-mono">Schmelzpunkt</div>
                    <div className="font-mono font-bold text-slate-900">{product.meltingPoint}</div>
                  </div>
                )}
                {product.boilingPoint && (
                  <div>
                    <div className="text-slate-400 font-mono">Siedepunkt</div>
                    <div className="font-mono font-bold text-slate-900">{product.boilingPoint}</div>
                  </div>
                )}
              </div>

              <div className="flex items-baseline justify-between pt-2">
                <div>
                  <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                    {product.price}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    inkl. gesetzl. MwSt. ({product.pricePerLiterOrKg})
                  </div>
                </div>

                <button
                  onClick={() => {
                    onClose();
                    onEnquire(product);
                  }}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Enquiry absenden</span>
                </button>
              </div>
            </div>
          </div>

          {/* Description & Technical Properties */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h4 className="text-xs uppercase font-mono tracking-wider text-slate-500">
              Beschreibung & Qualität
            </h4>
            <p className="text-sm text-slate-700 leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Applications */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h4 className="text-xs uppercase font-mono tracking-wider text-slate-500">
              Typische Anwendungsbereiche
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {product.applications.map((app, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-200 text-xs text-slate-700"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{app}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Safety, NFPA Diamond & GHS Classification */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                <Shield className="w-4 h-4 text-emerald-700" />
                <span>Gefahrstoff-, Sicherheits- & NFPA-Einstufung</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">GHS / CLP & NFPA 704</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              {/* NFPA 704 Diamond Display */}
              {product.nfpaDiamond && (
                <div className="flex items-center gap-4 p-3 bg-white rounded-lg border border-slate-200">
                  <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                    {/* Diamond 4 Quadrants */}
                    <div className="absolute inset-0 rotate-45 border-2 border-slate-900 overflow-hidden grid grid-cols-2 grid-rows-2 shadow-xs">
                      {/* Top: Flammability (Red) */}
                      <div className="bg-rose-600 flex items-center justify-center -rotate-45 font-bold text-white text-xs font-mono">
                        {product.nfpaDiamond.flammability}
                      </div>
                      {/* Right: Instability (Yellow) */}
                      <div className="bg-amber-400 flex items-center justify-center -rotate-45 font-bold text-slate-900 text-xs font-mono">
                        {product.nfpaDiamond.instability}
                      </div>
                      {/* Left: Health (Blue) */}
                      <div className="bg-blue-600 flex items-center justify-center -rotate-45 font-bold text-white text-xs font-mono">
                        {product.nfpaDiamond.health}
                      </div>
                      {/* Bottom: Special (White) */}
                      <div className="bg-white flex items-center justify-center -rotate-45 font-bold text-slate-900 text-[10px] font-mono">
                        {product.nfpaDiamond.special || '-'}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs space-y-0.5">
                    <div className="font-bold text-slate-800">NFPA 704 Gefahrendiamant</div>
                    <div className="text-[11px] text-slate-500">
                      Blau (Gesundheit): {product.nfpaDiamond.health} · Rot (Brand): {product.nfpaDiamond.flammability}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Gelb (Reaktion): {product.nfpaDiamond.instability} · Sonder: {product.nfpaDiamond.special || 'Keine'}
                    </div>
                  </div>
                </div>
              )}

              {/* GHS Pictograms & Hazard summary */}
              <div className="space-y-2">
                <div className="text-xs text-slate-700">
                  <strong className="text-slate-900 font-semibold">Gefahrstoffeinstufung: </strong>
                  {product.hazardSummary || 'Keine Gefahreneinstufung'}
                </div>

                {product.ghsPictograms && product.ghsPictograms.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {product.ghsPictograms.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-rose-50 text-rose-700 border border-rose-200 font-bold"
                      >
                        ⚠️ {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* SDS Document & Demo Video Direct Actions */}
            {(product.sdsDocumentUrl || product.demoVideoUrl) && (
              <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-3">
                {product.sdsDocumentUrl && (
                  <a
                    href={product.sdsDocumentUrl}
                    download={product.sdsDocumentName || 'Sicherheitsdatenblatt.pdf'}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 shadow-2xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-rose-600" />
                    <span>SDS Dokument herunterladen ({product.sdsDocumentName || 'PDF'})</span>
                  </a>
                )}

                {product.demoVideoUrl && (
                  <a
                    href={product.demoVideoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>▶ Demonstrations-Video abspielen</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Keine B2B-Mindestabnahme · Schneller Direktbezug
          </div>
          <button
            onClick={() => {
              onClose();
              onEnquire(product);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Jetzt anfragen</span>
          </button>
        </div>
      </div>
    </div>
  );
};
