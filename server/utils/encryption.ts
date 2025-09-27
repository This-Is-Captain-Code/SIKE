import crypto from 'crypto';

// Secure encryption utility for private keys using AES-256-GCM
const ALGORITHM = 'aes-256-gcm';

// Get encryption key from environment - REQUIRED for security
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required and must be 32 bytes (64 hex chars)');
  }
  
  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters)');
  }
  
  return Buffer.from(key, 'hex');
}

export function encryptPrivateKey(privateKey: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12); // 12 bytes for GCM
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(privateKey, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    // Combine iv, encrypted data, and authTag (all base64 encoded)
    return iv.toString('base64') + ':' + encrypted + ':' + authTag.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt private key');
  }
}

export function decryptPrivateKey(encryptedPrivateKey: string): string {
  try {
    const parts = encryptedPrivateKey.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted private key format');
    }
    
    const [ivBase64, encrypted, authTagBase64] = parts;
    
    const key = getEncryptionKey();
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt private key');
  }
}