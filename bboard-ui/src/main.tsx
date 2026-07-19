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

import './globals.js';

import '@midnight-ntwrk/dapp-connector-api';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { NetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import * as pino from 'pino';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import { theme } from './config/theme.js';
import { ProofPledgeProvider } from './contexts/index.js';

const networkId = import.meta.env.VITE_NETWORK_ID as NetworkId;
setNetworkId(networkId);

export const logger = pino.pino({
  level: import.meta.env.VITE_LOGGING_LEVEL as string,
});

logger.trace({ networkId }, 'ProofPledge network selected');

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <CssBaseline />
    <ThemeProvider theme={theme}>
      <ProofPledgeProvider logger={logger}>
        <App />
      </ProofPledgeProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
