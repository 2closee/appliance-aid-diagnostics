import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// BrowserRouter handles the initial path automatically - no manual history manipulation needed

createRoot(document.getElementById("root")!).render(<App />);
