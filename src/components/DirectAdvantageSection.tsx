import React from 'react';
import { ShieldAlert, Zap, Award, CheckCheck, FileText, ArrowRight } from 'lucide-react';

export const DirectAdvantageSection: React.FC = () => {
  return (
    <section id="vorteile" className="py-14 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl space-y-3 mb-10">
          <div className="text-xs uppercase font-mono tracking-widest text-emerald-700 font-semibold">
            Das Aniixa Direktmarkt-Prinzip
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Chemikalienbezug ohne B2B-Hürden und Bürokratie.
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            In klassischen Großhandelsportalen scheitern viele private Forscher, Werkstätten und Labore an Mindestbestellwerten, Handelsregister-Nachweisen oder wochenlangen Freischaltungen. Aniixa schließt diese Lücke.
          </p>
        </div>

        {/* 4 Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Pillar 1 */}
          <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              01
            </div>
            <h3 className="font-bold text-slate-900 text-base">
              Kein B2B-Zwang
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Kein Gewerbeschein, keine HRB-Nummer oder Umsatzsteuer-ID zwingend erforderlich. Offener Zugang für Forschung, Bildung und Handwerk.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-slate-200 text-slate-800 flex items-center justify-center font-bold">
              02
            </div>
            <h3 className="font-bold text-slate-900 text-base">
              Ab 1 Gebinde (Kein Minimum)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Sie benötigen nur 1.000 ml Reinst-Ethanol oder 1 kg Citronensäure? Sie kaufen genau die Menge, die Sie für Ihre Versuche benötigen.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-slate-200 text-slate-800 flex items-center justify-center font-bold">
              03
            </div>
            <h3 className="font-bold text-slate-900 text-base">
              Zertifizierte Labor-Reinheit
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Europäisches Arzneibuch (Ph. Eur.), Deutsches Arzneibuch (DAB) und pro analysi (p.a.) Spezifikationen mit lückenlosem Chargen-CoA.
            </p>
          </div>

          {/* Pillar 4 */}
          <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              04
            </div>
            <h3 className="font-bold text-slate-900 text-base">
              WhatsApp Direktanfrage
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Ein Klick auf „Enquiry senden“ übernimmt Artikelnummer, Bild und Preis automatisch und übergibt alles vorformuliert an WhatsApp.
            </p>
          </div>
        </div>

        {/* Quality Norms Banner */}
        <div id="standards" className="mt-8 p-6 bg-slate-900 text-slate-100 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-mono text-emerald-400 uppercase tracking-wider">
              Normen & Richtlinien
            </div>
            <div className="font-bold text-base text-white">
              DIN EN ISO 9001 · GHS/CLP Kennzeichnung · REACH Konform
            </div>
            <p className="text-xs text-slate-400">
              Jedes Gebinde wird nach strengen deutschen Gefahrstoff- und Verpackungsrichtlinien geprüft und versiegelt.
            </p>
          </div>

          <div className="text-xs font-mono text-slate-300 bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 shrink-0">
            Standort: Deutschland / EU
          </div>
        </div>

      </div>
    </section>
  );
};
