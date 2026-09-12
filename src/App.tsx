/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AdaptiveProvider } from './context/AdaptiveContext';
import { AdaptiveShell } from './components/AdaptiveShell';

export default function App() {
  return (
    <AdaptiveProvider>
      <AdaptiveShell />
    </AdaptiveProvider>
  );
}
