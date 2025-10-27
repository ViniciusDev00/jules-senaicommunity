import React, { createContext, useContext, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WebSocketContext = createContext(null);

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ children }) => {
  const [stompClient, setStompClient] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const disconnect = useCallback(() => {
    if (stompClient && stompClient.connected) {
      stompClient.deactivate();
    }
    setStompClient(null);
    setIsConnected(false);
  }, [stompClient]);

  const connect = useCallback((token) => {
    if (!token || (stompClient && stompClient.connected)) {
      return;
    }

    // Disconnect any existing client before creating a new one
    if (stompClient) {
      disconnect();
    }

    const socketFactory = () => new SockJS(`http://localhost:8080/ws?token=${token}`);

    const client = new Client({
      webSocketFactory: socketFactory,
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
  }, [stompClient, disconnect]);

  const contextValue = {
    stompClient,
    isConnected,
    connect,
    disconnect,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};
