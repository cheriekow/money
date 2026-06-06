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
      navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js')
        .then(registration => {
          console.log('SW registered successfully:', registration.scope);
        })
        .catch(err => {
          console.error('SW registration failed:', err);
        });
    } else {
      console.log('SW registration bypassed in development/preview environment. Cleaning up active service workers to prevent cache conflicts...');
      navigator.serviceWorker.getRegistrations().then(registrations => {
        let unregisteredAny = false;
        for (const registration of registrations) {
          registration.unregister();
          unregisteredAny = true;
          console.log('Unregistered active service worker:', registration.scope);
        }
        if (unregisteredAny) {
          console.log('Dev Service Worker cleaned up. Reloading to clear cache...');
          setTimeout(() => {
            location.reload();
          }, 100);
        }
      });
    }
  });
}

