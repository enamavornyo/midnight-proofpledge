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

import { AddCircleOutlined, LinkOutlined } from '@mui/icons-material';
import { Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { useState, type ReactElement } from 'react';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { TextPromptDialog } from './TextPromptDialog.js';

export interface PledgeStartCardProps {
  readonly onDeploy: () => void;
  readonly onJoin: (contractAddress: ContractAddress) => void;
}

export const PledgeStartCard = ({ onDeploy, onJoin }: PledgeStartCardProps): ReactElement => {
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);

  return (
    <Card sx={{ width: '100%', maxWidth: 560 }}>
      <CardContent>
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography variant="h5">Start a pledge contract</Typography>
            <Typography color="text.secondary">
              Deploy a new contract or connect to an existing contract address.
            </Typography>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button
              data-testid="pledge-deploy-button"
              variant="contained"
              startIcon={<AddCircleOutlined />}
              onClick={onDeploy}
            >
              Deploy contract
            </Button>
            <Button
              data-testid="pledge-join-button"
              variant="outlined"
              startIcon={<LinkOutlined />}
              onClick={() => setJoinDialogOpen(true)}
            >
              Join contract
            </Button>
          </Stack>
        </Stack>
      </CardContent>

      <TextPromptDialog
        prompt="Enter the ProofPledge contract address"
        isOpen={joinDialogOpen}
        onCancel={() => setJoinDialogOpen(false)}
        onSubmit={(contractAddress) => {
          setJoinDialogOpen(false);
          onJoin(contractAddress.trim());
        }}
      />
    </Card>
  );
};
