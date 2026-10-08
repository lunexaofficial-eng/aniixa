import React, { useState, useEffect } from 'react';
import {
  Key,
  Cloud,
  Mail,
  Globe,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Send,
  Trash2,
  Server,
  ShieldCheck,
  HardDrive
} from 'lucide-react';

interface KeysManagementProps {
  token: string;
}

type KeysSubTab = 'r2' | 'resend' | 'domains';

export const KeysManagement: React.FC<KeysManagementProps> = ({ token }) => {
  const [activeTab, setActiveTab] = useState<KeysSubTab>('r2');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Cloudflare R2 State
  const [r2AccountId, setR2AccountId] = useState('');
  const [r2AccessKeyId, setR2AccessKeyId] = useState('');
  const [r2SecretAccessKey, setR2SecretAccessKey] = useState('');
  const [r2BucketName, setR2BucketName] = useState('');
  const [r2PublicUrl, setR2PublicUrl] = useState('');
  const [showR2Secret, setShowR2Secret] = useState(false);
  const [savingR2, setSavingR2] = useState(false);
  const [testingR2, setTestingR2] = useState(false);
  const [r2Status, setR2Status] = useState<string | null>(null);

  // Resend.com State
  const [resendApiKey, setResendApiKey] = useState('');
  const [resendFromEmail, setResendFromEmail] = useState('Aniixa Labor <onboarding@resend.dev>');
  const [showResendKey, setShowResendKey] = useState(false);
  const [savingResend, setSavingResend] = useState(false);
  const [testingResend, setTestingResend] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  // Test Email State
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  // Resend Domains State
  const [newDomainName, setNewDomainName] = useState('');
  const [newDomainRegion, setNewDomainRegion] = useState('eu-west-1 (Frankfurt / Europa)');
  const [domainsList, setDomainsList] = useState<any[]>([]);
  const [addingDomain, setAddingDomain] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Fetch initial keys from backend
  const fetchKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/keys', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.cloudflareR2) {
          setR2AccountId(data.cloudflareR2.accountId || '');
          setR2AccessKeyId(data.cloudflareR2.accessKeyId || '');
          setR2SecretAccessKey(data.cloudflareR2.secretAccessKey || '');
          setR2BucketName(data.cloudflareR2.bucketName || '');
          setR2PublicUrl(data.cloudflareR2.publicUrl || '');
          setR2Status('Konfiguriert & Aktiv');
        }
        if (data.resend) {
          setResendApiKey(data.resend.apiKey || '');
          setResendFromEmail(data.resend.fromEmail || 'Aniixa Labor <onboarding@resend.dev>');
          setResendStatus('Konfiguriert & Aktiv');
        }
        if (data.resendDomains) {
          setDomainsList(data.resendDomains);
        }
      }
    } catch (err) {
      console.warn('Error loading keys:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, [token]);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 5000);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // 1. Save Cloudflare R2 Keys
  const handleSaveR2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingR2(true);
    setNotice(null);

    try {
      const res = await fetch('/api/admin/keys/r2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountId: r2AccountId,
          accessKeyId: r2AccessKeyId,
          secretAccessKey: r2SecretAccessKey,
          bucketName: r2BucketName,
          publicUrl: r2PublicUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Speichern fehlgeschlagen.');

      setR2Status('Konfiguriert & Aktiv');
      showNotification('success', data.message || 'Cloudflare R2 Schlüssel erfolgreich gespeichert.');
    } catch (err: any) {
      showNotification('error', err.message || 'Fehler beim Speichern der R2 Schlüssel.');
    } finally {
      setSavingR2(false);
    }
  };

  // Test R2
  const handleTestR2 = async () => {
    setTestingR2(true);
    try {
      const res = await fetch('/api/admin/keys/r2/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountId: r2AccountId,
          accessKeyId: r2AccessKeyId,
          secretAccessKey: r2SecretAccessKey,
          bucketName: r2BucketName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Test fehlgeschlagen.');
      showNotification('success', data.message || 'Cloudflare R2 Verbindung verifiziert.');
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setTestingR2(false);
    }
  };

  // 2. Save Resend Key
  const handleSaveResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingResend(true);
    setNotice(null);

    try {
      const res = await fetch('/api/admin/keys/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          apiKey: resendApiKey,
          fromEmail: resendFromEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Speichern fehlgeschlagen.');

      setResendStatus('Konfiguriert & Aktiv');
      showNotification('success', data.message || 'Resend API-Schlüssel gespeichert.');
    } catch (err: any) {
      showNotification('error', err.message || 'Fehler beim Speichern.');
    } finally {
      setSavingResend(false);
    }
  };

  // Test Resend API
  const handleTestResend = async () => {
    setTestingResend(true);
    try {
      const res = await fetch('/api/admin/keys/resend/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ apiKey: resendApiKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Resend Validierung fehlgeschlagen.');
      showNotification('success', data.message || 'Resend API-Schlüssel erfolgreich validiert.');
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setTestingResend(false);
    }
  };

  // Send Test Email
  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailRecipient) return;
    setSendingTestEmail(true);

    try {
      const res = await fetch('/api/admin/keys/resend/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recipientEmail: testEmailRecipient }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Versand fehlgeschlagen.');

      showNotification('success', data.message || `Test-E-Mail versendet an ${testEmailRecipient}`);
      setTestEmailRecipient('');
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setSendingTestEmail(false);
    }
  };

  // 3. Add Verified Domain
  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainName) return;
    setAddingDomain(true);

    try {
      const res = await fetch('/api/admin/keys/resend/domain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          domain: newDomainName,
          region: newDomainRegion,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hinzufügen fehlgeschlagen.');

      showNotification('success', data.message || `Domain ${newDomainName} erfolgreich hinzugefügt.`);
      setNewDomainName('');
      fetchKeys();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setAddingDomain(false);
    }
  };

  // Delete Domain
  const handleDeleteDomain = async (id: string, domainName: string) => {
    if (!confirm(`Möchten Sie die Domain "${domainName}" wirklich entfernen?`)) return;
    try {
      const res = await fetch(`/api/admin/keys/resend/domain/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showNotification('success', `Domain ${domainName} entfernt.`);
        fetchKeys();
      }
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Banner / Explanation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="text-xs uppercase font-mono tracking-wider text-emerald-400 font-semibold flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5" />
            <span>Keys & Storage Management</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            API-Schlüssel & Speicherverwaltung
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl pt-0.5">
            Tragen Sie Ihre Cloudflare R2 und Resend.com Zugangsdaten direkt hier ein. Alle Schlüssel werden sicher in Neon PostgreSQL gespeichert — keine manuellen Umgebungsvariablen nötig.
          </p>
        </div>

        <button
          onClick={fetchKeys}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono inline-flex items-center gap-1.5 transition-colors cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Neu laden</span>
        </button>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            notice.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/60 border-rose-800 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{notice.text}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Sub-Tabs: R2 Storage vs Resend Key vs Resend Domains */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('r2')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'r2'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>Cloudflare R2 Storage</span>
          {r2Status && (
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('resend')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'resend'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Resend.com API-Schlüssel</span>
          {resendStatus && (
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('domains')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'domains'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Verifizierte Domains ({domainsList.length})</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. CLOUDFLARE R2 STORAGE KEYS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'r2' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
          
          {/* Form (8 cols) */}
          <div className="lg:col-span-8 bg-slate-950/80 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800/80 pb-4">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-emerald-400" />
                  <span>Cloudflare R2 Object Storage Zugangsdaten</span>
                </h3>
                <p className="text-xs text-slate-400 pt-0.5">
                  S3-kompatibler Cloud-Speicher für hochauflösende Sicherheitsdatenblätter (SDS) und Produktbilder.
                </p>
              </div>

              <div className="text-right">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border ${
                  r2AccountId && r2AccessKeyId
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                    : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${r2AccountId ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  <span>{r2AccountId ? 'R2 Aktiv' : 'Nicht konfiguriert'}</span>
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveR2} className="space-y-4">
              {/* Account ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Cloudflare Account-ID *
                </label>
                <input
                  type="text"
                  required
                  value={r2AccountId}
                  onChange={(e) => setR2AccountId(e.target.value)}
                  placeholder="z. B. d3b07384d113edec49eaa6238ad5ff00"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                />
              </div>

              {/* Bucket Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Bucket Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={r2BucketName}
                    onChange={(e) => setR2BucketName(e.target.value)}
                    placeholder="aniixa-chemical-storage"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Öffentliche Bucket-URL / CDN (Optional)
                  </label>
                  <input
                    type="url"
                    value={r2PublicUrl}
                    onChange={(e) => setR2PublicUrl(e.target.value)}
                    placeholder="https://pub-xxx.r2.dev oder cdn.aniixa.de"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              {/* Access Key ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Access Key ID *
                </label>
                <input
                  type="text"
                  required
                  value={r2AccessKeyId}
                  onChange={(e) => setR2AccessKeyId(e.target.value)}
                  placeholder="z. B. 9b578c18742d13bb9374028475923984"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                />
              </div>

              {/* Secret Access Key */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Secret Access Key *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowR2Secret(!showR2Secret)}
                    className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1 cursor-pointer"
                  >
                    {showR2Secret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showR2Secret ? 'Verbergen' : 'Anzeigen'}</span>
                  </button>
                </div>
                <input
                  type={showR2Secret ? 'text' : 'password'}
                  required
                  value={r2SecretAccessKey}
                  onChange={(e) => setR2SecretAccessKey(e.target.value)}
                  placeholder="z. B. a39b8f84902c..."
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                />
              </div>

              {/* Auto-generated Endpoint Info */}
              {r2AccountId && (
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-[11px] font-mono space-y-1">
                  <div className="text-slate-400">Automatisch berechneter S3-Endpunkt:</div>
                  <div className="text-emerald-400 select-all">
                    https://{r2AccountId.trim()}.r2.cloudflarestorage.com
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={savingR2}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {savingR2 ? 'Speichere in Neon DB...' : 'Cloudflare R2 Schlüssel speichern'}
                </button>

                <button
                  type="button"
                  onClick={handleTestR2}
                  disabled={testingR2 || !r2AccountId || !r2AccessKeyId}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Server className="w-3.5 h-3.5" />
                  <span>{testingR2 ? 'Verbinde...' : 'Verbindung testen'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Guide & Help (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-5 bg-slate-950/70 border border-slate-800 rounded-2xl text-xs space-y-3">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Wo finde ich die R2-Schlüssel?</span>
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-slate-400 text-[11px] leading-relaxed">
                <li>Melden Sie sich im <strong>Cloudflare Dashboard</strong> an.</li>
                <li>Wählen Sie im linken Menü <strong>R2 Object Storage</strong>.</li>
                <li>Klicken Sie auf <strong>Manage R2 API Tokens</strong> rechts oben.</li>
                <li>Erstellen Sie einen Token mit <strong>Admin Read & Write</strong> Rechten.</li>
                <li>Kopieren Sie <em>Account ID</em>, <em>Access Key ID</em> und <em>Secret Access Key</em> hierher.</li>
              </ol>

              <div className="pt-2">
                <a
                  href="https://dash.cloudflare.com/?to=/:account/r2"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:underline font-mono"
                >
                  <span>Cloudflare R2 Dashboard öffnen</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl text-[11px] text-slate-400 font-mono">
              <div className="text-white font-semibold mb-1">Vorteil für den Markt:</div>
              Keine Bandbreitenkosten (Egress Fees: 0,00 €) beim Ausliefern von Labor-PDFs und Analysenzertifikaten.
            </div>
          </div>

        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. RESEND.COM API KEY MANAGEMENT */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'resend' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
          
          {/* Form (8 cols) */}
          <div className="lg:col-span-8 bg-slate-950/80 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800/80 pb-4">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Mail className="w-5 h-5 text-emerald-400" />
                  <span>Resend.com E-Mail API-Konfiguration</span>
                </h3>
                <p className="text-xs text-slate-400 pt-0.5">
                  Schneller, transaktionaler E-Mail-Dienst für Bestellbestätigungen und Labor-Anfragen.
                </p>
              </div>

              <div className="text-right">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border ${
                  resendApiKey
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                    : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${resendApiKey ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  <span>{resendApiKey ? 'Resend Aktiv' : 'Nicht konfiguriert'}</span>
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveResend} className="space-y-4">
              {/* API Key */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Resend API Key (beginnt mit "re_") *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowResendKey(!showResendKey)}
                    className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1 cursor-pointer"
                  >
                    {showResendKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showResendKey ? 'Verbergen' : 'Anzeigen'}</span>
                  </button>
                </div>
                <input
                  type={showResendKey ? 'text' : 'password'}
                  required
                  value={resendApiKey}
                  onChange={(e) => setResendApiKey(e.target.value)}
                  placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                />
              </div>

              {/* Default From Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Standard Absender-E-Mail (From Address) *
                </label>
                <input
                  type="text"
                  required
                  value={resendFromEmail}
                  onChange={(e) => setResendFromEmail(e.target.value)}
                  placeholder="Aniixa Chemikalien <bestellung@aniixa.de>"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Hinweis: Solange Sie keine eigene Domain verifiziert haben, können Sie <code>onboarding@resend.dev</code> als Test-Absender nutzen.
                </span>
              </div>

              {/* Save & Test Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={savingResend}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {savingResend ? 'Speichere...' : 'Resend API-Schlüssel speichern'}
                </button>

                <button
                  type="button"
                  onClick={handleTestResend}
                  disabled={testingResend || !resendApiKey}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Server className="w-3.5 h-3.5" />
                  <span>{testingResend ? 'Prüfe Key...' : 'API-Schlüssel testen'}</span>
                </button>
              </div>
            </form>

            {/* Test Email Dispatch Card */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <h4 className="font-bold text-white text-xs uppercase font-mono tracking-wider">
                Echte Test-E-Mail über Resend senden
              </h4>
              <form onSubmit={handleSendTestEmail} className="flex gap-2">
                <input
                  type="email"
                  required
                  value={testEmailRecipient}
                  onChange={(e) => setTestEmailRecipient(e.target.value)}
                  placeholder="Ihre E-Mail (z. B. test@labor.de)"
                  className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={sendingTestEmail || !resendApiKey}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingTestEmail ? 'Sende...' : 'Test senden'}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Guide & Help (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-5 bg-slate-950/70 border border-slate-800 rounded-2xl text-xs space-y-3">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-400" />
                <span>Wo finde ich den Resend Key?</span>
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-slate-400 text-[11px] leading-relaxed">
                <li>Öffnen Sie <strong>resend.com</strong> und loggen Sie sich ein.</li>
                <li>Gehen Sie zu <strong>API Keys</strong> im linken Navigationsmenü.</li>
                <li>Klicken Sie auf <strong>Create API Key</strong>.</li>
                <li>Wählen Sie <em>Full Access</em> oder <em>Sending Access</em>.</li>
                <li>Kopieren Sie den Schlüssel (beginnt mit <code>re_</code>) hier hinein.</li>
              </ol>

              <div className="pt-2">
                <a
                  href="https://resend.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:underline font-mono"
                >
                  <span>Resend API Keys öffnen</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. RESEND VERIFIED DOMAINS MANAGEMENT */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'domains' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Add Domain Form Card */}
          <div className="p-6 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-4">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Globe className="w-5 h-5 text-emerald-400" />
                <span>Neue Domain für den E-Mail-Versand verifizieren</span>
              </h3>
              <p className="text-xs text-slate-400 pt-0.5">
                Verbinden Sie Ihre eigene Absenderdomain (z. B. aniixa.de). Das System generiert automatisch alle nötigen DKIM-, SPF-, MX- und DMARC-Einträge für Ihren DNS-Anbieter.
              </p>
            </div>

            <form onSubmit={handleAddDomain} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-6">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Domainname *
                </label>
                <input
                  type="text"
                  required
                  value={newDomainName}
                  onChange={(e) => setNewDomainName(e.target.value)}
                  placeholder="z. B. aniixa.de oder mail.aniixa.de"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Versand-Region (Serverstandort)
                </label>
                <select
                  value={newDomainRegion}
                  onChange={(e) => setNewDomainRegion(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="eu-west-1 (Frankfurt / Europa)">eu-west-1 (Frankfurt / Europa)</option>
                  <option value="us-east-1 (Nordamerika)">us-east-1 (Nordamerika)</option>
                  <option value="ap-southeast-1 (Asien)">ap-southeast-1 (Asien)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={addingDomain || !newDomainName}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-40"
                >
                  {addingDomain ? 'Erstelle...' : 'Domain anlegen'}
                </button>
              </div>
            </form>
          </div>

          {/* List of Verified Domains */}
          <div className="space-y-4">
            <h3 className="font-bold text-white text-sm">
              Aktive & Konfigurierte Domains ({domainsList.length})
            </h3>

            {domainsList.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/70 border border-slate-800 rounded-xl text-slate-500 text-xs">
                Noch keine Domains hinterlegt. Fügen Sie oben Ihre erste Domain hinzu.
              </div>
            ) : (
              domainsList.map((dom) => (
                <div
                  key={dom.id}
                  className="p-5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-4"
                >
                  {/* Domain Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center font-bold font-mono">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-base font-bold text-white font-mono flex items-center gap-2">
                          <span>{dom.domain}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                            {dom.status === 'VERIFIED' ? '✓ Verifiziert' : dom.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Region: {dom.region || 'eu-west-1'} · Erstellt: {new Date(dom.createdAt).toLocaleDateString('de-DE')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeleteDomain(dom.id, dom.domain)}
                        className="px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-950/40 rounded border border-rose-900/50 transition-colors cursor-pointer"
                        title="Domain entfernen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* DNS Records Table */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-300 uppercase font-mono tracking-wider">
                      Erforderliche DNS-Einträge für Ihren DNS-Anbieter (Cloudflare / Namecheap / Hostinger)
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                            <th className="py-2 px-2.5">Typ</th>
                            <th className="py-2 px-2.5">Name / Host</th>
                            <th className="py-2 px-2.5">Wert / Ziel</th>
                            <th className="py-2 px-2.5">TTL</th>
                            <th className="py-2 px-2.5 text-right">Aktion</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-[11px]">
                          {(dom.records || []).map((rec: any, idx: number) => {
                            const copyId = `${dom.id}_${idx}`;
                            return (
                              <tr key={idx} className="hover:bg-slate-900/60 transition-colors">
                                <td className="py-2 px-2.5">
                                  <span className="px-1.5 py-0.5 bg-slate-800 text-emerald-300 rounded font-bold">
                                    {rec.type}
                                  </span>
                                </td>
                                <td className="py-2 px-2.5 text-slate-200 select-all font-mono">
                                  {rec.name}
                                </td>
                                <td className="py-2 px-2.5 text-slate-400 max-w-xs truncate select-all font-mono">
                                  {rec.value}
                                </td>
                                <td className="py-2 px-2.5 text-slate-500">{rec.ttl}</td>
                                <td className="py-2 px-2.5 text-right">
                                  <button
                                    onClick={() => copyToClipboard(rec.value, copyId)}
                                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded inline-flex items-center gap-1 cursor-pointer transition-colors"
                                    title="Wert kopieren"
                                  >
                                    {copiedKey === copyId ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                    <span>{copiedKey === copyId ? 'Kopiert' : 'Kopieren'}</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              ))
            )}
          </div>

        </div>
      )}

    </div>
  );
};
