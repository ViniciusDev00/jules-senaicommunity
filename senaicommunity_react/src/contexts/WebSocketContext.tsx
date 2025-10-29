import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Client, IFrame } from '@stomp/stompjs'; // Importar IFrame
import SockJS from 'sockjs-client';

// 1. Definição do Tipo para o Contexto
type WebSocketContextType = {
  stompClient: Client | null;
  isConnected: boolean;
  connect: (token: string) => void;
  disconnect: () => void;
};

// 2. Criação do Contexto com o Tipo null inicial
const WebSocketContext = createContext<WebSocketContextType | null>(null);

// 3. Hook para consumir o contexto
export const useWebSocket = (): WebSocketContextType | null => useContext(WebSocketContext);

// Tipo para as props do Provider
type WebSocketProviderProps = {
  children: ReactNode;
};

// 4. Criação do Provider (Componente)
export const WebSocketProvider = ({ children }: WebSocketProviderProps) => {
  // 5. Estado `stompClient` com Tipo Explícito
  const [stompClient, setStompClient] = useState<Client | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Função de desconexão (agora sem useCallback para simplificar, será recriada se stompClient mudar)
  const disconnect = () => {
    // console.log("Attempting disconnect..."); // Log para debug
    if (stompClient?.connected) {
      stompClient.deactivate();
      // console.log("STOMP client deactivated."); // Log para debug
    }
    // Apenas limpa se já não estiver limpo, para evitar loops
    if (stompClient !== null) {
      setStompClient(null);
    }
    if (isConnected) {
       setIsConnected(false);
    }
  };

  // Função de conexão (useCallback mantido, mas com dependências corretas)
  const connect = useCallback((token: string) => {
    // Evita reconexão se já conectado ou se não há token
    if (!token || (stompClient?.connected && isConnected)) {
      // console.log("Connect skipped: No token or already connected."); // Log para debug
      return;
    }

    // console.log("Attempting connect..."); // Log para debug

    // Cria nova factory e cliente a cada tentativa de conexão
    const socketFactory = () => new SockJS(`http://localhost:8080/ws`);

    const client = new Client({
      webSocketFactory: socketFactory,
      connectHeaders: {
        'Authorization': `Bearer ${token}`
      },
      // Aumentar timeouts pode ajudar em conexões lentas
      reconnectDelay: 5000, // Tenta reconectar a cada 5 segundos
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      onConnect: () => {
        console.log('Conectado ao WebSocket!');
        setIsConnected(true);
        // Define o cliente STOMP no estado APÓS a conexão ser estabelecida
        setStompClient(client);
      },
      onDisconnect: () => {
        console.log('Desconectado do WebSocket.');
        setIsConnected(false);
        setStompClient(null); // Limpa o cliente no estado
      },
      onStompError: (frame: IFrame) => {
        console.error('Erro no STOMP:', frame.headers['message'], frame.body);
        setIsConnected(false); // Garante que o estado reflita o erro
        setStompClient(null);
        // Tentar desconectar formalmente pode ajudar a limpar recursos
        client.deactivate();
      },
      onWebSocketError: (event: Event) => {
        console.error('Erro na conexão WebSocket:', event);
        setIsConnected(false);
        setStompClient(null);
         // Tentar desconectar formalmente
        client.deactivate();
      },
      onWebSocketClose: (event: CloseEvent) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        setIsConnected(false);
        setStompClient(null);
      }
    });

    // Ativa o cliente para iniciar a conexão
    client.activate();

  // Removido 'stompClient' e 'disconnect' das dependências para evitar loop
  // A lógica agora garante que 'connect' só executa se necessário
  }, [isConnected]); // Depende apenas de 'isConnected' para decidir se tenta reconectar

  // Efeito para desconectar ao desmontar o componente
  useEffect(() => {
    // A função retornada pelo useEffect é a função de cleanup
    return () => {
      // console.log("Cleanup: Disconnecting WebSocket..."); // Log para debug
      disconnect();
    };
  // As dependências corretas aqui são stompClient e disconnect
  }, [stompClient, disconnect]);


  // Valor do Contexto
  const contextValue: WebSocketContextType = {
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
