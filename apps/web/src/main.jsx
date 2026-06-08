import React from 'react';
import ReactDOM from 'react-dom/client';
import { initTelegramApp } from './init.js';
import App from './App.jsx';
import './index.css';

// Initialize TMA SDK before rendering
initTelegramApp();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
