import crypto from 'crypto';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'aniixa_chemical_german_admin_secret_key_2026_998471';

export interface TokenPayload {
  userId: number;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

// Generate signed authentication token
export function createAdminToken(userId: number, email: string, role: string = 'SUPER_ADMIN'): string {
  const payload: TokenPayload = {
    userId,
    email,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${signature}`;
}

// Verify signed authentication token
export function verifyAdminToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payloadB64, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(payloadB64).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }
    const payload: TokenPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

// WebAuthn Challenge Store (Tied to session or user)
interface ChallengeRecord {
  challenge: string;
  userId?: number;
  type: 'register' | 'login';
  createdAt: number;
}

const challengeMap = new Map<string, ChallengeRecord>();

// Clean expired challenges every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of challengeMap.entries()) {
    if (now - val.createdAt > 5 * 60 * 1000) {
      challengeMap.delete(key);
    }
  }
}, 10 * 60 * 1000);

export function generateWebAuthnChallenge(type: 'register' | 'login', userId?: number): string {
  const challenge = crypto.randomBytes(32).toString('base64url');
  challengeMap.set(challenge, {
    challenge,
    userId,
    type,
    createdAt: Date.now(),
  });
  return challenge;
}

export function verifyWebAuthnChallenge(challenge: string, type: 'register' | 'login'): boolean {
  const record = challengeMap.get(challenge);
  if (!record) return false;
  if (record.type !== type) return false;
  // Valid for 5 minutes
  if (Date.now() - record.createdAt > 5 * 60 * 1000) {
    challengeMap.delete(challenge);
    return false;
  }
  challengeMap.delete(challenge);
  return true;
}
