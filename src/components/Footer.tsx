import React from 'react';
import { Database, MessageSquare } from 'lucide-react';

interface FooterProps {
  onOpenNeonModal: () => void;
  onOpenAdmin?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenNeonModal, onOpenAdmin }) => {
  return (
    <footer id="kontakt" className="bg-slate-950 text-slate-400 text-xs py-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <div className="space-y-3 md:col-span-2">
            <div className="text-white font-bold text-base tracking-tight flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-emerald-600 text-white font-mono text-xs flex items-center justify-center font-bold">A</span>
              <span>Aniixa Deutschland</span>
            </div>
            <p className="max-w-md text-slate-400 text-xs leading-relaxed">
              Aniixa ist der transparente Chemikalien- und Reagenzienmarkt nach deutschen Laborstandards. Unkomplizierter Direktbezug für Laboratorien, Forschungseinrichtungen, Universitäten und Privatlabore ohne künstliche B2B-Hürden.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={onOpenNeonModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 font-mono text-[11px] transition-colors cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>Neon PostgreSQL Status</span>
              </button>

              {onOpenAdmin && (
                <button
                  onClick={onOpenAdmin}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 rounded border border-slate-800 font-mono text-[11px] transition-colors cursor-pointer"
                >
                  <span>Admin-Portal</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-white font-semibold text-xs uppercase tracking-wider font-mono">
              Rechtliche Hinweise
            </div>
            <ul className="space-y-1.5 text-slate-400">
              <li>Chemikaliengesetz (ChemG) konform</li>
              <li>Sicherheitsdatenblätter nach REACH</li>
              <li>GHS / CLP Einstufungen</li>
              <li>Keine Abgabe an Minderjährige</li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="text-white font-semibold text-xs uppercase tracking-wider font-mono">
              Direktkontakt
            </div>
            <ul className="space-y-1.5 text-slate-400">
              <li>WhatsApp Support: +49 1520 1234567</li>
              <li>Dispatch: Montag – Freitag, 08:00 – 17:00 CET</li>
              <li>Zentrallager: Hessen / Deutschland</li>
              <li>Express-Versand mit Gefahrgutzulassung</li>
            </ul>
          </div>

        </div>

        <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            © {new Date().getFullYear()} Aniixa Deutschland. Alle Rechte vorbehalten.
          </div>
          <div className="font-mono">
            Aniixa Direct Reagent Marketplace · WhatsApp Fast-Track Inquiry System
          </div>
        </div>
      </div>
    </footer>
  );
};
