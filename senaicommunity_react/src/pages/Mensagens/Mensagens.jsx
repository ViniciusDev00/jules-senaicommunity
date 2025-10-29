// src/pages/Mensagens/Mensagens.jsx (COMPLETO E CORRIGIDO PARA PARSING E PERSISTÊNCIA)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import Topbar from '../../components/Layout/Topbar';
import Sidebar from '../../components/Layout/Sidebar';
import Swal from 'sweetalert2';
import './Mensagens.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faEllipsisV, faSearch, faSpinner, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../../contexts/WebSocketContext.tsx'; // Assumindo .tsx

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
const MessageBubble = ({ mensagem, isMe }) => (
     <div className={`message-bubble-wrapper ${isMe ? 'me' : 'other'}`}>
        <div className="message-bubble">
            {/* Mostra o nome do autor se for um chat de grupo e a msg não for minha */}
            {!isMe && mensagem.tipo === 'grupo' && (
                <strong className="message-author">{mensagem.nomeAutor || 'Sistema'}</strong>
            )}
            <p className="message-text">{mensagem.conteudo}</p>
            <span className="message-time">
                {new Date(mensagem.dataEnvio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
        </div>
    </div>
);

// --- COMPONENTE PRINCIPAL DA PÁGINA ---
const Mensagens = ({ onLogout }) => {
    const [conversas, setConversas] = useState([]);
    const [conversaAtiva, setConversaAtiva] = useState(null); 
    const [mensagens, setMensagens] = useState([]);
    const [loadingConversas, setLoadingConversas] = useState(true);
    const [loadingMensagens, setLoadingMensagens] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [novaMensagem, setNovaMensagem] = useState('');
    const { stompClient, isConnected } = useWebSocket() || {};
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

            const amigosRes = await axios.get('http://localhost:8080/api/amizades/amigos'); 
            const conversasDMs = amigosRes.data.map(amigo => ({
                id: amigo.usuario.id, 
                nome: amigo.usuario.nome,
                tipo: 'dm',
                avatar: amigo.usuario.fotoPerfil ? `http://localhost:8080${amigo.usuario.fotoPerfil}` : `https://i.pravatar.cc/50?u=${amigo.usuario.id}`,
                ultimaMensagem: 'Conversa privada', 
            }));

            const todasConversas = [...conversasGrupos, ...conversasDMs];
            setConversas(todasConversas);
            return todasConversas; 

        } catch (error) {
            console.error("Erro ao buscar conversas:", error);
            const status = (error && typeof error === 'object' && 'response' in error && (error as any).response) ? (error as any).response.status : null;
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

        if (atualizarUrl) {
            const params = new URLSearchParams();
            params.set(conversa.tipo, conversa.id);
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

            const msgsFormatadas = mensagensRes.data.map((msg: any) => ({
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
                    chatParaAbrir = todasConversas.find((c: any) => c.id === idNumerico && c.tipo === 'grupo');
                } else if (dmIdQuery && todasConversas.length > 0) {
                    const idNumerico = parseInt(dmIdQuery, 10);
                    chatParaAbrir = todasConversas.find((c: any) => c.id === idNumerico && c.tipo === 'dm');
                }

                if (chatParaAbrir) {
                    selecionarConversa(chatParaAbrir, userData, false);
                } else if (grupoIdQuery || dmIdQuery) {
                    console.warn("Chat da URL não encontrado na lista de conversas.");
                    navigate('/mensagens', { replace: true }); 
                }

            } catch (error) {
                console.error("Erro ao buscar dados iniciais:", error);
                if ((error as any).response?.status === 401) onLogout();
            }
        };

        fetchInitialData();
    }, [onLogout, location.search, fetchConversas, navigate, selecionarConversa]);

    // Efeito para rolar para a última mensagem
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [mensagens]);

    // Efeito para o WebSocket
    useEffect(() => {
        if (isConnected && stompClient && conversaAtiva && currentUser) {
            // Tópico que o Backend USA no MensagemGrupoService
            const topic = conversaAtiva.tipo === 'grupo'
                ? `/topic/grupo/${conversaAtiva.id}` 
                : `/topic/chat/privado/${currentUser.id}/${conversaAtiva.id}`;

            const subscription = stompClient.subscribe(topic, (message) => {
                const newMessage = JSON.parse(message.body);
                
                // Adiciona a mensagem recebida (que já vem salva com ID do Backend)
                setMensagens((prevMessages) => [...prevMessages, newMessage]);
            });

            return () => {
                subscription.unsubscribe();
            };
        }
    }, [isConnected, stompClient, conversaAtiva, currentUser]);

    // Função de enviar (Removida a atualização Otimista)
    const handleEnviarMensagem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!novaMensagem.trim() || !conversaAtiva || !currentUser || !stompClient || !isConnected) return;

        const endpoint = conversaAtiva.tipo === 'grupo'
            ? `/app/chat/grupo/${conversaAtiva.id}`
            : `/app/chat/privado/${conversaAtiva.id}`;

        const mensagemParaEnviar = {
            conteudo: novaMensagem,
            dataEnvio: new Date().toISOString(),
        };

        try {
            stompClient.publish({
                destination: endpoint,
                body: JSON.stringify(mensagemParaEnviar),
            });
            
            // REMOÇÃO DA ATUALIZAÇÃO OPTIMISTA: O WebSocket trará a mensagem salva
            setNovaMensagem('');

        } catch (error) {
             console.error("Erro ao publicar mensagem via WebSocket:", error);
             Swal.fire('Erro', 'Falha ao enviar mensagem.', 'error');
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
                                        ativa={conversaAtiva?.id === c.id}
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
                                            <MessageBubble
                                                key={msg.id || index} 
                                                mensagem={msg}
                                                isMe={msg.autorId === currentUser?.id}
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
                                />
                                <button type="submit" disabled={!novaMensagem.trim()}><FontAwesomeIcon icon={faPaperPlane} /></button>
                            </form>
                        </div>
                   ) : (
                       <div className="empty-chat-view">
                           <svg width="150" height="150" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{opacity: 0.3, marginBottom: '1.5rem', color: 'var(--text-tertiary)'}}>
                                <path d="M16.8 13.4147C17.411 13.4147 17.957 13.1417 18.441 12.6577C18.925 12.1737 19.199 11.6277 19.199 11.0157C19.199 10.4037 18.925 9.85873 18.441 9.37373C17.957 8.88973 17.411 8.61573 16.8 8.61573H7.199C6.588 8.61573 6.042 8.88973 5.558 9.37373C5.074 9.85873 4.799 10.4037 4.799 11.0157C4.799 11.6277 5.074 12.1737 5.558 12.6577C6.042 13.1417 6.588 13.4147 7.199 13.4147H16.8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M12 17.0147H7.199C6.588 17.0147 6.042 16.7417 5.558 16.2577C5.074 15.7737 4.799 15.2277 4.799 14.6157C4.799 14.0037 5.074 13.4587 5.558 12.9737C6.042 12.4897 6.588 12.2157 7.199 12.2157H12" stroke="currentColor" strokeWidth="1.s5" strokeLinecap="round" strokeLinejoin="round"/>
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