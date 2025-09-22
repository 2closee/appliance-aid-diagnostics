import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Handle initial path for direct URL access
const initialPath = (window as any).__INITIAL_PATH__;
if (initialPath) {
  window.history.replaceState(null, '', initialPath);
}

createRoot(document.getElementById("root")!).render(<App />);
