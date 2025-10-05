import { devLog } from '../../utils/logger';

describe('Logger', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('setLogLevel', () => {
    it('should filter logs based on level', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      devLog.setLogLevel('error');

      devLog.debug('debug message');
      devLog.info('info message');
      devLog.warn('warn message');
      devLog.error('error message');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('error message')
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('redactSensitive', () => {
    it('should redact private keys in log messages', () => {
      devLog.setLogLevel('debug');
      devLog.info(
        'Private key: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('PRIVATE_KEY_REDACTED')
      );
    });

    it('should partially redact addresses', () => {
      devLog.setLogLevel('debug');
      devLog.info('User address: 0x742d35Cc6634C0532925a3b844Bc454e4438f44e');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('0x742d...f44e')
      );
    });
  });

  describe('json output', () => {
    it('should output valid JSON', () => {
      const testData = { test: 'data', number: 123 };
      devLog.json(testData);

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify(testData, null, 2)
      );
    });
  });
});
