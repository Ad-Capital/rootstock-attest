import { Command } from 'commander';
import inquirer from 'inquirer';
import { BlockchainAdapter } from '../core/blockchain';
import { QueryService } from '../core/query';
import { getCLIConfig, validateConfig } from '../utils/config';
import { devLog } from '../utils/logger';

interface VerifyOptions {
  uid?: string;
  json?: boolean;
  interactive?: boolean;
  checkExpiration?: boolean;
  checkRevocation?: boolean;
}

interface VerificationResult {
  uid: string;
  isValid: boolean;
  exists: boolean;
  isRevoked: boolean;
  isExpired: boolean;
  attestation?: any;
  issues: string[];
}

export function createVerifyCommand(): Command {
  const command = new Command('verify');

  command
    .description('Verify the validity of an attestation')
    .option('-u, --uid <uid>', 'Attestation UID to verify')
    .option('--json', 'Output result as JSON')
    .option('-i, --interactive', 'Use interactive mode')
    .option('--check-expiration', 'Check if attestation is expired', true)
    .option('--check-revocation', 'Check if attestation is revoked', true)
    .action(async (options: VerifyOptions) => {
      try {
        await handleVerifyCommand(options);
      } catch (error) {
        devLog.error('Verify command failed', error as Error);
        process.exit(1);
      }
    });

  return command;
}

async function handleVerifyCommand(options: VerifyOptions): Promise<void> {
  const config = getCLIConfig();
  validateConfig(config);
  devLog.setLogLevel(config.logLevel);

  if (options.interactive || !options.uid) {
    await handleInteractiveMode(options);
  }

  if (!options.uid) {
    throw new Error('Attestation UID is required');
  }

  if (!options.uid.startsWith('0x') || options.uid.length !== 66) {
    throw new Error(
      'Invalid UID format. Expected 0x followed by 64 hex characters'
    );
  }

  devLog.info(`Verifying attestation: ${options.uid}`);

  const blockchain = new BlockchainAdapter(config);
  const queryService = new QueryService(config.network.graphqlEndpoint || '');

  const result = await verifyAttestation(
    options.uid,
    blockchain,
    queryService,
    {
      checkExpiration: options.checkExpiration !== false,
      checkRevocation: options.checkRevocation !== false,
    }
  );

  if (options.json) {
    devLog.json({
      success: true,
      verification: result,
    });
  } else {
    await displayVerificationResult(result);
  }
}

async function verifyAttestation(
  uid: string,
  blockchain: BlockchainAdapter,
  queryService: QueryService,
  checks: { checkExpiration: boolean; checkRevocation: boolean }
): Promise<VerificationResult> {
  const result: VerificationResult = {
    uid,
    isValid: true,
    exists: false,
    isRevoked: false,
    isExpired: false,
    issues: [],
  };

  try {
    const attestations = await queryService.getAttestationsByUID([uid]);

    if (attestations.length === 0) {
      result.exists = false;
      result.isValid = false;
      result.issues.push('Attestation does not exist');
      return result;
    }

    const attestation = attestations[0];
    result.exists = true;
    result.attestation = attestation;

    if (checks.checkRevocation && attestation.revocationTime > 0) {
      result.isRevoked = true;
      result.isValid = false;
      result.issues.push(
        `Attestation was revoked on ${new Date(attestation.revocationTime * 1000).toISOString()}`
      );
    }

    if (checks.checkExpiration && attestation.expirationTime > 0) {
      const now = Math.floor(Date.now() / 1000);
      if (attestation.expirationTime < now) {
        result.isExpired = true;
        result.isValid = false;
        result.issues.push(
          `Attestation expired on ${new Date(attestation.expirationTime * 1000).toISOString()}`
        );
      }
    }

    try {
      const onChainAttestation = await blockchain.getAttestation(uid);
      if (!onChainAttestation || onChainAttestation.uid !== uid) {
        result.isValid = false;
        result.issues.push(
          'Attestation data mismatch between on-chain and indexer'
        );
      }
    } catch (error) {
      devLog.warn(
        `Could not verify on-chain data: ${(error as Error).message}`
      );
      result.issues.push('Warning: Could not verify on-chain data');
    }

    try {
      const schema = await blockchain.getSchema(attestation.schema.id);
      if (!schema || !schema.schema) {
        result.isValid = false;
        result.issues.push('Referenced schema does not exist or is invalid');
      }
    } catch (error) {
      result.isValid = false;
      result.issues.push('Failed to validate schema');
    }

    if (result.issues.length === 0) {
      result.issues.push('All checks passed');
    }
  } catch (error) {
    result.isValid = false;
    result.issues.push(`Verification failed: ${(error as Error).message}`);
  }

  return result;
}

async function displayVerificationResult(
  result: VerificationResult
): Promise<void> {
  devLog.info(`\nVerification Results for ${result.uid}:`);
  devLog.info('='.repeat(80));

  if (result.isValid) {
    devLog.success('✅ ATTESTATION IS VALID');
  } else {
    devLog.failure('❌ ATTESTATION IS NOT VALID');
  }

  devLog.info(`\nStatus Checks:`);
  devLog.info(`  Exists: ${result.exists ? '✅ Yes' : '❌ No'}`);
  devLog.info(`  Revoked: ${result.isRevoked ? '❌ Yes' : '✅ No'}`);
  devLog.info(`  Expired: ${result.isExpired ? '❌ Yes' : '✅ No'}`);

  if (result.attestation) {
    devLog.info(`\nAttestation Details:`);
    devLog.info(`  Schema: ${result.attestation.schema.id}`);
    devLog.info(`  Recipient: ${result.attestation.recipient}`);
    devLog.info(`  Attester: ${result.attestation.attester}`);
    devLog.info(
      `  Created: ${new Date(result.attestation.timeCreated * 1000).toISOString()}`
    );

    if (result.attestation.expirationTime > 0) {
      devLog.info(
        `  Expires: ${new Date(result.attestation.expirationTime * 1000).toISOString()}`
      );
    } else {
      devLog.info(`  Expires: Never`);
    }

    devLog.info(`  Revocable: ${result.attestation.revocable ? 'Yes' : 'No'}`);

    if (result.attestation.decodedDataJson) {
      devLog.info(`\nDecoded Data:`);
      try {
        const decoded = JSON.parse(result.attestation.decodedDataJson);
        for (const [key, value] of Object.entries(decoded)) {
          devLog.info(`    ${key}: ${value}`);
        }
      } catch {
        devLog.info(`    Raw: ${result.attestation.decodedDataJson}`);
      }
    }
  }

  devLog.info(`\nValidation Issues:`);
  result.issues.forEach((issue, index) => {
    const icon = issue.includes('passed')
      ? '✅'
      : issue.includes('Warning')
        ? '⚠️'
        : '❌';
    devLog.info(`  ${index + 1}. ${icon} ${issue}`);
  });

  if (result.isValid) {
    devLog.success('\n🎉 This attestation is valid and can be trusted!');
  } else {
    devLog.failure(
      '\n⚠️ This attestation has validation issues. Use with caution.'
    );
  }
}

async function handleInteractiveMode(options: VerifyOptions): Promise<void> {
  devLog.info('Starting interactive attestation verification...');

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'uid',
      message: 'Enter attestation UID to verify:',
      default: options.uid,
      validate: (input: string) => {
        if (!input || !input.startsWith('0x') || input.length !== 66) {
          return 'Please enter a valid UID (0x followed by 64 hex characters)';
        }
        return true;
      },
    },
    {
      type: 'confirm',
      name: 'checkExpiration',
      message: 'Check if attestation is expired?',
      default: options.checkExpiration !== false,
    },
    {
      type: 'confirm',
      name: 'checkRevocation',
      message: 'Check if attestation is revoked?',
      default: options.checkRevocation !== false,
    },
  ]);

  Object.assign(options, answers);
}
