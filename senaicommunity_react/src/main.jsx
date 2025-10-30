import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { WebSocketProvider } from './contexts/WebSocketContext.jsx';
import { AuthProvider } from './contexts/Auth/AuthContext.jsx';

// Importa o arquivo CSS que define as cores e fontes globais (Correto!)
import './styles/global.css';

// Importa o CSS padrão do Vite (Correto!)
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <AuthProvider>
      <WebSocketProvider>
        <App />
      </WebSocketProvider>
    </AuthProvider>
  </React.StrictMode>
);