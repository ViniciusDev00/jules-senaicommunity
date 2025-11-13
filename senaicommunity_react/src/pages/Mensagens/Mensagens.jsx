// src/pages/Mensagens/Mensagens.jsx (CÓDIGO FINAL E COMPLETO)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import Topbar from '../../components/Layout/Topbar';
import Sidebar from '../../components/Layout/Sidebar';
import Swal from 'sweetalert2';
import './Mensagens.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faPaperPlane, faEllipsisV, faSearch, faSpinner, 
    faArrowLeft, faTrash, faPen, faTimes 
} from '@fortawesome/free-solid-svg-icons';

import { useLocation, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../../contexts/WebSocketContext.tsx'; 

// --- COMPONENTE CONVERSATIONListItem ---
const ConversationListItem = ({ conversa, ativa, onClick }) => (
    <div
        className={`convo-list-item ${ativa ? 'selected' : ''}`}
        onClick={onClick}
    >
        <img src={conversa.avatar} className="avatar" alt="avatar" />
        <div className="convo-info">
            <div className="convo-title">{conversa.nome}</div>
            <div className="convo-snippet">{conversa.ultimaMensagem || 'Nenhuma mensagem ainda'}</div>
        </div>
    </div>
);

// --- COMPONENTE MessageBubble ---
const MessageBubble = ({ mensagem, isMe, onDeleteClick, onEditClick }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    // Fecha o menu se clicar fora dele
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    // Verifica se a data de edição é diferente da data de envio
    const hasBeenEdited = mensagem.dataEdicao && new Date(mensagem.dataEnvio).getTime() !== new Date(mensagem.dataEdicao).getTime();

    return (
     <div className={`message-bubble-wrapper ${isMe ? 'me' : 'other'}`}>
        <div className="message-bubble">
            
            {/* Ícone de Menu (só aparece para mim) */}
            {isMe && (
                <div className="message-menu-trigger" onClick={() => setMenuOpen(prev => !prev)}>
                    <FontAwesomeIcon icon={faEllipsisV} />
                </div>
            )}

            {/* Menu Dropdown */}
            {menuOpen && isMe && (
                <div className="message-menu-dropdown" ref={menuRef}>
                    <button onClick={() => { onEditClick(mensagem); setMenuOpen(false); }}>
                        <FontAwesomeIcon icon={faPen} /> Editar
                    </button>
                    <button className="danger" onClick={() => { onDeleteClick(mensagem); setMenuOpen(false); }}>
                        <FontAwesomeIcon icon={faTrash} /> Excluir
                    </button>
                </div>
            )}

            {/* Conteúdo da Mensagem */}
            {!isMe && mensagem.tipo === 'grupo' && (
                <strong className="message-author">{mensagem.nomeAutor || 'Sistema'}</strong>
            )}
            <p className="message-text">{mensagem.conteudo}</p>
            <span className="message-time">
                {hasBeenEdited && <span className="edited-indicator">(editado) </span>}
                {new Date(mensagem.dataEnvio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
        </div>
    </div>
    );
};


// --- NOVO COMPONENTE: MessageEditForm ---
const MessageEditForm = ({ mensagem, onSave, onCancel }) => {
    const [editedContent, setEditedContent] = useState(mensagem.conteudo);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editedContent.trim() && editedContent.trim() !== mensagem.conteudo) {
            onSave(mensagem, editedContent.trim());
        } else {
            onCancel();
        }
    };

    return (
        <div className="message-bubble-wrapper me">
            <form className="message-edit-form" onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Escape' && onCancel()}
                />
                <div className="edit-form-actions">
                    <button type="button" className="btn-cancel" onClick={onCancel}>
                        <FontAwesomeIcon icon={faTimes} /> Cancelar
                    </button>
                    <button type="submit" className="btn-save" disabled={!editedContent.trim()}>
                        <FontAwesomeIcon icon={faPen} /> Salvar
                    </button>
                </div>
            </form>
        </div>
    );
};


// --- COMPONENTE PRINCIPAL DA PÁGINA (CÓDIGO FINAL CORRIGIDO) ---
const Mensagens = ({ onLogout }) => {
    const [conversas, setConversas] = useState([]);
    const [conversaAtiva, setConversaAtiva] = useState(null); 
    const [mensagens, setMensagens] = useState([]);
    const [loadingConversas, setLoadingConversas] = useState(true);
    const [loadingMensagens, setLoadingMensagens] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [novaMensagem, setNovaMensagem] = useState('');
    
    const [editingMessage, setEditingMessage] = useState(null);

    const { stompClient, isConnected } = useWebSocket(); 
    const messagesEndRef = useRef(null);

    const location = useLocation();
    const navigate = useNavigate();

    // --- FUNÇÃO DE BUSCA DE DADOS REAIS ---
    const fetchConversas = useCallback(async () => {
        setLoadingConversas(true);
        try {
            const projetosRes = await axios.get('http://localhost:8080/projetos/meus-projetos');
            const conversasGrupos = projetosRes.data.map(proj => ({
                id: proj.id, 
                nome: proj.titulo,
                tipo: 'grupo',
                avatar: proj.imagemUrl
                    ? `http://localhost:8080/projetos/imagens/${proj.imagemUrl}` 
                    : `https://placehold.co/50/30363d/8b949e?text=${proj.titulo.substring(0, 2)}`,
                ultimaMensagem: 'Chat do projeto', 
            }));

            const amigosRes = await axios.get('http://localhost:8080/api/amizades/'); 
            const validAmigos = amigosRes.data.filter(amigo => amigo && amigo.idUsuario);

            const conversasDMs = validAmigos.map(amigo => ({
                id: amigo.idUsuario, 
                nome: amigo.nome,
                tipo: 'dm',
                avatar: amigo.fotoPerfil ? `http://localhost:8080${amigo.fotoPerfil}` : `https://i.pravatar.cc/50?u=${amigo.idUsuario}`,
                ultimaMensagem: 'Conversa privada', 
            }));

            const todasConversas = [...conversasGrupos, ...conversasDMs];
            setConversas(todasConversas);
            return todasConversas; 

        } catch (error) {
            console.error("Erro ao buscar conversas:", error);
            const status = (error && typeof error === 'object' && 'response' in error && error.response) ? error.response.status : null;
            if (status === 401) {
                onLogout();
            }
            return [];
        } finally {
            setLoadingConversas(false); 
        }
    }, [onLogout]);

    // --- FUNÇÃO DE SELECIONAR CONVERSA ---
    const selecionarConversa = useCallback(async (conversa, user, atualizarUrl = true) => {
        if (!conversa) return;

        setConversaAtiva(conversa);
        setLoadingMensagens(true);
        setMensagens([]);
        setEditingMessage(null); // Cancela edição ao trocar de chat

        if (atualizarUrl) {
            const params = new URLSearchParams();
            params.set(conversa.tipo === 'grupo' ? 'grupo' : 'dm', conversa.id);
            navigate(`/mensagens?${params.toString()}`, { replace: true });
        }

        try {
            let endpoint = '';
            if (conversa.tipo === 'grupo') {
                endpoint = `http://localhost:8080/api/chat/grupo/${conversa.id}`;
            } else {
                if (!user) {
                     throw new Error("Dados do usuário ainda carregando.");
                }
                endpoint = `http://localhost:8080/api/chat/privado/${user.id}/${conversa.id}`;
            }

            const mensagensRes = await axios.get(endpoint);

            const msgsFormatadas = mensagensRes.data.map((msg) => ({
                ...msg,
                tipo: conversa.tipo
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

    // --- useEffect PRINCIPAL (Lógica de inicialização) ---
    useEffect(() => {
        document.title = 'Senai Community | Mensagens';
        const token = localStorage.getItem('authToken');
        if (!token) { onLogout(); return; }
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        const fetchInitialData = async () => {
            try {
                const userRes = await axios.get('http://localhost:8080/usuarios/me');
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

    // Efeito para rolar para a última mensagem
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [mensagens]);

    // Efeito para o WebSocket (Escuta de mensagens em tempo real)
    useEffect(() => {
        if (isConnected && stompClient && conversaAtiva && currentUser) {
            
            // 1. Tópico de Inscrição: Direto para o grupo OU a fila privada do usuário
            const topicToSubscribe = conversaAtiva.tipo === 'grupo'
                ? `/topic/grupo/${conversaAtiva.id}` 
                : `/user/queue/mensagens-privadas`; 

            const subscription = stompClient.subscribe(topicToSubscribe, (message) => {
                const payload = JSON.parse(message.body);
                
                // 2. Filtro de Conversa Ativa (CRÍTICO)
                const isForActiveChat = (() => {
                    if (conversaAtiva.tipo === 'grupo') {
                        // GRUPO: A mensagem deve ter o ID do grupo ativo.
                        return payload.grupoId === conversaAtiva.id;
                    } else {
                        // DM: A mensagem deve envolver o partnerId e o currentUser.id
                        const partnerId = conversaAtiva.id;

                        // Verifica se é uma mensagem (com remetente/destinatário) OU uma remoção
                        const isDMMessage = (payload.remetenteId === partnerId && payload.destinatarioId === currentUser.id) || 
                                            (payload.remetenteId === currentUser.id && payload.destinatarioId === partnerId);
                        
                        return isDMMessage || payload.tipo === 'remocao';
                    }
                })();

                if (!isForActiveChat) return;

                // 3. Atualização da UI
                if (payload.tipo === 'remocao') {
                    // Remove a mensagem
                    setMensagens((prev) => prev.filter(m => m.id !== payload.id));
                
                } else {
                    // É uma nova mensagem ou edição (payload contém o DTO completo atualizado)
                    setMensagens((prev) => {
                        const existingIndex = prev.findIndex(m => m.id === payload.id);
                        // Adiciona 'tipo' para que o MessageBubble saiba se é grupo ou dm
                        const messageWithContext = { ...payload, tipo: conversaAtiva.tipo };
                        
                        if (existingIndex > -1) {
                            // Edição
                            return prev.map((m, index) => index === existingIndex ? messageWithContext : m);
                        } else {
                            // Nova mensagem
                            return [...prev, messageWithContext];
                        }
                    });
                }
            });

            return () => {
                // Remove a inscrição ao desmontar ou trocar de chat
                subscription.unsubscribe();
            };
        }
    }, [isConnected, stompClient, conversaAtiva, currentUser]);


    // --- FUNÇÕES DE AÇÃO ---

    const handleEnviarMensagem = async (e) => {
        e.preventDefault();
        if (!novaMensagem.trim() || !conversaAtiva || !currentUser || !stompClient || !isConnected) return;

        // Endpoint de envio (DM/GRUPO)
        const endpoint = conversaAtiva.tipo === 'grupo'
            ? `/app/chat/grupo/${conversaAtiva.id}`
            : `/app/chat/privado/${conversaAtiva.id}`;

        let mensagemParaEnviar;

        if (conversaAtiva.tipo === 'grupo') {
            // MensagemGrupoEntradaDTO precisa só de 'conteudo'
            mensagemParaEnviar = {
                conteudo: novaMensagem,
            };
        } else {
            // MensagemPrivadaEntradaDTO precisa de 'conteudo' e 'destinatarioId'
            mensagemParaEnviar = {
                conteudo: novaMensagem,
                destinatarioId: conversaAtiva.id, 
            };
        }
        
        setNovaMensagem(''); // Limpa o input imediatamente

        try {
            // Publica a mensagem via WebSocket. O servidor vai ecoar a mensagem salva de volta.
            stompClient.publish({
                destination: endpoint,
                body: JSON.stringify(mensagemParaEnviar),
            });
            
        } catch (error) {
             console.error("Erro ao publicar mensagem via WebSocket:", error);
             Swal.fire('Erro', 'Falha ao enviar mensagem.', 'error');
             // Se houver falha, restaurar o texto no input
             setNovaMensagem(mensagemParaEnviar.conteudo); 
        }
    };

    // ✅ Excluir Mensagem (USANDO API REST DO BACKEND)
    const handleDeleteMessage = async (mensagem) => {
        const url = conversaAtiva.tipo === 'grupo'
            ? `http://localhost:8080/api/chat/grupo/${mensagem.id}`
            : `http://localhost:8080/api/chat/privado/${mensagem.id}`;

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
            try {
                // DELETE REST. O backend envia a notificação 'remocao' via WebSocket.
                await axios.delete(url);
            } catch (error) {
                console.error("Erro ao excluir mensagem:", error);
                const msg = error.response?.data?.message || 'Não foi possível excluir a mensagem.';
                Swal.fire('Erro', msg, 'error');
            }
        }
    };

    // ✅ Salvar Edição (USANDO API REST DO BACKEND)
    const handleSaveEdit = async (mensagem, novoConteudo) => {
        const url = conversaAtiva.tipo === 'grupo'
            ? `http://localhost:8080/api/chat/grupo/${mensagem.id}`
            : `http://localhost:8080/api/chat/privado/${mensagem.id}`;
        
        try {
            // PUT REST. O backend envia o DTO atualizado via WebSocket.
            await axios.put(url, novoConteudo, {
                headers: { 'Content-Type': 'text/plain' } // O backend espera texto puro
            });
            setEditingMessage(null); // Fecha o formulário de edição
        } catch (error) {
            console.error("Erro ao editar mensagem:", error);
            const msg = error.response?.data?.message || 'Não foi possível salvar a edição.';
            Swal.fire('Erro', msg, 'error');
        }
    };


    // Função para voltar para a lista no mobile
    const handleVoltarParaLista = () => {
        setConversaAtiva(null);
        navigate('/mensagens', { replace: true }); 
    };

    return (
        <div className="layout-mensagens">
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
                                    <img src={conversaAtiva.avatar} className="avatar" alt="avatar" />
                                    <h3>{conversaAtiva.nome}</h3>
                                </div>
                                <button className="chat-options-btn"><FontAwesomeIcon icon={faEllipsisV} /></button>
                            </header>

                            <div className="chat-messages-area">
                                {loadingMensagens ? <p className="loading-state"><FontAwesomeIcon icon={faSpinner} spin /> Carregando...</p> :
                                    mensagens.length > 0 ? (
                                        mensagens.map((msg, index) => (
                                            (editingMessage && editingMessage.id === msg.id) ? (
                                                <MessageEditForm
                                                    key={`edit-${msg.id}`}
                                                    mensagem={msg}
                                                    onSave={handleSaveEdit}
                                                    onCancel={() => setEditingMessage(null)}
                                                />
                                            ) : (
                                                <MessageBubble
                                                    key={msg.id || index} 
                                                    mensagem={msg}
                                                    isMe={msg.autorId === currentUser?.id || msg.remetenteId === currentUser?.id}
                                                    onDeleteClick={handleDeleteMessage}
                                                    onEditClick={(msg) => setEditingMessage(msg)}
                                                />
                                            )
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
                                <path d="M12 17.0147H7.199C6.588 17.0147 6.042 16.7417 5.558 16.2577C5.074 15.7737 4.799 15.2277 4.799 14.6157C4.799 14.0037 5.074 13.4587 5.558 12.9737C6.042 12.4897 6.588 12.2157 7.199 12.2157H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M21.6 11.0147V16.6147C21.6 18.3117 20.916 19.5097 19.548 20.2087C18.18 20.9077 16.584 21.0147 14.76 20.5287L11.7 19.6417C8.748 18.8417 5.999 18.8417 3 19.6417L1.8 19.9867C1.487 20.0767 1.156 20.0207 0.88 19.8317C0.604 19.6427 0.466 19.3497 0.466 18.9527V6.01473C0.466 4.31773 1.15 3.11973 2.518 2.42073C3.886 1.72173 5.482 1.61473 7.306 2.10073L10.366 2.98773C13.318 3.78773 16.067 3.78773 19.019 2.98773L20.219 2.64273C20.532 2.55273 20.863 2.59973 21.139 2.78873C21.415 2.97773 21.553 3.27073 21.553 3.66773L21.6 11.0147Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                           </svg>
                           <h3>Selecione uma conversa</h3>
                           <p>Escolha um amigo ou grupo para começar a conversar.</p>
                       </div>
                   )}
                </main>
            </div>
        </div>
    );
};

export default Mensagens;