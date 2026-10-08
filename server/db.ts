import { Pool } from 'pg';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
export let pool: Pool | null = null;
export let isDbConnected = false;
export let dbError: string | null = null;

export interface AdminUser {
  id: number;
  email: string;
  password_hash: string;
  salt: string;
  full_name: string;
  phone: string;
  role: string;
  created_at: string;
  last_login: string | null;
}

export interface AdminPasskey {
  id: number;
  user_id: number;
  credential_id: string;
  public_key: string;
  counter: number;
  device_name: string;
  transports: string | null;
  created_at: string;
  last_used: string | null;
}

export interface CloudflareR2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
  endpoint?: string;
  updatedAt?: string;
}

export interface ResendConfig {
  apiKey: string;
  fromEmail: string;
  updatedAt?: string;
}

export interface ResendDomainItem {
  id: string;
  domain: string;
  status: 'VERIFIED' | 'PENDING' | 'FAILED';
  region?: string;
  createdAt: string;
  records?: Array<{
    type: string;
    name: string;
    value: string;
    ttl: string;
    status: string;
  }>;
}

export interface EnquiryRecord {
  id: number | string;
  product_id: string;
  product_name: string;
  product_price: string;
  product_thumbnail: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  notes?: string;
  status?: 'NEW' | 'CONTACTED' | 'DISPATCHED' | 'COMPLETED';
  created_at: string;
  whatsapp_sent: boolean;
}

// In-Memory Fallbacks if Neon DB is not reachable
export const memoryEnquiries: EnquiryRecord[] = [];
export const memoryPasskeys: AdminPasskey[] = [];
export const memoryIntegrationKeys: Record<string, any> = {
  cloudflare_r2: null,
  resend: null,
  resend_domains: [
    {
      id: 'dom_default_aniixa',
      domain: 'aniixa.de',
      status: 'VERIFIED',
      region: 'eu-west-1 (Frankfurt)',
      createdAt: new Date().toISOString(),
      records: [
        { type: 'TXT', name: '_dmarc.aniixa.de', value: 'v=DMARC1; p=none;', ttl: 'Auto', status: 'VERIFIED' },
        { type: 'TXT', name: 'resend._domainkey.aniixa.de', value: 'p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC...', ttl: 'Auto', status: 'VERIFIED' },
        { type: 'MX', name: 'mail.aniixa.de', value: 'feedback-smtp.eu-west-1.amazonses.com', ttl: 'Auto', status: 'VERIFIED' },
      ],
    },
  ],
};

// Hash helper for admin password
export function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

// Default Admin: lunexa.official@gmail.com / Md1620@gmail
const DEFAULT_SALT = crypto.randomBytes(16).toString('hex');
const DEFAULT_HASH = hashPassword('Md1620@gmail', DEFAULT_SALT);

export const memoryAdminUser: AdminUser = {
  id: 1,
  email: 'lunexa.official@gmail.com',
  password_hash: DEFAULT_HASH,
  salt: DEFAULT_SALT,
  full_name: 'Aniixa Hauptadministrator',
  phone: '+49 1520 1234567',
  role: 'SUPER_ADMIN',
  created_at: new Date().toISOString(),
  last_login: null,
};

export async function initDatabase(): Promise<void> {
  if (!databaseUrl) {
    console.log('ℹ️ DATABASE_URL not provided. Using in-memory store for admin & catalog.');
    return;
  }

  try {
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false,
      },
      connectionTimeoutMillis: 5000,
    });

    // 1. Create enquiries table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS enquiries (
        id SERIAL PRIMARY KEY,
        product_id VARCHAR(100) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        product_price VARCHAR(100) NOT NULL,
        product_thumbnail TEXT,
        buyer_name VARCHAR(255) NOT NULL,
        buyer_email VARCHAR(255) NOT NULL,
        buyer_phone VARCHAR(100) NOT NULL,
        notes TEXT,
        status VARCHAR(50) DEFAULT 'NEW',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        whatsapp_sent BOOLEAN DEFAULT TRUE
      );
    `);

    // 2. Create admin_users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        salt VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(100),
        role VARCHAR(50) DEFAULT 'SUPER_ADMIN',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP WITH TIME ZONE
      );
    `);

    // 3. Create admin_passkeys table for real biometric fingerprint WebAuthn credentials
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_passkeys (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES admin_users(id) ON DELETE CASCADE,
        credential_id TEXT UNIQUE NOT NULL,
        public_key TEXT NOT NULL,
        counter INTEGER DEFAULT 0,
        device_name VARCHAR(255) DEFAULT 'Biometrischer Fingerabdruck / Passkey',
        transports TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_used TIMESTAMP WITH TIME ZONE
      );
    `);

    // 4. Create admin_integration_keys table for Cloudflare R2 and Resend.com keys
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_integration_keys (
        id SERIAL PRIMARY KEY,
        service_name VARCHAR(100) UNIQUE NOT NULL,
        credentials TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Ensure admin user lunexa.official@gmail.com exists with password Md1620@gmail
    const checkUser = await pool.query('SELECT * FROM admin_users WHERE email = $1', ['lunexa.official@gmail.com']);
    if (checkUser.rows.length === 0) {
      await pool.query(`
        INSERT INTO admin_users (email, password_hash, salt, full_name, phone, role)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, ['lunexa.official@gmail.com', DEFAULT_HASH, DEFAULT_SALT, 'Aniixa Hauptadministrator', '+49 1520 1234567', 'SUPER_ADMIN']);
      console.log('✅ Seeded default admin account lunexa.official@gmail.com in Neon PostgreSQL.');
    } else {
      // Keep password updated to required Md1620@gmail if hash mismatch
      const existing = checkUser.rows[0];
      const testHash = hashPassword('Md1620@gmail', existing.salt);
      if (testHash !== existing.password_hash) {
        await pool.query('UPDATE admin_users SET password_hash = $1 WHERE id = $2', [testHash, existing.id]);
        console.log('✅ Verified & synchronized admin credentials in Neon PostgreSQL.');
      }
    }

    isDbConnected = true;
    console.log('✅ Neon PostgreSQL initialized with enquiries, admin_users, and admin_passkeys tables.');
  } catch (err: any) {
    dbError = err.message;
    console.warn('⚠️ Neon PostgreSQL connection error, falling back to memory store:', err.message);
  }
}
