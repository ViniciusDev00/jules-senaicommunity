// src/components/Layout/Topbar.jsx (COM LINK DE CONFIGURAÇÃO)

import React, { useState, useEffect } from 'react'; // Hooks já estavam aqui
import { Link } from 'react-router-dom';
import { useWebSocket } from '../../contexts/WebSocketContext.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// Ícone do Sol/Lua já está importado de ThemeToggle, mas podemos precisar deles aqui
import {
    faHome, faCommentDots, faBell, faChevronDown, faUserEdit, faUserSlash,
    faSignOutAlt, faSearch, faMoon, faSun,
    faCog // ✅ 1. ÍCONE ADICIONADO
} from '@fortawesome/free-solid-svg-icons';
// import ThemeToggle from '../Auth/ThemeToggle'; // Não precisa mais importar separado se a lógica está aqui
import './Topbar.css'; // Carrega o CSS atualizado

const Topbar = ({ onLogout, currentUser }) => {
    const { stompClient, isConnected } = useWebSocket();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        if (isConnected && stompClient && currentUser) {
            const subscription = stompClient.subscribe(`/user/${currentUser.id}/topic/notificacoes`, (message) => {
                const newNotification = JSON.parse(message.body);
                setNotifications((prev) => [newNotification, ...prev]);
                setUnreadCount((prev) => prev + 1);
            });

            return () => {
                subscription.unsubscribe();
            };
        }
    }, [isConnected, stompClient, currentUser]);

    // ✅ 2. Lógica do Tema MOVIDA para cá
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);
    const handleThemeToggle = () => {
        setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
    };
    // Fim da lógica do Tema

    const handleToggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const userImage = currentUser?.urlFotoPerfil
        ? `http://localhost:8080${currentUser.urlFotoPerfil}`
        : "https://via.placeholder.com/40";

    return (
        <header className="topbar">
            <div className="header-left">
                {/* Link para a página principal */}
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
                    {/* <span className="badge">3</span> */} {/* Placeholder a ser removido ou dinamizado */}
                </Link>
                <div className="nav-icon notifications-container" data-tooltip="Notificações">
                    <div onClick={() => { setIsNotificationsOpen(!isNotificationsOpen); setUnreadCount(0); }}>
                        <FontAwesomeIcon icon={faBell} />
                        {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
                    </div>
                    {isNotificationsOpen && (
                        <div className="notifications-dropdown">
                            <div className="notifications-header">
                                <h3>Notificações</h3>
                            </div>
                            <div className="notifications-list">
                                {notifications.length > 0 ? (
                                    notifications.map((notif, index) => (
                                        <div className="notification-item" key={index}>
                                            <p>{notif.mensagem}</p>
                                            <span className="notification-time">{new Date(notif.data).toLocaleString()}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="no-notifications">Nenhuma notificação nova.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* ✅ 3. Botão ThemeToggle ADICIONADO AQUI DENTRO */}
                {/* Usamos um 'div' com 'onClick' e estilizamos como os outros nav-icon */}
                <div className="nav-icon theme-toggle-button" data-tooltip="Alternar tema" onClick={handleThemeToggle}>
                    <FontAwesomeIcon icon={theme === 'dark' ? faMoon : faSun} />
                </div>
            </nav>

            <div className="user-dropdown">
                <div className="user" onClick={handleToggleMenu}>
                    <div className="profile-pic">
                        <img src={userImage} alt="Perfil" />
                    </div>
                    {/* Ocultar nome em telas pequenas se necessário */}
                    <span className="username-display">{currentUser?.nome || 'Usuário'}</span>
                    <FontAwesomeIcon icon={faChevronDown} className={`dropdown-arrow ${isMenuOpen ? 'open' : ''}`} />
                </div>

                {isMenuOpen && (
                    <div className="dropdown-menu show">
                        <Link to="/perfil" onClick={() => setIsMenuOpen(false)}><FontAwesomeIcon icon={faUserEdit} /> Meu Perfil</Link>

                        {/* ✅ 2. LINK DE CONFIGURAÇÕES ADICIONADO */}
                        <Link to="/configuracoes" onClick={() => setIsMenuOpen(false)}><FontAwesomeIcon icon={faCog} /> Configurações</Link>

                        {/* <a href="#" className="danger"><FontAwesomeIcon icon={faUserSlash} /> Excluir Conta</a> */}
                        <a href="#" onClick={() => { onLogout(); setIsMenuOpen(false); }}><FontAwesomeIcon icon={faSignOutAlt} /> Sair</a>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Topbar;