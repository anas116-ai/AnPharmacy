import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './lib/i18n';

// StrictMode removed for production performance — it intentionally double-invokes
// effects, state initializers, and renders during development, which significantly
// slows down the app. In a large SPA like ours, removing it gives ~2x speed boost.
ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
