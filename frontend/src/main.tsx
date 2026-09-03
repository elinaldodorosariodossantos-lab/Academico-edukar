import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { App } from './App.tsx';
import { queryClient } from './lib/queryClient';
import './styles/globals.css';
import './styles/pages-professional.css';
import './styles/responsive.css';
import { appConfig } from './config/env';

document.title = `Sistema Acadêmico ${appConfig.name}`;

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
