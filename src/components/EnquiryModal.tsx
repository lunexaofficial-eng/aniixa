import React, { useState, useEffect } from 'react';
import { ChemicalProduct } from '../types/chemical';
import {
  X,
  MessageSquare,
  CheckCircle,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  Database,
  User,
  Mail,
  Phone,
  FileText
} from 'lucide-react';

interface EnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ChemicalProduct | null;
  whatsappNumber?: string;
  onEnquiryLogged?: (enquiry: any) => void;
}

const COUNTRY_CODES = [
  { code: '+49', country: 'DE Deutschland' },
  { code: '+43', country: 'AT Österreich' },
  { code: '+41', country: 'CH Schweiz' },
  { code: '+1', country: 'US / CA' },
  { code: '+44', country: 'UK' },
  { code: '+33', country: 'FR France' },
  { code: '+31', country: 'NL Niederlande' },
  { code: '+91', country: 'IN India' },
  { code: '+48', country: 'PL Polen' },
  { code: '+39', country: 'IT Italien' },
];

export const EnquiryModal: React.FC<EnquiryModalProps> = ({
  isOpen,
  onClose,
  product,
  whatsappNumber = '4915201234567',
  onEnquiryLogged,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+49');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('1 Standardgebinde');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [savedToNeon, setSavedToNeon] = useState(false);
  const [savedId, setSavedId] = useState<string | number | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [generatedWaUrl, setGeneratedWaUrl] = useState('');

  // Reset form when opened for a new product
  useEffect(() => {
    if (isOpen && product) {
      setIsSuccess(false);
      setCopied(false);
      setErrorMsg('');
      setSavedId(null);
      setGeneratedWaUrl('');
      // Set default note with fetched unit
      setNotes(`1x ${product.unit} zur schnellen Bereitstellung`);
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const buildWhatsappMessage = (currentPhone: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const imgUrl = product.thumbnail.startsWith('http')
      ? product.thumbnail
      : `${origin}${product.thumbnail}`;

    return [
      `*ANIIXA DEUTSCHLAND // PRODUKTANFRAGE*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `*PRODUKT-DATEN (SYSTEM-ABFRAGE):*`,
      `• *Produkt:* ${product.name}`,
      `• *Artikel-ID:* ${product.id}`,
      `• *CAS-Nummer:* ${product.casNumber}`,
      `• *Preis:* ${product.price} (${product.unit})`,
      `• *Reinheit / Qualität:* ${product.purity} · ${product.grade}`,
      `• *Formel:* ${product.formula} (${product.molarMass})`,
      `• *Produktbild-Referenz:* ${imgUrl}`,
      ``,
      `*KÄUFER-ANGABEN:*`,
      `• *Name:* ${fullName.trim()}`,
      `• *E-Mail:* ${email.trim()}`,
      `• *Telefon:* ${currentPhone.trim()}`,
      `• *Menge & Anmerkung:* ${notes.trim() || '1 Standard-Gebinde'}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `_Direktanfrage via Aniixa ohne B2B-Mindestbestellwert oder Gewerbenachweis._`,
    ].join('\n');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim()) {
      setErrorMsg('Bitte geben Sie Ihren vollständigen Namen ein.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Bitte geben Sie eine gültige E-Mail-Adresse ein.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Bitte geben Sie Ihre Telefonnummer ein.');
      return;
    }

    const fullPhone = `${countryCode} ${phone.trim()}`;
    const rawMessage = buildWhatsappMessage(fullPhone);
    const cleanWaTarget = whatsappNumber.replace(/[^0-9]/g, '');
    const waUrl = `https://wa.me/${cleanWaTarget}?text=${encodeURIComponent(rawMessage)}`;

    setIsSubmitting(true);

    try {
      // 1. Post to backend API to log into Neon PostgreSQL
      const response = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          productName: product.name,
          productPrice: `${product.price} / ${product.unit}`,
          productThumbnail: product.thumbnail,
          buyerName: fullName.trim(),
          buyerEmail: email.trim(),
          buyerPhone: fullPhone,
          notes: notes.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSavedToNeon(Boolean(data.savedToNeon));
        setSavedId(data.enquiry?.id || `REQ-${Date.now().toString().slice(-4)}`);
        if (onEnquiryLogged && data.enquiry) {
          onEnquiryLogged(data.enquiry);
        }
      }
    } catch (err) {
      console.warn('API call skipped or offline, continuing directly to WhatsApp:', err);
      setSavedId(`REQ-${Date.now().toString().slice(-4)}`);
    } finally {
      setIsSubmitting(false);
      setGeneratedWaUrl(waUrl);
      setIsSuccess(true);

      // 2. Immediately open WhatsApp with all pre-filled details!
      window.open(waUrl, '_blank');
    }
  };

  const handleCopyMessage = () => {
    const fullPhone = `${countryCode} ${phone.trim()}`;
    const msg = buildWhatsappMessage(fullPhone);
    navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 font-mono">
              Aniixa · WhatsApp Sofort-Dispatch
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-200/50 transition-colors cursor-pointer"
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Fetched Product Card Box (Always Visible) */}
        <div className="p-4 sm:p-5 bg-gradient-to-b from-slate-50 to-white border-b border-slate-200">
          <div className="text-[11px] uppercase font-mono tracking-wider text-emerald-800 font-semibold mb-2">
            Automatisch abgerufene Produktdaten
          </div>
          
          <div className="flex items-start gap-4">
            {/* Fetched Product Thumbnail */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 shadow-2xs">
              {(() => {
                const fallbackImg = 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=400&q=80';
                const safeSrc =
                  (product.thumbnail && product.thumbnail.trim()) ||
                  (product.primaryThumbnail && product.primaryThumbnail.trim()) ||
                  (product.thumbnails && product.thumbnails.find((t) => t && t.trim())) ||
                  fallbackImg;
                return (
                  <img
                    src={safeSrc}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      if (e.currentTarget.src !== fallbackImg) {
                        e.currentTarget.src = fallbackImg;
                      }
                    }}
                  />
                );
              })()}
            </div>

            {/* Fetched Product Details */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="px-1.5 py-0.5 bg-slate-900 text-white rounded text-[11px]">
                  {product.id}
                </span>
                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 text-[11px]">
                  CAS {product.casNumber}
                </span>
                <span className="text-emerald-700 font-medium">
                  {product.purity}
                </span>
              </div>

              <h3 className="font-bold text-slate-900 text-base sm:text-lg leading-tight truncate">
                {product.name}
              </h3>

              <div className="flex items-baseline gap-3 pt-0.5">
                <span className="text-lg font-bold font-mono text-emerald-700 tabular-nums">
                  {product.price}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  Gebinde: {product.unit} ({product.pricePerLiterOrKg})
                </span>
              </div>

              <div className="text-xs text-slate-500 truncate">
                Qualität: {product.grade} · {product.packaging}
              </div>
            </div>
          </div>
        </div>

        {/* Form or Success State */}
        {!isSuccess ? (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="text-xs text-slate-500">
              Geben Sie Ihre Kontaktdaten ein. Nach Klick auf{' '}
              <strong className="text-slate-800">„Anfrage über WhatsApp absenden“</strong> öffnet sich
              WhatsApp automatisch mit allen abgerufenen Produktdetails vorformuliert.
            </div>

            {/* Buyer Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Vollständiger Name / Ansprechpartner *</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="z. B. Dr. Jonas Weber oder Maria Schneider"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
              />
            </div>

            {/* Buyer Email & Phone Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Buyer Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>E-Mail-Adresse *</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@beispiel-labor.de"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                />
              </div>

              {/* Buyer Phone Number with Country Code */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>WhatsApp Telefonnummer *</span>
                </label>
                <div className="flex gap-1.5">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-28 px-2 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer"
                  >
                    {COUNTRY_CODES.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.code} {item.country.split(' ')[0]}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="170 1234567"
                    className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Quantity / Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Gewünschte Menge / Labor-Anmerkung</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="z. B. 2 Flaschen, Lieferung nach München mit Analysenzertifikat"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
              />
            </div>

            {/* Trust Assurance */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Kein Mindestbestellwert · Direkte technische Beratung</span>
              </span>
              <span className="font-mono text-[11px] text-slate-400 hidden sm:inline">
                Ziel-WhatsApp: +{whatsappNumber}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:flex-1 py-3 px-5 bg-[#25D366] hover:bg-[#20bd5a] active:bg-[#1da850] text-white font-bold rounded-lg transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <MessageSquare className="w-5 h-5 fill-current" />
                <span>
                  {isSubmitting
                    ? 'Verarbeite Anfrage...'
                    : 'Anfrage über WhatsApp absenden'}
                </span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-3 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
            </div>
          </form>
        ) : (
          /* Success Screen */
          <div className="p-6 sm:p-8 space-y-6 text-center">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900">
                WhatsApp wurde erfolgreich geöffnet!
              </h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Alle Produktdaten (ID: <span className="font-mono font-semibold">{product.id}</span>, Preis: {product.price}) und Ihre Kontaktdaten wurden in WhatsApp übertragen.
              </p>
            </div>

            {/* Neon DB Confirmation badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono text-slate-700">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {savedToNeon
                  ? `In Neon PostgreSQL archiviert (ID: ${savedId})`
                  : `Anfrage erfasst (ID: ${savedId})`}
              </span>
            </div>

            {/* Secondary actions if popup was blocked */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              {generatedWaUrl && (
                <a
                  href={generatedWaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>WhatsApp erneut öffnen</span>
                </a>
              )}

              <button
                onClick={handleCopyMessage}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Inhalt kopiert!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Text kopieren</span>
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                Fenster schließen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
