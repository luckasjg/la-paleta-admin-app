import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Aviso benigno del navegador al redimensionar diálogos/listas: no afecta la app.
window.addEventListener('error', (e) => {
  if (e.message?.includes('ResizeObserver loop')) e.stopImmediatePropagation();
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)