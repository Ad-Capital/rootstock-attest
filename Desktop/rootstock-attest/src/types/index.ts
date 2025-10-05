export interface AttestationData {
  schema: string;
  recipient: string;
  expirationTime?: number;
  revocable: boolean;
  data: string;
  value?: string;
}

export interface AttestationResponse {
  uid: string;
  txHash: string;
  blockNumber?: number;
  timestamp?: number;
}

export interface SchemaData {
  uid: string;
  schema: string;
  resolver: string;
  revocable: boolean;
  creator?: string;
}

export interface QueryOptions {
  schema?: string;
  recipient?: string;
  attester?: string;
  limit?: number;
  offset?: number;
}

export interface NetworkConfig {
  name: string;
  rpcUrl: string;
  chainId: number;
  easContractAddress: string;
  schemaRegistryAddress: string;
  graphqlEndpoint?: string;
}

export interface WalletConfig {
  privateKey?: string;
  mnemonic?: string;
  encryptedKey?: string;
}

export interface CLIConfig {
  network: NetworkConfig;
  wallet: WalletConfig;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  encryptStorage: boolean;
}

export interface DemoSchema {
  name: string;
  description: string;
  schema: string;
  uid?: string;
}
