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
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      console.log('ServiceWorker registered for PWA!');
    }).catch((err) => {
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)