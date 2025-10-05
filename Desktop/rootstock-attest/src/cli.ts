import { Command } from 'commander';
import { createIssueCommand } from './commands/issue';
import { createQueryCommand } from './commands/query';
import { createVerifyCommand } from './commands/verify';
import { createDemoCommand } from './commands/demo';
import { devLog } from './utils/logger';

const program = new Command();

program
  .name('rsk')
  .description(
    'Rootstock Attestation CLI - Issue, query, and verify EAS attestations'
  )
  .version('1.0.0');

const attestCommand = new Command('attest');
attestCommand
  .description('Rootstock Attestation Service commands')
  .addCommand(createIssueCommand())
  .addCommand(createQueryCommand())
  .addCommand(createVerifyCommand())
  .addCommand(createDemoCommand());

program.addCommand(attestCommand);

program
  .command('version')
  .description('Show version information')
  .action(() => {
    devLog.info('Rootstock Attestation CLI v1.0.0');
    devLog.info('Built with EAS SDK for Rootstock blockchain');
  });

program
  .command('config')
  .description('Show current configuration')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const { getCLIConfig } = await import('./utils/config');
      const config = getCLIConfig();

      const safeConfig = {
        network: {
          name: config.network.name,
          chainId: config.network.chainId,
          rpcUrl: config.network.rpcUrl,
          easContractAddress: config.network.easContractAddress,
          schemaRegistryAddress: config.network.schemaRegistryAddress,
        },
        logLevel: config.logLevel,
        encryptStorage: config.encryptStorage,
        hasPrivateKey: !!config.wallet.privateKey,
        hasMnemonic: !!config.wallet.mnemonic,
      };

      if (options.json) {
        devLog.json(safeConfig);
      } else {
        devLog.info('Current Configuration:');
        devLog.info(
          `Network: ${safeConfig.network.name} (Chain ID: ${safeConfig.network.chainId})`
        );
        devLog.info(`RPC URL: ${safeConfig.network.rpcUrl}`);
        devLog.info(`EAS Contract: ${safeConfig.network.easContractAddress}`);
        devLog.info(
          `Schema Registry: ${safeConfig.network.schemaRegistryAddress}`
        );
        devLog.info(`Log Level: ${safeConfig.logLevel}`);
        devLog.info(`Encrypt Storage: ${safeConfig.encryptStorage}`);
        devLog.info(
          `Wallet Configured: ${safeConfig.hasPrivateKey || safeConfig.hasMnemonic ? 'Yes' : 'No'}`
        );
      }
    } catch (error) {
      devLog.error('Failed to load configuration', error as Error);
      process.exit(1);
    }
  });

program.parse();

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
