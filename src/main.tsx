import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import '@fontsource-variable/inter';
// Branchify's base styles first, so the dashboard's own sheet can refine them.
import './styles.css';
import { App } from './app';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
