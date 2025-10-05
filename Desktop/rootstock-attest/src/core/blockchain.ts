import { ethers } from 'ethers';
import {
  EAS,
  SchemaEncoder,
  SchemaRegistry,
} from '@ethereum-attestation-service/eas-sdk';
import {
  CLIConfig,
  AttestationData,
  AttestationResponse,
  SchemaData,
} from '../types';
import { devLog } from '../utils/logger';

export class BlockchainAdapter {
  private provider: ethers.Provider;
  private signer: ethers.Signer;
  private eas: EAS;
  private schemaRegistry: SchemaRegistry;
  private config: CLIConfig;

  constructor(config: CLIConfig) {
    this.config = config;
    this.provider = new ethers.JsonRpcProvider(config.network.rpcUrl);
    this.signer = this.initializeSigner();
    this.eas = new EAS(config.network.easContractAddress);
    this.schemaRegistry = new SchemaRegistry(
      config.network.schemaRegistryAddress
    );

    this.eas.connect(this.signer);
    this.schemaRegistry.connect(this.signer);

    devLog.info(
      `Connected to ${config.network.name} at ${config.network.rpcUrl}`
    );
  }

  private initializeSigner(): ethers.Signer {
    if (this.config.wallet.privateKey) {
      return new ethers.Wallet(this.config.wallet.privateKey, this.provider);
    }

    if (this.config.wallet.mnemonic) {
      return ethers.Wallet.fromPhrase(
        this.config.wallet.mnemonic,
        this.provider
      );
    }

    throw new Error('No valid wallet configuration found');
  }

  async getSignerAddress(): Promise<string> {
    return await this.signer.getAddress();
  }

  async getBalance(): Promise<string> {
    const address = await this.getSignerAddress();
    const balance = await this.provider.getBalance(address);
    return ethers.formatEther(balance);
  }

  async estimateGasPrice(): Promise<string> {
    const gasPrice = await this.provider.getFeeData();
    return ethers.formatUnits(gasPrice.gasPrice || 0, 'gwei');
  }

  async createAttestation(
    attestationData: AttestationData
  ): Promise<AttestationResponse> {
    try {
      devLog.info('Creating attestation...');
      devLog.debug(`Schema: ${attestationData.schema}`);
      devLog.debug(`Recipient: ${attestationData.recipient}`);

      const transaction = await this.eas.attest({
        schema: attestationData.schema,
        data: {
          recipient: attestationData.recipient,
          expirationTime: BigInt(attestationData.expirationTime || 0),
          revocable: attestationData.revocable,
          data: attestationData.data,
          value: ethers.parseEther(attestationData.value || '0'),
        },
      });

      const estimatedGas = await transaction.estimateGas();
      devLog.debug(`Estimated gas: ${estimatedGas.toString()}`);

      const result = await transaction.wait();
      const uid = result;
      devLog.tx(`Attestation created with UID: ${uid}`);

      // For now, return without the transaction hash since EAS SDK doesn't expose it directly
      // In the real implementation, might need to listen for transaction events or use a different approach
      return {
        uid: uid,
        txHash: '', // Transaction hash not available from EAS SDK
        blockNumber: undefined,
        timestamp: Date.now(),
      };
    } catch (error) {
      devLog.error('Failed to create attestation', error as Error);
      throw error;
    }
  }

  async revokeAttestation(uid: string): Promise<string> {
    try {
      devLog.info(`Revoking attestation: ${uid}`);

      const transaction = await this.eas.revoke({
        schema: uid,
        data: { uid },
      });

      await transaction.wait();
      devLog.tx('Attestation revoked successfully');

      // Transaction hash not available from EAS SDK directly
      return '';
    } catch (error) {
      devLog.error('Failed to revoke attestation', error as Error);
      throw error;
    }
  }

  async createSchema(
    schema: string,
    resolverAddress: string = ethers.ZeroAddress,
    revocable: boolean = true
  ): Promise<string> {
    try {
      devLog.info('Creating new schema...');
      devLog.debug(`Schema definition: ${schema}`);

      const transaction = await this.schemaRegistry.register({
        schema,
        resolverAddress,
        revocable,
      });

      const uid = await transaction.wait();
      devLog.tx(`Schema created with UID: ${uid}`);

      return uid;
    } catch (error) {
      devLog.error('Failed to create schema', error as Error);
      throw error;
    }
  }

  async getSchema(uid: string): Promise<SchemaData> {
    try {
      const schema = await this.schemaRegistry.getSchema({ uid });

      return {
        uid,
        schema: schema.schema,
        resolver: schema.resolver,
        revocable: schema.revocable,
        creator: (schema as any).creator || undefined,
      };
    } catch (error) {
      devLog.error(`Failed to get schema ${uid}`, error as Error);
      throw error;
    }
  }

  async getAttestation(uid: string): Promise<any> {
    try {
      const attestation = await this.eas.getAttestation(uid);
      return attestation;
    } catch (error) {
      devLog.error(`Failed to get attestation ${uid}`, error as Error);
      throw error;
    }
  }

  encodeAttestationData(
    schemaDefinition: string,
    data: Record<string, any>
  ): string {
    try {
      const encoder = new SchemaEncoder(schemaDefinition);
      const encodedData = encoder.encodeData(
        Object.entries(data).map(([name, value]) => ({
          name,
          value,
          type: this.inferType(value),
        }))
      );

      devLog.debug('Attestation data encoded successfully');
      return encodedData;
    } catch (error) {
      devLog.error('Failed to encode attestation data', error as Error);
      throw error;
    }
  }

  private inferType(value: any): string {
    if (typeof value === 'string') {
      if (ethers.isAddress(value)) return 'address';
      if ((value as string).startsWith('0x')) return 'bytes32';
      return 'string';
    }
    if (typeof value === 'number') return 'uint256';
    if (typeof value === 'boolean') return 'bool';
    return 'string';
  }

  async waitForTransaction(
    txHash: string
  ): Promise<ethers.TransactionReceipt | null> {
    try {
      devLog.info(`Waiting for transaction confirmation: ${txHash}`);
      const receipt = await this.provider.waitForTransaction(txHash);
      devLog.tx(`Transaction confirmed in block ${receipt?.blockNumber}`);
      return receipt;
    } catch (error) {
      devLog.error('Transaction failed', error as Error);
      throw error;
    }
  }
}
