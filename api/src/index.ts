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

import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { type ContractAddress, convertFieldToBytes } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import { type Logger } from 'pino';
import { combineLatest, from, map, type Observable, tap } from 'rxjs';
import * as ProofPledge from '../../contract/src/managed/bboard/contract/index.js';
import { CompiledProofPledgeContract } from '../../contract/src/index.js';
import { type ProofPledgePrivateState, createProofPledgePrivateState } from '../../contract/src/witnesses.js';
import {
  type DeployedProofPledgeContract,
  type ProofPledgeContract,
  type ProofPledgeDerivedState,
  type ProofPledgeProviders,
  maxPledgeLength,
  proofPledgePrivateStateKey,
} from './common-types.js';
import * as utils from './utils/index.js';

export interface DeployedProofPledgeAPI {
  readonly deployedContractAddress: ContractAddress;
  readonly deployedContract: DeployedProofPledgeContract;
  readonly state$: Observable<ProofPledgeDerivedState>;

  createPledge: (pledge: string) => Promise<void>;
  completePledge: () => Promise<void>;
  archivePledge: () => Promise<void>;
}

export class ProofPledgeAPI implements DeployedProofPledgeAPI {
  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<ProofPledgeDerivedState>;

  private constructor(
    public readonly deployedContract: DeployedProofPledgeContract,
    private readonly providers: ProofPledgeProviders,
    private readonly logger?: Logger,
  ) {
    this.deployedContractAddress = deployedContract.deployTxData.public.contractAddress;
    providers.privateStateProvider.setContractAddress(this.deployedContractAddress);

    this.state$ = combineLatest(
      [
        providers.publicDataProvider.contractStateObservable(this.deployedContractAddress, { type: 'latest' }).pipe(
          map((contractState) => ProofPledge.ledger(contractState.data)),
          tap((ledgerState) =>
            logger?.trace({
              ledgerStateChanged: {
                state: stateLabel(ledgerState.state),
                pledge: ledgerState.pledge.value,
                sequence: ledgerState.sequence,
                owner: toHex(ledgerState.owner),
              },
            }),
          ),
        ),
        from(readPrivateState(providers, proofPledgePrivateStateKey)),
      ],
      (ledgerState, privateState) => {
        const localOwnerCommitment = ProofPledge.pureCircuits.publicKey(
          privateState.secretKey,
          convertFieldToBytes(32, ledgerState.sequence, 'api/src/index.ts'),
        );

        return {
          state: ledgerState.state,
          pledge: ledgerState.pledge.is_some ? ledgerState.pledge.value : undefined,
          sequence: ledgerState.sequence,
          isOwner: toHex(ledgerState.owner) === toHex(localOwnerCommitment),
        };
      },
    );
  }

  async createPledge(pledge: string): Promise<void> {
    const normalizedPledge = pledge.trim();
    if (!normalizedPledge) {
      throw new Error('Pledge text is required.');
    }
    if (normalizedPledge.length > maxPledgeLength) {
      throw new Error(`Pledge text must not exceed ${maxPledgeLength} characters.`);
    }

    this.activatePrivateStateScope();
    this.logger?.info({ pledgeLength: normalizedPledge.length }, 'Creating pledge');
    const txData = await this.deployedContract.callTx.createPledge(normalizedPledge);
    logTransaction(this.logger, 'createPledge', txData.public);
  }

  async completePledge(): Promise<void> {
    this.activatePrivateStateScope();
    this.logger?.info('Completing pledge');
    const txData = await this.deployedContract.callTx.completePledge();
    logTransaction(this.logger, 'completePledge', txData.public);
  }

  async archivePledge(): Promise<void> {
    this.activatePrivateStateScope();
    this.logger?.info('Archiving pledge');
    const txData = await this.deployedContract.callTx.archivePledge();
    logTransaction(this.logger, 'archivePledge', txData.public);
  }

  // One provider instance can serve several deployments, so every protected action
  // restores the contract-specific scope before witness data is requested.
  private activatePrivateStateScope(): void {
    this.providers.privateStateProvider.setContractAddress(this.deployedContractAddress);
  }

  static async deploy(providers: ProofPledgeProviders, logger?: Logger): Promise<ProofPledgeAPI> {
    logger?.info('Deploying ProofPledge contract');

    const deployedContract = await deployContract(providers, {
      compiledContract: CompiledProofPledgeContract,
      privateStateId: proofPledgePrivateStateKey,
      initialPrivateState: createProofPledgePrivateState(utils.randomBytes(32)),
    });

    logger?.trace({ contractDeployed: deployedContract.deployTxData.public });
    return new ProofPledgeAPI(deployedContract, providers, logger);
  }

  static async join(
    providers: ProofPledgeProviders,
    contractAddress: ContractAddress,
    logger?: Logger,
  ): Promise<ProofPledgeAPI> {
    logger?.info({ contractAddress }, 'Joining ProofPledge contract');

    const deployedContract = await findDeployedContract<ProofPledgeContract>(providers, {
      contractAddress,
      compiledContract: CompiledProofPledgeContract,
      privateStateId: proofPledgePrivateStateKey,
      initialPrivateState: await ProofPledgeAPI.getPrivateState(providers, contractAddress),
    });

    logger?.trace({ contractJoined: deployedContract.deployTxData.public });
    return new ProofPledgeAPI(deployedContract, providers, logger);
  }

  private static async getPrivateState(
    providers: ProofPledgeProviders,
    contractAddress: ContractAddress,
  ): Promise<ProofPledgePrivateState> {
    providers.privateStateProvider.setContractAddress(contractAddress);
    const existingPrivateState = await providers.privateStateProvider.get(proofPledgePrivateStateKey);
    return existingPrivateState ?? createProofPledgePrivateState(utils.randomBytes(32));
  }
}

const readPrivateState = async (
  providers: ProofPledgeProviders,
  privateStateId: typeof proofPledgePrivateStateKey,
): Promise<ProofPledgePrivateState> => {
  const privateState = await providers.privateStateProvider.get(privateStateId);
  if (privateState === null) {
    throw new Error('ProofPledge private state is unavailable for this contract.');
  }
  return privateState;
};

const stateLabel = (state: ProofPledge.State): 'empty' | 'open' | 'completed' => {
  if (state === ProofPledge.State.OPEN) return 'open';
  if (state === ProofPledge.State.COMPLETED) return 'completed';
  return 'empty';
};

const logTransaction = (
  logger: Logger | undefined,
  circuit: 'createPledge' | 'completePledge' | 'archivePledge',
  transaction: { readonly txHash: string; readonly blockHeight: number },
): void => {
  logger?.trace({
    transactionAdded: {
      circuit,
      txHash: transaction.txHash,
      blockHeight: transaction.blockHeight,
    },
  });
};

export * as utils from './utils/index.js';
export * from './common-types.js';
