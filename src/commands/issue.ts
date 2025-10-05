import { Command } from 'commander';
import inquirer from 'inquirer';
import { ethers } from 'ethers';
import { BlockchainAdapter } from '../core/blockchain';
import { getCLIConfig, validateConfig } from '../utils/config';
import { devLog } from '../utils/logger';
import { isValidAddress } from '../utils/crypto';
import { AttestationData } from '../types';

interface IssueOptions {
  schema?: string;
  recipient?: string;
  data?: string;
  expiration?: string;
  revocable?: boolean;
  value?: string;
  json?: boolean;
  interactive?: boolean;
}

export function createIssueCommand(): Command {
  const command = new Command('issue');

  command
    .description('Issue a new attestation on Rootstock')
    .option('-s, --schema <uid>', 'Schema UID for the attestation')
    .option(
      '-r, --recipient <address>',
      'Recipient address for the attestation'
    )
    .option('-d, --data <data>', 'Encoded attestation data or JSON string')
    .option(
      '-e, --expiration <timestamp>',
      'Expiration timestamp (0 for no expiration)'
    )
    .option('--revocable', 'Make the attestation revocable', true)
    .option('--no-revocable', 'Make the attestation non-revocable')
    .option('-v, --value <amount>', 'ETH value to send with attestation', '0')
    .option('--json', 'Output result as JSON')
    .option('-i, --interactive', 'Use interactive mode')
    .action(async (options: IssueOptions) => {
      try {
        await handleIssueCommand(options);
      } catch (error) {
        devLog.error('Issue command failed', error as Error);
        process.exit(1);
      }
    });

  return command;
}

async function handleIssueCommand(options: IssueOptions): Promise<void> {
  const config = getCLIConfig();
  validateConfig(config);

  devLog.setLogLevel(config.logLevel);

  if (options.interactive || !options.schema || !options.recipient) {
    await handleInteractiveMode(options);
  }

  if (!options.schema || !options.recipient) {
    throw new Error('Schema UID and recipient address are required');
  }

  if (!isValidAddress(options.recipient)) {
    throw new Error('Invalid recipient address format');
  }

  const blockchain = new BlockchainAdapter(config);
  const signerAddress = await blockchain.getSignerAddress();
  const balance = await blockchain.getBalance();

  devLog.info(`Using signer: ${signerAddress}`);
  devLog.info(`Balance: ${balance} ETH`);

  const attestationData: AttestationData = {
    schema: options.schema,
    recipient: options.recipient,
    expirationTime: options.expiration ? parseInt(options.expiration) : 0,
    revocable: options.revocable !== false,
    data: options.data || '0x',
    value: options.value || '0',
  };

  if (options.data && !options.data.startsWith('0x')) {
    try {
      const jsonData = JSON.parse(options.data);
      const schema = await blockchain.getSchema(options.schema);
      attestationData.data = blockchain.encodeAttestationData(
        schema.schema,
        jsonData
      );
    } catch (error) {
      devLog.warn('Failed to parse data as JSON, using as raw data');
      attestationData.data = options.data;
    }
  }

  devLog.info('Creating attestation...');

  if (!options.json) {
    devLog.info(`Schema: ${attestationData.schema}`);
    devLog.info(`Recipient: ${attestationData.recipient}`);
    devLog.info(`Revocable: ${attestationData.revocable}`);
    devLog.info(`Value: ${attestationData.value} ETH`);
  }

  const result = await blockchain.createAttestation(attestationData);

  if (options.json) {
    devLog.json({
      success: true,
      attestation: {
        uid: result.uid,
        txHash: result.txHash,
        blockNumber: result.blockNumber,
        timestamp: result.timestamp,
        schema: attestationData.schema,
        recipient: attestationData.recipient,
        revocable: attestationData.revocable,
      },
    });
  } else {
    devLog.success('Attestation created successfully!');
    devLog.info(`Attestation UID: ${result.uid}`);
    devLog.info(`Transaction Hash: ${result.txHash}`);
    if (result.blockNumber) {
      devLog.info(`Block Number: ${result.blockNumber}`);
    }
  }
}

async function handleInteractiveMode(options: IssueOptions): Promise<void> {
  devLog.info('Starting interactive attestation creation...');

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'schema',
      message: 'Enter schema UID:',
      default: options.schema,
      validate: (input: string) => {
        if (!input || !input.startsWith('0x') || input.length !== 66) {
          return 'Please enter a valid schema UID (0x followed by 64 hex characters)';
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'recipient',
      message: 'Enter recipient address:',
      default: options.recipient,
      validate: (input: string) => {
        if (!isValidAddress(input)) {
          return 'Please enter a valid Ethereum address';
        }
        return true;
      },
    },
    {
      type: 'editor',
      name: 'data',
      message: 'Enter attestation data (JSON format or raw hex):',
      default: options.data || '{}',
    },
    {
      type: 'input',
      name: 'expiration',
      message: 'Enter expiration timestamp (0 for no expiration):',
      default: options.expiration || '0',
      validate: (input: string) => {
        const num = parseInt(input);
        if (isNaN(num) || num < 0) {
          return 'Please enter a valid timestamp';
        }
        return true;
      },
    },
    {
      type: 'confirm',
      name: 'revocable',
      message: 'Should this attestation be revocable?',
      default: options.revocable !== false,
    },
    {
      type: 'input',
      name: 'value',
      message: 'Enter ETH value to send (0 for no value):',
      default: options.value || '0',
      validate: (input: string) => {
        try {
          ethers.parseEther(input);
          return true;
        } catch {
          return 'Please enter a valid ETH amount';
        }
      },
    },
  ]);

  Object.assign(options, answers);
}
