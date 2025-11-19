import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserFriends } from '@fortawesome/free-solid-svg-icons';
import { useWebSocket } from '../../contexts/WebSocketContext'; 
import axios from 'axios';
import './Principal.css';

const RightSidebar = () => {
    const [amigos, setAmigos] = useState([]);
    const { stompClient, isConnected } = useWebSocket(); 

    // Função para garantir que a URL da imagem esteja certa
    const getProfileImageUrl = (fotoPerfil) => {
        if (!fotoPerfil) return "/default-avatar.png";
        
        // Se já for um link completo (ex: Google, Cloudinary)
        if (fotoPerfil.startsWith("http")) return fotoPerfil;
        
        // Se começar com barra (ex: /api/arquivos/foto.jpg), adiciona o domínio
        if (fotoPerfil.startsWith("/")) return `http://localhost:8080${fotoPerfil}`;
        
        // Se for só o nome do arquivo (ex: "perfil_123.jpg"), usa o endpoint do seu Controller
        // Baseado no seu AmizadeService, o caminho correto parece ser /api/arquivos/
        return `http://localhost:8080/api/arquivos/${fotoPerfil}`;
    };

    // 1. Carrega a lista de amigos
    useEffect(() => {
        const fetchAmigos = async () => {
            try {
                const token = localStorage.getItem('authToken');
                // Endpoint correto conforme seu AmizadeController
                const response = await axios.get('http://localhost:8080/api/amizades/', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setAmigos(response.data);
            } catch (error) {
                console.error("Erro ao buscar amigos:", error);
            }
        };
        fetchAmigos();
    }, []);

    // 2. WebSocket para Status Online
    useEffect(() => {
        if (isConnected && stompClient) {
            const subscription = stompClient.subscribe('/topic/status', (message) => {
                const usuariosOnline = JSON.parse(message.body); 
                setAmigos(prevAmigos => prevAmigos.map(amigo => ({
                    ...amigo,
                    online: usuariosOnline.includes(amigo.email)
                })));
            });
            return () => subscription.unsubscribe();
        }
    }, [isConnected, stompClient]);

    return (
        <aside className="right-sidebar">
            {/* ÚNICO WIDGET: Contatos (Amigos Online) */}
            <div className="widget-card">
                <div className="widget-header">
                    <h3><FontAwesomeIcon icon={faUserFriends} /> Contatos</h3>
                </div>
                
                <ul className="lista-amigos-online">
                    {amigos.length === 0 ? (
                        <p className="no-friends">Nenhum amigo adicionado.</p>
                    ) : (
                        amigos.map((amigo) => (
                            <li key={amigo.idAmizade || amigo.idUsuario} className="amigo-item">
                                <div className="avatar-wrapper">
                                    <img 
                                        src={getProfileImageUrl(amigo.fotoPerfil)}
                                        alt={amigo.nome} 
                                        className="avatar-mini"
                                        onError={(e) => {e.target.src = "/default-avatar.png"}}
                                    />
                                    {/* Bolinha Verde */}
                                    {amigo.online && <span className="status-dot online"></span>}
                                </div>
                                <div className="amigo-info">
                                    <span className="amigo-nome">{amigo.nome}</span>
                                    <span className="amigo-status-texto">
                                        {amigo.online ? "Online" : "Offline"}
                                    </span>
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </aside>
    );
};

export default RightSidebar;