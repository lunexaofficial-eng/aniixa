import React, { useState, useEffect } from 'react';
import {
  Shield,
  Fingerprint,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ExternalLink,
  ChevronLeft
} from 'lucide-react';
import { isWebAuthnSupported, isPlatformAuthenticatorAvailable, loginWithFingerprintPasskey } from '../../utils/webauthn';

interface AdminLoginProps {
  onLoginSuccess: (token: string, user: any) => void;
  onReturnToMarket: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onReturnToMarket }) => {
  const [email, setEmail] = useState('lunexa.official@gmail.com');
  const [password, setPassword] = useState('Md1620@gmail');
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    isPlatformAuthenticatorAvailable().then((available) => {
      setBiometricAvailable(available);
    });
  }, []);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Anmeldung fehlgeschlagen.');
      }

      localStorage.setItem('aniixa_admin_token', data.token);
      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Verbindungsfehler beim Anmelden.');
    } finally {
      setLoading(false);
    }
  };

  const handleFingerprintLogin = async () => {
    setErrorMsg('');
    setPasskeyLoading(true);

    try {
      const data = await loginWithFingerprintPasskey();
      localStorage.setItem('aniixa_admin_token', data.token);
      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Fingerabdruck-Anmeldung fehlgeschlagen.');
    } finally {
      setPasskeyLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">
        
        {/* Top return link */}
        <button
          onClick={onReturnToMarket}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Zurück zum Marktplatz (Aniixa)</span>
        </button>

        {/* Card Container */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Aniixa Admin-Portal
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Hochsicherer Zugriff für Marktleiter & Laborverwalter
            </p>
          </div>

          {/* Error notice */}
          {errorMsg && (
            <div className="p-3 bg-rose-950/50 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Biometric Passkey / Fingerprint Quick Login Button */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleFingerprintLogin}
              disabled={passkeyLoading || loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer disabled:opacity-50"
            >
              <Fingerprint className={`w-5 h-5 ${passkeyLoading ? 'animate-pulse text-amber-200' : ''}`} />
              <span>
                {passkeyLoading
                  ? 'Sensor aktiv... Fingerabdruck auflegen'
                  : 'Mit Fingerabdruck / Passkey anmelden'}
              </span>
            </button>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 font-mono">
              <span>Touch ID / Windows Hello / Passkey</span>
              <span className={biometricAvailable ? 'text-emerald-400' : 'text-slate-500'}>
                {biometricAvailable ? '✓ Sensor erkannt' : 'WebAuthn bereit'}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-950 px-3 text-[11px] uppercase font-mono text-slate-500 tracking-wider">
              Oder mit Zugangsdaten
            </span>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Admin E-Mail</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="lunexa.official@gmail.com"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Passwort</span>
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Md1620@gmail"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading || passkeyLoading}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-white text-slate-900 font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Prüfe Anmeldedaten...' : 'Als Administrator anmelden'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Credential Reference for Convenience */}
          <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl text-[11px] text-slate-400 space-y-1 font-mono">
            <div className="text-emerald-400 font-semibold">Autorisierte Anmeldedaten:</div>
            <div>E-Mail: <span className="text-white">lunexa.official@gmail.com</span></div>
            <div>Passwort: <span className="text-white">Md1620@gmail</span></div>
          </div>

        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-500 font-mono">
          Aniixa Enterprise Control · FIDO2 / WebAuthn Biometrie-Standard
        </div>

      </div>
    </div>
  );
};
