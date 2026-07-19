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

import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { describe, expect, it } from "vitest";
import { State } from "../managed/bboard/contract/index.js";
import { ProofPledgeSimulator } from "./proof-pledge-simulator.js";
import { randomBytes } from "./utils.js";

setNetworkId("undeployed");

const PRIVATE_STATE_OWNER_ERROR =
  "failed assert: The current private state does not own this pledge";

describe("ProofPledge contract", () => {
  it("generates the initial state deterministically", () => {
    const key = randomBytes(32);
    expect(new ProofPledgeSimulator(key).getLedger()).toEqual(
      new ProofPledgeSimulator(key).getLedger(),
    );
  });

  it("initializes an empty pledge with sequence one", () => {
    const key = randomBytes(32);
    const simulator = new ProofPledgeSimulator(key);
    const ledgerState = simulator.getLedger();

    expect(ledgerState.sequence).toEqual(1n);
    expect(ledgerState.pledge.is_some).toEqual(false);
    expect(ledgerState.pledge.value).toEqual("");
    expect(ledgerState.owner).toEqual(new Uint8Array(32));
    expect(ledgerState.state).toEqual(State.EMPTY);
    expect(simulator.getPrivateState()).toEqual({ secretKey: key });
  });

  it("creates an open pledge without changing private state", () => {
    const simulator = new ProofPledgeSimulator(randomBytes(32));
    const initialPrivateState = simulator.getPrivateState();

    simulator.createPledge("Complete three focused study sessions.");

    const ledgerState = simulator.getLedger();
    expect(simulator.getPrivateState()).toEqual(initialPrivateState);
    expect(ledgerState.sequence).toEqual(1n);
    expect(ledgerState.pledge.is_some).toEqual(true);
    expect(ledgerState.pledge.value).toEqual(
      "Complete three focused study sessions.",
    );
    expect(ledgerState.owner).toEqual(simulator.publicKey());
    expect(ledgerState.state).toEqual(State.OPEN);
  });

  it("allows the owner to complete an open pledge", () => {
    const simulator = new ProofPledgeSimulator(randomBytes(32));
    simulator.createPledge("Finish the Midnight hackathon submission.");

    simulator.completePledge();

    expect(simulator.getLedger().state).toEqual(State.COMPLETED);
  });

  it("allows the owner to archive a completed pledge", () => {
    const simulator = new ProofPledgeSimulator(randomBytes(32));
    simulator.createPledge("Record the product demonstration.");
    simulator.completePledge();
    simulator.archivePledge();

    const ledgerState = simulator.getLedger();
    expect(ledgerState.sequence).toEqual(2n);
    expect(ledgerState.pledge.is_some).toEqual(false);
    expect(ledgerState.pledge.value).toEqual("");
    expect(ledgerState.state).toEqual(State.EMPTY);
  });

  it("rejects a second pledge while one is open", () => {
    const simulator = new ProofPledgeSimulator(randomBytes(32));
    simulator.createPledge("First pledge");

    expect(() => simulator.createPledge("Second pledge")).toThrow(
      "failed assert: An active pledge already exists",
    );
  });

  it("rejects a second pledge while one is completed but not archived", () => {
    const simulator = new ProofPledgeSimulator(randomBytes(32));
    simulator.createPledge("First pledge");
    simulator.completePledge();

    expect(() => simulator.createPledge("Second pledge")).toThrow(
      "failed assert: An active pledge already exists",
    );
  });

  it("rejects completion when the pledge contract is empty", () => {
    const simulator = new ProofPledgeSimulator(randomBytes(32));
    expect(() => simulator.completePledge()).toThrow(
      "failed assert: Only an open pledge can be completed",
    );
  });

  it("rejects completion by a different private state", () => {
    const simulator = new ProofPledgeSimulator(randomBytes(32));
    simulator.createPledge("Owner-only completion");
    simulator.switchUser(randomBytes(32));

    expect(() => simulator.completePledge()).toThrow(PRIVATE_STATE_OWNER_ERROR);
  });

  it("rejects completing the same pledge twice", () => {
    const simulator = new ProofPledgeSimulator(randomBytes(32));
    simulator.createPledge("Complete once");
    simulator.completePledge();

    expect(() => simulator.completePledge()).toThrow(
      "failed assert: Only an open pledge can be completed",
    );
  });

  it("rejects archival before completion", () => {
    const simulator = new ProofPledgeSimulator(randomBytes(32));
    simulator.createPledge("Complete before archive");

    expect(() => simulator.archivePledge()).toThrow(
      "failed assert: Only a completed pledge can be archived",
    );
  });

  it("rejects archival by a different private state", () => {
    const simulator = new ProofPledgeSimulator(randomBytes(32));
    simulator.createPledge("Owner-only archive");
    simulator.completePledge();
    simulator.switchUser(randomBytes(32));

    expect(() => simulator.archivePledge()).toThrow(PRIVATE_STATE_OWNER_ERROR);
  });

  it("supports a new owner after archival", () => {
    const simulator = new ProofPledgeSimulator(randomBytes(32));
    simulator.createPledge("First owner");
    simulator.completePledge();
    simulator.archivePledge();

    simulator.switchUser(randomBytes(32));
    simulator.createPledge("Second owner");

    expect(simulator.getLedger().state).toEqual(State.OPEN);
    expect(simulator.getLedger().sequence).toEqual(2n);
    expect(simulator.getLedger().owner).toEqual(simulator.publicKey());
  });

  it("prevents an archived owner credential from controlling a later pledge", () => {
    const firstOwner = randomBytes(32);
    const simulator = new ProofPledgeSimulator(firstOwner);
    simulator.createPledge("First pledge");
    simulator.completePledge();
    simulator.archivePledge();

    simulator.switchUser(randomBytes(32));
    simulator.createPledge("Second pledge");
    simulator.switchUser(firstOwner);

    expect(() => simulator.completePledge()).toThrow(PRIVATE_STATE_OWNER_ERROR);
  });
});
