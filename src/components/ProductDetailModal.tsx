import React from 'react';
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
            <div className="md:col-span-5 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 aspect-4/3">
              <img
                src={product.thumbnail}
                alt={product.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
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
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                {product.name}
              </h2>
              <p className="text-xs font-mono text-slate-500">
                IUPAC: {product.iupacName}
              </p>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-slate-400 font-mono">Summenformel</div>
                  <div className="font-mono font-bold text-slate-900">{product.formula}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-mono">Molmasse</div>
                  <div className="font-mono font-bold text-slate-900">{product.molarMass}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-mono">Garantierte Reinheit</div>
                  <div className="font-semibold text-emerald-700">{product.purity}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-mono">Gebindegröße</div>
                  <div className="font-semibold text-slate-900">{product.unit}</div>
                </div>
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

          {/* Safety & Compliance */}
          <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
              <Shield className="w-4 h-4 text-amber-700" />
              <span>Gefahrstoff & Einstufung (GHS / CLP)</span>
            </div>
            <div className="text-xs text-amber-800">
              {product.hazardSummary}
              {product.unNumber && ` · Transportnummer: ${product.unNumber}`}
            </div>
            <div className="text-[11px] text-amber-700/90">
              Sicherheitsdatenblatt (SDS / SDB) nach Verordnung (EG) Nr. 1907/2006 (REACH) wird bei Anfrage beigefügt.
            </div>
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
