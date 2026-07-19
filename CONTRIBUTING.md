# Contributing

ProofPledge is a focused hackathon project built on Midnight's official bulletin-board example. Contributions must preserve the privacy boundary, keep the core flow small, and include appropriate verification and documentation.

## Setup

```bash
nvm use
npm ci --legacy-peer-deps
npm run compact
npm run verify
```

## Contribution process

1. Create a focused branch from `main`.
2. Keep each change limited to one concern.
3. Add or update tests for contract and application behavior.
4. Update documentation affected by the change.
5. Run the full verification command.
6. Open a pull request with the completed checklist.

## Pull request requirements

- Clear problem statement and implementation summary
- No secrets, wallet seeds, generated private state, or local databases
- Compact bindings regenerated locally but not committed when covered by `.gitignore`
- New contract behavior covered by simulator tests
- User-facing changes tested for loading, success, and failure states
- Technical comments limited to non-obvious behavior and invariants
- Conventional Commit messages
- Relevant README, changelog, environment, architecture, and verification updates

## License

Contributions are licensed under Apache-2.0 and must preserve inherited source-file notices.
