import CryptoJS from 'crypto-js';
import { devLog } from './logger';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-me';

export function encryptData(data: string): string {
  try {
    const encrypted = CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
    devLog.debug('Data encrypted successfully');
    return encrypted;
  } catch (error) {
    devLog.error('Failed to encrypt data', error as Error);
    throw new Error('Encryption failed');
  }
}

export function decryptData(encryptedData: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    if (!decrypted) {
      throw new Error('Invalid encrypted data or wrong key');
    }

    devLog.debug('Data decrypted successfully');
    return decrypted;
  } catch (error) {
    devLog.error('Failed to decrypt data', error as Error);
    throw new Error('Decryption failed');
  }
}

export function isValidPrivateKey(key: string): boolean {
  const privateKeyRegex = /^(0x)?[a-fA-F0-9]{64}$/;
  return privateKeyRegex.test(key);
}

export function isValidAddress(address: string): boolean {
  const addressRegex = /^0x[a-fA-F0-9]{40}$/;
  return addressRegex.test(address);
}

export function sanitizeForLog(data: string): string {
  if (isValidPrivateKey(data)) {
    return 'PRIVATE_KEY_REDACTED';
  }

  if (data.includes(' ') && data.split(' ').length >= 12) {
    return 'MNEMONIC_REDACTED';
  }

  return data;
}
