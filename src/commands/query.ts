import { Command } from 'commander';
import inquirer from 'inquirer';
import { QueryService } from '../core/query';
import { getCLIConfig } from '../utils/config';
import { devLog } from '../utils/logger';
import { isValidAddress } from '../utils/crypto';
import { QueryOptions } from '../types';

interface QueryCommandOptions {
  schema?: string;
  recipient?: string;
  attester?: string;
  uid?: string;
  limit?: string;
  offset?: string;
  json?: boolean;
  interactive?: boolean;
}

export function createQueryCommand(): Command {
  const command = new Command('query');

  command
    .description('Query attestations from Rootstock')
    .option('-s, --schema <uid>', 'Filter by schema UID')
    .option('-r, --recipient <address>', 'Filter by recipient address')
    .option('-a, --attester <address>', 'Filter by attester address')
    .option('-u, --uid <uid>', 'Get specific attestation by UID')
    .option('-l, --limit <number>', 'Limit number of results', '100')
    .option('-o, --offset <number>', 'Offset for pagination', '0')
    .option('--json', 'Output result as JSON')
    .option('-i, --interactive', 'Use interactive mode')
    .action(async (options: QueryCommandOptions) => {
      try {
        await handleQueryCommand(options);
      } catch (error) {
        devLog.error('Query command failed', error as Error);
        process.exit(1);
      }
    });

  return command;
}

async function handleQueryCommand(options: QueryCommandOptions): Promise<void> {
  const config = getCLIConfig();
  devLog.setLogLevel(config.logLevel);

  if (options.interactive) {
    await handleInteractiveMode(options);
  }

  const queryService = new QueryService(config.network.graphqlEndpoint || '');

  if (options.uid) {
    await handleSingleUIDQuery(queryService, options.uid, options.json);
    return;
  }

  const queryOptions: QueryOptions = {
    schema: options.schema,
    recipient: options.recipient,
    attester: options.attester,
    limit: options.limit ? parseInt(options.limit) : undefined,
    offset: options.offset ? parseInt(options.offset) : undefined,
  };

  if (queryOptions.recipient && !isValidAddress(queryOptions.recipient)) {
    throw new Error('Invalid recipient address format');
  }

  if (queryOptions.attester && !isValidAddress(queryOptions.attester)) {
    throw new Error('Invalid attester address format');
  }

  devLog.info('Querying attestations...');

  const attestations = await queryService.queryAttestations(queryOptions);

  if (options.json) {
    devLog.json({
      success: true,
      count: attestations.length,
      attestations: attestations,
    });
  } else {
    await displayAttestations(attestations);
  }
}

async function handleSingleUIDQuery(
  queryService: QueryService,
  uid: string,
  jsonOutput?: boolean
): Promise<void> {
  devLog.info(`Fetching attestation: ${uid}`);

  const attestations = await queryService.getAttestationsByUID([uid]);

  if (attestations.length === 0) {
    if (jsonOutput) {
      devLog.json({
        success: false,
        error: 'Attestation not found',
        uid,
      });
    } else {
      devLog.failure(`Attestation not found: ${uid}`);
    }
    return;
  }

  const attestation = attestations[0];

  if (jsonOutput) {
    devLog.json({
      success: true,
      attestation,
    });
  } else {
    await displaySingleAttestation(attestation);
  }
}

async function displayAttestations(attestations: any[]): Promise<void> {
  if (attestations.length === 0) {
    devLog.info('No attestations found matching the criteria.');
    return;
  }

  devLog.success(`Found ${attestations.length} attestation(s):`);

  for (const attestation of attestations) {
    devLog.info(`\n${'='.repeat(60)}`);
    devLog.info(`UID: ${attestation.uid}`);
    devLog.info(`Schema: ${attestation.schema.id}`);
    devLog.info(`Recipient: ${attestation.recipient}`);
    devLog.info(`Attester: ${attestation.attester}`);
    devLog.info(
      `Created: ${new Date(attestation.timeCreated * 1000).toISOString()}`
    );

    if (attestation.revocationTime > 0) {
      devLog.warn(
        `Revoked: ${new Date(attestation.revocationTime * 1000).toISOString()}`
      );
    }

    if (attestation.expirationTime > 0) {
      const expDate = new Date(attestation.expirationTime * 1000);
      const isExpired = expDate < new Date();
      devLog.info(
        `Expires: ${expDate.toISOString()} ${isExpired ? '(EXPIRED)' : ''}`
      );
    }

    if (attestation.decodedDataJson) {
      devLog.info('Decoded Data:');
      try {
        const decoded = JSON.parse(attestation.decodedDataJson);
        for (const [key, value] of Object.entries(decoded)) {
          devLog.info(`  ${key}: ${value}`);
        }
      } catch {
        devLog.info(`  Raw: ${attestation.decodedDataJson}`);
      }
    }
  }
}

async function displaySingleAttestation(attestation: any): Promise<void> {
  devLog.success('Attestation Details:');
  devLog.info(`${'='.repeat(60)}`);
  devLog.info(`UID: ${attestation.uid}`);
  devLog.info(`Schema ID: ${attestation.schema.id}`);
  devLog.info(`Schema Definition: ${attestation.schema.schema}`);
  devLog.info(`Recipient: ${attestation.recipient}`);
  devLog.info(`Attester: ${attestation.attester}`);
  devLog.info(
    `Created: ${new Date(attestation.timeCreated * 1000).toISOString()}`
  );
  devLog.info(`Revocable: ${attestation.revocable ? 'Yes' : 'No'}`);

  if (attestation.revocationTime > 0) {
    devLog.warn(
      `Status: REVOKED on ${new Date(attestation.revocationTime * 1000).toISOString()}`
    );
  } else {
    devLog.success('Status: ACTIVE');
  }

  if (attestation.expirationTime > 0) {
    const expDate = new Date(attestation.expirationTime * 1000);
    const isExpired = expDate < new Date();
    devLog.info(`Expires: ${expDate.toISOString()}`);
    if (isExpired) {
      devLog.warn('WARNING: This attestation has expired');
    }
  } else {
    devLog.info('Expires: Never');
  }

  devLog.info(`Raw Data: ${attestation.data}`);

  if (attestation.decodedDataJson) {
    devLog.info('\nDecoded Data:');
    try {
      const decoded = JSON.parse(attestation.decodedDataJson);
      for (const [key, value] of Object.entries(decoded)) {
        devLog.info(`  ${key}: ${value}`);
      }
    } catch {
      devLog.info(`  ${attestation.decodedDataJson}`);
    }
  }
}

async function handleInteractiveMode(
  options: QueryCommandOptions
): Promise<void> {
  devLog.info('Starting interactive attestation query...');

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'queryType',
      message: 'What would you like to query?',
      choices: [
        { name: 'Search attestations by filters', value: 'search' },
        { name: 'Get specific attestation by UID', value: 'uid' },
        { name: 'List schemas', value: 'schemas' },
      ],
    },
  ]);

  if (answers.queryType === 'uid') {
    const uidAnswer = await inquirer.prompt([
      {
        type: 'input',
        name: 'uid',
        message: 'Enter attestation UID:',
        validate: (input: string) => {
          if (!input || !input.startsWith('0x') || input.length !== 66) {
            return 'Please enter a valid UID (0x followed by 64 hex characters)';
          }
          return true;
        },
      },
    ]);
    options.uid = uidAnswer.uid;
  } else if (answers.queryType === 'search') {
    const searchAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'schema',
        message: 'Filter by schema UID (optional):',
        default: options.schema,
      },
      {
        type: 'input',
        name: 'recipient',
        message: 'Filter by recipient address (optional):',
        default: options.recipient,
        validate: (input: string) => {
          if (input && !isValidAddress(input)) {
            return 'Please enter a valid Ethereum address';
          }
          return true;
        },
      },
      {
        type: 'input',
        name: 'attester',
        message: 'Filter by attester address (optional):',
        default: options.attester,
        validate: (input: string) => {
          if (input && !isValidAddress(input)) {
            return 'Please enter a valid Ethereum address';
          }
          return true;
        },
      },
      {
        type: 'input',
        name: 'limit',
        message: 'Maximum number of results:',
        default: options.limit || '100',
        validate: (input: string) => {
          const num = parseInt(input);
          if (isNaN(num) || num <= 0) {
            return 'Please enter a positive number';
          }
          return true;
        },
      },
    ]);

    Object.assign(options, searchAnswers);
  } else if (answers.queryType === 'schemas') {
    const config = getCLIConfig();
    const queryService = new QueryService(config.network.graphqlEndpoint || '');
    const schemas = await queryService.querySchemas({ limit: 50 });

    if (options.json) {
      devLog.json({
        success: true,
        count: schemas.length,
        schemas,
      });
    } else {
      devLog.success(`Found ${schemas.length} schema(s):`);
      for (const schema of schemas) {
        devLog.info(`\n${'='.repeat(40)}`);
        devLog.info(`UID: ${schema.id}`);
        devLog.info(`Creator: ${schema.creator}`);
        devLog.info(`Schema: ${schema.schema}`);
        devLog.info(`Revocable: ${schema.revocable ? 'Yes' : 'No'}`);
        devLog.info(`Created: ${new Date(schema.time * 1000).toISOString()}`);
      }
    }
    process.exit(0);
  }
}
