import { jest } from '@jest/globals';

jest.setTimeout(30000);

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.RSK_NETWORK = 'testnet';
  process.env.PRIVATE_KEY =
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  process.env.LOG_LEVEL = 'error';
});

describe('Test Setup', () => {
  it('should set up test environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.RSK_NETWORK).toBe('testnet');
    expect(process.env.LOG_LEVEL).toBe('error');
    expect(process.env.PRIVATE_KEY).toBeDefined();
  });
});
