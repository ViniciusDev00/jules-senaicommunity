// src/components/Layout/Topbar.tsx (COMPLETO, CORRIGIDO E ATUALIZADO)

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useWebSocket } from '../../contexts/WebSocketContext.tsx'; 
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faHome, faCommentDots, faBell, faChevronDown, faUserEdit,
    faSignOutAlt, faSearch, faMoon, faSun, faCog
} from '@fortawesome/free-solid-svg-icons';
import './Topbar.css';
import axios from 'axios';
import ConviteProjetoModal from './ConviteProjetoModal'; // Importa o NOVO modal

// --- DEFINIÇÃO DOS TIPOS ---
interface Notificacao {
    id: any;
    mensagem: string;
    dataCriacao: string; // Vem como string do JSON
    lida: boolean;
    tipo: string;
    idReferencia: any;
    // Campos do Remetente (vindos do Backend atualizado)
    remetenteId?: any;
    remetenteNome?: string;
    remetenteFotoUrl?: string; 
}

// O que guardamos no estado ao clicar em um convite
interface ConviteSelecionado {
    id: any; // ID da Notificação
    conviteId: any; // ID do Convite (de idReferencia)
    mensagem: string;
    remetenteNome?: string;
    remetenteFotoUrl?: string; // Passa a foto para o modal
}

// Tipo das props do Topbar
interface TopbarProps {
    onLogout: () => void;
    currentUser: any; // Idealmente, defina uma interface de Usuário
}

const Topbar: React.FC<TopbarProps> = ({ onLogout, currentUser }) => {
    
    const webSocketContext = useWebSocket();
    const stompClient = webSocketContext?.stompClient;
    const isConnected = webSocketContext?.isConnected;

    // Estados tipados
    const [notifications, setNotifications] = useState<Notificacao[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const [conviteSelecionado, setConviteSelecionado] = useState<ConviteSelecionado | null>(null);
    const [isConviteModalOpen, setIsConviteModalOpen] = useState(false);

    // Busca notificações existentes
    const fetchNotifications = useCallback(async () => {
        if (currentUser) {
            try {
                const response = await axios.get('http://localhost:8080/api/notificacoes');
                
                if (response.data && Array.isArray(response.data)) {
                    const sortedNotifications: Notificacao[] = response.data.sort((a: Notificacao, b: Notificacao) =>
                        new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime()
                    );
                    setNotifications(sortedNotifications);
                    const unread = sortedNotifications.filter(notif => !notif.lida).length;
                    setUnreadCount(unread);
                } else {
                    setNotifications([]);
                    setUnreadCount(0);
                }
            } catch (error) {
                console.error("Erro ao buscar notificações:", error);
                setNotifications([]); 
                setUnreadCount(0);
                if ((error as any).response?.status === 401 || (error as any).response?.status === 403) {
                    onLogout();
                }
            }
        }
    }, [currentUser, onLogout]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]); 

    // Ouve o WebSocket
    useEffect(() => {
        if (isConnected && stompClient && currentUser && currentUser.email) {
            const subscription = stompClient.subscribe(`/user/${currentUser.email}/queue/notifications`, (message) => {
                try {
                    const newNotification: Notificacao = JSON.parse(message.body);
                    setNotifications((prev) => [newNotification, ...prev.slice(0, 49)]);
                    if (!isNotificationsOpen) {
                        setUnreadCount((prev) => prev + 1);
                    }
                } catch (e) {
                    console.error("Erro ao processar notificação recebida:", e, message.body);
                }
            });

            return () => {
                if (subscription && typeof subscription.unsubscribe === 'function') {
                    subscription.unsubscribe();
                }
            };
        }
    }, [isConnected, stompClient, currentUser, isNotificationsOpen]);

    // Lógica do Tema
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);
    const handleThemeToggle = () => {
        setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
    };

    const handleToggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
        setIsNotificationsOpen(false); 
    };

    // Abre/Fecha dropdown de notificações e marca como lidas
    const handleOpenNotifications = () => {
        const newState = !isNotificationsOpen;
        setIsNotificationsOpen(newState);
        setIsMenuOpen(false); 

        if (newState && unreadCount > 0) { 
            setUnreadCount(0);
            axios.post('http://localhost:8080/api/notificacoes/ler-todas')
                 .then(() => {
                    setNotifications(prev => prev.map(n => ({ ...n, lida: true })));
                 })
                 .catch(err => {
                     console.error("Erro ao marcar notificações como lidas:", err);
                 });
        }
    };

    // --- LÓGICA PRINCIPAL (CLIQUE NA NOTIFICAÇÃO) ---
    const handleNotificationClick = (notif: Notificacao) => {
        // 1. Marca como lida (se já não estiver)
        if (!notif.lida) {
            axios.post(`http://localhost:8080/api/notificacoes/${notif.id}/ler`)
                .then(() => {
                    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, lida: true } : n));
                })
                .catch(err => console.error("Erro ao marcar notificação como lida:", err));
        }

        // 2. Ação específica (Abrir Modal de Convite)
        if (notif.tipo === 'CONVITE_PROJETO' && notif.idReferencia) {
            setConviteSelecionado({
                id: notif.id,
                conviteId: notif.idReferencia, // Este é o ID do CONVITE
                mensagem: notif.mensagem,
                remetenteNome: notif.remetenteNome, // Passa o nome para o modal
                remetenteFotoUrl: notif.remetenteFotoUrl // Passa a foto para o modal
            });
            setIsConviteModalOpen(true); 
            setIsNotificationsOpen(false); 
        } else {
            console.log("Notificação clicada (tipo " + notif.tipo + "):", notif);
            setIsNotificationsOpen(false); 
        }
    };

    // --- Funções para o Modal ---
    const handleCloseConviteModal = () => {
        setIsConviteModalOpen(false);
        setConviteSelecionado(null);
    };

    // (Promise<void> garante que podemos usar 'await' no modal)
    const handleAcceptConvite = async (conviteId: any): Promise<void> => {
        await axios.post(`http://localhost:8080/projetos/convites/${conviteId}/aceitar`);
        // Remove a notificação da lista e fecha o modal
        setNotifications(prev => prev.filter(n => n.id !== conviteSelecionado?.id));
        handleCloseConviteModal();
        // Você pode querer adicionar um fetchProjetos() aqui se tiver uma lista global
    };

    const handleDeclineConvite = async (conviteId: any): Promise<void> => {
        await axios.delete(`http://localhost:8080/projetos/convites/${conviteId}/recusar`);
        // Remove a notificação da lista e fecha o modal
        setNotifications(prev => prev.filter(n => n.id !== conviteSelecionado?.id));
        handleCloseConviteModal();
    };

    // URL da foto do usuário logado (para a barra)
    const userImage = currentUser?.urlFotoPerfil
        ? `http://localhost:8080${currentUser.urlFotoPerfil}`
        : "https://via.placeholder.com/40";

    // URL da foto do REMETENTE da notificação (para o dropdown)
    const getNotificationSenderPhoto = (notif: Notificacao) => { 
        if (notif.remetenteFotoUrl) {
            if (notif.remetenteFotoUrl.startsWith('http')) {
                return notif.remetenteFotoUrl;
            }
            return `http://localhost:8080${notif.remetenteFotoUrl}`;
        }
        // Fallback
        return `https://i.pravatar.cc/40?u=${notif.remetenteId || 'sistema'}`;
    };

    return (
        <> 
            <header className="topbar">
                 <div className="header-left">
                    <Link to="/principal" className="logo-link">
                        <h1 className="logo"><span className="highlight">SENAI </span>Community</h1>
                    </Link>
                </div>

                <div className="search">
                    <FontAwesomeIcon icon={faSearch} />
                    <input type="text" id="search-input" placeholder="Pesquisar..." />
                </div>

                <nav className="nav-icons">
                    <Link to="/principal" className="nav-icon" data-tooltip="Início">
                        <FontAwesomeIcon icon={faHome} />
                    </Link>
                    <Link to="/mensagens" className="nav-icon" data-tooltip="Mensagens">
                        <FontAwesomeIcon icon={faCommentDots} />
                    </Link>

                    {/* === ÁREA DE NOTIFICAÇÃO ATUALIZADA === */}
                    <div className="nav-icon notifications-container" data-tooltip="Notificações">
                        <div onClick={handleOpenNotifications}>
                            <FontAwesomeIcon icon={faBell} />
                            {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
                        </div>

                        {isNotificationsOpen && (
                            <div className="notifications-dropdown">
                                <div className="notifications-header">
                                    <h3>Notificações</h3>
                                </div>
                                <div className="notifications-list">
                                    {(Array.isArray(notifications) && notifications.length > 0) ? (
                                        notifications.map((notif: Notificacao) => (
                                            <div
                                                className={`notification-item ${!notif.lida ? 'unread' : ''}`}
                                                key={notif.id} 
                                                onClick={() => handleNotificationClick(notif)} 
                                            >
                                                <img
                                                    src={getNotificationSenderPhoto(notif)}
                                                    alt={notif.remetenteNome || 'Remetente'}
                                                    className="notification-sender-photo"
                                                />
                                                <div className="notification-content">
                                                    <p className="notification-text">
                                                        {/* USA O NOME DO REMETENTE! */}
                                                        <strong>{notif.remetenteNome || 'Notificação'}</strong>
                                                        &nbsp;{notif.mensagem}
                                                    </p>
                                                    <span className="notification-time">
                                                        {new Date(notif.dataCriacao).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                {!notif.lida && <div className="unread-indicator"></div>}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="no-notifications">Nenhuma notificação nova.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    {/* === FIM DA ÁREA DE NOTIFICAÇÃO === */}

                    <div className="nav-icon theme-toggle-button" data-tooltip="Alternar tema" onClick={handleThemeToggle}>
                        <FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} />
                    </div>
                </nav>

                <div className="user-dropdown">
                    <div className="user" onClick={handleToggleMenu}>
                        <div className="profile-pic">
                            <img src={userImage} alt="Perfil" />
                        </div>
                        <span className="username-display">{currentUser?.nome || 'Usuário'}</span>
                        <FontAwesomeIcon icon={faChevronDown} className={`dropdown-arrow ${isMenuOpen ? 'open' : ''}`} />
                    </div>

                    {isMenuOpen && (
                        <div className="dropdown-menu show">
                            <Link to="/perfil" onClick={() => setIsMenuOpen(false)}><FontAwesomeIcon icon={faUserEdit} /> Meu Perfil</Link>
                            <Link to="/configuracoes" onClick={() => setIsMenuOpen(false)}><FontAwesomeIcon icon={faCog} /> Configurações</Link>
                            <a href="#" onClick={() => { onLogout(); setIsMenuOpen(false); }}><FontAwesomeIcon icon={faSignOutAlt} /> Sair</a>
                        </div>
                    )}
                </div>
            </header>

            {/* Renderiza o novo modal */}
            {isConviteModalOpen && conviteSelecionado && (
                <ConviteProjetoModal
                    convite={conviteSelecionado}
                    onClose={handleCloseConviteModal}
                    onAccept={handleAcceptConvite}
                    onDecline={handleDeclineConvite}
                />
            )}
        </>
    );
};

export default Topbar;