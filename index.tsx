
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
// Import API configuration to ensure it's loaded
import './src/config/api';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
