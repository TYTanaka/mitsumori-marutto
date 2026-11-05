import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Offline support (production builds only): public/sw.js keeps the
// app shell and its hashed assets in the Cache Storage so a repeat
// visit opens even without a connection. Registration is relative
// to the configured base path.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(() => {
        // Best-effort: the app works the same without the worker.
      });
  });
}
