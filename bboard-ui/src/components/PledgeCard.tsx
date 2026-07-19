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
  ArchiveOutlined,
  CheckCircleOutlined,
  ContentCopyOutlined,
  LockOutlined,
  PublishOutlined,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { type Observable } from 'rxjs';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { maxPledgeLength, type DeployedProofPledgeAPI, type ProofPledgeDerivedState } from '../../../api/src/index.js';
import { State } from '../../../contract/src/index.js';
import { type PledgeDeployment } from '../contexts/BrowserProofPledgeManager.js';

export interface PledgeCardProps {
  readonly deployment$: Observable<PledgeDeployment>;
}

export const PledgeCard = ({ deployment$ }: PledgeCardProps): ReactElement => {
  const [deployment, setDeployment] = useState<PledgeDeployment>({ status: 'in-progress' });
  const [api, setApi] = useState<DeployedProofPledgeAPI>();
  const [pledgeState, setPledgeState] = useState<ProofPledgeDerivedState>();
  const [pledgeInput, setPledgeInput] = useState('');
  const [isWorking, setIsWorking] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();

  useEffect(() => {
    const subscription = deployment$.subscribe(setDeployment);
    return () => subscription.unsubscribe();
  }, [deployment$]);

  useEffect(() => {
    if (deployment.status === 'in-progress') return;
    setIsWorking(false);

    if (deployment.status === 'failed') {
      setErrorMessage(deployment.error.message || 'Contract deployment failed.');
      return;
    }

    setApi(deployment.api);
    const subscription = deployment.api.state$.subscribe({
      next: setPledgeState,
      error: (error: unknown) => {
        setErrorMessage(error instanceof Error ? error.message : String(error));
      },
    });
    return () => subscription.unsubscribe();
  }, [deployment]);

  useEffect(() => {
    if (pledgeState?.state !== State.EMPTY) setPledgeInput('');
  }, [pledgeState?.state]);

  const runAction = useCallback(async (action: () => Promise<void>): Promise<void> => {
    setErrorMessage(undefined);
    setIsWorking(true);
    try {
      await action();
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsWorking(false);
    }
  }, []);

  const createPledge = useCallback(async () => {
    if (!api || !pledgeInput.trim()) return;
    await runAction(() => api.createPledge(pledgeInput));
  }, [api, pledgeInput, runAction]);

  const completePledge = useCallback(async () => {
    if (!api) return;
    await runAction(() => api.completePledge());
  }, [api, runAction]);

  const archivePledge = useCallback(async () => {
    if (!api) return;
    await runAction(() => api.archivePledge());
  }, [api, runAction]);

  const copyContractAddress = useCallback(async () => {
    if (api) await navigator.clipboard.writeText(api.deployedContractAddress);
  }, [api]);

  return (
    <Card data-testid="pledge-card" sx={{ position: 'relative', width: '100%', maxWidth: 720 }}>
      {isWorking && (
        <Box
          data-testid="pledge-working-indicator"
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'rgba(7, 10, 18, 0.72)',
          }}
        >
          <CircularProgress />
        </Box>
      )}

      <CardContent>
        <Stack spacing={3}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
              <Typography variant="overline" color="text.secondary">
                Contract
              </Typography>
              {api ? (
                <Typography data-testid="pledge-address" noWrap sx={{ fontFamily: 'monospace' }}>
                  {shortContractAddress(api.deployedContractAddress)}
                </Typography>
              ) : (
                <Skeleton width={220} />
              )}
            </Stack>
            <Tooltip title="Copy contract address">
              <span>
                <IconButton disabled={!api} onClick={copyContractAddress} aria-label="Copy contract address">
                  <ContentCopyOutlined />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>

          {errorMessage && (
            <Alert severity="error" onClose={() => setErrorMessage(undefined)}>
              {errorMessage}
            </Alert>
          )}

          {!pledgeState ? (
            <Skeleton variant="rounded" height={220} />
          ) : (
            <PledgeStateContent
              state={pledgeState}
              pledgeInput={pledgeInput}
              onPledgeInputChange={setPledgeInput}
              onCreate={createPledge}
              onComplete={completePledge}
              onArchive={archivePledge}
            />
          )}

          <Alert severity="warning" variant="outlined">
            The ownership secret is stored only in the current browser session. Refreshing or closing the page can
            remove access to protected actions.
          </Alert>

          <Divider />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <PrivacyItem label="Public" value="Pledge text, status, sequence, owner commitment" />
            <PrivacyItem label="Private" value="Ownership secret and raw witness input" />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

interface PledgeStateContentProps {
  readonly state: ProofPledgeDerivedState;
  readonly pledgeInput: string;
  readonly onPledgeInputChange: (value: string) => void;
  readonly onCreate: () => Promise<void>;
  readonly onComplete: () => Promise<void>;
  readonly onArchive: () => Promise<void>;
}

const PledgeStateContent = ({
  state,
  pledgeInput,
  onPledgeInputChange,
  onCreate,
  onComplete,
  onArchive,
}: PledgeStateContentProps): ReactElement => {
  if (state.state === State.EMPTY) {
    return (
      <Stack spacing={2}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h5">Publish a pledge</Typography>
          <Chip label="Empty" size="small" />
        </Stack>
        <TextField
          data-testid="pledge-input"
          label="Public pledge"
          placeholder="Complete three focused study sessions this week."
          value={pledgeInput}
          multiline
          minRows={4}
          slotProps={{ htmlInput: { maxLength: maxPledgeLength } }}
          helperText={`${pledgeInput.length}/${maxPledgeLength} characters`}
          onChange={(event) => onPledgeInputChange(event.target.value)}
        />
        <Button
          data-testid="pledge-create-button"
          variant="contained"
          startIcon={<PublishOutlined />}
          disabled={!pledgeInput.trim()}
          onClick={() => void onCreate()}
        >
          Publish pledge
        </Button>
      </Stack>
    );
  }

  const completed = state.state === State.COMPLETED;
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5">Active pledge</Typography>
        <Chip label={completed ? 'Completed' : 'Open'} color={completed ? 'success' : 'primary'} size="small" />
      </Stack>

      <Typography data-testid="pledge-text" variant="h6" sx={{ overflowWrap: 'anywhere' }}>
        {state.pledge}
      </Typography>

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <LockOutlined fontSize="small" />
        <Typography color="text.secondary">
          {state.isOwner
            ? 'The local private state controls this pledge.'
            : 'A different private state controls this pledge.'}
        </Typography>
      </Stack>

      {completed ? (
        <Button
          data-testid="pledge-archive-button"
          variant="contained"
          startIcon={<ArchiveOutlined />}
          color={state.isOwner ? 'primary' : 'warning'}
          onClick={() => void onArchive()}
        >
          {state.isOwner ? 'Archive pledge' : 'Attempt archival'}
        </Button>
      ) : (
        <Button
          data-testid="pledge-complete-button"
          variant="contained"
          startIcon={<CheckCircleOutlined />}
          color={state.isOwner ? 'primary' : 'warning'}
          onClick={() => void onComplete()}
        >
          {state.isOwner ? 'Complete pledge' : 'Attempt completion'}
        </Button>
      )}
    </Stack>
  );
};

const PrivacyItem = ({ label, value }: { readonly label: string; readonly value: string }): ReactElement => (
  <Box sx={{ flex: 1 }}>
    <Typography variant="overline" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2">{value}</Typography>
  </Box>
);

const shortContractAddress = (contractAddress: ContractAddress): string =>
  contractAddress.length > 20 ? `${contractAddress.slice(0, 10)}...${contractAddress.slice(-10)}` : contractAddress;
