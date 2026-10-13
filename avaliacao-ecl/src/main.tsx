// Primeiro de tudo: os dados grandes passam a ser guardados comprimidos (o tablet encheu).
import './armazenamento';
import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

