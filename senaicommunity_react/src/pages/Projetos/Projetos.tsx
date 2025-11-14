// src/pages/Projetos/Projetos.tsx (CORRIGIDO E TIPADO)

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import Topbar from '../../components/Layout/Topbar';
import Sidebar from '../../components/Layout/Sidebar';
import RightSidebar from '../../pages/Principal/RightSidebar';
import './Projetos.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPlus, faSearch, faLink, faTimes, faSpinner, faUserPlus,
    faUserFriends, faExternalLinkAlt, faCalendarAlt, faInfoCircle,
    faCommentDots, faTrash, faUserShield
} from '@fortawesome/free-solid-svg-icons';
// Corrigindo a importação do lodash
import debounce from 'lodash/debounce'; 
import { useNavigate } from 'react-router-dom';

// =================================================================
// === DEFINIÇÃO DOS TIPOS ===
// =================================================================
interface Membro {
    id: any;
    usuarioId: any;
    usuarioNome: string;
    usuarioEmail: string;
    usuarioFotoUrl: string;
    role: 'ADMIN' | 'MODERADOR' | 'MEMBRO';
    dataEntrada: string;
    convidadoPorNome?: string;
}

interface Projeto {
    id: any;
    titulo: string;
    descricao: string;
    imagemUrl: string;
    dataCriacao: string;
    dataInicio: string; // ou Date
    dataEntrega?: string; // ou Date
    status: string;
    linksUteis: string[];
    maxMembros: number;
    grupoPrivado: boolean;
    autorId: any;
    autorNome: string;
    totalMembros: number;
    membros: Membro[];
    // convitesPendentes: any[]; // Adicione se necessário
}

// Usuário (simplificado)
interface Usuario {
    id: any;
    nome: string;
    email: string;
    tipoUsuario: 'ALUNO' | 'PROFESSOR';
    fotoPerfil: string;
    urlFotoPerfil?: string; // Adicionado para currentUser
}
// =================================================================

// === Props dos Componentes ===
interface ProjetoCardProps {
    projeto: Projeto;
    onVerDetalhes: (projeto: Projeto) => void;
}

interface NovoProjetoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProjectCreated: (novoProjeto: Projeto) => void;
}

interface ProjetoDetalheModalProps {
    projeto: Projeto | null;
    currentUser: Usuario | null;
    onClose: () => void;
    onGoToChat: (projetoId: any) => void;
    onProjetoAtualizado: (projetoId: any) => void;
    onProjetoExcluido: (projetoId: any) => void;
}

interface ProjetosPageProps {
    onLogout: () => void;
}

// --- COMPONENTE ProjetoCard ---
const ProjetoCard: React.FC<ProjetoCardProps> = ({ projeto, onVerDetalhes }) => {
    // ... (Código do ProjetoCard não muda) ...
    const imageUrl = projeto.imagemUrl
        ? `http://localhost:8080/projetos/imagens/${projeto.imagemUrl}`
        : 'https://placehold.co/600x400/161b22/8b949e?text=Projeto';

    return (
        <article className="projeto-card">
            <div className="projeto-imagem" style={{ backgroundImage: `url('${imageUrl}')` }}></div>
            <div className="projeto-conteudo">
                <h3 className="projeto-titulo">{projeto.titulo}</h3>
                <p className="projeto-descricao">{projeto.descricao}</p>
                <div className="projeto-footer">
                    <div className="projeto-membros">
                        {projeto.membros?.slice(0, 5).map(membro => (
                            <img
                                key={membro.usuarioId}
                                className="membro-avatar"
                                src={membro.usuarioFotoUrl ? `http://localhost:8080${membro.usuarioFotoUrl}` : `https://i.pravatar.cc/40?u=${membro.usuarioId}`}
                                title={membro.usuarioNome}
                                alt={membro.usuarioNome}
                            />
                        ))}
                        {projeto.membros?.length > 5 && (
                            <div className="membro-avatar more">+{projeto.membros.length - 5}</div>
                        )}
                    </div>
                    <button className="ver-projeto-btn" onClick={() => onVerDetalhes(projeto)}>
                        Ver Projeto
                    </button>
                </div>
            </div>
        </article>
    );
};

// --- COMPONENTE MODAL DE NOVO PROJETO ---
const NovoProjetoModal: React.FC<NovoProjetoModalProps> = ({ isOpen, onClose, onProjectCreated }) => {
    // ... (Código do NovoProjetoModal não muda) ...
    const [titulo, setTitulo] = useState('');
    const [descricao, setDescricao] = useState('');
    const [foto, setFoto] = useState<File | null>(null); // Tipado
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState<Usuario | null>(null); // Tipado
    const [links, setLinks] = useState(['']);
    const [participantes, setParticipantes] = useState<Usuario[]>([]); // Tipado
    const [searchTermParticipante, setSearchTermParticipante] = useState('');
    const [buscaResultados, setBuscaResultados] = useState<Usuario[]>([]); // Tipado
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const fetchCurrentUser = async () => {
                const token = localStorage.getItem('authToken');
                if (!token) { console.error("Token não encontrado."); return; }
                try {
                    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    const response = await axios.get('http://localhost:8080/usuarios/me');
                    setCurrentUser(response.data);
                } catch (error) { console.error("Erro ao buscar usuário atual:", error); }
            };
            fetchCurrentUser();
            setTitulo(''); setDescricao(''); setFoto(null);
            setLinks(['']); setParticipantes([]); setSearchTermParticipante(''); setBuscaResultados([]);
        }
    }, [isOpen]);

    const handleLinkChange = (index: number, value: string) => {
        const novosLinks = [...links]; novosLinks[index] = value; setLinks(novosLinks);
    };
    const addLinkInput = () => {
        if (links.length < 3) { setLinks([...links, '']); }
    };
    const removeLinkInput = (index: number) => {
        const novosLinks = links.filter((_, i) => i !== index);
        setLinks(novosLinks.length > 0 ? novosLinks : ['']);
    };

    const debouncedSearch = useCallback(debounce(async (query: string) => {
        if (!currentUser || query.length < 3) {
            setBuscaResultados([]);
            setIsSearching(false);
            return;
        }
        try {
            const response = await axios.get(`http://localhost:8080/usuarios/buscar?nome=${query}`);
            const idsAdicionados = new Set(participantes.map(p => p.id));
            const resultadosFiltrados = response.data.filter((user: Usuario) =>
                user.id !== currentUser.id && !idsAdicionados.has(user.id)
            );
            setBuscaResultados(resultadosFiltrados);
        } catch (error) { console.error('Erro ao buscar usuários:', error); }
        finally { setIsSearching(false); }
    }, 500), [participantes, currentUser]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value; setSearchTermParticipante(query);
        setIsSearching(true); debouncedSearch(query);
    };
    const addParticipante = (usuario: Usuario) => {
        setParticipantes([...participantes, usuario]);
        setSearchTermParticipante(''); setBuscaResultados([]);
    };
    const removeParticipante = (id: any) => {
        setParticipantes(participantes.filter(p => p.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) { Swal.fire('Erro', 'Não foi possível identificar o autor.', 'error'); return; }
        setLoading(true);
        const formData = new FormData();
        formData.append('titulo', titulo);
        formData.append('descricao', descricao);
        formData.append('autorId', currentUser.id.toString()); // Converte para string
        formData.append('maxMembros', "50"); // Converte para string
        formData.append('grupoPrivado', "false"); // Converte para string
        links.filter(link => link.trim() !== '').forEach(link => formData.append('linksUteis', link));
        
        participantes.forEach(p => {
            if (p.tipoUsuario === 'ALUNO') { formData.append('alunoIds', p.id.toString()); } // Converte para string
            else if (p.tipoUsuario === 'PROFESSOR') { formData.append('professorIds', p.id.toString()); } // Converte para string
        });
        
        if (foto) { formData.append('foto', foto); }
        
        try {
            const response = await axios.post('http://localhost:8080/projetos', formData);
            Swal.fire('Sucesso!', 'Projeto publicado e chat criado!', 'success');
            onProjectCreated(response.data); onClose();
        } catch (error) {
            console.error("Erro ao criar projeto:", error);
            const errorMsg = (error as any).response?.data?.message || 'Não foi possível publicar o projeto.';
            Swal.fire('Erro', `Detalhe: ${errorMsg}`, 'error');
        } finally { setLoading(false); }
    };

    if (!isOpen) return null;
    return (
        <div className="modal-overlay visible" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Cadastrar Novo Projeto</h2>
                    <button className="close-modal-btn" onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* ... (Form groups de Título, Descrição, Foto, Links) ... */}
                        <div className="form-group">
                            <label htmlFor="proj-titulo">Título do Projeto</label>
                            <input type="text" id="proj-titulo" value={titulo} onChange={e => setTitulo(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="proj-descricao">Descrição</label>
                            <textarea id="proj-descricao" rows={3} value={descricao} onChange={e => setDescricao(e.target.value)} required></textarea>
                        </div>
                        <div className="form-group">
                            <label htmlFor="proj-foto">Foto de Capa (Opcional)</label>
                            <input type="file" id="proj-foto" accept="image/*" onChange={(e) => setFoto(e.target.files ? e.target.files[0] : null)} />
                            {foto && <span className="file-name-preview">{foto.name}</span>}
                        </div>
                        <div className="form-group">
                            <label>Links Úteis (Opcional, máx 3)</label>
                            {links.map((link, index) => (
                                <div className="link-input-group" key={index}>
                                    <FontAwesomeIcon icon={faLink} />
                                    <input type="url" placeholder="https://github.com/seu-projeto" value={link} onChange={(e) => handleLinkChange(index, e.target.value)} />
                                    {links.length > 1 && (<button type="button" className="btn-remove-link" onClick={() => removeLinkInput(index)}><FontAwesomeIcon icon={faTimes} /></button>)}
                                </div>
                            ))}
                            {links.length < 3 && (<button type="button" className="btn-add-link" onClick={addLinkInput}><FontAwesomeIcon icon={faPlus} /> Adicionar outro link</button>)}
                        </div>
                        <div className="form-group">
                            <label htmlFor="proj-participantes">Adicionar Participantes (Opcional)</label>
                            <div className="participantes-pills-container">
                                {participantes.map(p => (
                                    <span key={p.id} className="participante-pill">
                                        {p.nome}
                                        <button type="button" onClick={() => removeParticipante(p.id)}><FontAwesomeIcon icon={faTimes} /></button>
                                    </span>
                                ))}
                            </div>
                            <div className="search-participantes-wrapper">
                                <FontAwesomeIcon icon={isSearching ? faSpinner : faSearch} className={isSearching ? 'spinner-icon' : ''} />
                                <input type="text" id="proj-participantes" placeholder="Buscar por nome..." value={searchTermParticipante} onChange={handleSearchChange} autoComplete="off" />
                                {buscaResultados.length > 0 && (
                                    <div className="search-results-dropdown">
                                        {buscaResultados.map(user => (
                                            <div key={user.id} className="search-result-item" onClick={() => addParticipante(user)}>
                                                <img src={user.fotoPerfil ? `http://localhost:8080${user.fotoPerfil}` : `https://i.pravatar.cc/40?u=${user.id}`} alt={user.nome} />
                                                <div className="search-result-info">
                                                    <span>{user.nome}</span><small>{user.email} ({user.tipoUsuario})</small>
                                                </div>
                                                <FontAwesomeIcon icon={faUserPlus} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn-publish" disabled={loading || !currentUser}>{loading ? 'Publicando...' : 'Publicar Projeto'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- COMPONENTE MODAL DE DETALHES DO PROJETO ---
const ProjetoDetalheModal: React.FC<ProjetoDetalheModalProps> = ({ projeto, currentUser, onClose, onGoToChat, onProjetoAtualizado, onProjetoExcluido }) => {
    // ... (Código do ProjetoDetalheModal não muda) ...
    const [searchTermParticipante, setSearchTermParticipante] = useState('');
    const [buscaResultados, setBuscaResultados] = useState<Usuario[]>([]); // Tipado
    const [isSearching, setIsSearching] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    const autor = useMemo(() =>
        projeto?.membros.find(m => m.role === 'ADMIN'),
    [projeto]);

    const isAutor = autor?.usuarioId === currentUser?.id;

    const debouncedSearch = useCallback(debounce(async (query: string) => {
        if (!currentUser || !projeto || query.length < 3) {
            setBuscaResultados([]);
            setIsSearching(false);
            return;
        }
        try {
            const response = await axios.get(`http://localhost:8080/usuarios/buscar?nome=${query}`);
            const idsMembrosAtuais = new Set(projeto.membros.map(m => m.usuarioId));
            const resultadosFiltrados = response.data.filter((user: Usuario) =>
                !idsMembrosAtuais.has(user.id)
            );
            setBuscaResultados(resultadosFiltrados);
        } catch (error) { console.error('Erro ao buscar usuários:', error); }
        finally { setIsSearching(false); }
    }, 500), [projeto, currentUser]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value; setSearchTermParticipante(query);
        setIsSearching(true); debouncedSearch(query);
    };

    const handleAddParticipante = async (usuario: Usuario) => {
        if (!projeto) return;
        setIsAdding(true);
        try {
            const params = {
                usuarioConvidadoId: usuario.id
            };
            await axios.post(`http://localhost:8080/projetos/${projeto.id}/convites`, null, { params: params });
            Swal.fire('Sucesso!', `Convite enviado para ${usuario.nome}.`, 'success');
            // onProjetoAtualizado(projeto.id); // Não precisa mais
            setSearchTermParticipante('');
            setBuscaResultados([]);
        } catch (error) {
            console.error("Erro ao enviar convite:", error);
            const errorMsg = (error as any).response?.data?.message || 'Não foi possível enviar o convite.';
            Swal.fire('Erro', errorMsg, 'error');
        } finally {
            setIsAdding(false);
        }
    };

    const handleExcluirProjeto = async () => {
        if (!projeto) return;
        const result = await Swal.fire({
            title: 'Você tem certeza?',
            text: `Excluir o projeto "${projeto.titulo}" é uma ação irreversível!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sim, excluir!',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await axios.delete(`http://localhost:8080/projetos/${projeto.id}`);
                Swal.fire('Excluído!', 'O projeto foi excluído com sucesso.', 'success');
                onProjetoExcluido(projeto.id);
            } catch (error) {
                console.error("Erro ao excluir projeto:", error);
                Swal.fire('Erro', 'Não foi possível excluir o projeto.', 'error');
            }
        }
    };

    useEffect(() => {
        if (!projeto) {
            setSearchTermParticipante('');
            setBuscaResultados([]);
            setIsSearching(false);
        }
    }, [projeto]);


    if (!projeto) return null;

    const imageUrl = projeto.imagemUrl
        ? `http://localhost:8080/projetos/imagens/${projeto.imagemUrl}`
        : 'https://placehold.co/600x400/161b22/8b949e?text=Projeto';

    return (
        <div className="modal-overlay visible" onClick={onClose}>
            <div className="modal-content modal-detalhe" onClick={e => e.stopPropagation()}>
                <div className="modal-header detalhe-header" style={{ backgroundImage: `url('${imageUrl}')` }}>
                    <div className="header-overlay">
                        <h2>{projeto.titulo}</h2>
                        <button className="close-modal-btn" onClick={onClose}>&times;</button>
                    </div>
                </div>
                <div className="modal-body detalhe-body">
                    <div className="detalhe-info-grid">
                        <div className="detalhe-info-item">
                            <FontAwesomeIcon icon={faInfoCircle} />
                            <div>
                                <strong>Descrição</strong>
                                <p>{projeto.descricao}</p>
                            </div>
                        </div>
                        <div className="detalhe-info-item">
                            <FontAwesomeIcon icon={faCalendarAlt} />
                            <div>
                                <strong>Criado em</strong>
                                <p>{new Date(projeto.dataCriacao).toLocaleDateString('pt-BR')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Seção de Membros */}
                    <h3><FontAwesomeIcon icon={faUserFriends} /> Membros ({projeto.membros?.length || 0})</h3>
                    <div className="detalhe-membros-lista">
                        {projeto.membros?.map(membro => (
                            <div key={membro.usuarioId} className="detalhe-membro-item" title={`${membro.usuarioNome} (${membro.role})`}>
                                <img
                                    src={membro.usuarioFotoUrl ? `http://localhost:8080${membro.usuarioFotoUrl}` : `https://i.pravatar.cc/40?u=${membro.usuarioId}`}
                                    alt={membro.usuarioNome}
                                />
                                <span className={`role-badge ${membro.role.toLowerCase()}`}>{membro.role}</span>
                            </div>
                        ))}
                    </div>

                    {/* Seção de Links */}
                    {projeto.linksUteis && projeto.linksUteis.length > 0 && (
                        <>
                            <h3><FontAwesomeIcon icon={faLink} /> Links Úteis</h3>
                            <div className="detalhe-links-lista">
                                {projeto.linksUteis.map((link, index) => (
                                    <a href={link} target="_blank" rel="noopener noreferrer" className="link-util-item" key={index}>
                                        <FontAwesomeIcon icon={faExternalLinkAlt} />
                                        <span>{link.replace(/^(httpsC?:\/\/)?(www\.)?/, '')}</span>
                                    </a>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Seção de Adicionar Membros (SÓ PARA O AUTOR/ADMIN) */}
                    {isAutor && (
                        <>
                            <h3 className="admin-section-title"><FontAwesomeIcon icon={faUserShield} /> Gerenciamento (Admin)</h3>
                            <div className="form-group">
                                <label htmlFor="proj-add-participante">Adicionar Novo Membro</label>
                                <div className="search-participantes-wrapper">
                                    <FontAwesomeIcon
                                        icon={isSearching || isAdding ? faSpinner : faSearch}
                                        className={(isSearching || isAdding) ? 'spinner-icon' : ''}
                                    />
                                    <input
                                        type="text"
                                        id="proj-add-participante"
                                        placeholder="Buscar por nome..."
                                        value={searchTermParticipante}
                                        onChange={handleSearchChange}
                                        autoComplete="off"
                                        disabled={isAdding}
                                    />
                                    {buscaResultados.length > 0 && (
                                        <div className="search-results-dropdown">
                                            {buscaResultados.map(user => (
                                                <div key={user.id} className="search-result-item" onClick={() => handleAddParticipante(user)}>
                                                    <img src={user.fotoPerfil ? `http://localhost:8080${user.fotoPerfil}` : `https://i.pravatar.cc/40?u=${user.id}`} alt={user.nome} />
                                                    <div className="search-result-info">
                                                        <span>{user.nome}</span><small>{user.email} ({user.tipoUsuario})</small>
                                                    </div>
                                                    <FontAwesomeIcon icon={faUserPlus} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                </div>
                <div className="modal-footer">
                    {/* Botão de Excluir (SÓ PARA O AUTOR/ADMIN) */}
                    {isAutor && (
                        <button
                            type="button"
                            className="btn-cancel btn-delete"
                            onClick={handleExcluirProjeto}
                        >
                            <FontAwesomeIcon icon={faTrash} /> Excluir Projeto
                        </button>
                    )}
                    <button type="button" className="btn-cancel" onClick={onClose} style={{ marginLeft: isAutor ? 'auto' : '0' }}>
                        Fechar
                    </button>
                    <button type="button" className="btn-publish btn-chat" onClick={() => onGoToChat(projeto.id)}>
                        <FontAwesomeIcon icon={faCommentDots} /> Ir para o Chat
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- COMPONENTE PRINCIPAL DA PÁGINA ---
const Projetos: React.FC<ProjetosPageProps> = ({ onLogout }) => {
    const [projetos, setProjetos] = useState<Projeto[]>([]); // Tipado
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<Usuario | null>(null); // Tipado
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // ✅ 1. Adiciona o estado do menu mobile
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const [projetoSelecionado, setProjetoSelecionado] = useState<Projeto | null>(null); // Tipado
    const navigate = useNavigate();

    const fetchAllData = useCallback(async () => {
        setLoading(true);
        const token = localStorage.getItem('authToken');
         if (!token) { onLogout(); return; }
        try {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            const [userRes, projetosRes] = await Promise.all([
                 axios.get('http://localhost:8080/usuarios/me'),
                 axios.get('http://localhost:8080/projetos')
            ]);
            setCurrentUser(userRes.data);
            // Garante que a resposta é um array antes de ordenar
            if (Array.isArray(projetosRes.data)) {
                 setProjetos(projetosRes.data.sort((a: Projeto, b: Projeto) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime()));
            } else {
                 setProjetos([]);
            }
        } catch (error) {
            console.error("Erro ao buscar dados:", error);
             if ((error as any).response?.status === 401 || (error as any).response?.status === 403) { onLogout(); }
        } finally { setLoading(false); }
    }, [onLogout]);

    useEffect(() => {
        document.title = 'Senai Community | Projetos';
        fetchAllData();
    }, [fetchAllData]);

    const handleProjectCreated = (novoProjeto: Projeto) => {
        setProjetos(prevProjetos => [novoProjeto, ...prevProjetos]);
    };

    const handleGoToChat = (projetoId: any) => {
        setProjetoSelecionado(null);
        navigate(`/mensagens?grupo=${projetoId}`);
    };

    const handleProjetoExcluido = (projetoId: any) => {
        setProjetos(prev => prev.filter(p => p.id !== projetoId));
        setProjetoSelecionado(null);
    };

    const handleProjetoAtualizado = async (projetoId: any) => {
        try {
            const response = await axios.get(`http://localhost:8080/projetos/${projetoId}`);
            const projetoAtualizado = response.data;

            setProjetos(prev => prev.map(p =>
                p.id === projetoId ? projetoAtualizado : p
            ));

            setProjetoSelecionado(projetoAtualizado);
        } catch (error) {
            console.error("Erro ao atualizar projeto:", error);
            setProjetoSelecionado(null);
        }
    };

    const filteredProjetos = useMemo(() => {
        return projetos.filter(proj =>
            proj.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            proj.descricao.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [projetos, searchTerm]);


    return (
        <div>
            {/* ✅ 2. Passa a prop 'onToggleSidebar' para o Topbar */}
            <Topbar 
                onLogout={onLogout} 
                currentUser={currentUser} 
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            />

            {/* ✅ 3. Adiciona o overlay */}
            {isSidebarOpen && (
                <div 
                    className="sidebar-overlay"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            <div className="container">
                {/* ✅ 4. Passa a prop 'isOpen' para o Sidebar */}
                <Sidebar 
                    currentUser={currentUser} 
                    isOpen={isSidebarOpen}
                />
                <main className="main-content">
                    <header className="projetos-header">
                        <div className="header-text">
                            <h1>Explore os Projetos da Comunidade</h1>
                            <p>Inspire-se, colabore e colabore com suas criações.</p>
                        </div>
                        <button className="btn-new-project" onClick={() => setIsCreateModalOpen(true)}>
                            <FontAwesomeIcon icon={faPlus} /> Publicar Projeto
                        </button>
                    </header>

                    <section className="projetos-filters">
                        <div className="search-projetos">
                            <FontAwesomeIcon icon={faSearch} />
                            <input
                                type="text"
                                placeholder="Buscar por nome ou descrição..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </section>

                    <section className="projetos-grid">
                        {loading ? <p className="loading-state">Carregando projetos...</p> :
                            filteredProjetos.length > 0 ? (
                                filteredProjetos.map(proj =>
                                    <ProjetoCard
                                        key={proj.id}
                                        projeto={proj}
                                        onVerDetalhes={setProjetoSelecionado}
                                    />
                                )
                            ) : (
                                <div className="empty-state">
                                    <h3>Nenhum projeto encontrado</h3>
                                    <p>Seja o primeiro a publicar ou ajuste sua busca!</p>
                                </div>
                            )
                        }
                    </section>
                </main>
                <RightSidebar />
            </div>

            {/* Modal de Criação (existente) */}
            <NovoProjetoModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onProjectCreated={handleProjectCreated}
            />

            {/* MODAL DE DETALHES ATUALIZADO com novas props */}
            <ProjetoDetalheModal
                projeto={projetoSelecionado}
                currentUser={currentUser}
                onClose={() => setProjetoSelecionado(null)}
                onGoToChat={handleGoToChat}
                onProjetoAtualizado={handleProjetoAtualizado}
                onProjetoExcluido={handleProjetoExcluido}
            />
        </div>
    );
};

export default Projetos;