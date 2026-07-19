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

import { Box, Container, Stack, Typography } from '@mui/material';
import { type PropsWithChildren, type ReactElement } from 'react';
import { Header } from './Header.js';

export const MainLayout = ({ children }: PropsWithChildren): ReactElement => (
  <Box sx={{ minHeight: '100vh' }}>
    <Header />
    <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 } }}>
      <Stack spacing={5} sx={{ alignItems: 'center' }}>
        <Stack spacing={2} sx={{ maxWidth: 760, textAlign: 'center' }}>
          <Typography variant="overline" color="primary.main" sx={{ fontWeight: 800 }}>
            July 2026 Midnight Hackathon
          </Typography>
          <Typography variant="h2" component="h1" sx={{ fontWeight: 800 }}>
            Public commitments. Private ownership.
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
            Publish a pledge, prove ownership through Midnight, and complete it without exposing the private secret that
            controls the contract action.
          </Typography>
        </Stack>
        {children}
      </Stack>
    </Container>
  </Box>
);
