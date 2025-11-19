// src/pages/Mensagens/Mensagens.jsx (CORRIGIDO)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
// ✅ Importação corrigida para .jsx
import Topbar from '../../components/Layout/Topbar.jsx'; 
import Sidebar from '../../components/Layout/Sidebar.jsx';
import Swal from 'sweetalert2';
import './Mensagens.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faPaperPlane, faEllipsisV, faSearch, faSpinner, 
    faArrowLeft, faTrash, faPen, faTimes 
} from '@fortawesome/free-solid-svg-icons';

import { useLocation, useNavigate } from 'react-router-dom';
// ✅ Importação corrigida para .jsx
import { useWebSocket } from '../../contexts/WebSocketContext.jsx'; 

import EditarMensagemModal from './EditarMensagemModal.jsx';

// Função helper de imagem (apontando para o avatar padrão)
const getCorrectUserImageUrl = (url, fallbackId) => {
    const defaultAvatar = 'http://localhost:8080/images/default-avatar.png'; //
    
    if (!url) {
        return defaultAvatar; 
    }
    if (url.startsWith('http')) {
        return url;
    }
    if (url.startsWith('/api/arquivos/') || url.startsWith('/images/')) {
        return `http://localhost:8080${url}`;
    }
    return `http://localhost:8080/api/arquivos/${url}`;
};

// --- COMPONENTE CONVERSATIONListItem ---
const ConversationListItem = ({ conversa, ativa, onClick }) => (
    <div
        className={`convo-list-item ${ativa ? 'selected' : ''}`}
        onClick={onClick}
    >
        <img 
            src={conversa.avatar} 
            className="avatar" 
            alt="avatar" 
            onError={(e) => { 
                e.target.onerror = null; 
                if (conversa.tipo === 'grupo') {
                    e.target.src = `https://placehold.co/50/30363d/8b949e?text=${conversa.nome.substring(0, 2)}`;
                } else {
                    e.target.src = 'http://localhost:8080/images/default-avatar.png';
                }
            }}
        />
        <div className="convo-info">
            <div className="convo-title">{conversa.nome}</div>
            <div className="convo-snippet">{conversa.ultimaMensagem || 'Nenhuma mensagem ainda'}</div>
        </div>
    </div>
);


// --- COMPONENTE MessageBubble ---
const MessageBubble = ({ mensagem, isMe, onDeleteClick, onEditClick, onReactClick, reactions }) => {
    // ... (Componente sem alterações, já estava correto) ...
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const emojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const hasBeenEdited = mensagem.dataEdicao && new Date(mensagem.dataEnvio).getTime() !== new Date(mensagem.dataEdicao).getTime();
    const aggregatedReactions = (reactions || []).reduce((acc, emoji) => {
        const found = acc.find(r => r.emoji === emoji);
        if (found) { found.count++; } else { acc.push({ emoji, count: 1 }); }
        return acc;
    }, []);
    const handleReact = (emoji) => {
        onReactClick(mensagem, emoji);
        setMenuOpen(false);
    };
    const isGrupo = mensagem.tipo === 'grupo';
    const showAuthorInfo = isGrupo && !isMe; 
    const authorPhoto = showAuthorInfo 
        ? getCorrectUserImageUrl(mensagem.fotoAutorUrl, mensagem.autorId) 
        : null;

    return (
     <div className={`message-bubble-wrapper ${isMe ? 'me' : 'other'} ${isGrupo ? 'grupo' : 'dm'}`}>
        {showAuthorInfo && (
            <img 
                src={authorPhoto} 
                alt={mensagem.nomeAutor} 
                className="message-author-avatar" 
                onError={(e) => { 
                    e.target.onerror = null; 
                    e.target.src = 'http://localhost:8080/images/default-avatar.png';
                }}
            />
        )}
        <div className="message-bubble">
            <div className="message-menu-trigger" onClick={() => setMenuOpen(prev => !prev)}>
                <FontAwesomeIcon icon={faEllipsisV} />
            </div>
            {menuOpen && (
                <div className="message-menu-dropdown" ref={menuRef}>
                    {isMe && (
                        <>
                            <button onClick={() => { onEditClick(mensagem); setMenuOpen(false); }}>
                                <FontAwesomeIcon icon={faPen} /> Editar
                            </button>
                            <button className="danger" onClick={() => { onDeleteClick(mensagem); setMenuOpen(false); }}>
                                <FontAwesomeIcon icon={faTrash} /> Excluir
                            </button>
                        </>
                    )}
                    {!isMe && (
                        <div className="emoji-react-list">
                            {emojis.map(emoji => (
                                <span key={emoji} className="emoji-react-item" onClick={() => handleReact(emoji)}>
                                    {emoji}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}
            {showAuthorInfo && (
                <strong className="message-author">{mensagem.nomeAutor || 'Sistema'}</strong>
            )}
            <p className="message-text">{mensagem.conteudo}</p>
            <span className="message-time">
                {hasBeenEdited && <span className="edited-indicator">(editado) </span>}
                {new Date(mensagem.dataEnvio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
        </div>
        {aggregatedReactions.length > 0 && (
            <div className="message-reactions">
                {aggregatedReactions.map(r => (
                    <span key={r.emoji} className="reaction-pill">
                        {r.emoji} {r.count > 1 && <span className="reaction-count">{r.count}</span>}
                    </span>
                ))}
            </div>
        )}
     </div>
    );
};


// --- COMPONENTE PRINCIPAL DA PÁGINA ---
const Mensagens = ({ onLogout }) => {
    // ... (estados não mudam)
    const [conversas, setConversas] = useState([]);
    const [conversaAtiva, setConversaAtiva] = useState(null); 
    const [mensagens, setMensagens] = useState([]);
    const [loadingConversas, setLoadingConversas] = useState(true);
    const [loadingMensagens, setLoadingMensagens] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [novaMensagem, setNovaMensagem] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [messageToEdit, setMessageToEdit] = useState(null);

    const { stompClient, isConnected } = useWebSocket(); 
    const messagesEndRef = useRef(null);
    const location = useLocation();
    const navigate = useNavigate();

    // ... (fetchConversas - Sem alterações, já estava correta) ...
    const fetchConversas = useCallback(async () => {
        setLoadingConversas(true);
        try {
            const projetosRes = await axios.get('http://localhost:8080/projetos/meus-projetos'); //
            const conversasGrupos = projetosRes.data.map(proj => ({
                id: proj.id, 
                nome: proj.titulo,
                tipo: 'grupo',
                avatar: proj.imagemUrl 
                    ? proj.imagemUrl 
                    : `https://placehold.co/50/30363d/8b949e?text=${proj.titulo.substring(0, 2)}`,
                ultimaMensagem: 'Chat do projeto', 
            }));
            const amigosRes = await axios.get('http://localhost:8080/api/amizades/'); //
            const validAmigos = amigosRes.data.filter(amigo => amigo && amigo.idUsuario);
            const conversasDMs = validAmigos.map(amigo => {
                const avatarUrl = getCorrectUserImageUrl(amigo.fotoPerfil, amigo.idUsuario);
                return {
                    id: amigo.idUsuario, 
                    nome: amigo.nome,
                    tipo: 'dm',
                    avatar: avatarUrl, 
                    ultimaMensagem: 'Conversa privada', 
                };
            });
            const todasConversas = [...conversasGrupos, ...conversasDMs];
            setConversas(todasConversas);
            return todasConversas; 
        } catch (error) {
            console.error("Erro ao buscar conversas:", error);
            const status = (error && typeof error === 'object' && 'response' in error && error.response) ? error.response.status : null;
            if (status === 401) { onLogout(); }
            return [];
        } finally {
            setLoadingConversas(false); 
        }
    }, [onLogout]);

    // ... (selecionarConversa - Sem alterações, já estava correta) ...
    const selecionarConversa = useCallback(async (conversa, user, atualizarUrl = true) => {
        if (!conversa) return;
        setConversaAtiva(conversa);
        setLoadingMensagens(true);
        setMensagens([]);
        setIsEditModalOpen(false);
        setMessageToEdit(null);
        if (atualizarUrl) {
            const params = new URLSearchParams();
            params.set(conversa.tipo === 'grupo' ? 'grupo' : 'dm', conversa.id);
            navigate(`/mensagens?${params.toString()}`, { replace: true });
        }
        try {
            let endpoint = '';
            if (conversa.tipo === 'grupo') {
                endpoint = `http://localhost:8080/api/chat/grupo/${conversa.id}`; //
            } else {
                if (!user) { throw new Error("Dados do usuário ainda carregando."); }
                endpoint = `http://localhost:8080/api/chat/privado/${user.id}/${conversa.id}`; //
            }
            const mensagensRes = await axios.get(endpoint);
            const msgsFormatadas = mensagensRes.data.map((msg) => ({
                ...msg,
                tipo: conversa.tipo,
            }));
            setMensagens(msgsFormatadas);
        } catch (error) {
            console.error("Erro ao buscar mensagens:", error);
            Swal.fire('Erro', 'Não foi possível carregar as mensagens.', 'error');
            setConversaAtiva(null); 
            navigate('/mensagens', { replace: true });
        } finally {
            setLoadingMensagens(false);
        }
    }, [navigate]);

    // ... (useEffect Inicial, useEffect Scroll - Sem alterações) ...
    useEffect(() => {
        document.title = 'Senai Community | Mensagens';
        const token = localStorage.getItem('authToken');
        if (!token) { onLogout(); return; }
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const fetchInitialData = async () => {
            try {
                const userRes = await axios.get('http://localhost:8080/usuarios/me'); //
                const userData = userRes.data; 
                setCurrentUser(userData); 
                const todasConversas = await fetchConversas(); 
                const params = new URLSearchParams(location.search);
                const grupoIdQuery = params.get('grupo');
                const dmIdQuery = params.get('dm');
                let chatParaAbrir = null;
                if (grupoIdQuery && todasConversas.length > 0) {
                    const idNumerico = parseInt(grupoIdQuery, 10);
                    chatParaAbrir = todasConversas.find((c) => c.id === idNumerico && c.tipo === 'grupo');
                } else if (dmIdQuery && todasConversas.length > 0) {
                    const idNumerico = parseInt(dmIdQuery, 10);
                    chatParaAbrir = todasConversas.find((c) => c.id === idNumerico && c.tipo === 'dm');
                }
                if (chatParaAbrir) {
                    selecionarConversa(chatParaAbrir, userData, false);
                } else if (grupoIdQuery || dmIdQuery) {
                    console.warn("Chat da URL não encontrado na lista de conversas.");
                    navigate('/mensagens', { replace: true }); 
                }
            } catch (error) {
                console.error("Erro ao buscar dados iniciais:", error);
                if (error.response?.status === 401) onLogout();
            }
        };
        fetchInitialData();
    }, [onLogout, location.search, fetchConversas, navigate, selecionarConversa]);

    useEffect(() => {
        if (!isEditModalOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [mensagens, isEditModalOpen]);

    // ... (useEffect WebSocket - Sem alterações) ...
    useEffect(() => {
        if (isConnected && stompClient && conversaAtiva && currentUser) {
            const topicToSubscribe = conversaAtiva.tipo === 'grupo'
                ? `/topic/grupo/${conversaAtiva.id}` 
                : `/user/queue/mensagens-privadas`; 

            const subscription = stompClient.subscribe(topicToSubscribe, (message) => {
                const payload = JSON.parse(message.body);
                const isForActiveChat = (() => {
                    if (conversaAtiva.tipo === 'grupo') {
                        return payload.grupoId === conversaAtiva.id;
                    } else {
                        const partnerId = conversaAtiva.id;
                        const isDMMessage = (payload.remetenteId === partnerId && payload.destinatarioId === currentUser.id) || 
                                            (payload.remetenteId === currentUser.id && payload.destinatarioId === partnerId);
                        return isDMMessage || payload.tipo === 'remocao';
                    }
                })();
                if (!isForActiveChat) return;
                if (payload.tipo === 'remocao') {
                    setMensagens((prev) => prev.filter(m => m.id !== payload.id));
                } else {
                    setMensagens((prev) => {
                        const existingIndex = prev.findIndex(m => m.id === payload.id);
                        const messageWithContext = { ...payload, tipo: conversaAtiva.tipo };
                        if (existingIndex > -1) {
                            return prev.map((m, index) => index === existingIndex ? messageWithContext : m);
                        } else {
                            return [...prev, messageWithContext];
                        }
                    });
                }
            });
            return () => {
                subscription.unsubscribe();
            };
        }
    }, [isConnected, stompClient, conversaAtiva, currentUser]);


    // --- FUNÇÕES DE AÇÃO ---

    // ✅✅✅ INÍCIO DA CORREÇÃO (O Erro do Vídeo) ✅✅✅
    const handleEnviarMensagem = async (e) => {
        e.preventDefault();
        if (!novaMensagem.trim() || !conversaAtiva || !currentUser || !stompClient || !isConnected) return;

        // A lógica do endpoint estava errada para grupos.
        const endpoint = conversaAtiva.tipo === 'grupo'
            ? `/app/grupo/${conversaAtiva.id}` // CORRETO
            : `/app/chat/privado/${conversaAtiva.id}`; // CORRETO

        let mensagemParaEnviar;
        if (conversaAtiva.tipo === 'grupo') {
            mensagemParaEnviar = { conteudo: novaMensagem };
        } else {
            mensagemParaEnviar = { conteudo: novaMensagem, destinatarioId: conversaAtiva.id };
        }
        setNovaMensagem(''); 

        // DEBUGGING (Como você pediu)
        console.log("Enviando mensagem para o destino:", endpoint);
        console.log("Payload:", JSON.stringify(mensagemParaEnviar));
        
        try {
            stompClient.publish({
                destination: endpoint,
                body: JSON.stringify(mensagemParaEnviar),
            });
        } catch (error) {
             console.error("Erro ao publicar mensagem via WebSocket:", error);
             Swal.fire('Erro', 'Falha ao enviar mensagem.', 'error');
             setNovaMensagem(mensagemParaEnviar.conteudo); 
        }
    };
    // ✅✅✅ FIM DA CORREÇÃO ✅✅✅

    // ... (handleDeleteMessage - Sem alterações, já usava a lógica mista correta) ...
    const handleDeleteMessage = async (mensagem) => {
        const result = await Swal.fire({
            title: 'Excluir mensagem?',
            text: "Esta ação não pode ser desfeita.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sim, excluir!',
            cancelButtonText: 'Cancelar'
        });
        if (result.isConfirmed) {
            if (conversaAtiva.tipo === 'grupo') {
                if (!stompClient || !isConnected) {
                     Swal.fire('Erro', 'Não conectado ao chat. Tente novamente.', 'error');
                     return;
                }
                try {
                    const url = `/app/grupo/${mensagem.id}/excluir`; //
                    stompClient.publish({ destination: url });
                } catch (error) {
                    console.error("Erro ao excluir mensagem (Grupo) via WebSocket:", error);
                    Swal.fire('Erro', 'Não foi possível excluir a mensagem.', 'error');
                }
            } else {
                try {
                    const url = `http://localhost:8080/api/chat/privado/${mensagem.id}`; //
                    await axios.delete(url);
                } catch (error) {
                    console.error("Erro ao excluir mensagem (DM) via REST:", error);
                    Swal.fire('Erro', 'Não foi possível excluir a mensagem.', 'error');
                }
            }
        }
    };

    const handleOpenEditModal = (mensagem) => {
        setMessageToEdit(mensagem);
        setIsEditModalOpen(true);
    };

    // ... (handleSaveEdit - Sem alterações, já usava a lógica mista correta) ...
    const handleSaveEdit = async (mensagem, novoConteudo) => {
        if (conversaAtiva.tipo === 'grupo') {
            // GRUPO: Usa WebSocket
            const url = `/app/grupo/${mensagem.id}/editar`; //
            if (!stompClient || !isConnected) {
                Swal.fire('Erro', 'Não conectado ao chat. Tente novamente.', 'error');
                throw new Error("Cliente STOMP não conectado");
            }
            try {
                stompClient.publish({
                    destination: url,
                    body: novoConteudo, 
                });
            } catch (error) {
                console.error("Erro ao editar mensagem (Grupo) via WebSocket:", error);
                Swal.fire('Erro', 'Não foi possível salvar a edição.', 'error');
                throw error; 
            }
        } else {
            // DM: Usa REST (axios)
            try {
                const url = `http://localhost:8080/api/chat/privado/${mensagem.id}`; //
                await axios.put(url, { conteudo: novoConteudo });
            } catch (error) {
                 console.error("Erro ao editar mensagem (DM) via REST:", error);
                 const errorMsg = error.response?.data?.message || 'Não foi possível salvar a edição.';
                 Swal.fire('Erro', errorMsg, 'error');
                 throw error;
            }
        }
    };

    const handleSendReaction = (mensagem, emoji) => {
        // ... (Nenhuma alteração aqui) ...
        console.log(`Reagindo com ${emoji} à mensagem ID ${mensagem.id}`);
        setMensagens(prev => prev.map(m => 
            m.id === mensagem.id 
                ? { ...m, reactions: [...(m.reactions || []), emoji] }
                : m
        ));
    };

    const handleVoltarParaLista = () => {
        setConversaAtiva(null);
        navigate('/mensagens', { replace: true }); 
    };

    return (
        <div className="layout-mensagens">
            {/* ... (Renderização - Sem alterações) ... */}
            <Topbar onLogout={onLogout} currentUser={currentUser} />
            <div className="container container-chat">
                <Sidebar currentUser={currentUser}/>
                <aside className={`chat-conversations-sidebar ${conversaAtiva ? 'hidden-mobile' : ''}`}>
                    <div className="conv-sidebar-header"><h2>Mensagens</h2></div>
                    <div className="conv-search">
                         <FontAwesomeIcon icon={faSearch} />
                         <input type="text" placeholder="Pesquisar conversas..." />
                    </div>
                    <div className="conversations-list">
                        {loadingConversas ? <p className="loading-state"><FontAwesomeIcon icon={faSpinner} spin /> Carregando...</p> :
                            conversas.length > 0 ? (
                                conversas.map(c => (
                                    <ConversationListItem
                                        key={`${c.tipo}-${c.id}`}
                                        conversa={c}
                                        ativa={conversaAtiva?.id === c.id && conversaAtiva?.tipo === c.tipo}
                                        onClick={() => selecionarConversa(c, currentUser)}
                                    />
                                ))
                            ) : <p className="empty-state">Nenhuma conversa encontrada.</p>
                        }
                    </div>
                </aside>
                <main className={`chat-main-area ${!conversaAtiva ? 'hidden-mobile' : ''}`}>
                   {conversaAtiva ? (
                        <div className="chat-active-card">
                            <header className="chat-header-area">
                                <button className="chat-back-btn" onClick={handleVoltarParaLista}>
                                    <FontAwesomeIcon icon={faArrowLeft} />
                                </button>
                                <div className="chat-header-info">
                                    <img 
                                        src={conversaAtiva.avatar} 
                                        className="avatar" 
                                        alt="avatar" 
                                        onError={(e) => { 
                                            e.target.onerror = null; 
                                            if (conversaAtiva.tipo === 'grupo') {
                                                e.target.src = `https://placehold.co/50/30363d/8b949e?text=${conversaAtiva.nome.substring(0, 2)}`;
                                            } else {
                                                e.target.src = 'http://localhost:8080/images/default-avatar.png';
                                            }
                                        }}
                                    />
                                    <h3>{conversaAtiva.nome}</h3>
                                </div>
                                <button className="chat-options-btn"><FontAwesomeIcon icon={faEllipsisV} /></button>
                            </header>
                            <div className="chat-messages-area">
                                {loadingMensagens ? <p className="loading-state"><FontAwesomeIcon icon={faSpinner} spin /> Carregando...</p> :
                                    mensagens.length > 0 ? (
                                        mensagens.map((msg, index) => (
                                            <MessageBubble
                                                key={msg.id || index} 
                                                mensagem={msg}
                                                isMe={msg.autorId === currentUser?.id || msg.remetenteId === currentUser?.id}
                                                onDeleteClick={handleDeleteMessage}
                                                onEditClick={handleOpenEditModal}
                                                onReactClick={handleSendReaction}
                                                reactions={msg.reactions || []} 
                                            />
                                        ))
                                    ) : (
                                        <p className="empty-state">Ainda não há mensagens. Diga oi!</p>
                                    )
                                }
                                <div ref={messagesEndRef} />
                            </div>
                            <form className="chat-input-area" onSubmit={handleEnviarMensagem}>
                                <input
                                    type="text"
                                    name="messageInput"
                                    placeholder="Digite uma mensagem..."
                                    value={novaMensagem}
                                    onChange={(e) => setNovaMensagem(e.target.value)}
                                    autoComplete="off"
                                    disabled={!isConnected}
                                />
                                <button type="submit" disabled={!novaMensagem.trim() || !isConnected}><FontAwesomeIcon icon={faPaperPlane} /></button>
                            </form>
                        </div>
                   ) : (
                       <div className="empty-chat-view">
                           <svg width="150" height="150" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{opacity: 0.3, marginBottom: '1.5rem', color: 'var(--text-tertiary)'}}>
                                <path d="M16.8 13.4147C17.411 13.4147 17.957 13.1417 18.441 12.6577C18.925 12.1737 19.199 11.6277 19.199 11.0157C19.199 10.4037 18.925 9.85873 18.441 9.37373C17.957 8.88973 17.411 8.61573 16.8 8.61573H7.199C6.588 8.61573 6.042 8.88973 5.558 9.37373C5.074 9.85873 4.799 10.4037 4.799 11.0157C4.799 11.6277 5.074 12.1737 5.558 12.6577C6.042 13.1417 6.588 13.4147 7.199 13.4147H16.8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M12 17.0147H7.199C6.588 17.0147 6.042 16.7417 5.558 16.2577C5.074 15.7737 4.799 15.2277 4.799 14.6157C4.799 14.0037 5.074 13.4587 5.558 12.9737C6.042 12.4897 6.588 12.2157 7.199 12.2157H12" stroke="currentColor" strokeWidth="1.D5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M21.6 11.0147V16.6147C21.6 18.3117 20.916 19.5097 19.548 20.2087C18.18 20.9077 16.584 21.0147 14.76 20.5287L11.7 19.6417C8.748 18.8417 5.999 18.8417 3 19.6417L1.8 19.9867C1.487 20.0767 1.156 20.0207 0.88 19.8317C0.604 19.6427 0.466 19.3497 0.466 18.9527V6.01473C0.466 4.31773 1.15 3.11973 2.518 2.42073C3.886 1.72173 5.482 1.61473 7.306 2.10073L10.366 2.98773C13.318 3.78773 16.067 3.78773 19.019 2.98773L20.219 2.64273C20.532 2.55273 20.863 2.59973 21.139 2.78873C21.415 2.97773 21.553 3.27073 21.553 3.66773L21.6 11.0147Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                           </svg>
                           <h3>Selecione uma conversa</h3>
                           <p>Escolha um amigo ou grupo para começar a conversar.</p>
                       </div>
                   )}
                </main>
            </div>

            {isEditModalOpen && messageToEdit && (
                <EditarMensagemModal
                    mensagem={messageToEdit}
                    onSave={handleSaveEdit}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setMessageToEdit(null);
                    }}
                />
            )}
        </div>
    );
};

export default Mensagens;