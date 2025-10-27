import React, { createContext, useContext, useEffect, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WebSocketContext = createContext(null);

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ children }) => {
  const [stompClient, setStompClient] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');

    if (token) {
      const socketFactory = () => new SockJS('http://localhost:8080/ws');
      const client = new Client({
        webSocketFactory: socketFactory,
        connectHeaders: {
          Authorization: `Bearer ${token}`,
        },
        onConnect: () => {
          console.log('Conectado ao WebSocket!');
          setIsConnected(true);
        },
        onDisconnect: () => {
          console.log('Desconectado do WebSocket.');
          setIsConnected(false);
        },
        onError: (error) => {
          console.error('Erro no WebSocket:', error);
        },
      });

      client.activate();
      setStompClient(client);

      return () => {
        if (client.connected) {
          client.deactivate();
        }
      };
    }
  }, []);

  return (
    <WebSocketContext.Provider value={{ stompClient, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
};
