import React, { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Remove splash screen after app loads
const removeSplashScreen = () => {
  const splashScreen = document.getElementById('splash-screen');
  if (splashScreen) {
    splashScreen.style.opacity = '0';
    splashScreen.style.transition = 'opacity 0.3s ease-out';
    setTimeout(() => {
      splashScreen.remove();
    }, 300);
  }
};

// Wait for app to be ready before removing splash
window.addEventListener('load', () => {
  setTimeout(removeSplashScreen, 500);
});

createRoot(document.getElementById("root")!).render(<App />);
