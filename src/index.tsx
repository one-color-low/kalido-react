import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import KalidoReact from './components/KalidoReact';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <KalidoReact></KalidoReact>
  </React.StrictMode>
);

