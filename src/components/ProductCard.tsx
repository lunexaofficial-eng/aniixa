import React from 'react';
import { ChemicalProduct } from '../types/chemical';
import { MessageSquare, ArrowUpRight, FlaskConical, CheckCircle2 } from 'lucide-react';

interface ProductCardProps {
  product: ChemicalProduct;
  onEnquire: (product: ChemicalProduct) => void;
  onViewDetails: (product: ChemicalProduct) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onEnquire,
  onViewDetails,
}) => {
  return (
    <article className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-slate-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between">
      {/* Top: Image & Essential Tags */}
      <div>
        <div className="relative aspect-4/3 bg-slate-100 overflow-hidden border-b border-slate-100">
          <img
            src={product.thumbnail}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
            referrerPolicy="no-referrer"
            onError={(e) => {
              // Fallback to solid technical card if image cannot render
              e.currentTarget.style.display = 'none';
            }}
          />
          {/* Subtle overlay indicators */}
          <div className="absolute top-3 left-3">
            <span className="font-mono text-xs bg-slate-900/80 backdrop-blur-sm text-white px-2 py-0.5 rounded">
              {product.id}
            </span>
          </div>

          <div className="absolute top-3 right-3">
            <span className="font-mono text-xs bg-white/90 backdrop-blur-sm text-slate-800 px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
              CAS {product.casNumber}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-3">
          {/* Formula & Grade Line */}
          <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
            <span className="text-emerald-700 font-medium">
              {product.formula}
            </span>
            <span>{product.grade}</span>
          </div>

          {/* Product Title */}
          <h3
            onClick={() => onViewDetails(product)}
            className="font-bold text-slate-900 text-base leading-snug cursor-pointer hover:text-emerald-700 transition-colors line-clamp-2"
          >
            {product.name}
          </h3>

          {/* Chemical Specs / Metadata without pill clutter */}
          <div className="text-xs text-slate-500 space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Reinheit:</span>
              <span className="font-semibold text-slate-700">{product.purity}</span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-400">Gebinde:</span>
              <span className="text-slate-700">{product.unit}</span>
            </div>
            <div className="text-slate-500 truncate" title={product.packaging}>
              {product.packaging}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Price & Enquiry Action */}
      <div className="p-4 sm:p-5 pt-0 mt-2 space-y-3 border-t border-slate-100/80">
        <div className="flex items-baseline justify-between pt-3">
          <div>
            <div className="text-lg font-bold font-mono text-slate-900 tabular-nums">
              {product.price}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              inkl. MwSt. · {product.pricePerLiterOrKg}
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs text-emerald-700 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{product.leadTime}</span>
          </div>
        </div>

        {/* Action Buttons: Enquiry Button Prominently Rendered on Every Product */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          {/* Enquiry Button: Fetches product info into popup */}
          <button
            type="button"
            onClick={() => onEnquire(product)}
            className="sm:col-span-3 w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs whitespace-nowrap cursor-pointer"
            aria-label={`Enquiry für ${product.name}`}
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span>Enquiry senden</span>
          </button>

          {/* View Details Button */}
          <button
            type="button"
            onClick={() => onViewDetails(product)}
            className="sm:col-span-2 w-full flex items-center justify-center gap-1 px-2.5 py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            title="Produktdatenblatt ansehen"
          >
            <span>Details</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
};
