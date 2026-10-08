import React from 'react';
import { Search, ShieldCheck, Truck, Clock, Sparkles } from 'lucide-react';
import heroImg from '../assets/images/hero_german_chemical_lab_1791425646760.jpg';

interface HeroProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: string;
  onCategorySelect: (cat: string) => void;
}

export const Hero: React.FC<HeroProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategorySelect,
}) => {
  const categories = ['Alle', 'Solvents', 'Acids & Bases', 'Salts & Reagents', 'Organic Compounds'];

  return (
    <section className="relative overflow-hidden bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Headlines & Search */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <div className="text-xs uppercase font-mono tracking-widest text-emerald-700 font-semibold">
                Aniixa · Deutscher Chemikalienmarkt
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-[1.15] text-balance">
                Hochreine Reagenzien direkt bei Aniixa anfragen.
              </h1>
              <p className="text-base sm:text-lg text-slate-600 max-w-2xl pt-1">
                Kein zähes B2B-Portal, kein Firmen-Handelsregisterzwang. Aniixa liefert transparente Einzelpreise, zertifizierte DIN & Ph. Eur. Reinheiten und direkten WhatsApp-Sofortdialog.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative max-w-xl">
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Produkt suchen nach Name, CAS-Nr. (z. B. 64-17-5) oder Formel..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all shadow-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="absolute right-3 text-xs text-slate-400 hover:text-slate-600 px-1 py-0.5"
                  >
                    Löschen
                  </button>
                )}
              </div>
            </div>

            {/* Category Segmented Selector */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs text-slate-400 font-mono mr-2">Kategorie:</span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => onCategorySelect(cat)}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {cat === 'Alle' ? 'Alle Chemikalien' : cat}
                </button>
              ))}
            </div>

            {/* Trust Markers without pills */}
            <div className="pt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500 border-t border-slate-100">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>DIN EN ISO & Ph. Eur. Reinheit</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Kein B2B-Mindestbestellwert</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Direkte WhatsApp-Anfrage</span>
              </span>
            </div>
          </div>

          {/* Right Column: Hero Image with German Lab Precision aesthetic */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-md bg-slate-100 aspect-4/3 sm:aspect-16/10 lg:aspect-4/3">
              <img
                src={heroImg}
                alt="Laborbank mit Analysenflaschen nach deutschem Standard"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent flex flex-col justify-end p-5 text-white">
                <div className="font-mono text-xs text-emerald-300">
                  DEUTSCHES QUALITÄTSLABOR
                </div>
                <div className="text-sm font-semibold text-white/95">
                  Chargengeprüfte Analysenreagenzien & Reinststoffe
                </div>
                <div className="text-xs text-white/70 font-mono pt-1">
                  Direktversand ab Zentrallager · Schnelle Bereitstellung
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
