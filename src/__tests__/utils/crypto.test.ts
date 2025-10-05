import {
  encryptData,
  decryptData,
  isValidPrivateKey,
  isValidAddress,
  sanitizeForLog,
} from '../../utils/crypto';

describe('Crypto Utils', () => {
  describe('encryptData and decryptData', () => {
    it('should encrypt and decrypt data correctly', () => {
      const originalData = 'test sensitive data';
      const encrypted = encryptData(originalData);
      const decrypted = decryptData(encrypted);

      expect(decrypted).toBe(originalData);
      expect(encrypted).not.toBe(originalData);
    });

    it('should throw error when decrypting invalid data', () => {
      expect(() => decryptData('invalid-encrypted-data')).toThrow(
        'Decryption failed'
      );
    });
  });

  describe('isValidPrivateKey', () => {
    it('should validate correct private key format', () => {
      const validKey =
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      expect(isValidPrivateKey(validKey)).toBe(true);
    });

    it('should validate private key without 0x prefix', () => {
      const validKey =
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      expect(isValidPrivateKey(validKey)).toBe(true);
    });

    it('should reject invalid private key formats', () => {
      expect(isValidPrivateKey('invalid')).toBe(false);
      expect(isValidPrivateKey('0x123')).toBe(false);
      expect(isValidPrivateKey('')).toBe(false);
    });
  });

  describe('isValidAddress', () => {
    it('should validate correct Ethereum address format', () => {
      const validAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
      expect(isValidAddress(validAddress)).toBe(true);
    });

    it('should reject invalid address formats', () => {
      expect(isValidAddress('invalid')).toBe(false);
      expect(isValidAddress('0x123')).toBe(false);
      expect(isValidAddress('')).toBe(false);
      expect(isValidAddress('742d35Cc6634C0532925a3b844Bc454e4438f44e')).toBe(
        false
      );
    });
  });

  describe('sanitizeForLog', () => {
    it('should redact private keys', () => {
      const privateKey =
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      expect(sanitizeForLog(privateKey)).toBe('PRIVATE_KEY_REDACTED');
    });

    it('should redact mnemonics', () => {
      const mnemonic =
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      expect(sanitizeForLog(mnemonic)).toBe('MNEMONIC_REDACTED');
    });

    it('should pass through regular data', () => {
      const regularData = 'just some regular text';
      expect(sanitizeForLog(regularData)).toBe(regularData);
    });
  });
});
