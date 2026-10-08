// Standard WebAuthn (FIDO2 / Passkeys) browser utility

export function isWebAuthnSupported(): boolean {
  return typeof window !== 'undefined' && Boolean(window.PublicKeyCredential);
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

// Helper: Convert base64url string to BufferSource
export function base64urlToUint8Array(base64url: string): BufferSource {
  // Replace base64url characters with regular base64
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes as unknown as BufferSource;
}

// Helper: Convert ArrayBuffer to base64 string
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper: Convert ArrayBuffer to base64url string
export function arrayBufferToBase64url(buffer: ArrayBuffer): string {
  return arrayBufferToBase64(buffer)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Register Fingerprint Passkey using native WebAuthn API
 */
export async function registerFingerprintPasskey(token: string, deviceName?: string) {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn / Passkeys werden von diesem Browser nicht unterstützt.');
  }

  // 1. Request challenge from backend
  const challengeRes = await fetch('/api/admin/passkey/register-challenge', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!challengeRes.ok) {
    const errData = await challengeRes.json().catch(() => ({}));
    throw new Error(errData.error || 'Fehler beim Abrufen der WebAuthn-Challenge.');
  }

  const creationOptions = await challengeRes.json();

  // 2. Prepare PublicKeyCredentialCreationOptions
  const publicKeyOptions: PublicKeyCredentialCreationOptions = {
    challenge: base64urlToUint8Array(creationOptions.challenge),
    rp: {
      name: creationOptions.rp.name,
      id: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
    },
    user: {
      id: base64urlToUint8Array(creationOptions.user.id),
      name: creationOptions.user.name,
      displayName: creationOptions.user.displayName,
    },
    pubKeyCredParams: creationOptions.pubKeyCredParams || [
      { alg: -7, type: 'public-key' },
      { alg: -257, type: 'public-key' },
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'preferred',
      residentKey: 'preferred',
    },
    timeout: 60000,
    attestation: 'none',
  };

  // 3. Trigger native device biometric prompt (Touch ID / Windows Hello / Android Biometrics)
  let credential: any;
  try {
    credential = await navigator.credentials.create({
      publicKey: publicKeyOptions,
    });
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      throw new Error('Biometrie-Vorgang abgebrochen oder durch Sicherheitsrichtlinie verweigert.');
    }
    throw new Error('Passkey-Erstellung fehlgeschlagen: ' + err.message);
  }

  if (!credential) {
    throw new Error('Kein biometrischer Passkey zurückgegeben.');
  }

  // 4. Format registration data for server verification
  const response = credential.response as AuthenticatorAttestationResponse;
  const credentialId = credential.id;
  const clientDataJSON = arrayBufferToBase64(response.clientDataJSON);
  const attestationObject = arrayBufferToBase64(response.attestationObject);
  const transports = response.getTransports ? response.getTransports() : undefined;

  // 5. Send to server to verify and persist in Neon PostgreSQL
  const verifyRes = await fetch('/api/admin/passkey/register-verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      credentialId,
      clientDataJSON,
      attestationObject,
      deviceName: deviceName || 'Geräte-Fingerabdruck / Biometrie',
      transports,
    }),
  });

  const verifyData = await verifyRes.json();
  if (!verifyRes.ok) {
    throw new Error(verifyData.error || 'Server-Verifizierung des Passkeys fehlgeschlagen.');
  }

  return verifyData;
}

/**
 * Login with Fingerprint Passkey without password
 */
export async function loginWithFingerprintPasskey() {
  if (!isWebAuthnSupported()) {
    throw new Error('Passkeys werden von diesem Browser nicht unterstützt.');
  }

  // 1. Get challenge from backend
  const challengeRes = await fetch('/api/admin/passkey/login-challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!challengeRes.ok) {
    const err = await challengeRes.json().catch(() => ({}));
    throw new Error(err.error || 'Fehler beim Anfordern der Biometrie-Challenge.');
  }

  const options = await challengeRes.json();

  const allowCredentials = (options.allowCredentials || []).map((c: any) => ({
    id: base64urlToUint8Array(c.id),
    type: 'public-key' as const,
  }));

  const requestOptions: PublicKeyCredentialRequestOptions = {
    challenge: base64urlToUint8Array(options.challenge),
    rpId: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
    allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
    userVerification: 'preferred',
    timeout: 60000,
  };

  // 2. Prompt user for biometric fingerprint
  let assertion: any;
  try {
    assertion = await navigator.credentials.get({
      publicKey: requestOptions,
    });
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      throw new Error('Biometrie-Authentifizierung abgebrochen.');
    }
    throw new Error('Fingerabdruck-Abfrage fehlgeschlagen: ' + err.message);
  }

  if (!assertion) {
    throw new Error('Keine biometrische Bestätigung empfangen.');
  }

  // 3. Format response and verify on backend
  const response = assertion.response as AuthenticatorAssertionResponse;
  const credentialId = assertion.id;
  const clientDataJSON = arrayBufferToBase64(response.clientDataJSON);
  const authenticatorData = arrayBufferToBase64(response.authenticatorData);
  const signature = arrayBufferToBase64(response.signature);

  const verifyRes = await fetch('/api/admin/passkey/login-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      credentialId,
      clientDataJSON,
      authenticatorData,
      signature,
    }),
  });

  const verifyData = await verifyRes.json();
  if (!verifyRes.ok) {
    throw new Error(verifyData.error || 'Biometrische Anmeldung abgelehnt.');
  }

  return verifyData;
}
