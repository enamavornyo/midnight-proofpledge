# Security policy

## Reporting a vulnerability

Do not disclose suspected vulnerabilities in a public issue. Use GitHub's private vulnerability reporting feature for the repository when available. Include reproduction steps, affected files, expected impact, and a minimal proof of concept when practical.

## Sensitive information

Never commit:

- wallet seed phrases or private keys
- ownership secrets
- `.env` files containing credentials
- local Midnight private-state databases
- access tokens
- generated logs containing sensitive values

## Supported version

Security fixes apply to the latest commit on `main` during the hackathon development period.

## Midnight platform issues

A vulnerability in Midnight-maintained libraries or infrastructure should also be reported through the Midnight Foundation's official security process. Project-specific reports should remain separate from upstream reports unless the issue is confirmed to originate upstream.
