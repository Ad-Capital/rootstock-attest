# Rootstock Attestation CLI

A powerful command-line interface for issuing, querying, and verifying Ethereum Attestation Service (EAS) attestations on Rootstock blockchain. This tool integrates seamlessly with the Rootstock ecosystem, enabling developers to create and manage attestations for hackathon participation, grant milestones, community reputation, and more.

## Features

- **Issue Attestations**: Create on-chain attestations with custom schemas
- **Query Attestations**: Search and filter attestations by multiple criteria
- **Verify Attestations**: Validate authenticity and check revocation status
- **Demo Mode**: Built-in scenarios for hackathon badges, grants, and reputation
- **Secure**: Private key encryption and sensitive data redaction
- **Multiple Output Formats**: Human-readable and JSON outputs
- **Interactive Mode**: User-friendly prompts for all commands

## Installation

```bash
npm install -g rootstock-attest
```

Or clone and build locally:

```bash
git clone https://github.com/rootstock/rootstock-attest.git
cd rootstock-attest
npm install
npm run build
npm link
```

## Quick Start

1. **Setup Environment Variables**

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

```env
RSK_NETWORK=testnet
PRIVATE_KEY=your_private_key_here
RSK_RPC_URL=https://public-node.testnet.rsk.co
```

2. **Run Demo**

```bash
rsk attest demo --type hackathon
```

3. **Check Configuration**

```bash
rsk config
```

## Commands

### Issue Attestation

Create a new attestation on Rootstock:

```bash
# Basic usage
rsk attest issue \
  --schema 0x1234... \
  --recipient 0x742d35Cc... \
  --data '{"eventName":"Rootstock Hackathon","prize":5000}'

# Interactive mode
rsk attest issue --interactive

# With expiration and value
rsk attest issue \
  --schema 0x1234... \
  --recipient 0x742d35Cc... \
  --data 0x1234... \
  --expiration 1735689600 \
  --value 0.1
```

**Options:**
- `-s, --schema <uid>`: Schema UID for the attestation
- `-r, --recipient <address>`: Recipient address
- `-d, --data <data>`: JSON data or encoded hex
- `-e, --expiration <timestamp>`: Expiration timestamp (0 = never)
- `--revocable/--no-revocable`: Make attestation revocable (default: true)
- `-v, --value <amount>`: ETH value to send
- `--json`: Output as JSON
- `-i, --interactive`: Interactive mode

### Query Attestations

Search and retrieve attestations:

```bash
# Query by recipient
rsk attest query --recipient 0x742d35Cc...

# Query by schema
rsk attest query --schema 0x1234...

# Query specific attestation
rsk attest query --uid 0xabcd...

# Complex query with pagination
rsk attest query \
  --schema 0x1234... \
  --recipient 0x742d35Cc... \
  --limit 50 \
  --offset 100

# Interactive mode
rsk attest query --interactive
```

**Options:**
- `-s, --schema <uid>`: Filter by schema UID
- `-r, --recipient <address>`: Filter by recipient
- `-a, --attester <address>`: Filter by attester
- `-u, --uid <uid>`: Get specific attestation
- `-l, --limit <number>`: Limit results (default: 100)
- `-o, --offset <number>`: Pagination offset
- `--json`: Output as JSON
- `-i, --interactive`: Interactive mode

### Verify Attestation

Validate attestation authenticity:

```bash
# Basic verification
rsk attest verify --uid 0xabcd...

# Skip expiration check
rsk attest verify --uid 0xabcd... --no-check-expiration

# Interactive mode
rsk attest verify --interactive
```

**Options:**
- `-u, --uid <uid>`: Attestation UID to verify
- `--check-expiration`: Check expiration (default: true)
- `--check-revocation`: Check revocation (default: true)
- `--json`: Output as JSON
- `-i, --interactive`: Interactive mode

### Demo Scenarios

Run built-in demo scenarios:

```bash
# Hackathon winner badge
rsk attest demo --type hackathon

# Grant milestone completion
rsk attest demo --type grant

# Community reputation score
rsk attest demo --type reputation

# Developer skill badge
rsk attest demo --type badge

# Interactive demo selection
rsk attest demo --interactive
```

**Demo Types:**
- `hackathon`: Issue hackathon winner attestation
- `grant`: Issue grant milestone completion
- `reputation`: Issue community reputation score
- `badge`: Issue developer skill badge

## Configuration

### Environment Variables

```env
# Network Configuration
RSK_NETWORK=testnet                    # testnet or mainnet
RSK_RPC_URL=https://public-node.testnet.rsk.co
RSK_MAINNET_RPC_URL=https://public-node.rsk.co

# RAS Contract Addresses (Mainnet)
RAS_CONTRACT_ADDRESS=0x54c0726E9D2D57Bc37aD52C7E219a3229E0ee963
RAS_SCHEMA_REGISTRY=0xef29675d82Cc5967069D6D9c17F2719F67728F5b

# Wallet Configuration
PRIVATE_KEY=your_private_key_here
MNEMONIC=your_twelve_word_mnemonic_here

# Security & Logging
ENCRYPT_STORAGE=true
LOG_LEVEL=info                         # debug, info, warn, error

# GraphQL Endpoint
GRAPHQL_ENDPOINT=https://rootstock.easscan.org/graphql
```

### View Current Configuration

```bash
rsk config
rsk config --json
```

## Schema Examples

### Hackathon Winner Schema

```json
{
  "schema": "string eventName,string projectName,string category,uint256 prize,string githubRepo",
  "data": {
    "eventName": "Rootstock Global Hackathon 2024",
    "projectName": "DeFi Portfolio Tracker",
    "category": "DeFi",
    "prize": 5000,
    "githubRepo": "https://github.com/user/defi-tracker"
  }
}
```

### Grant Milestone Schema

```json
{
  "schema": "string grantName,string milestone,uint256 amount,string deliverable,bool completed",
  "data": {
    "grantName": "Rootstock Ecosystem Development Grant",
    "milestone": "MVP Development Complete",
    "amount": 10000,
    "deliverable": "Smart contract deployed and audited",
    "completed": true
  }
}
```

## Output Examples

### Issue Command Output

```bash
$ rsk attest issue --schema 0x1234... --recipient 0x742d... --data '{"event":"Hackathon"}'

[2024-01-01T12:00:00.000Z] [INFO] Using signer: 0x742d35Cc6634C0532925a3b844Bc454e4438f44e
[2024-01-01T12:00:00.000Z] [INFO] Balance: 1.5 ETH
[2024-01-01T12:00:00.000Z] [INFO] Creating attestation...
[2024-01-01T12:00:00.000Z] [TX] Attestation created with UID: 0xabcd1234...
✅ Attestation created successfully!
Attestation UID: 0xabcd1234...
Transaction Hash: 0x5678efgh...
Block Number: 1234567
```

### Query Command Output

```bash
$ rsk attest query --recipient 0x742d...

✅ Found 3 attestation(s):

============================================================
UID: 0xabcd1234...
Schema: 0x1234...
Recipient: 0x742d35Cc6634C0532925a3b844Bc454e4438f44e
Attester: 0x1234567890abcdef...
Created: 2024-01-01T12:00:00.000Z
Decoded Data:
  eventName: Rootstock Global Hackathon 2024
  projectName: DeFi Portfolio Tracker
  prize: 5000
```

### Verify Command Output

```bash
$ rsk attest verify --uid 0xabcd1234...

Verification Results for 0xabcd1234...:
================================================================================
✅ ATTESTATION IS VALID

Status Checks:
  Exists: ✅ Yes
  Revoked: ✅ No
  Expired: ✅ No

Attestation Details:
  Schema: 0x1234...
  Recipient: 0x742d35Cc6634C0532925a3b844Bc454e4438f44e
  Attester: 0x1234567890abcdef...
  Created: 2024-01-01T12:00:00.000Z
  Expires: Never
  Revocable: Yes

🎉 This attestation is valid and can be trusted!
```

## Architecture

The CLI follows clean architecture principles with clear separation of concerns:

```
src/
├── commands/          # CLI command handlers
│   ├── issue.ts      # Issue attestation command
│   ├── query.ts      # Query attestations command
│   ├── verify.ts     # Verify attestation command
│   └── demo.ts       # Demo scenarios
├── core/             # Core business logic
│   ├── blockchain.ts # EAS contract interactions
│   └── query.ts      # GraphQL query service
├── utils/            # Utility functions
│   ├── config.ts     # Configuration management
│   ├── logger.ts     # Logging with redaction
│   └── crypto.ts     # Encryption utilities
├── types/            # TypeScript type definitions
└── __tests__/        # Comprehensive test suite
```

## Security

- **Private Key Protection**: Never logs or exposes private keys
- **Data Encryption**: Sensitive data encrypted with AES-256
- **Input Validation**: All CLI inputs sanitized and validated
- **Secure Defaults**: HTTPS endpoints and secure configurations
- **Log Redaction**: Automatic redaction of sensitive information

## Development

### Setup

```bash
git clone https://github.com/rootstock/rootstock-attest.git
cd rootstock-attest
npm install
cp .env.example .env
# Configure your .env file
```

### Scripts

```bash
npm run dev          # Development mode with ts-node
npm run build        # Build TypeScript to JavaScript
npm run test         # Run test suite
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run format       # Format code with Prettier
npm run demo         # Run demo command
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- utils/config.test.ts

# Run tests in watch mode
npm run test:watch
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Standards

- Follow TypeScript best practices
- Write tests for new features
- Use conventional commits
- Ensure all tests pass
- Run linting and formatting

## Troubleshooting

### Common Issues

**"Network connection failed"**
- Check your RPC URL in `.env`
- Verify network connectivity
- Try switching to a different RPC endpoint

**"Transaction failed"**
- Ensure sufficient ETH balance for gas
- Check contract addresses are correct
- Verify schema UID exists

**"Invalid private key"**
- Ensure private key is 64 hex characters
- Check private key format (with or without 0x prefix)
- Verify the key corresponds to your intended account

### Debug Mode

Enable debug logging for detailed information:

```bash
export LOG_LEVEL=debug
rsk attest issue --schema 0x... --recipient 0x... --data '{}'
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

-  [Documentation](https://dev.rootstock.io/dev-tools/attestations/ras/)
-  [Report Issues](https://github.com/rootstock/rootstock-attest/issues)
-  [Discord Community](https://discord.gg/rootstock)
-  [Twitter](https://twitter.com/rootstock_io)

---

Built with ❤️ for the Rootstock ecosystem.