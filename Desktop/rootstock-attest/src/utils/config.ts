import { config } from 'dotenv';
import { CLIConfig, NetworkConfig } from '../types';
import { devLog } from './logger';

config();

const ROOTSTOCK_NETWORKS: Record<string, NetworkConfig> = {
  mainnet: {
    name: 'Rootstock Mainnet',
    rpcUrl: process.env.RSK_MAINNET_RPC_URL || 'https://public-node.rsk.co',
    chainId: 30,
    easContractAddress:
      process.env.RAS_CONTRACT_ADDRESS ||
      '0x54c0726E9D2D57Bc37aD52C7E219a3229E0ee963',
    schemaRegistryAddress:
      process.env.RAS_SCHEMA_REGISTRY ||
      '0xef29675d82Cc5967069D6D9c17F2719F67728F5b',
    graphqlEndpoint: 'https://rootstock.easscan.org/graphql',
  },
  testnet: {
    name: 'Rootstock Testnet',
    rpcUrl: process.env.RSK_RPC_URL || 'https://public-node.testnet.rsk.co',
    chainId: 31,
    easContractAddress:
      process.env.RSK_TESTNET_RAS_CONTRACT ||
      '0x54c0726E9D2D57Bc37aD52C7E219a3229E0ee963',
    schemaRegistryAddress:
      process.env.RSK_TESTNET_SCHEMA_REGISTRY ||
      '0xef29675d82Cc5967069D6D9c17F2719F67728F5b',
    graphqlEndpoint: 'https://rootstock-testnet.easscan.org/graphql',
  },
};

export function getNetworkConfig(network: string = 'testnet'): NetworkConfig {
  const networkConfig = ROOTSTOCK_NETWORKS[network];
  if (!networkConfig) {
    throw new Error(`Unsupported network: ${network}`);
  }
  return networkConfig;
}

export function getCLIConfig(): CLIConfig {
  const networkName = process.env.RSK_NETWORK || 'testnet';
  const network = getNetworkConfig(networkName);

  return {
    network,
    wallet: {
      privateKey: process.env.PRIVATE_KEY,
      mnemonic: process.env.MNEMONIC,
    },
    logLevel: (process.env.LOG_LEVEL as any) || 'info',
    encryptStorage: process.env.ENCRYPT_STORAGE === 'true',
  };
}

export function validateConfig(config: CLIConfig): void {
  if (!config.wallet.privateKey && !config.wallet.mnemonic) {
    throw new Error(
      'Either PRIVATE_KEY or MNEMONIC must be provided in environment variables'
    );
  }

  if (!config.network.rpcUrl) {
    throw new Error('RPC URL is required for network configuration');
  }

  if (!config.network.easContractAddress) {
    throw new Error('EAS contract address is required');
  }

  devLog.debug(`Config validated for network: ${config.network.name}`);
}
