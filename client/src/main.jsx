import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import axios from 'axios'

const backendUrl = 'https://superapp-backend-6106.onrender.com';
axios.defaults.baseURL = backendUrl;

// 🔥 START THE SERVICE WORKER TO ENABLE APP INSTALLATION 🔥
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('ServiceWorker registered');
      // Check for updates every time the page loads
      reg.update();
      // When a new SW is waiting, activate it immediately
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available — reload to get fresh code
            newWorker.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
          }
        });
      });
    }).catch((err) => {
      console.log('ServiceWorker registration failed: ', err);
    });

    // If SW controller changes (new SW took over), reload
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)