import { Command } from 'commander';
import inquirer from 'inquirer';
import { BlockchainAdapter } from '../core/blockchain';
import { QueryService } from '../core/query';
import { getCLIConfig, validateConfig } from '../utils/config';
import { devLog } from '../utils/logger';
import { DemoSchema } from '../types';

const DEMO_SCHEMAS: DemoSchema[] = [
  {
    name: 'Hackathon Winner',
    description: 'Attestation for hackathon winners',
    schema:
      'string eventName,string projectName,string category,uint256 prize,string githubRepo',
  },
  {
    name: 'Grant Milestone',
    description: 'Attestation for completed grant milestones',
    schema:
      'string grantName,string milestone,uint256 amount,string deliverable,bool completed',
  },
  {
    name: 'Community Reputation',
    description: 'Attestation for community contributions',
    schema:
      'string platform,string username,uint256 contributions,string role,uint256 score',
  },
  {
    name: 'Developer Badge',
    description: 'Attestation for developer achievements',
    schema:
      'string skill,string level,string certifier,uint256 timestamp,string evidence',
  },
];

interface DemoOptions {
  type?: string;
  create?: boolean;
  json?: boolean;
  interactive?: boolean;
}

export function createDemoCommand(): Command {
  const command = new Command('demo');

  command
    .description('Run demo scenarios for Rootstock attestations')
    .option('-t, --type <type>', 'Demo type: hackathon|grant|reputation|badge')
    .option('-c, --create', "Create the demo schema if it doesn't exist")
    .option('--json', 'Output result as JSON')
    .option('-i, --interactive', 'Use interactive mode')
    .action(async (options: DemoOptions) => {
      try {
        await handleDemoCommand(options);
      } catch (error) {
        devLog.error('Demo command failed', error as Error);
        process.exit(1);
      }
    });

  return command;
}

async function handleDemoCommand(options: DemoOptions): Promise<void> {
  const config = getCLIConfig();
  validateConfig(config);
  devLog.setLogLevel(config.logLevel);

  if (options.interactive || !options.type) {
    await handleInteractiveMode(options);
  }

  const demoType = options.type || 'hackathon';
  const schema = DEMO_SCHEMAS.find((s) =>
    s.name.toLowerCase().includes(demoType.toLowerCase())
  );

  if (!schema) {
    throw new Error(
      `Unknown demo type: ${demoType}. Available: hackathon, grant, reputation, badge`
    );
  }

  const blockchain = new BlockchainAdapter(config);
  const queryService = new QueryService(config.network.graphqlEndpoint || '');

  devLog.info(`Running ${schema.name} demo...`);
  devLog.info(`Description: ${schema.description}`);

  let schemaUID = schema.uid;

  if (options.create || !schemaUID) {
    devLog.info('Creating demo schema...');
    schemaUID = await blockchain.createSchema(schema.schema);
    schema.uid = schemaUID;
    devLog.success(`Schema created with UID: ${schemaUID}`);
  }

  if (!schemaUID) {
    throw new Error(
      'No schema UID available. Use --create to create the schema first.'
    );
  }

  const signerAddress = await blockchain.getSignerAddress();
  await runDemoScenario(
    schema,
    schemaUID,
    signerAddress,
    blockchain,
    options.json
  );

  if (!options.json) {
    devLog.info('\n🎉 Demo completed successfully!');
    devLog.info('\nNext steps:');
    devLog.info(
      `1. Query your attestation: rsk attest query --uid <attestation-uid>`
    );
    devLog.info(
      `2. Verify the attestation: rsk attest verify --uid <attestation-uid>`
    );
    devLog.info(
      `3. Query by recipient: rsk attest query --recipient ${signerAddress}`
    );
  }
}

async function runDemoScenario(
  schema: DemoSchema,
  schemaUID: string,
  signerAddress: string,
  blockchain: BlockchainAdapter,
  jsonOutput?: boolean
): Promise<void> {
  let demoData: Record<string, any>;
  const recipient = signerAddress;

  switch (schema.name) {
    case 'Hackathon Winner':
      demoData = {
        eventName: 'Rootstock Global Hackathon 2024',
        projectName: 'DeFi Portfolio Tracker',
        category: 'DeFi',
        prize: 5000,
        githubRepo: 'https://github.com/user/defi-tracker',
      };
      break;

    case 'Grant Milestone':
      demoData = {
        grantName: 'Rootstock Ecosystem Development Grant',
        milestone: 'MVP Development Complete',
        amount: 10000,
        deliverable: 'Smart contract deployed and audited',
        completed: true,
      };
      break;

    case 'Community Reputation':
      demoData = {
        platform: 'Rootstock Discord',
        username: 'crypto_dev_123',
        contributions: 50,
        role: 'Community Moderator',
        score: 95,
      };
      break;

    case 'Developer Badge':
      demoData = {
        skill: 'Smart Contract Development',
        level: 'Advanced',
        certifier: 'Rootstock Academy',
        timestamp: Math.floor(Date.now() / 1000),
        evidence: 'Completed advanced Solidity course with 98% score',
      };
      break;

    default:
      throw new Error('Unknown demo schema');
  }

  if (!jsonOutput) {
    devLog.info('\nDemo Data:');
    for (const [key, value] of Object.entries(demoData)) {
      devLog.info(`  ${key}: ${value}`);
    }
    devLog.info(`\nRecipient: ${recipient}`);
  }

  const encodedData = blockchain.encodeAttestationData(schema.schema, demoData);

  const attestationData = {
    schema: schemaUID,
    recipient,
    expirationTime: 0,
    revocable: true,
    data: encodedData,
    value: '0',
  };

  devLog.info('\nCreating demo attestation...');
  const result = await blockchain.createAttestation(attestationData);

  if (jsonOutput) {
    devLog.json({
      success: true,
      demo: {
        type: schema.name,
        schema: {
          uid: schemaUID,
          definition: schema.schema,
        },
        attestation: {
          uid: result.uid,
          txHash: result.txHash,
          blockNumber: result.blockNumber,
          recipient,
          data: demoData,
        },
      },
    });
  } else {
    devLog.success('Demo attestation created!');
    devLog.info(`Attestation UID: ${result.uid}`);
    devLog.info(`Transaction Hash: ${result.txHash}`);
    if (result.blockNumber) {
      devLog.info(`Block Number: ${result.blockNumber}`);
    }
  }
}

async function handleInteractiveMode(options: DemoOptions): Promise<void> {
  devLog.info('Welcome to the Rootstock Attestation Demo!');
  devLog.info(
    'This will create sample attestations to showcase the functionality.\n'
  );

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: 'Choose a demo scenario:',
      choices: DEMO_SCHEMAS.map((schema) => ({
        name: `${schema.name} - ${schema.description}`,
        value: schema.name.toLowerCase().replace(/\s+/g, ''),
      })),
      default: options.type,
    },
    {
      type: 'confirm',
      name: 'create',
      message: "Create the schema if it doesn't exist?",
      default: true,
    },
    {
      type: 'confirm',
      name: 'proceed',
      message:
        'This will create an attestation on Rootstock. Do you want to proceed?',
      default: true,
    },
  ]);

  if (!answers.proceed) {
    devLog.info('Demo cancelled.');
    process.exit(0);
  }

  Object.assign(options, answers);

  const selectedSchema = DEMO_SCHEMAS.find(
    (s) => s.name.toLowerCase().replace(/\s+/g, '') === answers.type
  );

  if (selectedSchema) {
    devLog.info(`\nSelected Demo: ${selectedSchema.name}`);
    devLog.info(`Schema: ${selectedSchema.schema}`);
    devLog.info(`Description: ${selectedSchema.description}\n`);
  }
}
