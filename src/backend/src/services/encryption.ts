/**
 * Encryption Service (Phase 7 Sprint 3)
 *
 * Provides encryption/decryption for sensitive data at rest,
 * using AES-256-GCM for authenticated encryption.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 64;

export interface EncryptedData {
  iv: string;
  tag: string;
  ciphertext: string;
  salt: string;
}

/**
 * Derive encryption key from master key and salt
 */
function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(masterKey, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt sensitive data
 */
export function encrypt(
  plaintext: string,
  masterKey: string = process.env.ENCRYPTION_KEY || 'default-master-key'
): EncryptedData {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty plaintext');
  }

  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  // Derive encryption key
  const key = deriveKey(masterKey, salt);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encrypt data
  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  // Get authentication tag
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    ciphertext,
    salt: salt.toString('hex'),
  };
}

/**
 * Decrypt sensitive data
 */
export function decrypt(
  encrypted: EncryptedData,
  masterKey: string = process.env.ENCRYPTION_KEY || 'default-master-key'
): string {
  if (!encrypted || !encrypted.ciphertext) {
    throw new Error('Invalid encrypted data');
  }

  // Reconstruct buffers from hex strings
  const salt = Buffer.from(encrypted.salt, 'hex');
  const iv = Buffer.from(encrypted.iv, 'hex');
  const tag = Buffer.from(encrypted.tag, 'hex');

  // Derive decryption key
  const key = deriveKey(masterKey, salt);

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  // Decrypt data
  let plaintext = decipher.update(encrypted.ciphertext, 'hex', 'utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
}

/**
 * Hash password for storage
 */
export function hashPassword(password: string, salt: string = ''): string {
  const saltBuffer = salt ? Buffer.from(salt, 'hex') : crypto.randomBytes(SALT_LENGTH);
  const hash = crypto.pbkdf2Sync(password, saltBuffer, 100000, 64, 'sha256');

  return `${saltBuffer.toString('hex')}:${hash.toString('hex')}`;
}

/**
 * Verify password against hash
 */
export function verifyPassword(password: string, hash: string): boolean {
  const [saltHex, hashHex] = hash.split(':');

  if (!saltHex || !hashHex) {
    return false;
  }

  const salt = Buffer.from(saltHex, 'hex');
  const passwordHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256');

  return passwordHash.toString('hex') === hashHex;
}

/**
 * Generate random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash token for storage (one-way)
 */
export function hashToken(token: string): string {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

/**
 * Verify token against hash
 */
export function verifyToken(token: string, hash: string): boolean {
  const tokenHash = hashToken(token);
  return crypto.timingSafeEqual(Buffer.from(tokenHash), Buffer.from(hash));
}

/**
 * Generate HMAC for data integrity
 */
export function generateHmac(
  data: string,
  secret: string = process.env.HMAC_SECRET || 'default-hmac-secret'
): string {
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
}

/**
 * Verify HMAC
 */
export function verifyHmac(
  data: string,
  expectedHmac: string,
  secret: string = process.env.HMAC_SECRET || 'default-hmac-secret'
): boolean {
  const computedHmac = generateHmac(data, secret);
  return crypto.timingSafeEqual(
    Buffer.from(computedHmac),
    Buffer.from(expectedHmac)
  );
}

/**
 * Encrypt JSON object
 */
export function encryptObject<T>(
  obj: T,
  masterKey?: string
): EncryptedData {
  const json = JSON.stringify(obj);
  return encrypt(json, masterKey);
}

/**
 * Decrypt JSON object
 */
export function decryptObject<T>(
  encrypted: EncryptedData,
  masterKey?: string
): T {
  const plaintext = decrypt(encrypted, masterKey);
  return JSON.parse(plaintext) as T;
}

/**
 * Redact sensitive strings (for logging)
 */
export function redact(value: string, keepLength: number = 4): string {
  if (!value || value.length <= keepLength) {
    return '***';
  }

  const visible = value.substring(0, keepLength);
  const hidden = '*'.repeat(value.length - keepLength);
  return visible + hidden;
}

/**
 * Validate encryption key strength
 */
export function validateKeyStrength(key: string): { valid: boolean; message: string } {
  if (!key) {
    return { valid: false, message: 'Key is empty' };
  }

  if (key.length < 32) {
    return { valid: false, message: 'Key should be at least 32 characters' };
  }

  if (!/[a-z]/.test(key)) {
    return { valid: false, message: 'Key should contain lowercase letters' };
  }

  if (!/[A-Z]/.test(key)) {
    return { valid: false, message: 'Key should contain uppercase letters' };
  }

  if (!/[0-9]/.test(key)) {
    return { valid: false, message: 'Key should contain numbers' };
  }

  if (!/[!@#$%^&*]/.test(key)) {
    return { valid: false, message: 'Key should contain special characters' };
  }

  return { valid: true, message: 'Key strength is adequate' };
}

export default {
  encrypt,
  decrypt,
  hashPassword,
  verifyPassword,
  generateToken,
  hashToken,
  verifyToken,
  generateHmac,
  verifyHmac,
  encryptObject,
  decryptObject,
  redact,
  validateKeyStrength,
};
