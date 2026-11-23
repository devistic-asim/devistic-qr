import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppRoot } from './App';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element missing');

createRoot(root).render(
  <StrictMode>
    <AppRoot />
  </StrictMode>,
);
