// src/pages/MinhasConexoes/MinhasConexoes.jsx (COM CONFIRMAÇÃO DE EXCLUSÃO)

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Topbar from '../../components/Layout/Topbar';
import Sidebar from '../../components/Layout/Sidebar';
import RightSidebar from '../../pages/Principal/RightSidebar'; 
import Swal from 'sweetalert2';
import './MinhasConexoes.css'; 
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faTimes, faPaperPlane, faUserMinus, faClockRotateLeft } from '@fortawesome/free-solid-svg-icons';
import { Link, useNavigate } from 'react-router-dom'; 

// --- COMPONENTE ConexaoCard ---
// (Este componente não precisa de alterações)
const ConexaoCard = ({ item, type, onAction, onGoToChat }) => {
    
    let idUsuario, nome, foto;

    if (type === 'enviado') {
        idUsuario = item.idSolicitado;
        nome = item.nomeSolicitado;
        foto = item.fotoPerfilSolicitado;
    } else if (type === 'recebido') {
        idUsuario = item.idSolicitante; 
        nome = item.nomeSolicitante;
        foto = item.fotoPerfilSolicitante;
    } else { // type === 'amigo'
        idUsuario = item.idUsuario; 
        nome = item.nome;
        foto = item.fotoPerfil; 
    }

    let fotoUrl;
    const fallbackAvatar = `https://i.pravatar.cc/80?u=${idUsuario || item.idAmizade}`;
    
    if (!foto) {
        fotoUrl = fallbackAvatar;
    } else if (foto.startsWith('http')) {
        fotoUrl = foto; // URL completa (ex: Cloudinary)
    } else if (foto.startsWith('/api/arquivos/') || foto.startsWith('/images/')) {
        fotoUrl = `http://localhost:8080${foto}`;
    } else {
        fotoUrl = `http://localhost:8080/api/arquivos/${foto}`; //
    }

    const handleActionClick = (action) => {
        onAction(item.idAmizade, action);
    };

    return (
        <article className="conexao-card">
             <Link to={`/perfil/${idUsuario}`} className="conexao-card-link">
                <img 
                    src={fotoUrl} 
                    alt={`Foto de ${nome}`} 
                    className="conexao-avatar"
                    onError={(e) => { e.target.onerror = null; e.target.src = fallbackAvatar; }} // Fallback
                />
                <h4 className="conexao-nome">{nome}</h4>
            </Link>
            <div className="conexao-actions">
                {type === 'recebido' && <>
                    <button className="btn btn-primary btn-accept" onClick={() => handleActionClick('aceitar')}>
                        <FontAwesomeIcon icon={faCheck} /> Aceitar
                    </button>
                    <button className="btn btn-secondary btn-decline" onClick={() => handleActionClick('recusar')}>
                        <FontAwesomeIcon icon={faTimes} /> Recusar
                    </button>
                </>}
                {type === 'enviado' && <button className="btn btn-secondary btn-cancel" onClick={() => handleActionClick('cancelar')}>
                     <FontAwesomeIcon icon={faClockRotateLeft} /> Cancelar
                </button>}
                {type === 'amigo' && <>
                    <button className="btn btn-secondary btn-message" onClick={() => onGoToChat(idUsuario)}>
                        <FontAwesomeIcon icon={faPaperPlane} /> Mensagem
                    </button>
                    <button className="btn btn-danger btn-remove" onClick={() => handleActionClick('remover')}>
                        <FontAwesomeIcon icon={faUserMinus} /> Remover
                    </button>
                </>}
            </div>
        </article>
    );
};

// --- COMPONENTE PRINCIPAL DA PÁGINA ---
const MinhasConexoes = ({ onLogout }) => {
    const [recebidos, setRecebidos] = useState([]);
    const [enviados, setEnviados] = useState([]);
    const [amigos, setAmigos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null); 
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    const navigate = useNavigate();

    const fetchData = async () => {
        // ... (fetchData não precisa de alterações) ...
        const token = localStorage.getItem('authToken');
        if (!token) {
            onLogout();
            return;
        }
        try {
             axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            const [userRes, resRecebidos, resEnviados, resAmigos] = await Promise.all([
                 axios.get('http://localhost:8080/usuarios/me'),
                axios.get('http://localhost:8080/api/amizades/pendentes'),
                axios.get('http://localhost:8080/api/amizades/enviadas'),
                axios.get('http://localhost:8080/api/amizades/') 
            ]);
            setCurrentUser(userRes.data);
            setRecebidos(resRecebidos.data); 
            setEnviados(resEnviados.data); 
            setAmigos(resAmigos.data); 
        } catch (error) {
            console.error("Erro ao buscar conexões:", error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                 onLogout(); 
            }
        } finally {
            setLoading(false); 
        }
    };

    useEffect(() => {
        document.title = 'Senai Community | Conexões';
        setLoading(true); 
        fetchData();
    }, [onLogout]);

    // ✅✅✅ INÍCIO DA ATUALIZAÇÃO ✅✅✅
    // A função handleAction foi modificada
    const handleAction = async (amizadeId, action) => {
        let url = '';
        let method = 'post';

        // 1. Define a URL e o método baseado na ação
        switch(action) {
            case 'aceitar':
                url = `http://localhost:8080/api/amizades/aceitar/${amizadeId}`;
                method = 'post';
                break;
            case 'recusar':
            case 'cancelar':
            case 'remover': 
                 url = `http://localhost:8080/api/amizades/recusar/${amizadeId}`; //
                 method = 'delete';
                 break;
            default:
                return; // Ação desconhecida
        }

        // 2. SE A AÇÃO FOR 'REMOVER', MOSTRA O POP-UP DE CONFIRMAÇÃO
        if (action === 'remover') {
            Swal.fire({
                title: 'Você tem certeza?',
                text: "A amizade será desfeita e você não poderá reverter isso!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33', // Vermelho
                cancelButtonColor: 'var(--bg-quaternary)', // Cinza do tema
                confirmButtonText: 'Sim, remover!',
                cancelButtonText: 'Cancelar'
            }).then(async (result) => {
                // 3. Se o usuário confirmar...
                if (result.isConfirmed) {
                    try {
                        // Executa a requisição de remoção
                        await axios({ method, url });
                        // Atualiza o estado local
                        setAmigos(prev => prev.filter(a => a.idAmizade !== amizadeId));
                        
                        Swal.fire(
                            'Removido!',
                            'A conexão foi desfeita.',
                            'success'
                        );
                    } catch (error) {
                        console.error(`Erro ao ${action} amizade:`, error);
                        Swal.fire('Erro', `Não foi possível executar a ação '${action}'. Tente novamente.`, 'error');
                    }
                }
            });
        } else {
            // 4. PARA AS OUTRAS AÇÕES (aceitar, recusar, cancelar), executa direto
            try {
                await axios({ method, url });

                // Atualização otimista do estado
                if (action === 'aceitar') {
                     const aceito = recebidos.find(r => r.idAmizade === amizadeId);
                     if (aceito) {
                         const novoAmigo = {
                             idAmizade: aceito.idAmizade,
                             idUsuario: aceito.idSolicitante,
                             nome: aceito.nomeSolicitante,
                             fotoPerfil: aceito.fotoPerfilSolicitante,
                             email: '...', 
                             online: true 
                         };
                         setAmigos(prev => [...prev, novoAmigo]);
                         setRecebidos(prev => prev.filter(r => r.idAmizade !== amizadeId));
                     }
                } else if (action === 'recusar') {
                     setRecebidos(prev => prev.filter(r => r.idAmizade !== amizadeId));
                } else if (action === 'cancelar') {
                     setEnviados(prev => prev.filter(e => e.idAmizade !== amizadeId));
                }
            } catch (error) {
                console.error(`Erro ao ${action} amizade:`, error);
                Swal.fire('Erro', `Não foi possível executar a ação '${action}'. Tente novamente.`, 'error');
            }
        }
    };
    // ✅✅✅ FIM DA ATUALIZAÇÃO ✅✅✅

    const handleGoToChat = (userId) => {
        navigate(`/mensagens?dm=${userId}`);
    };

    return (
        <div>
            {/* ... (Restante do JSX sem alterações) ... */}
            <Topbar 
                onLogout={onLogout} 
                currentUser={currentUser} 
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            />

            {isSidebarOpen && (
                <div 
                    className="sidebar-overlay"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            <div className="container">
                <Sidebar 
                    currentUser={currentUser} 
                    isOpen={isSidebarOpen}
                />
                <main className="main-content">
                    <section className="widget-card connections-page-card">
                        <h2 className="widget-title">Gerenciar Conexões</h2>

                        {/* --- Seção Pedidos Recebidos --- */}
                        <div className="connections-section">
                            <h3>Pedidos Recebidos ({loading ? '...' : recebidos.length})</h3>
                             {loading ? <p className="loading-state">Carregando...</p> : recebidos.length > 0 ? (
                                <div className="conexao-grid">
                                    {recebidos.map(item => 
                                        <ConexaoCard 
                                            key={item.idAmizade} 
                                            item={item} 
                                            type="recebido" 
                                            onAction={handleAction} 
                                            onGoToChat={handleGoToChat} 
                                        />
                                    )}
                                </div>
                            ) : <p className="empty-state">Nenhum pedido de conexão pendente.</p>}
                        </div>

                        {/* --- Seção Pedidos Enviados --- */}
                        <div className="connections-section">
                            <h3>Pedidos Enviados ({loading ? '...' : enviados.length})</h3>
                             {loading ? <p className="loading-state">Carregando...</p> : enviados.length > 0 ? (
                                 <div className="conexao-grid">
                                    {enviados.map(item => 
                                        <ConexaoCard 
                                            key={item.idAmizade} 
                                            item={item} 
                                            type="enviado" 
                                            onAction={handleAction} 
                                            onGoToChat={handleGoToChat} 
                                        />
                                    )}
                                 </div>
                            ) : <p className="empty-state">Você não enviou nenhum pedido recentemente.</p>}
                        </div>

                        {/* --- Seção Meus Amigos --- */}
                        <div className="connections-section">
                            <h3>Minhas Conexões ({loading ? '...' : amigos.length})</h3>
                             {loading ? <p className="loading-state">Carregando...</p> : amigos.length > 0 ? (
                                <div className="conexao-grid">
                                    {amigos.map(item => 
                                        <ConexaoCard 
                                            key={item.idAmizade} 
                                            item={item} 
                                            type="amigo" 
                                            onAction={handleAction} 
                                            onGoToChat={handleGoToChat} 
                                        />
                                    )}
                                </div>
                            ) : <p className="empty-state">Você ainda não tem conexões. Que tal <Link to="/encontrar-pessoas">encontrar pessoas</Link>?</p>}
                        </div>
                    </section>
                </main>
                 <RightSidebar />
            </div>
        </div>
    );
};

export default MinhasConexoes;