import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { App } from './app';
import { ParticlesBackground } from './components/particles-background';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ParticlesBackground />
    <App />
  </React.StrictMode>
);
