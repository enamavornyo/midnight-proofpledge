# ProofPledge

ProofPledge is a privacy-preserving accountability DApp built for the July 2026 Midnight Hackathon. A public pledge can be created, completed, and archived while the ownership secret remains private. Midnight verifies ownership through a zero-knowledge proof before any protected state transition is accepted.

## Project status

The repository contains the ProofPledge Compact contract, shared application API, CLI, React interface, contract tests, and submission documentation. Compact-generated artifacts remain excluded from source control and must be regenerated before the full verification gate runs.

| Area                                   | Status                                    |
| -------------------------------------- | ----------------------------------------- |
| Official Midnight workspace            | Present                                   |
| Repository standards and documentation | Present                                   |
| ProofPledge contract                   | Implemented; Compact compilation required |
| Shared application layer               | Implemented; static validation passed     |
| Web interface                          | Implemented; static validation passed     |
| Devpost submission package             | Present                                   |

## Core flow

1. Publish one public pledge.
2. Store only a cryptographic ownership commitment on the public ledger.
3. Keep the ownership secret in local private state.
4. Prove ownership before completing the pledge.
5. Prove ownership again before archiving it.
6. Increment the pledge sequence to prevent proof reuse across later pledges.

## Privacy boundary

| Public               | Private                      |
| -------------------- | ---------------------------- |
| Pledge text          | Ownership secret             |
| Pledge status        | Real-world identity          |
| Pledge sequence      | Raw witness input            |
| Ownership commitment | Local private-state contents |

The public ledger proves that an authorized state transition occurred. It does not reveal the secret used to authorize the transition.

## Repository structure

```text
.
├── api/                    Shared Midnight contract API
├── bboard-cli/             Command-line interface retained from the starter
├── bboard-ui/              React browser interface retained from the starter
├── contract/               Compact contract, witnesses, and tests
├── docs/                   Architecture, privacy, workflow, and submission notes
└── .github/workflows/      Continuous integration and security scanning
```

The starter workspace directory names and generated `managed/bboard` path remain unchanged to minimize integration risk with the official Midnight build and asset-loading conventions.

## Prerequisites

- Node.js 24.11.1 or later
- npm 11 or later
- Compact compiler 0.31.0 or later
- Docker Desktop with Docker Compose v2
- Lace wallet extension for browser-based preview or preprod use

The exact Node.js version is pinned in `.nvmrc`.

## Setup

```bash
nvm use
npm ci --legacy-peer-deps
npm run compact
npm run build
```

Configure the browser network and CLI private-state password:

```bash
cp .env.example bboard-ui/.env.local
export PROOFPLEDGE_PRIVATE_STORAGE_PASSWORD='replace-with-a-long-local-password'
```

The password protects the CLI private-state database and must not be committed or recorded in the demonstration video.

## Run the application

### Browser interface on preview

Start the local proof server from the repository root:

```bash
docker compose -f bboard-cli/proof-server-local.yml up -d
```

Build and serve the preview interface:

```bash
npm run build:preview --workspace=@proofpledge/ui
npm run start --workspace=@proofpledge/ui
```

The static server prints the assigned local URL. Lace must use the `preview` network and the local proof server at `http://127.0.0.1:6300`.

### Browser interface on preprod

```bash
docker compose -f bboard-cli/proof-server-local.yml up -d
npm run build --workspace=@proofpledge/ui
npm run start --workspace=@proofpledge/ui
```

Lace must use the `preprod` network and hold sufficient test tokens for contract transactions.

### Command-line interface

```bash
export PROOFPLEDGE_PRIVATE_STORAGE_PASSWORD='replace-with-a-long-local-password'
npm run preview-remote --workspace=@proofpledge/cli
```

Use `preprod-remote` instead of `preview-remote` for preprod. A wallet created through the first menu option is session-only; the seed-based option is required for repeat access. The CLI prints contract addresses and public state but never prints wallet seeds or ownership secrets.

Stop the proof server after the demonstration:

```bash
docker compose -f bboard-cli/proof-server-local.yml down
```

## Development commands

```bash
npm run format
npm run format:check
npm run compact
npm run typecheck
npm run lint
npm run test
npm run build
npm run verify
```

`npm run verify` is the full release gate. It compiles the Compact contract, checks formatting, runs TypeScript validation and linting, executes contract tests, and builds every workspace.

## Documentation

- [Architecture](docs/architecture.md)
- [Privacy model](docs/privacy-model.md)
- [Development workflow](docs/development.md)
- [Verification record](docs/verification.md)
- [Submission checklist](docs/submission-checklist.md)
- [Demonstration script](docs/demo-script.md)
- [Devpost submission copy](docs/devpost-submission.md)

## AI-assisted development disclosure

AI tools may assist with planning, implementation, debugging, and documentation review. All generated or suggested changes must be reviewed against the project requirements, compiled, tested where tooling permits, and disclosed in the final Devpost submission.

## Upstream attribution

ProofPledge is derived from Midnight Network's official `example-bboard` project and preserves the upstream Apache-2.0 notices in inherited source files. See [NOTICE.md](NOTICE.md) for attribution and modification details.

## License

Licensed under the Apache License 2.0. See [LICENSE](LICENSE).
