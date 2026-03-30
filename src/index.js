import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Global variables for the environment
window.__app_id = window.__app_id || 'eternal-host-v1';
window.__firebase_config = window.__firebase_config || '{}';
window.__initial_auth_token = window.__initial_auth_token || '';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
