import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const isDevelopment = 
      location.hostname.includes("localhost") ||
      location.hostname.includes("127.0.0.1") ||
      location.hostname.includes("lovable") ||
      location.hostname.includes("preview") ||
      location.hostname.includes("development") ||
      location.hostname.includes("antigravity"); // Antigravity preview check

    if (!isDevelopment) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('SW registered successfully:', registration.scope);
        })
        .catch(err => {
          console.error('SW registration failed:', err);
        });
    } else {
      console.log('SW registration bypassed in development/preview environment.');
    }
  });
}

