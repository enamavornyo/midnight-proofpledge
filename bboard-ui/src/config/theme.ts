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

import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#a5b4fc',
      contrastText: '#111827',
    },
    background: {
      default: '#070a12',
      paper: '#111827',
    },
    success: {
      main: '#34d399',
    },
  },
  typography: {
    fontFamily: 'Inter, Montserrat, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h2: {
      fontSize: 'clamp(2.25rem, 7vw, 4.5rem)',
      letterSpacing: '-0.045em',
      lineHeight: 1.02,
    },
  },
  shape: {
    borderRadius: 14,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid rgba(165, 180, 252, 0.18)',
          backgroundImage: 'linear-gradient(145deg, rgba(17, 24, 39, 0.98), rgba(10, 15, 28, 0.98))',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 700,
        },
      },
    },
  },
});
