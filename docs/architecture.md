# Architecture

## Overview

ProofPledge uses the modular structure supplied by the official Midnight bulletin-board example. The design separates Compact contract logic, generated contract bindings, shared application services, command-line interaction, and the React interface.

```text
React UI / CLI
      |
      v
Shared contract API
      |
      v
Midnight providers
      |
      +--> public data provider
      +--> private state provider
      +--> proof provider
      +--> wallet provider
      |
      v
Compact contract
```

## Components

### Contract workspace

The `contract` workspace contains:

- Compact source code
- witness implementations
- generated contract bindings
- simulator utilities
- contract tests

The contract defines the public pledge state machine and the proof conditions for protected transitions.

### API workspace

The `api` workspace exposes typed operations for deployment, contract joining, state observation, and circuit execution. UI and CLI code consume this layer rather than calling provider primitives directly.

### CLI workspace

The `bboard-cli` workspace provides a direct contract interaction path. It remains useful for contract verification and fallback demonstrations when browser-wallet setup is unavailable.

### UI workspace

The `bboard-ui` workspace contains the React application, wallet integration, contract context, transaction feedback, and the public/private data explanation.

## Target state machine

```text
EMPTY -> OPEN -> COMPLETED -> EMPTY
```

- `createPledge` moves `EMPTY` to `OPEN`.
- `completePledge` moves `OPEN` to `COMPLETED` after ownership verification.
- `archivePledge` moves `COMPLETED` to `EMPTY` after ownership verification and increments the sequence.

## Data ownership

Public contract state is authoritative for pledge content, status, sequence, and ownership commitment. Local private state is authoritative for the secret used by the witness. No conventional database is required for the minimum viable product.

## Design constraints

- One active pledge keeps contract state and demonstration flow small.
- Domain logic remains in the contract or shared API rather than React components.
- Provider construction remains isolated from presentation code.
- Generated Compact artifacts are never edited manually.
- Contract changes require regenerated bindings before TypeScript verification.
