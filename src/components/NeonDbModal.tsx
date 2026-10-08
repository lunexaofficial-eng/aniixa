import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertCircle, RefreshCw, X, Server, ShieldCheck, Clock } from 'lucide-react';
import { StoredEnquiry } from '../types/chemical';

interface NeonDbModalProps {
  isOpen: boolean;
  onClose: () => void;
  neonConnected: boolean;
  onRefreshStatus: () => void;
}

export const NeonDbModal: React.FC<NeonDbModalProps> = ({
  isOpen,
  onClose,
  neonConnected,
  onRefreshStatus,
}) => {
  const [enquiries, setEnquiries] = useState<StoredEnquiry[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'enquiries'>('status');

  const fetchEnquiries = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/enquiries');
      if (res.ok) {
        const data = await res.json();
        setEnquiries(data.enquiries || []);
      }
    } catch (e) {
      console.warn('Could not fetch inquiries:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchEnquiries();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-base">
              Aniixa · Neon PostgreSQL Datenbank-Integration
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('status')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'status'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Verbindungsstatus & Umgebungsvariable
          </button>
          <button
            onClick={() => {
              setActiveTab('enquiries');
              fetchEnquiries();
            }}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'enquiries'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Erfasste Anfragen</span>
            <span className="font-mono text-[11px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full">
              {enquiries.length}
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {activeTab === 'status' ? (
            <div className="space-y-4">
              {/* Status Box */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  neonConnected
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                {neonConnected ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <Server className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="font-bold text-sm">
                    {neonConnected
                      ? 'Live mit Neon PostgreSQL verbunden'
                      : 'Neon PostgreSQL Treiber initialisiert (Bereit für DATABASE_URL)'}
                  </div>
                  <p className="text-xs text-slate-600">
                    Die Anwendung liest <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[11px]">DATABASE_URL</code> aus den Umgebungsvariablen. Alle WhatsApp-Anfragen werden sofort in PostgreSQL persistiert.
                  </p>
                </div>
              </div>

              {/* Environment Variable Specification */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-700 uppercase font-mono tracking-wider">
                  Umgebungsvariable (.env.example)
                </div>
                <div className="bg-slate-900 text-slate-100 p-3.5 rounded-lg font-mono text-xs overflow-x-auto space-y-1">
                  <div className="text-slate-400"># Neon PostgreSQL connection string</div>
                  <div className="text-emerald-400">
                    DATABASE_URL="postgresql://neondb_owner:***@ep-cool-fog-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require"
                  </div>
                </div>
              </div>

              {/* Schema Specification */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-700 uppercase font-mono tracking-wider">
                  Automatisches Datenbankschema (Tabelle: enquiries)
                </div>
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-lg font-mono text-xs text-slate-700 space-y-1">
                  <div><span className="text-indigo-600">id</span> SERIAL PRIMARY KEY</div>
                  <div><span className="text-indigo-600">product_id</span> VARCHAR(100) — z. B. DE-CHEM-1082</div>
                  <div><span className="text-indigo-600">product_name</span> VARCHAR(255) — Chemikalienname</div>
                  <div><span className="text-indigo-600">product_price</span> VARCHAR(100) — Preis zum Anfragezeitpunkt</div>
                  <div><span className="text-indigo-600">buyer_name</span>, <span className="text-indigo-600">buyer_email</span>, <span className="text-indigo-600">buyer_phone</span></div>
                  <div><span className="text-indigo-600">created_at</span> TIMESTAMP WITH TIME ZONE DEFAULT NOW()</div>
                  <div><span className="text-indigo-600">whatsapp_sent</span> BOOLEAN DEFAULT TRUE</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => {
                    onRefreshStatus();
                    fetchEnquiries();
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Verbindung erneut prüfen</span>
                </button>

                <div className="text-xs text-slate-500 font-mono">
                  PostgreSQL Treiber: pg (node-postgres)
                </div>
              </div>
            </div>
          ) : (
            /* Enquiries List */
            <div className="space-y-3">
              {enquiries.length === 0 ? (
                <div className="text-center py-10 text-slate-500 space-y-2">
                  <Database className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs">
                    Noch keine Anfragen eingegangen. Klicken Sie auf „Enquiry senden“ bei einem Produkt, um den ersten Eintrag zu erstellen!
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {enquiries.map((enq) => (
                    <div
                      key={enq.id}
                      className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-xs transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                          <span>{enq.product_name}</span>
                          <span className="font-mono text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                            {enq.product_id}
                          </span>
                        </div>
                        <span className="font-mono text-emerald-700 font-bold">
                          {enq.product_price}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600 text-[11px]">
                        <span>Käufer: <strong>{enq.buyer_name}</strong></span>
                        <span>E-Mail: {enq.buyer_email}</span>
                        <span>Tel: {enq.buyer_phone}</span>
                      </div>

                      {enq.notes && (
                        <div className="text-[11px] text-slate-500 bg-white p-1.5 rounded border border-slate-200/60">
                          {enq.notes}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(enq.created_at).toLocaleString('de-DE')}</span>
                        </span>
                        <span className="text-emerald-700 font-semibold">
                          ✓ WhatsApp Dispatch aktiv
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
