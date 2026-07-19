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

import { Buffer } from 'buffer';

// Vite exposes the active mode through `PROD` and `DEV`, while some browser
// dependencies still inspect `process.env.NODE_ENV`.
//
// @ts-expect-error - support third-party libraries that require `NODE_ENV`.
globalThis.process = {
  env: {
    NODE_ENV: import.meta.env.MODE, // Map `MODE` to `process.env.NODE_ENV`.
  },
};

// Midnight browser dependencies require a global `Buffer` polyfill.
globalThis.Buffer = Buffer;
