import { Command } from 'commander';
import { createIssueCommand } from '../../commands/issue';
import { BlockchainAdapter } from '../../core/blockchain';

jest.mock('../../core/blockchain');
jest.mock('inquirer', () => ({
  prompt: jest.fn().mockResolvedValue({
    schema:
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    recipient: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    data: 'test data',
    expiration: '0',
    revocable: true,
    value: '0',
  }),
}));
jest.mock('../../utils/config', () => ({
  getCLIConfig: jest.fn(() => ({
    network: {
      name: 'Test Network',
      rpcUrl: 'https://test.rpc',
      chainId: 31,
      easContractAddress: '0xtest',
      schemaRegistryAddress: '0xtest',
    },
    wallet: {
      privateKey:
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    },
    logLevel: 'error',
    encryptStorage: false,
  })),
  validateConfig: jest.fn(),
}));

describe('Issue Command', () => {
  let command: Command;
  let mockBlockchainAdapter: jest.Mocked<BlockchainAdapter>;
  let processExitSpy: jest.SpyInstance;

  beforeEach(() => {
    command = createIssueCommand();
    mockBlockchainAdapter = new BlockchainAdapter(
      {} as any
    ) as jest.Mocked<BlockchainAdapter>;
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation();

    (
      BlockchainAdapter as jest.MockedClass<typeof BlockchainAdapter>
    ).mockImplementation(() => mockBlockchainAdapter);

    mockBlockchainAdapter.getSignerAddress.mockResolvedValue('0x123456789');
    mockBlockchainAdapter.getBalance.mockResolvedValue('1.0');
    mockBlockchainAdapter.createAttestation.mockResolvedValue({
      uid: '0xtest-uid',
      txHash: '0xtest-hash',
      blockNumber: 123,
      timestamp: Date.now(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    processExitSpy.mockRestore();
  });

  it('should create issue command with correct name and description', () => {
    expect(command.name()).toBe('issue');
    expect(command.description()).toBe('Issue a new attestation on Rootstock');
  });

  it('should have all required options', () => {
    const options = command.options;
    const optionNames = options.map((opt) => opt.long);

    expect(optionNames).toContain('--schema');
    expect(optionNames).toContain('--recipient');
    expect(optionNames).toContain('--data');
    expect(optionNames).toContain('--expiration');
    expect(optionNames).toContain('--revocable');
    expect(optionNames).toContain('--value');
    expect(optionNames).toContain('--json');
    expect(optionNames).toContain('--interactive');
  });

  it('should validate required parameters', async () => {
    // Mock inquirer to return empty values to trigger validation error
    const inquirer = require('inquirer');
    inquirer.prompt.mockResolvedValueOnce({
      schema: '',
      recipient: '',
      data: '',
    });

    // Test by parsing command line arguments that are missing required fields
    try {
      await command.parseAsync(['node', 'test'], { from: 'node' });
    } catch (error) {
      // Command should fail due to missing required parameters
    }

    // Verify that process.exit was called due to validation failure
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('should validate recipient address format', async () => {
    // Test by parsing command line arguments with invalid recipient address
    try {
      await command.parseAsync(
        [
          'node',
          'test',
          '--schema',
          '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          '--recipient',
          'invalid-address',
          '--data',
          'test data',
        ],
        { from: 'node' }
      );
    } catch (error) {
      // Command should fail due to invalid recipient address
    }

    // Verify that process.exit was called due to validation failure
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});
