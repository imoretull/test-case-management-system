import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  AppShell,
  DataAdapterProvider,
  HttpAdapter,
} from '@tcms/framework';
import './index.css';

// Amazon-specific policy: stories explicitly marked as "API-only by intent".
// UI coverage gap on these is by design, not a miss.
const UI_INTENTIONAL_NONE = new Set<string>(['AMZN-1459']);

// In dev, Vite proxies `/api/*` to the TCMS server on :3030.
// In a hosted deployment, point this at the server URL.
const adapter = new HttpAdapter({ baseUrl: '' });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DataAdapterProvider adapter={adapter}>
      <AppShell
        productName="Amazon"
        productKey="AMZN"
        coverageOptions={{ uiIntentionalNone: UI_INTENTIONAL_NONE }}
      />
    </DataAdapterProvider>
  </React.StrictMode>,
);
