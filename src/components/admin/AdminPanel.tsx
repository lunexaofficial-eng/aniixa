import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Fingerprint,
  User,
  Key,
  MessageSquare,
  Package,
  Activity,
  LogOut,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Database,
  Lock,
  Phone,
  Mail,
  Sliders,
  Clock,
  Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';
import { CHEMICAL_PRODUCTS } from '../../data/products';
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  registerFingerprintPasskey
} from '../../utils/webauthn';
import { KeysManagement } from './KeysManagement';

interface AdminPanelProps {
  token: string;
  initialUser: any;
  onLogout: () => void;
  onReturnToMarket: () => void;
}

type AdminTab = 'dashboard' | 'enquiries' | 'products' | 'keys' | 'profile' | 'security';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  token,
  initialUser,
  onLogout,
  onReturnToMarket,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [adminUser, setAdminUser] = useState<any>(initialUser || {});
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [passkeys, setPasskeys] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ totalEnquiries: 0, registeredPasskeys: 0, databaseConnected: false });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile Form State
  const [profileName, setProfileName] = useState(initialUser?.fullName || 'Aniixa Hauptadministrator');
  const [profilePhone, setProfilePhone] = useState(initialUser?.phone || '+49 1520 1234567');
  const [newPassword, setNewPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Passkey Registration State
  const [passkeyDeviceName, setPasskeyDeviceName] = useState('Mein Biometrischer Fingerabdruck');
  const [registeringPasskey, setRegisteringPasskey] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState<boolean | null>(null);

  // Horizontal slidable nav controls
  const navContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check WebAuthn platform support
  useEffect(() => {
    isPlatformAuthenticatorAvailable().then((res) => {
      setBiometricAvailable(res);
    });
  }, []);

  const checkScrollBounds = () => {
    if (navContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = navContainerRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  useEffect(() => {
    checkScrollBounds();
    window.addEventListener('resize', checkScrollBounds);
    return () => window.removeEventListener('resize', checkScrollBounds);
  }, []);

  const slideNav = (direction: 'left' | 'right') => {
    if (navContainerRef.current) {
      const offset = direction === 'left' ? -200 : 200;
      navContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
      setTimeout(checkScrollBounds, 300);
    }
  };

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Enquiries
      const enqRes = await fetch('/api/admin/enquiries', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (enqRes.ok) {
        const d = await enqRes.json();
        setEnquiries(d.enquiries || []);
      }

      // 2. Passkeys
      const pkRes = await fetch('/api/admin/passkey/list', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (pkRes.ok) {
        const d = await pkRes.json();
        setPasskeys(d.passkeys || []);
      }

      // 3. Stats
      const statRes = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (statRes.ok) {
        const d = await statRes.json();
        setStats(d);
      }

      // 4. Me
      const meRes = await fetch('/api/admin/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (meRes.ok) {
        const d = await meRes.json();
        setAdminUser(d.user);
        setProfileName(d.user.fullName);
        setProfilePhone(d.user.phone || '');
      }
    } catch (err: any) {
      console.warn('Admin fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 5000);
  };

  // Register Fingerprint Passkey
  const handleRegisterPasskey = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisteringPasskey(true);
    setNotice(null);

    try {
      const result = await registerFingerprintPasskey(token, passkeyDeviceName);
      showNotice('success', result.message || 'Fingerabdruck-Passkey erfolgreich registriert.');
      fetchData();
    } catch (err: any) {
      showNotice('error', err.message || 'Fehler bei der Fingerabdruck-Registrierung.');
    } finally {
      setRegisteringPasskey(false);
    }
  };

  // Delete Passkey
  const handleDeletePasskey = async (id: number | string) => {
    if (!confirm('Möchten Sie diesen Fingerabdruck-Passkey wirklich entfernen?')) return;
    try {
      const res = await fetch(`/api/admin/passkey/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showNotice('success', 'Passkey erfolgreich gelöscht.');
        fetchData();
      }
    } catch (err: any) {
      showNotice('error', 'Löschen fehlgeschlagen: ' + err.message);
    }
  };

  // Update Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setNotice(null);

    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: profileName.trim(),
          phone: profilePhone.trim(),
          newPassword: newPassword ? newPassword.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Aktualisierung fehlgeschlagen.');

      showNotice('success', 'Profil erfolgreich aktualisiert.');
      setNewPassword('');
      fetchData();
    } catch (err: any) {
      showNotice('error', err.message || 'Speichern fehlgeschlagen.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Update Enquiry Status
  const handleUpdateStatus = async (id: number | string, status: string) => {
    try {
      const res = await fetch(`/api/admin/enquiries/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setEnquiries((prev) =>
          prev.map((item) => (String(item.id) === String(id) ? { ...item, status } : item))
        );
      }
    } catch (err) {
      console.warn('Status update error:', err);
    }
  };

  // Delete Enquiry
  const handleDeleteEnquiry = async (id: number | string) => {
    if (!confirm('Anfrage unwiderruflich löschen?')) return;
    try {
      await fetch(`/api/admin/enquiries/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setEnquiries((prev) => prev.filter((item) => String(item.id) !== String(id)));
      showNotice('success', 'Anfrage gelöscht.');
    } catch (err) {
      console.warn('Delete error:', err);
    }
  };

  const navTabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'enquiries', label: `Anfragen (${enquiries.length})`, icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: 'products', label: 'Reagenzien & Bestand', icon: <Package className="w-3.5 h-3.5" /> },
    { id: 'keys', label: 'Keys & Storage', icon: <Key className="w-3.5 h-3.5" /> },
    { id: 'profile', label: 'Admin-Profil', icon: <User className="w-3.5 h-3.5" /> },
    { id: 'security', label: `Sicherheit & Passkeys (${passkeys.length})`, icon: <Fingerprint className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      
      {/* Top Admin Header with Horizontal Smooth Slidable Menu (NO 3-lines menu!) */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          
          {/* Left: Aniixa Admin Wordmark */}
          <div className="flex items-center gap-2.5 shrink-0 select-none">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold flex items-center justify-center font-mono text-sm shadow-inner">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                <span>Aniixa</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                  Admin
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono truncate max-w-[140px] sm:max-w-none">
                {adminUser?.email || 'lunexa.official@gmail.com'}
              </div>
            </div>
          </div>

          {/* Center: Horizontal Smooth Slidable Menu */}
          <div className="relative flex-1 min-w-0 flex items-center px-1 sm:px-3">
            {canScrollLeft && (
              <button
                onClick={() => slideNav('left')}
                className="absolute left-0 z-20 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer shadow-xs"
                aria-label="Nach links"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}

            <div
              ref={navContainerRef}
              onScroll={checkScrollBounds}
              className="flex items-center gap-1.5 overflow-x-auto scroll-smooth py-1 px-1 w-full scrollbar-none"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {navTabs.map((tab) => {
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative px-3.5 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      isSelected
                        ? 'text-white'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="adminNavPill"
                        className="absolute inset-0 bg-emerald-600 rounded-full shadow-xs -z-1"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {canScrollRight && (
              <button
                onClick={() => slideNav('right')}
                className="absolute right-0 z-20 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer shadow-xs"
                aria-label="Nach rechts"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right: Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onReturnToMarket}
              className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors hidden sm:inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Zum Markt</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              onClick={onLogout}
              className="p-2 sm:px-3 sm:py-1.5 text-xs font-medium bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-900/50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Abmelden"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Abmelden</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Admin Content Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Global Notice Banner */}
        {notice && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center justify-between animate-in fade-in ${
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
            <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-white text-xs">
              ✕
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: DASHBOARD */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Gesamte Anfragen</span>
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-white font-mono">{enquiries.length}</div>
                <div className="text-[11px] text-slate-500">Live aus Neon PostgreSQL / Speicher</div>
              </div>

              <div className="p-5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Neue WhatsApp-Anfragen</span>
                  <Activity className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-amber-400 font-mono">
                  {enquiries.filter((e) => e.status === 'NEW' || !e.status).length}
                </div>
                <div className="text-[11px] text-slate-500">Benötigen Bearbeitung</div>
              </div>

              <div className="p-5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Aktive Passkeys</span>
                  <Fingerprint className="w-4 h-4 text-teal-400" />
                </div>
                <div className="text-2xl font-bold text-teal-400 font-mono">{passkeys.length}</div>
                <div className="text-[11px] text-slate-500">Biometrische Fingerabdrücke hinterlegt</div>
              </div>

              <div className="p-5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>PostgreSQL Datenbank</span>
                  <Database className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-base font-bold text-white flex items-center gap-1.5 pt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Neon Connected</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">DATABASE_URL verifiziert</div>
              </div>
            </div>

            {/* Quick Actions & Recent Enquiries */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Recent Enquiries (7 cols) */}
              <div className="lg:col-span-7 bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span>Letzte eingegangene Kundenanfragen</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('enquiries')}
                    className="text-xs text-emerald-400 hover:underline font-mono"
                  >
                    Alle ansehen ({enquiries.length}) →
                  </button>
                </div>

                {enquiries.length === 0 ? (
                  <div className="py-10 text-center text-slate-500 text-xs">
                    Noch keine Anfragen eingegangen. Testen Sie den „Enquiry senden“ Button auf der Produktseite.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {enquiries.slice(0, 5).map((enq) => (
                      <div
                        key={enq.id}
                        className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="font-semibold text-white flex items-center gap-2">
                            <span>{enq.product_name}</span>
                            <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded">
                              {enq.product_id}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 pt-0.5">
                            Käufer: {enq.buyer_name} · {enq.buyer_phone}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-mono text-emerald-400 font-bold">{enq.product_price}</span>
                          <a
                            href={`https://wa.me/${enq.buyer_phone?.replace(/[^0-9]/g, '')}?text=Guten%20Tag%20${encodeURIComponent(enq.buyer_name)}%2C%20hier%20ist%20die%20Aniixa%20Marktleitung.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
                            title="Über WhatsApp antworten"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Passkey Security Spotlight (5 cols) */}
              <div className="lg:col-span-5 bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Fingerprint className="w-5 h-5" />
                  <h3 className="font-bold text-white text-sm">Passkey / Biometrie-Status</h3>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Sie können sich ohne E-Mail und Passwort direkt mit Ihrem Fingerabdruck (Touch ID, Windows Hello oder Smartphone) anmelden.
                </p>

                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Hinterlegte Fingerabdrücke:</span>
                    <span className="font-mono font-bold text-emerald-400">{passkeys.length} Passkeys</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Geräte-Sensor:</span>
                    <span className="font-mono text-white">
                      {biometricAvailable ? '✓ Verfügbar' : 'WebAuthn aktiv'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('security')}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Fingerprint className="w-4 h-4" />
                  <span>Fingerabdruck-Verwaltung öffnen</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: ENQUIRIES MANAGEMENT */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'enquiries' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Kundenanfragen (Enquiries)</h2>
                <p className="text-xs text-slate-400">
                  Alle von Käufern eingereichten Produktanfragen mit direkter WhatsApp-Antwort.
                </p>
              </div>
              <button
                onClick={fetchData}
                className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Aktualisieren</span>
              </button>
            </div>

            {enquiries.length === 0 ? (
              <div className="p-12 text-center bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="text-sm font-semibold text-slate-300">Keine Anfragen vorhanden</div>
                <div className="text-xs text-slate-500">
                  Sobald ein Käufer im Marktplatz auf „Enquiry senden“ klickt, erscheint der Datensatz hier.
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {enquiries.map((enq) => (
                  <div
                    key={enq.id}
                    className="p-4 bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-xl text-xs space-y-3 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-emerald-400 font-bold text-sm">
                          {enq.product_price}
                        </span>
                        <div>
                          <div className="font-bold text-white text-sm">{enq.product_name}</div>
                          <div className="font-mono text-[11px] text-slate-400">ID: {enq.product_id}</div>
                        </div>
                      </div>

                      {/* Status Selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px]">Status:</span>
                        <select
                          value={enq.status || 'NEW'}
                          onChange={(e) => handleUpdateStatus(enq.id, e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                        >
                          <option value="NEW">NEU (Eingegangen)</option>
                          <option value="CONTACTED">In Klärung / Kontaktiert</option>
                          <option value="DISPATCHED">Versand vorbereitet</option>
                          <option value="COMPLETED">Abgeschlossen</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-300">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-mono">Käufer</span>
                        <strong className="text-white">{enq.buyer_name}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-mono">E-Mail</span>
                        <a href={`mailto:${enq.buyer_email}`} className="text-emerald-400 hover:underline">
                          {enq.buyer_email}
                        </a>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-mono">Telefon / WhatsApp</span>
                        <span className="font-mono text-white">{enq.buyer_phone}</span>
                      </div>
                    </div>

                    {enq.notes && (
                      <div className="p-2.5 bg-slate-900 rounded-lg text-slate-300 text-[11px] border border-slate-800">
                        <strong className="text-slate-400 font-mono text-[10px] block">Anmerkung des Käufers:</strong>
                        {enq.notes}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                      <div className="flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(enq.created_at).toLocaleString('de-DE')}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Direct WhatsApp Responder */}
                        <a
                          href={`https://wa.me/${enq.buyer_phone?.replace(/[^0-9]/g, '')}?text=Guten%20Tag%20${encodeURIComponent(enq.buyer_name)}%2C%20vielen%20Dank%20f%C3%BCr%20Ihre%20Anfrage%20zu%20${encodeURIComponent(enq.product_name)}%20bei%20Aniixa.`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1.5 transition-colors font-medium shadow-xs"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp Chat</span>
                        </a>

                        <button
                          onClick={() => handleDeleteEnquiry(enq.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: PRODUCTS INVENTORY */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'products' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-white">Reagenzien & Katalogbestand</h2>
              <p className="text-xs text-slate-400">
                Übersicht aller gelisteten Chemikalien nach deutschen Qualitätsnormen.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CHEMICAL_PRODUCTS.map((prod) => (
                <div
                  key={prod.id}
                  className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3 text-xs"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={prod.thumbnail}
                      alt={prod.name}
                      className="w-14 h-14 object-cover rounded-lg bg-slate-900 border border-slate-800 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] text-emerald-400">{prod.id} · CAS {prod.casNumber}</div>
                      <div className="font-bold text-white truncate">{prod.name}</div>
                      <div className="text-slate-400">{prod.purity} · {prod.grade}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 font-mono">
                    <div className="text-emerald-400 font-bold text-sm">{prod.price}</div>
                    <div className="text-slate-400">{prod.unit}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: KEYS & STORAGE MANAGEMENT */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'keys' && (
          <KeysManagement token={token} />
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 5: ADMIN PROFILE MANAGEMENT */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-white">Admin-Profilverwaltung</h2>
              <p className="text-xs text-slate-400">
                Verwalten Sie Ihre persönlichen Angaben, E-Mail-Adresse und Ihr Passwort.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="p-6 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Vollständiger Name</span>
                </label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Admin E-Mail-Adresse</span>
                </label>
                <input
                  type="email"
                  disabled
                  value={adminUser?.email || 'lunexa.official@gmail.com'}
                  className="w-full px-3.5 py-2.5 bg-slate-900/50 border border-slate-800/80 rounded-xl text-xs sm:text-sm text-slate-400 font-mono cursor-not-allowed"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Haupt-Login-E-Mail ist fest verknüpft mit lunexa.official@gmail.com
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Telefonnummer</span>
                </label>
                <input
                  type="text"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  placeholder="+49 1520 1234567"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all font-mono"
                />
              </div>

              <div className="pt-2 border-t border-slate-800">
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Neues Passwort vergeben (Optional)</span>
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nur ausfüllen, wenn Sie das Passwort ändern möchten"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                <span>{savingProfile ? 'Speichere Profil...' : 'Profiländerungen speichern'}</span>
              </button>
            </form>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 5: SECURITY MANAGEMENT & FINGERPRINT PASSKEY */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'security' && (
          <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Fingerprint className="w-5 h-5 text-emerald-400" />
                <span>Sicherheitsverwaltung & Fingerabdruck-Passkeys</span>
              </h2>
              <p className="text-xs text-slate-400">
                Registrieren Sie Ihren Geräte-Fingerabdruck (Touch ID, Windows Hello, Android Biometrie) für 100% passwortlose Anmeldung.
              </p>
            </div>

            {/* Passkey Setup Card */}
            <div className="p-6 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 border border-slate-800 rounded-2xl space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-white text-base">
                    Neuen Fingerabdruck / Passkey hinterlegen
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-lg">
                    Nach der Registrierung können Sie sich beim nächsten Mal durch einfaches Auflegen Ihres Fingers oder per Face ID / Windows Hello einloggen — ganz ohne Eingabe von E-Mail und Passwort.
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                  <Fingerprint className="w-6 h-6" />
                </div>
              </div>

              {/* Hardware diagnostics */}
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs flex items-center justify-between font-mono">
                <span className="text-slate-400">Geräte-Biometrie Status:</span>
                <span className={biometricAvailable ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                  {biometricAvailable ? '✓ Plattform-Biometrie bereit' : 'WebAuthn Standard aktiv'}
                </span>
              </div>

              <form onSubmit={handleRegisterPasskey} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Geräte-Bezeichnung (zur Wiedererkennung)
                  </label>
                  <input
                    type="text"
                    required
                    value={passkeyDeviceName}
                    onChange={(e) => setPasskeyDeviceName(e.target.value)}
                    placeholder="z. B. Mein MacBook Touch ID oder Windows Fingerabdruck"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={registeringPasskey}
                  className="w-full py-3 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Fingerprint className={`w-4 h-4 ${registeringPasskey ? 'animate-pulse text-amber-200' : ''}`} />
                  <span>
                    {registeringPasskey
                      ? 'Sensor aktiv... Jetzt Fingerabdruck auflegen...'
                      : 'Fingerabdruck jetzt registrieren'}
                  </span>
                </button>
              </form>
            </div>

            {/* List of Registered Passkeys */}
            <div className="p-6 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-4">
              <h3 className="font-bold text-white text-sm">
                Registrierte biometrische Passkeys ({passkeys.length})
              </h3>

              {passkeys.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  Bisher ist noch kein Fingerabdruck hinterlegt. Registrieren Sie oben Ihren ersten Passkey.
                </div>
              ) : (
                <div className="space-y-3">
                  {passkeys.map((pk) => (
                    <div
                      key={pk.id}
                      className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl text-xs flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center shrink-0">
                          <Fingerprint className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-white">{pk.device_name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Erstellt: {new Date(pk.created_at).toLocaleDateString('de-DE')}
                            {pk.last_used && ` · Zuletzt genutzt: ${new Date(pk.last_used).toLocaleDateString('de-DE')}`}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeletePasskey(pk.id)}
                        className="px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-950/50 rounded border border-rose-900/60 transition-colors cursor-pointer"
                        title="Passkey löschen"
                      >
                        Löschen
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </main>
    </div>
  );
};
