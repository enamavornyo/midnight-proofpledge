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

import { AppBar, Box, Stack, Toolbar, Typography } from '@mui/material';
import { type ReactElement } from 'react';

export const Header = (): ReactElement => (
  <AppBar position="static" elevation={0} color="transparent" data-testid="header">
    <Toolbar sx={{ py: 1.5, justifyContent: 'space-between' }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Box
          component="span"
          sx={{
            width: 34,
            height: 34,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            fontWeight: 800,
          }}
        >
          P
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          ProofPledge
        </Typography>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
          Powered by
        </Typography>
        <Box component="img" src="/midnight-logo.png" alt="Midnight" height={36} />
      </Stack>
    </Toolbar>
  </AppBar>
);
