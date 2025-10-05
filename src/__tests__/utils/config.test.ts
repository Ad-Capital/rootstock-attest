import {
  getCLIConfig,
  getNetworkConfig,
  validateConfig,
} from '../../utils/config';

describe('Config Utils', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getNetworkConfig', () => {
    it('should return testnet config by default', () => {
      const config = getNetworkConfig();
      expect(config.name).toBe('Rootstock Testnet');
      expect(config.chainId).toBe(31);
    });

    it('should return mainnet config when specified', () => {
      const config = getNetworkConfig('mainnet');
      expect(config.name).toBe('Rootstock Mainnet');
      expect(config.chainId).toBe(30);
    });

    it('should throw error for unknown network', () => {
      expect(() => getNetworkConfig('unknown')).toThrow(
        'Unsupported network: unknown'
      );
    });
  });

  describe('getCLIConfig', () => {
    it('should return valid config with environment variables', () => {
      process.env.RSK_NETWORK = 'testnet';
      process.env.PRIVATE_KEY =
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      process.env.LOG_LEVEL = 'debug';

      const config = getCLIConfig();

      expect(config.network.name).toBe('Rootstock Testnet');
      expect(config.wallet.privateKey).toBe(
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      );
      expect(config.logLevel).toBe('debug');
    });

    it('should use default values when env vars are missing', () => {
      delete process.env.RSK_NETWORK;
      delete process.env.LOG_LEVEL;

      const config = getCLIConfig();

      expect(config.network.name).toBe('Rootstock Testnet');
      expect(config.logLevel).toBe('info');
    });
  });

  describe('validateConfig', () => {
    it('should pass validation with valid config', () => {
      const config = {
        network: {
          name: 'Test Network',
          rpcUrl: 'https://test.rpc.url',
          chainId: 31,
          easContractAddress: '0x1234567890abcdef1234567890abcdef12345678',
          schemaRegistryAddress: '0x1234567890abcdef1234567890abcdef12345678',
        },
        wallet: {
          privateKey:
            '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        },
        logLevel: 'info' as const,
        encryptStorage: false,
      };

      expect(() => validateConfig(config)).not.toThrow();
    });

    it('should throw error when no wallet credentials provided', () => {
      const config = {
        network: {
          name: 'Test Network',
          rpcUrl: 'https://test.rpc.url',
          chainId: 31,
          easContractAddress: '0x1234567890abcdef1234567890abcdef12345678',
          schemaRegistryAddress: '0x1234567890abcdef1234567890abcdef12345678',
        },
        wallet: {},
        logLevel: 'info' as const,
        encryptStorage: false,
      };

      expect(() => validateConfig(config)).toThrow(
        'Either PRIVATE_KEY or MNEMONIC must be provided'
      );
    });

    it('should throw error when RPC URL is missing', () => {
      const config = {
        network: {
          name: 'Test Network',
          rpcUrl: '',
          chainId: 31,
          easContractAddress: '0x1234567890abcdef1234567890abcdef12345678',
          schemaRegistryAddress: '0x1234567890abcdef1234567890abcdef12345678',
        },
        wallet: {
          privateKey:
            '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        },
        logLevel: 'info' as const,
        encryptStorage: false,
      };

      expect(() => validateConfig(config)).toThrow('RPC URL is required');
    });
  });
});
