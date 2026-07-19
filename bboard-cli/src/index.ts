// This file is part of midnightntwrk/example-bboard.
// Copyright (C) Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { stdin as input, stdout as output } from 'node:process';
import { createInterface, type Interface } from 'node:readline/promises';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { assertIsContractAddress, toHex } from '@midnight-ntwrk/midnight-js-utils';
import { type TestEnvironment } from '@midnight-ntwrk/testkit-js';
import { type WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { type Logger } from 'pino';
import { WebSocket } from 'ws';
import {
  ProofPledgeAPI,
  type ProofPledgeDerivedState,
  type ProofPledgeProviders,
  type DeployedProofPledgeContract,
  type PrivateStateId,
  proofPledgePrivateStateKey,
} from '../../api/src/index.js';
import { randomBytes } from '../../api/src/utils/index.js';
import { ledger, type Ledger, State } from '../../contract/src/managed/bboard/contract/index.js';
import { type ProofPledgePrivateState } from '../../contract/src/witnesses.js';
import { type Config, StandaloneConfig } from './config.js';
import { generateDust } from './generate-dust.js';
import { MidnightWalletProvider } from './midnight-wallet-provider.js';
import { syncWallet, waitForUnshieldedFunds } from './wallet-utils.js';

// @ts-expect-error WebSocket is required by the Apollo transport used by the indexer client.
globalThis.WebSocket = WebSocket;

export const getProofPledgeLedgerState = async (
  providers: ProofPledgeProviders,
  contractAddress: ContractAddress,
): Promise<Ledger | null> => {
  assertIsContractAddress(contractAddress);
  const contractState = await providers.publicDataProvider.queryContractState(contractAddress);
  return contractState == null ? null : ledger(contractState.data);
};

const DEPLOY_OR_JOIN_QUESTION = `
Select a contract action:
  1. Deploy a new ProofPledge contract
  2. Join an existing ProofPledge contract
  3. Exit
Selection: `;

const deployOrJoin = async (
  providers: ProofPledgeProviders,
  rli: Interface,
  logger: Logger,
): Promise<ProofPledgeAPI | null> => {
  while (true) {
    const choice = await rli.question(DEPLOY_OR_JOIN_QUESTION);
    switch (choice) {
      case '1': {
        const api = await ProofPledgeAPI.deploy(providers, logger);
        logger.info(`Deployed contract at address: ${api.deployedContractAddress}`);
        return api;
      }
      case '2': {
        const address = await rli.question('Contract address in hex: ');
        const api = await ProofPledgeAPI.join(providers, address, logger);
        logger.info(`Joined contract at address: ${api.deployedContractAddress}`);
        return api;
      }
      case '3':
        logger.info('Exiting...');
        return null;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

const stateLabel = (state: State): string => {
  if (state === State.OPEN) return 'open';
  if (state === State.COMPLETED) return 'completed';
  return 'empty';
};

const displayLedgerState = async (
  providers: ProofPledgeProviders,
  deployedContract: DeployedProofPledgeContract,
  logger: Logger,
): Promise<void> => {
  const contractAddress = deployedContract.deployTxData.public.contractAddress;
  const ledgerState = await getProofPledgeLedgerState(providers, contractAddress);

  if (ledgerState === null) {
    logger.info(`No ProofPledge contract exists at ${contractAddress}`);
    return;
  }

  logger.info(`Current state: '${stateLabel(ledgerState.state)}'`);
  logger.info(`Current pledge: '${ledgerState.pledge.is_some ? ledgerState.pledge.value : 'none'}'`);
  logger.info(`Current sequence: ${ledgerState.sequence}`);
  logger.info(`Current owner commitment: '${toHex(ledgerState.owner)}'`);
};

const displayPrivateState = async (providers: ProofPledgeProviders, logger: Logger): Promise<void> => {
  const privateState = await providers.privateStateProvider.get(proofPledgePrivateStateKey);
  if (privateState === null) {
    logger.info('No local ProofPledge private state exists.');
    return;
  }

  logger.info('Local ProofPledge private state exists. Raw secret material is intentionally hidden.');
};

const displayDerivedState = (derivedState: ProofPledgeDerivedState | undefined, logger: Logger): void => {
  if (derivedState === undefined) {
    logger.info('No derived ProofPledge state is available.');
    return;
  }

  logger.info(`Current state: '${stateLabel(derivedState.state)}'`);
  logger.info(`Current pledge: '${derivedState.pledge ?? 'none'}'`);
  logger.info(`Current sequence: ${derivedState.sequence}`);
  logger.info(`Local private state owns pledge: ${derivedState.isOwner ? 'yes' : 'no'}`);
};

const MAIN_LOOP_QUESTION = `
Select an action:
  1. Create a pledge
  2. Complete the open pledge
  3. Archive the completed pledge
  4. Display public ledger state
  5. Inspect local private-state status
  6. Display derived state
  7. Exit
Selection: `;

const mainLoop = async (providers: ProofPledgeProviders, rli: Interface, logger: Logger): Promise<void> => {
  const proofPledgeApi = await deployOrJoin(providers, rli, logger);
  if (proofPledgeApi === null) return;

  let currentState: ProofPledgeDerivedState | undefined;
  const subscription = proofPledgeApi.state$.subscribe((state) => {
    currentState = state;
  });

  try {
    while (true) {
      const choice = await rli.question(MAIN_LOOP_QUESTION);
      try {
        switch (choice) {
          case '1': {
            const pledge = await rli.question('Public pledge text: ');
            await proofPledgeApi.createPledge(pledge);
            break;
          }
          case '2':
            await proofPledgeApi.completePledge();
            break;
          case '3':
            await proofPledgeApi.archivePledge();
            break;
          case '4':
            await displayLedgerState(providers, proofPledgeApi.deployedContract, logger);
            break;
          case '5':
            await displayPrivateState(providers, logger);
            break;
          case '6':
            displayDerivedState(currentState, logger);
            break;
          case '7':
            logger.info('Exiting...');
            return;
          default:
            logger.error(`Invalid choice: ${choice}`);
        }
      } catch (error: unknown) {
        logError(logger, error);
        logger.info('Returning to main menu...');
      }
    }
  } finally {
    subscription.unsubscribe();
  }
};

const GENESIS_MINT_WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

const WALLET_LOOP_QUESTION = `
Select a wallet action:
  1. Build an ephemeral wallet
  2. Build a wallet from a seed
  3. Exit
Selection: `;

const buildWallet = async (config: Config, rli: Interface, logger: Logger): Promise<string | undefined> => {
  if (config instanceof StandaloneConfig) return GENESIS_MINT_WALLET_SEED;

  while (true) {
    const choice = await rli.question(WALLET_LOOP_QUESTION);
    switch (choice) {
      case '1':
        return toHex(randomBytes(32));
      case '2':
        return rli.question('Wallet seed: ');
      case '3':
        logger.info('Exiting...');
        return undefined;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

const getPrivateStoragePassword = (): string => {
  const password = process.env.PROOFPLEDGE_PRIVATE_STORAGE_PASSWORD?.trim();
  if (!password) {
    throw new Error('PROOFPLEDGE_PRIVATE_STORAGE_PASSWORD must be set before starting the CLI.');
  }
  return password;
};

export const run = async (config: Config, testEnv: TestEnvironment, logger: Logger): Promise<void> => {
  const rli = createInterface({ input, output, terminal: true });
  const providersToStop: MidnightWalletProvider[] = [];

  try {
    const environment = await testEnv.start();
    logger.info(`Environment started with configuration: ${JSON.stringify(environment)}`);

    const seed = await buildWallet(config, rli, logger);
    if (seed === undefined) return;

    const walletProvider = await MidnightWalletProvider.build(logger, environment, seed);
    providersToStop.push(walletProvider);
    const walletFacade: WalletFacade = walletProvider.wallet;
    await walletProvider.start();

    const unshieldedState = await waitForUnshieldedFunds(logger, walletFacade, environment, unshieldedToken());
    const nightBalance = unshieldedState.balances[unshieldedToken().raw];
    if (nightBalance === undefined) {
      logger.info('No funds received, exiting...');
      return;
    }
    logger.info(`NIGHT wallet balance: ${nightBalance}`);

    if (config.generateDust) {
      const dustGeneration = await generateDust(logger, seed, unshieldedState, walletFacade);
      if (dustGeneration) {
        logger.info(`Submitted dust generation registration transaction: ${dustGeneration}`);
        await syncWallet(logger, walletFacade);
      }
    }

    const zkConfigProvider = new NodeZkConfigProvider<'createPledge' | 'completePledge' | 'archivePledge'>(
      config.zkConfigPath,
    );
    const providers: ProofPledgeProviders = {
      privateStateProvider: levelPrivateStateProvider<PrivateStateId, ProofPledgePrivateState>({
        privateStateStoreName: config.privateStateStoreName,
        signingKeyStoreName: `${config.privateStateStoreName}-signing-keys`,
        privateStoragePasswordProvider: getPrivateStoragePassword,
        accountId: seed,
      }),
      publicDataProvider: indexerPublicDataProvider(environment.indexer, environment.indexerWS),
      zkConfigProvider,
      proofProvider: httpClientProofProvider(environment.proofServer, zkConfigProvider),
      walletProvider,
      midnightProvider: walletProvider,
    };

    await mainLoop(providers, rli, logger);
  } catch (error: unknown) {
    logError(logger, error);
    logger.info('Exiting...');
  } finally {
    rli.close();
    rli.removeAllListeners();

    for (const wallet of providersToStop) {
      try {
        logger.info('Stopping wallet...');
        await wallet.stop();
      } catch (error: unknown) {
        logError(logger, error);
      }
    }

    try {
      logger.info('Stopping test environment...');
      await testEnv.shutdown();
    } catch (error: unknown) {
      logError(logger, error);
    }
  }
};

const logError = (logger: Logger, error: unknown): void => {
  if (error instanceof Error) {
    logger.error(`Found error '${error.message}'`);
    logger.debug(error.stack);
    return;
  }

  logger.error('Found error with an unknown type');
};
