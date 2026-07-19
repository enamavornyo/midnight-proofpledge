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

import {
  ProofPledgeAPI,
  type DeployedProofPledgeAPI,
  type PrivateStateId,
  type ProofPledgeCircuitKeys,
  type ProofPledgeProviders,
} from '../../../api/src/index.js';
import { type ConnectedAPI, type InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { type NetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { type ContractAddress, fromHex, toHex } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  Binding,
  FinalizedTransaction,
  Proof,
  SignatureEnabled,
  Transaction,
  type TransactionId,
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { type UnboundTransaction } from '@midnight-ntwrk/midnight-js-types';
import { pipe as fnPipe } from 'fp-ts/function';
import { type Logger } from 'pino';
import {
  BehaviorSubject,
  catchError,
  concatMap,
  filter,
  firstValueFrom,
  interval,
  map,
  type Observable,
  take,
  tap,
  throwError,
  timeout,
} from 'rxjs';
import semver from 'semver';
import { type ProofPledgePrivateState } from '../../../contract/src/witnesses.js';
import { inMemoryPrivateStateProvider } from '../in-memory-private-state-provider.js';

export interface InProgressPledgeDeployment {
  readonly status: 'in-progress';
}

export interface DeployedPledgeDeployment {
  readonly status: 'deployed';
  readonly api: DeployedProofPledgeAPI;
}

export interface FailedPledgeDeployment {
  readonly status: 'failed';
  readonly error: Error;
}

export type PledgeDeployment = InProgressPledgeDeployment | DeployedPledgeDeployment | FailedPledgeDeployment;

export interface ProofPledgeAPIProvider {
  readonly deployments$: Observable<Array<Observable<PledgeDeployment>>>;
  readonly resolve: (contractAddress?: ContractAddress) => Observable<PledgeDeployment>;
}

export class BrowserProofPledgeManager implements ProofPledgeAPIProvider {
  readonly #deploymentsSubject = new BehaviorSubject<Array<BehaviorSubject<PledgeDeployment>>>([]);
  #initializedProviders: Promise<ProofPledgeProviders> | undefined;

  constructor(private readonly logger: Logger) {
    this.deployments$ = this.#deploymentsSubject;
  }

  readonly deployments$: Observable<Array<Observable<PledgeDeployment>>>;

  resolve(contractAddress?: ContractAddress): Observable<PledgeDeployment> {
    const deployments = this.#deploymentsSubject.value;
    const existing = deployments.find(
      (deployment) =>
        deployment.value.status === 'deployed' && deployment.value.api.deployedContractAddress === contractAddress,
    );

    if (existing) return existing;

    const deployment = new BehaviorSubject<PledgeDeployment>({ status: 'in-progress' });
    if (contractAddress) {
      void this.joinDeployment(deployment, contractAddress);
    } else {
      void this.deployDeployment(deployment);
    }

    this.#deploymentsSubject.next([...deployments, deployment]);
    return deployment;
  }

  private getProviders(): Promise<ProofPledgeProviders> {
    this.#initializedProviders ??= initializeProviders(this.logger);
    return this.#initializedProviders;
  }

  private async deployDeployment(deployment: BehaviorSubject<PledgeDeployment>): Promise<void> {
    try {
      const api = await ProofPledgeAPI.deploy(await this.getProviders(), this.logger);
      deployment.next({ status: 'deployed', api });
    } catch (error: unknown) {
      deployment.next({
        status: 'failed',
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  private async joinDeployment(
    deployment: BehaviorSubject<PledgeDeployment>,
    contractAddress: ContractAddress,
  ): Promise<void> {
    try {
      const api = await ProofPledgeAPI.join(await this.getProviders(), contractAddress, this.logger);
      deployment.next({ status: 'deployed', api });
    } catch (error: unknown) {
      deployment.next({
        status: 'failed',
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }
}

const initializeProviders = async (logger: Logger): Promise<ProofPledgeProviders> => {
  const networkId = import.meta.env.VITE_NETWORK_ID as NetworkId;
  const connectedAPI = await connectToWallet(logger, networkId);
  const keyMaterialProvider = new FetchZkConfigProvider<ProofPledgeCircuitKeys>(
    window.location.origin,
    fetch.bind(window),
  );
  const config = await connectedAPI.getConfiguration();
  const privateStateProvider = inMemoryPrivateStateProvider<PrivateStateId, ProofPledgePrivateState>();
  const shieldedAddresses = await connectedAPI.getShieldedAddresses();

  return {
    privateStateProvider,
    zkConfigProvider: keyMaterialProvider,
    proofProvider: httpClientProofProvider(config.proverServerUri!, keyMaterialProvider),
    publicDataProvider: indexerPublicDataProvider(config.indexerUri, config.indexerWsUri),
    walletProvider: {
      getCoinPublicKey: () => shieldedAddresses.shieldedCoinPublicKey,
      getEncryptionPublicKey: () => shieldedAddresses.shieldedEncryptionPublicKey,
      balanceTx: async (tx: UnboundTransaction, ttl?: Date): Promise<FinalizedTransaction> => {
        try {
          logger.info({ tx, ttl }, 'Balancing transaction via wallet');
          const received = await connectedAPI.balanceUnsealedTransaction(toHex(tx.serialize()));
          return Transaction.deserialize<SignatureEnabled, Proof, Binding>(
            'signature',
            'proof',
            'binding',
            fromHex(received.tx),
          );
        } catch (error: unknown) {
          logger.error({ error }, 'Error balancing transaction via wallet');
          throw error;
        }
      },
    },
    midnightProvider: {
      submitTx: async (tx: FinalizedTransaction): Promise<TransactionId> => {
        await connectedAPI.submitTransaction(toHex(tx.serialize()));
        const txIdentifiers = tx.identifiers();
        logger.info({ txIdentifiers }, 'Submitted transaction via wallet');
        return txIdentifiers[0];
      },
    },
  };
};

const COMPATIBLE_CONNECTOR_API_VERSION = '4.x';
const WALLET_DISCOVERY_TIMEOUT_MS = 10_000;
const WALLET_CONNECTION_TIMEOUT_MS = 60_000;

const isInitialAPI = (wallet: unknown): wallet is InitialAPI => {
  if (!wallet || typeof wallet !== 'object') return false;
  const candidate = wallet as Partial<InitialAPI>;
  return typeof candidate.apiVersion === 'string' && typeof candidate.connect === 'function';
};

const getInjectedWallets = (): InitialAPI[] =>
  window.midnight ? Object.values(window.midnight).filter(isInitialAPI) : [];

const getFirstCompatibleWallet = (): InitialAPI | undefined =>
  getInjectedWallets().find((wallet) => semver.satisfies(wallet.apiVersion, COMPATIBLE_CONNECTOR_API_VERSION));

const getWalletDiscoveryError = (): Error => {
  const injectedWallets = getInjectedWallets();
  if (injectedWallets.length === 0) {
    return new Error(
      'No Midnight wallet was detected. Install or enable Lace, enter the Midnight wallet, and refresh this page.',
    );
  }

  const detectedWallets = injectedWallets
    .map((wallet) => `${wallet.name || wallet.rdns || 'Unknown wallet'} (${wallet.apiVersion})`)
    .join(', ');

  return new Error(
    `No compatible Midnight wallet was found. ProofPledge requires DApp Connector API ${COMPATIBLE_CONNECTOR_API_VERSION}; detected ${detectedWallets}.`,
  );
};

const connectToWallet = (logger: Logger, networkId: string): Promise<ConnectedAPI> =>
  firstValueFrom(
    fnPipe(
      interval(250),
      map(() => getFirstCompatibleWallet()),
      filter((connectorAPI): connectorAPI is InitialAPI => Boolean(connectorAPI)),
      tap((connectorAPI) =>
        logger.info(
          {
            apiVersion: connectorAPI.apiVersion,
            name: connectorAPI.name,
            rdns: connectorAPI.rdns,
          },
          'Compatible wallet connector API found',
        ),
      ),
      take(1),
      timeout({
        first: WALLET_DISCOVERY_TIMEOUT_MS,
        with: () => throwError(() => getWalletDiscoveryError()),
      }),
      concatMap(async (initialAPI) => initialAPI.connect(networkId)),
      timeout({
        first: WALLET_CONNECTION_TIMEOUT_MS,
        with: () =>
          throwError(
            () =>
              new Error(
                'The Midnight wallet did not respond. Unlock Lace, approve the connection request, and try again.',
              ),
          ),
      }),
      catchError((error: unknown) => {
        logger.error({ error }, 'Wallet connection failed');
        return throwError(() => (error instanceof Error ? error : new Error('Application authorization failed.')));
      }),
    ),
  );
