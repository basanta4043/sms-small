import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

if (!window.storage) {
  const storage = new Map();
  window.storage = {
    async get(key) {
      return storage.has(key) ? { value: storage.get(key) } : null;
    },
    async set(key, value) {
      storage.set(key, value);
    },
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
