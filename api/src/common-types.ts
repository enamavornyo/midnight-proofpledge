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

import { type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import type { Contract, ProofPledgePrivateState, State, Witnesses } from '../../contract/src/index.js';

export const proofPledgePrivateStateKey = 'proofPledgePrivateState';
export const maxPledgeLength = 180;
export type PrivateStateId = typeof proofPledgePrivateStateKey;

export type PrivateStates = {
  readonly proofPledgePrivateState: ProofPledgePrivateState;
};

export type ProofPledgeContract = Contract<ProofPledgePrivateState, Witnesses<ProofPledgePrivateState>>;

export type ProofPledgeCircuitKeys = Exclude<keyof ProofPledgeContract['impureCircuits'], number | symbol>;

export type ProofPledgeProviders = MidnightProviders<ProofPledgeCircuitKeys, PrivateStateId, ProofPledgePrivateState>;

export type DeployedProofPledgeContract = FoundContract<ProofPledgeContract>;

export type ProofPledgeDerivedState = {
  readonly state: State;
  readonly sequence: bigint;
  readonly pledge: string | undefined;
  readonly isOwner: boolean;
};
