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

import { Stack } from '@mui/material';
import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { type Observable } from 'rxjs';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { MainLayout, PledgeCard, PledgeStartCard } from './components/index.js';
import { type PledgeDeployment } from './contexts/BrowserProofPledgeManager.js';
import { useProofPledgeContext } from './hooks/index.js';

const App = (): ReactElement => {
  const provider = useProofPledgeContext();
  const [deployments, setDeployments] = useState<Array<Observable<PledgeDeployment>>>([]);

  useEffect(() => {
    const subscription = provider.deployments$.subscribe(setDeployments);
    return () => subscription.unsubscribe();
  }, [provider]);

  const deployContract = useCallback(() => {
    provider.resolve();
  }, [provider]);

  const joinContract = useCallback(
    (contractAddress: ContractAddress) => {
      provider.resolve(contractAddress);
    },
    [provider],
  );

  return (
    <MainLayout>
      <Stack spacing={3} sx={{ width: '100%', alignItems: 'center' }}>
        {deployments.map((deployment, index) => (
          <PledgeCard key={`pledge-${index}`} deployment$={deployment} />
        ))}
        <PledgeStartCard onDeploy={deployContract} onJoin={joinContract} />
      </Stack>
    </MainLayout>
  );
};

export default App;
