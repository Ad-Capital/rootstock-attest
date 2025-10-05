import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'tx';

class Logger {
  private logLevel: LogLevel = 'info';

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error', 'tx'];
    const currentIndex = levels.indexOf(this.logLevel);
    const messageIndex = levels.indexOf(level);
    return messageIndex >= currentIndex;
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    switch (level) {
      case 'debug':
        return chalk.gray(`${prefix} ${message}`);
      case 'info':
        return chalk.blue(`${prefix} ${message}`);
      case 'warn':
        return chalk.yellow(`${prefix} ${message}`);
      case 'error':
        return chalk.red(`${prefix} ${message}`);
      case 'tx':
        return chalk.green(`${prefix} ${message}`);
      default:
        return `${prefix} ${message}`;
    }
  }

  private redactSensitive(message: string): string {
    return message
      .replace(/private.*key.*[a-fA-F0-9]{64}/gi, 'PRIVATE_KEY_REDACTED')
      .replace(/mnemonic.*[a-z\s]{20,}/gi, 'MNEMONIC_REDACTED')
      .replace(/0x[a-fA-F0-9]{40}/g, (match) => {
        if (
          match.toLowerCase().includes('contract') ||
          match.toLowerCase().includes('address')
        ) {
          return match;
        }
        return `${match.slice(0, 6)}...${match.slice(-4)}`;
      });
  }

  debug(message: string): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', this.redactSensitive(message)));
    }
  }

  info(message: string): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', this.redactSensitive(message)));
    }
  }

  warn(message: string): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', this.redactSensitive(message)));
    }
  }

  error(message: string, error?: Error): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', this.redactSensitive(message)));
      if (error) {
        console.error(chalk.red(error.stack || error.message));
      }
    }
  }

  tx(message: string): void {
    if (this.shouldLog('tx')) {
      console.log(this.formatMessage('tx', this.redactSensitive(message)));
    }
  }

  success(message: string): void {
    console.log(chalk.green(`✅ ${message}`));
  }

  failure(message: string): void {
    console.log(chalk.red(`❌ ${message}`));
  }

  json(data: any): void {
    console.log(JSON.stringify(data, null, 2));
  }
}

export const devLog = new Logger();
