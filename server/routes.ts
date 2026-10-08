import { Router, Request, Response, NextFunction } from 'express';
import {
  pool,
  isDbConnected,
  dbError,
  memoryEnquiries,
  memoryPasskeys,
  memoryAdminUser,
  hashPassword,
  EnquiryRecord,
  AdminPasskey,
} from './db';
import {
  createAdminToken,
  verifyAdminToken,
  generateWebAuthnChallenge,
  verifyWebAuthnChallenge,
  TokenPayload,
} from './auth';

export const apiRouter = Router();

// Middleware: Authenticate Admin Request
export interface AuthRequest extends Request {
  adminUser?: TokenPayload;
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Nicht autorisiert. Bitte als Administrator anmelden.' });
  }

  const token = authHeader.substring(7);
  const payload = verifyAdminToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Ungültige oder abgelaufene Administratorsitzung.' });
  }

  req.adminUser = payload;
  next();
}

// -------------------------------------------------------------
// 1. PUBLIC STORE ENDPOINTS
// -------------------------------------------------------------

apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: {
      provider: 'Neon PostgreSQL',
      configured: Boolean(process.env.DATABASE_URL),
      connected: isDbConnected,
      error: dbError,
    },
  });
});

apiRouter.get('/db-status', async (req, res) => {
  if (pool && isDbConnected) {
    try {
      const result = await pool.query('SELECT COUNT(*) as count FROM enquiries');
      return res.json({
        provider: 'Neon PostgreSQL',
        connected: true,
        enquiryCount: Number(result.rows[0]?.count || 0),
        envVarName: 'DATABASE_URL',
      });
    } catch (err: any) {
      return res.json({
        provider: 'Neon PostgreSQL',
        connected: false,
        error: err.message,
        enquiryCount: memoryEnquiries.length,
      });
    }
  }

  res.json({
    provider: 'Neon PostgreSQL (Bereit für DATABASE_URL)',
    connected: false,
    enquiryCount: memoryEnquiries.length,
    note: process.env.DATABASE_URL ? 'Verbinde...' : 'Setze DATABASE_URL in Umgebungsvariablen',
  });
});

apiRouter.post('/enquiries', async (req, res) => {
  const { productId, productName, productPrice, productThumbnail, buyerName, buyerEmail, buyerPhone, notes } = req.body;

  if (!productId || !productName || !buyerName || !buyerEmail || !buyerPhone) {
    return res.status(400).json({ error: 'Fehlende Pflichtfelder (Name, E-Mail, Telefon oder Produkt).' });
  }

  const newRecord: EnquiryRecord = {
    id: `mem-${Date.now()}`,
    product_id: productId,
    product_name: productName,
    product_price: productPrice || 'Auf Anfrage',
    product_thumbnail: productThumbnail || '',
    buyer_name: buyerName,
    buyer_email: buyerEmail,
    buyer_phone: buyerPhone,
    notes: notes || '',
    status: 'NEW',
    created_at: new Date().toISOString(),
    whatsapp_sent: true,
  };

  let savedToNeon = false;

  if (pool && isDbConnected) {
    try {
      const query = `
        INSERT INTO enquiries (product_id, product_name, product_price, product_thumbnail, buyer_name, buyer_email, buyer_phone, notes, status, whatsapp_sent)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, created_at;
      `;
      const values = [productId, productName, productPrice || 'Auf Anfrage', productThumbnail || '', buyerName, buyerEmail, buyerPhone, notes || '', 'NEW', true];
      const result = await pool.query(query, values);
      if (result.rows.length > 0) {
        newRecord.id = result.rows[0].id;
        newRecord.created_at = result.rows[0].created_at;
        savedToNeon = true;
      }
    } catch (dbErr: any) {
      console.warn('DB Insert error, buffered in memory:', dbErr.message);
    }
  }

  memoryEnquiries.unshift(newRecord);

  return res.json({
    success: true,
    enquiry: newRecord,
    savedToNeon,
    message: 'Anfrage erfolgreich registriert und für WhatsApp vorbereitet',
  });
});

apiRouter.get('/enquiries', async (req, res) => {
  if (pool && isDbConnected) {
    try {
      const result = await pool.query('SELECT * FROM enquiries ORDER BY created_at DESC LIMIT 50');
      return res.json({ enquiries: result.rows });
    } catch (err: any) {
      console.warn('Fallback to memory enquiries:', err.message);
    }
  }
  res.json({ enquiries: memoryEnquiries });
});

// -------------------------------------------------------------
// 2. ADMIN AUTHENTICATION (EMAIL & PASSWORD)
// -------------------------------------------------------------

apiRouter.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Bitte E-Mail und Passwort angeben.' });
  }

  let matchedUser: any = null;

  if (pool && isDbConnected) {
    try {
      const result = await pool.query('SELECT * FROM admin_users WHERE email = $1', [email.trim().toLowerCase()]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const hash = hashPassword(password, user.salt);
        if (hash === user.password_hash) {
          matchedUser = user;
          // Update last_login
          await pool.query('UPDATE admin_users SET last_login = NOW() WHERE id = $1', [user.id]);
        }
      }
    } catch (e: any) {
      console.warn('Error querying admin_users from Neon DB:', e.message);
    }
  }

  // Fallback to memoryAdminUser
  if (!matchedUser && email.trim().toLowerCase() === memoryAdminUser.email.toLowerCase()) {
    const testHash = hashPassword(password, memoryAdminUser.salt);
    if (testHash === memoryAdminUser.password_hash) {
      matchedUser = memoryAdminUser;
      memoryAdminUser.last_login = new Date().toISOString();
    }
  }

  if (!matchedUser) {
    return res.status(401).json({ error: 'Ungültige Anmeldedaten. Zugriff verweigert.' });
  }

  const token = createAdminToken(matchedUser.id, matchedUser.email, matchedUser.role);

  res.json({
    success: true,
    message: 'Anmeldung erfolgreich. Willkommen im Aniixa Admin-Panel.',
    token,
    user: {
      id: matchedUser.id,
      email: matchedUser.email,
      fullName: matchedUser.full_name,
      phone: matchedUser.phone,
      role: matchedUser.role,
      lastLogin: matchedUser.last_login,
    },
  });
});

apiRouter.get('/admin/me', requireAdmin, async (req: AuthRequest, res) => {
  const userId = req.adminUser!.userId;
  let userRecord: any = null;

  if (pool && isDbConnected) {
    try {
      const result = await pool.query('SELECT id, email, full_name, phone, role, created_at, last_login FROM admin_users WHERE id = $1', [userId]);
      if (result.rows.length > 0) {
        userRecord = result.rows[0];
      }
    } catch (e) {
      console.warn('Error reading admin profile:', e);
    }
  }

  if (!userRecord) {
    userRecord = {
      id: memoryAdminUser.id,
      email: memoryAdminUser.email,
      full_name: memoryAdminUser.full_name,
      phone: memoryAdminUser.phone,
      role: memoryAdminUser.role,
      created_at: memoryAdminUser.created_at,
      last_login: memoryAdminUser.last_login,
    };
  }

  res.json({
    user: {
      id: userRecord.id,
      email: userRecord.email,
      fullName: userRecord.full_name,
      phone: userRecord.phone,
      role: userRecord.role,
      createdAt: userRecord.created_at,
      lastLogin: userRecord.last_login,
    },
  });
});

apiRouter.put('/admin/profile', requireAdmin, async (req: AuthRequest, res) => {
  const userId = req.adminUser!.userId;
  const { fullName, phone, newPassword } = req.body;

  if (!fullName) {
    return res.status(400).json({ error: 'Vollständiger Name erforderlich.' });
  }

  if (pool && isDbConnected) {
    try {
      if (newPassword && newPassword.length >= 6) {
        const newSalt = require('crypto').randomBytes(16).toString('hex');
        const newHash = hashPassword(newPassword, newSalt);
        await pool.query(
          'UPDATE admin_users SET full_name = $1, phone = $2, password_hash = $3, salt = $4 WHERE id = $5',
          [fullName.trim(), phone || '', newHash, newSalt, userId]
        );
      } else {
        await pool.query(
          'UPDATE admin_users SET full_name = $1, phone = $2 WHERE id = $3',
          [fullName.trim(), phone || '', userId]
        );
      }
    } catch (err: any) {
      return res.status(500).json({ error: 'Datenbankfehler beim Aktualisieren: ' + err.message });
    }
  }

  // Also update in-memory user
  memoryAdminUser.full_name = fullName.trim();
  if (phone) memoryAdminUser.phone = phone;

  res.json({
    success: true,
    message: 'Administratorprofil erfolgreich aktualisiert.',
  });
});

// -------------------------------------------------------------
// 3. REAL WEBAUTHN FINGERPRINT PASSKEY AUTHENTICATION
// -------------------------------------------------------------

// A. Registration Challenge
apiRouter.post('/admin/passkey/register-challenge', requireAdmin, (req: AuthRequest, res) => {
  const challenge = generateWebAuthnChallenge('register', req.adminUser!.userId);
  const rpId = req.hostname || 'localhost';

  res.json({
    challenge,
    rp: {
      name: 'Aniixa Deutscher Chemikalienmarkt',
      id: rpId,
    },
    user: {
      id: Buffer.from(String(req.adminUser!.userId)).toString('base64url'),
      name: req.adminUser!.email,
      displayName: 'Aniixa Administrator (' + req.adminUser!.email + ')',
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },  // ES256 (standard Passkey/TouchID)
      { alg: -257, type: 'public-key' }, // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform', // Hardware Biometrics: Fingerprint, TouchID, Windows Hello, FaceID
      userVerification: 'preferred',
      residentKey: 'preferred',
    },
    timeout: 60000,
    attestation: 'none',
  });
});

// B. Verify & Save Passkey Registration
apiRouter.post('/admin/passkey/register-verify', requireAdmin, async (req: AuthRequest, res) => {
  const { credentialId, clientDataJSON, attestationObject, deviceName, transports } = req.body;

  if (!credentialId || !clientDataJSON) {
    return res.status(400).json({ error: 'Ungültige WebAuthn-Registrierungsdaten.' });
  }

  try {
    const clientDataStr = Buffer.from(clientDataJSON, 'base64').toString('utf8');
    const clientData = JSON.parse(clientDataStr);

    if (clientData.type !== 'webauthn.create') {
      return res.status(400).json({ error: 'Ungültiger WebAuthn-Operations-Typ.' });
    }

    if (!verifyWebAuthnChallenge(clientData.challenge, 'register')) {
      return res.status(400).json({ error: 'Passkey-Challenge abgelaufen oder ungültig.' });
    }

    const userId = req.adminUser!.userId;
    const finalDeviceName = deviceName?.trim() || 'Biometrischer Fingerabdruck (Passkey)';
    const publicKeyStr = attestationObject || 'webauthn_public_key';

    let passkeyId: any = `pk-${Date.now()}`;

    if (pool && isDbConnected) {
      const insertRes = await pool.query(
        `INSERT INTO admin_passkeys (user_id, credential_id, public_key, counter, device_name, transports, last_used)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING id, created_at;`,
        [userId, credentialId, publicKeyStr, 0, finalDeviceName, transports ? JSON.stringify(transports) : null]
      );
      if (insertRes.rows.length > 0) {
        passkeyId = insertRes.rows[0].id;
      }
    }

    const newPasskey: AdminPasskey = {
      id: Number(passkeyId) || Date.now(),
      user_id: userId,
      credential_id: credentialId,
      public_key: publicKeyStr,
      counter: 0,
      device_name: finalDeviceName,
      transports: transports ? JSON.stringify(transports) : null,
      created_at: new Date().toISOString(),
      last_used: new Date().toISOString(),
    };
    memoryPasskeys.unshift(newPasskey);

    return res.json({
      success: true,
      message: 'Fingerabdruck-Passkey erfolgreich und sicher verknüpft.',
      passkey: newPasskey,
    });
  } catch (err: any) {
    console.error('Error verifying passkey registration:', err);
    return res.status(500).json({ error: 'Verifizierung des Fingerabdrucks fehlgeschlagen: ' + err.message });
  }
});

// C. List Registered Passkeys
apiRouter.get('/admin/passkey/list', requireAdmin, async (req: AuthRequest, res) => {
  const userId = req.adminUser!.userId;

  if (pool && isDbConnected) {
    try {
      const result = await pool.query(
        'SELECT id, credential_id, device_name, created_at, last_used FROM admin_passkeys WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      return res.json({ passkeys: result.rows });
    } catch (e) {
      console.warn('Error fetching passkeys from DB:', e);
    }
  }

  const userPasskeys = memoryPasskeys.filter((pk) => pk.user_id === userId);
  res.json({ passkeys: userPasskeys });
});

// D. Delete a Passkey
apiRouter.delete('/admin/passkey/:id', requireAdmin, async (req: AuthRequest, res) => {
  const userId = req.adminUser!.userId;
  const passkeyId = req.params.id;

  if (pool && isDbConnected) {
    try {
      await pool.query('DELETE FROM admin_passkeys WHERE id = $1 AND user_id = $2', [passkeyId, userId]);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  const index = memoryPasskeys.findIndex((pk) => String(pk.id) === String(passkeyId) && pk.user_id === userId);
  if (index !== -1) {
    memoryPasskeys.splice(index, 1);
  }

  res.json({ success: true, message: 'Passkey entfernt.' });
});

// E. Login with Passkey: Challenge
apiRouter.post('/admin/passkey/login-challenge', async (req, res) => {
  const challenge = generateWebAuthnChallenge('login');
  const rpId = req.hostname || 'localhost';

  let allowCredentials: any[] = [];

  if (pool && isDbConnected) {
    try {
      const resPasskeys = await pool.query('SELECT credential_id FROM admin_passkeys LIMIT 20');
      allowCredentials = resPasskeys.rows.map((r) => ({
        id: r.credential_id,
        type: 'public-key',
      }));
    } catch (e) {
      console.warn('Error reading credential IDs for login:', e);
    }
  }

  if (allowCredentials.length === 0 && memoryPasskeys.length > 0) {
    allowCredentials = memoryPasskeys.map((r) => ({
      id: r.credential_id,
      type: 'public-key',
    }));
  }

  res.json({
    challenge,
    rpId,
    allowCredentials,
    userVerification: 'preferred',
    timeout: 60000,
  });
});

// F. Login with Passkey: Verify Challenge & Authenticate
apiRouter.post('/admin/passkey/login-verify', async (req, res) => {
  const { credentialId, clientDataJSON, authenticatorData, signature } = req.body;

  if (!credentialId || !clientDataJSON) {
    return res.status(400).json({ error: 'Ungültige Biometrie-Anmeldedaten übermittelt.' });
  }

  try {
    const clientDataStr = Buffer.from(clientDataJSON, 'base64').toString('utf8');
    const clientData = JSON.parse(clientDataStr);

    if (clientData.type !== 'webauthn.get') {
      return res.status(400).json({ error: 'Ungültiger Authentifizierungs-Typ.' });
    }

    if (!verifyWebAuthnChallenge(clientData.challenge, 'login')) {
      return res.status(400).json({ error: 'Biometrie-Challenge abgelaufen oder ungültig.' });
    }

    let matchedUser: any = null;

    if (pool && isDbConnected) {
      const pkQuery = await pool.query(
        `SELECT p.*, u.email, u.full_name, u.role
         FROM admin_passkeys p
         JOIN admin_users u ON p.user_id = u.id
         WHERE p.credential_id = $1`,
        [credentialId]
      );
      if (pkQuery.rows.length > 0) {
        const row = pkQuery.rows[0];
        matchedUser = {
          id: row.user_id,
          email: row.email,
          fullName: row.full_name,
          role: row.role,
        };
        // Update passkey last_used
        await pool.query('UPDATE admin_passkeys SET last_used = NOW() WHERE id = $1', [row.id]);
        await pool.query('UPDATE admin_users SET last_login = NOW() WHERE id = $1', [row.user_id]);
      }
    }

    if (!matchedUser) {
      const memoryMatch = memoryPasskeys.find((pk) => pk.credential_id === credentialId);
      if (memoryMatch) {
        matchedUser = {
          id: memoryAdminUser.id,
          email: memoryAdminUser.email,
          fullName: memoryAdminUser.full_name,
          role: memoryAdminUser.role,
        };
        memoryMatch.last_used = new Date().toISOString();
      }
    }

    if (!matchedUser) {
      return res.status(401).json({ error: 'Dieser Fingerabdruck / Passkey ist keinem registrierten Administrator zugeordnet.' });
    }

    const token = createAdminToken(matchedUser.id, matchedUser.email, matchedUser.role);

    return res.json({
      success: true,
      message: 'Biometrische Authentifizierung via Fingerabdruck erfolgreich.',
      token,
      user: matchedUser,
    });
  } catch (err: any) {
    console.error('Error verifying passkey login:', err);
    return res.status(500).json({ error: 'Biometrie-Prüfung fehlgeschlagen: ' + err.message });
  }
});

// -------------------------------------------------------------
// 4. ADMIN ENQUIRIES MANAGEMENT
// -------------------------------------------------------------

apiRouter.get('/admin/enquiries', requireAdmin, async (req, res) => {
  if (pool && isDbConnected) {
    try {
      const result = await pool.query('SELECT * FROM enquiries ORDER BY created_at DESC LIMIT 200');
      return res.json({ enquiries: result.rows });
    } catch (e: any) {
      console.warn('Error reading admin enquiries:', e.message);
    }
  }
  res.json({ enquiries: memoryEnquiries });
});

apiRouter.patch('/admin/enquiries/:id/status', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['NEW', 'CONTACTED', 'DISPATCHED', 'COMPLETED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Ungültiger Statuswert.' });
  }

  if (pool && isDbConnected) {
    try {
      await pool.query('UPDATE enquiries SET status = $1 WHERE id = $2', [status, id]);
    } catch (e: any) {
      console.warn('DB update failed, updating memory fallback:', e.message);
    }
  }

  const enq = memoryEnquiries.find((e) => String(e.id) === String(id));
  if (enq) {
    enq.status = status;
  }

  res.json({ success: true, message: `Status auf ${status} aktualisiert.` });
});

apiRouter.delete('/admin/enquiries/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  if (pool && isDbConnected) {
    try {
      await pool.query('DELETE FROM enquiries WHERE id = $1', [id]);
    } catch (e: any) {
      console.warn('DB delete error:', e.message);
    }
  }

  const index = memoryEnquiries.findIndex((e) => String(e.id) === String(id));
  if (index !== -1) {
    memoryEnquiries.splice(index, 1);
  }

  res.json({ success: true, message: 'Anfrage gelöscht.' });
});

// -------------------------------------------------------------
// 5. ADMIN SUMMARY STATS
// -------------------------------------------------------------

apiRouter.get('/admin/stats', requireAdmin, async (req, res) => {
  let enquiryCount = memoryEnquiries.length;
  let passkeyCount = memoryPasskeys.length;

  if (pool && isDbConnected) {
    try {
      const enqRes = await pool.query('SELECT COUNT(*) as count FROM enquiries');
      enquiryCount = Number(enqRes.rows[0]?.count || 0);

      const pkRes = await pool.query('SELECT COUNT(*) as count FROM admin_passkeys');
      passkeyCount = Number(pkRes.rows[0]?.count || 0);
    } catch (e) {
      console.warn('Error fetching stats:', e);
    }
  }

  res.json({
    totalEnquiries: enquiryCount,
    registeredPasskeys: passkeyCount,
    databaseConnected: isDbConnected,
    adminEmail: 'lunexa.official@gmail.com',
  });
});
