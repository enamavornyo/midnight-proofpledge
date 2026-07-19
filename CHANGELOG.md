# Changelog

All notable changes to ProofPledge are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- ProofPledge repository identity and product definition
- Root development and verification commands
- Architecture, privacy, workflow, verification, and submission documentation
- Environment example, editor configuration, and formatting exclusions
- Project-specific contribution, support, security, ownership, issue, and pull-request policies
- Upstream attribution notice
- Canonical root workspace lockfile with redundant package-level lockfiles removed
- Compact pledge lifecycle with private ownership checks and sequence binding
- Contract simulator and tests for authorized, unauthorized, invalid, repeated, and stale actions
- Shared ProofPledge deployment, joining, state observation, and transaction API
- Browser and CLI flows for creating, completing, archiving, and inspecting pledges
- Timed demonstration script and finished Devpost submission copy

### Changed

- Package metadata now identifies ProofPledge and uses the Apache-2.0 license declared by the repository
- Continuous integration now runs the root verification command against the pinned Node.js toolchain
- The bulletin-board product flow is replaced with the ProofPledge accountability lifecycle
- Browser private state is scoped by contract before each protected action
- CLI logs no longer expose wallet seeds or raw ownership secrets
- CLI private-state encryption now requires an explicit environment password
- The interface explains the public/private boundary and temporary in-memory ownership limitation
