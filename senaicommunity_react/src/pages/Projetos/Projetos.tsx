// src/pages/Projetos/Projetos.tsx (CORRIGIDO E ATUALIZADO)

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import Topbar from '../../components/Layout/Topbar.tsx'; 
import Sidebar from '../../components/Layout/Sidebar.jsx';
import RightSidebar from '../../pages/Principal/RightSidebar.jsx';
import './Projetos.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPlus, faSearch, faLink, faTimes, faSpinner, faUserPlus,
    faUserFriends, faExternalLinkAlt, faCalendarAlt, faInfoCircle,
    faCommentDots, faTrash, faUserShield, faImage, faList, faTh, faDatabase, faCode
} from '@fortawesome/free-solid-svg-icons';
import { faReact, faJava, faPython, faDocker, faJsSquare, faNodeJs } from '@fortawesome/free-brands-svg-icons';
import debounce from 'lodash/debounce'; 
import { useNavigate } from 'react-router-dom';

// ... (Interfaces de Tipos: Membro, Projeto, Usuario, etc. - Sem alterações) ...
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

// Novas interfaces para suportar as funcionalidades
interface Tech {
    name: string;
    icon: string; // Ex: 'react', 'java', 'docker'
}

interface Vaga {
    id: any;
    titulo: string;
    descricao: string;
    status: 'ABERTA' | 'FECHADA';
}

interface Projeto {
    id: any;
    titulo: string;
    descricao: string;
    imagemUrl: string; 
    videoUrl?: string; // Para o preview de vídeo
    dataCriacao: string;
    dataInicio: string; 
    dataEntrega?: string; 
    status: 'IDEIA' | 'DESENVOLVIMENTO' | 'CONCLUIDO'; // Status tipado
    linksUteis: string[];
    techStack: Tech[]; // Para as badges de tecnologia
    vagas: Vaga[]; // Para o sistema de recrutamento
    proximaReuniao?: { // Para a sincronia com o chat
        titulo: string;
        data: string;
    };
    maxMembros: number;
    grupoPrivado: boolean;
    autorId: any;
    autorNome: string;
    totalMembros: number;
    membros: Membro[];
}
interface Usuario {
    id: any;
    nome: string;
    email: string;
    tipoUsuario: 'ALUNO' | 'PROFESSOR';
    fotoPerfil: string; 
    urlFotoPerfil?: string; 
}
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
// ... (Função getCorrectUserImageUrl - Sem alterações) ...
const getCorrectUserImageUrl = (url: string | null | undefined, fallbackId: any): string => {
    const defaultAvatar = `https://i.pravatar.cc/40?u=${fallbackId || 'default'}`;
    if (!url) { return defaultAvatar; }
    if (url.startsWith('http')) { return url; }
    if (url.startsWith('/api/arquivos/') || url.startsWith('/images/')) {
        return `http://localhost:8080${url}`;
    }
    return `http://localhost:8080/api/arquivos/${url}`;
};

// --- COMPONENTE TechBadge (NOVO) ---
const TechBadge: React.FC<{ tech: Tech }> = ({ tech }) => {
    const iconMap: { [key: string]: any } = {
        react: faReact,
        java: faJava,
        python: faPython,
        docker: faDocker,
        javascript: faJsSquare,
        typescript: faJsSquare, // Usando o mesmo para TS
        'node-js': faNodeJs,
        database: faDatabase,
        // Adicione outros mapeamentos aqui
    };

    const icon = iconMap[tech.icon] || faCode; // Fallback para um ícone genérico

    return (
        <div className="tech-badge" title={tech.name}>
            <FontAwesomeIcon icon={icon} />
        </div>
    );
};


// --- COMPONENTE ProjetoCard ---
const ProjetoCard: React.FC<ProjetoCardProps> = ({ projeto, onVerDetalhes }) => {
    const imageUrl = projeto.imagemUrl
        ? projeto.imagemUrl
        : 'https://placehold.co/600x400/161b22/8b949e?text=Projeto';

    const getStatusText = (status: string) => {
        switch (status) {
            case 'IDEIA': return 'Ideia';
            case 'DESENVOLVIMENTO': return 'Em Desenvolvimento';
            case 'CONCLUIDO': return 'Concluído';
            default: return 'Indefinido';
        }
    };

    return (
        <article className="projeto-card">
            <div className="projeto-imagem" style={{ backgroundImage: `url('${imageUrl}')` }}></div>
            <div className="projeto-conteudo">
                <div className="progress-bar-container">
                    <div className={`progress-bar ${projeto.status?.toLowerCase()}`} style={{ width: projeto.status === 'IDEIA' ? '10%' : projeto.status === 'DESENVOLVIMENTO' ? '50%' : '100%' }}></div>
                </div>
                <span className="status-text">{getStatusText(projeto.status)}</span>
                <h3 className="projeto-titulo">{projeto.titulo}</h3>
                <p className="projeto-descricao">{projeto.descricao}</p>
                <div className="projeto-tech-stack">
                    {projeto.techStack?.slice(0, 4).map(tech => <TechBadge key={tech.icon} tech={tech} />)}
                </div>
                <div className="projeto-footer">
                    <div className="projeto-membros">
                        {projeto.membros?.slice(0, 5).map(membro => (
                            <img
                                key={membro.usuarioId}
                                className="membro-avatar"
                                src={getCorrectUserImageUrl(membro.usuarioFotoUrl, membro.usuarioId)}
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

// --- COMPONENTE ProjetoListItem (NOVO) ---
const ProjetoListItem: React.FC<ProjetoCardProps> = ({ projeto, onVerDetalhes }) => {
    return (
        <article className="projeto-list-item" onClick={() => onVerDetalhes(projeto)}>
            <div className="list-item-main">
                <h3 className="projeto-titulo">{projeto.titulo}</h3>
                <p className="projeto-descricao">{projeto.descricao}</p>
            </div>
            <div className="list-item-status">
                <span className={`status-badge ${projeto.status?.toLowerCase()}`}>{projeto.status}</span>
            </div>
            <div className="list-item-tech">
                {projeto.techStack?.slice(0, 5).map(tech => <TechBadge key={tech.icon} tech={tech} />)}
            </div>
            <div className="list-item-membros">
                <FontAwesomeIcon icon={faUserFriends} />
                <span>{projeto.totalMembros}</span>
            </div>
            <div className="list-item-actions">
                <button className="ver-projeto-btn-list">Ver Detalhes</button>
            </div>
        </article>
    );
};


// --- COMPONENTE MODAL DE NOVO PROJETO ---
const NovoProjetoModal: React.FC<NovoProjetoModalProps> = ({ isOpen, onClose, onProjectCreated }) => {
    // ... (Sem alterações aqui, continua usando a lógica de preview e getCorrectUserImageUrl) ...
    const [titulo, setTitulo] = useState('');
    const [descricao, setDescricao] = useState('');
    const [foto, setFoto] = useState<File | null>(null); 
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState<Usuario | null>(null); 
    const [links, setLinks] = useState(['']);
    const [participantes, setParticipantes] = useState<Usuario[]>([]); 
    const [searchTermParticipante, setSearchTermParticipante] = useState('');
    const [buscaResultados, setBuscaResultados] = useState<Usuario[]>([]); 
    const [isSearching, setIsSearching] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [status, setStatus] = useState<'IDEIA' | 'DESENVOLVIMENTO' | 'CONCLUIDO'>('IDEIA');
    const [techStack, setTechStack] = useState<Tech[]>([]);

    const availableTechs: Tech[] = [
        { name: 'React', icon: 'react' },
        { name: 'Java', icon: 'java' },
        { name: 'Python', icon: 'python' },
        { name: 'Docker', icon: 'docker' },
        { name: 'JavaScript', icon: 'javascript' },
        { name: 'TypeScript', icon: 'typescript' },
        { name: 'Node.js', icon: 'node-js' },
        { name: 'SQL', icon: 'database' },
    ];

    const iconMap: { [key: string]: any } = {
        react: faReact,
        java: faJava,
        python: faPython,
        docker: faDocker,
        javascript: faJsSquare,
        typescript: faJsSquare,
        'node-js': faNodeJs,
        database: faDatabase,
    };

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
            setTitulo(''); setDescricao(''); setFoto(null); setPreview(null);
            setLinks(['']); setParticipantes([]); setSearchTermParticipante(''); setBuscaResultados([]);
        }
    }, [isOpen]);

    useEffect(() => {
        return () => {
            if (preview && preview.startsWith('blob:')) {
                URL.revokeObjectURL(preview);
            }
        };
    }, [preview]);

    const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files ? e.target.files[0] : null;
        if (file) {
            setFoto(file);
            if (preview && preview.startsWith('blob:')) {
                URL.revokeObjectURL(preview);
            }
            setPreview(URL.createObjectURL(file));
        }
    };
    
    const removerPreview = () => {
        setFoto(null);
        if (preview && preview.startsWith('blob:')) {
            URL.revokeObjectURL(preview);
        }
        setPreview(null);
    };

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
            setBuscaResultados([]); setIsSearching(false); return;
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

    const handleTechChange = (e: React.ChangeEvent<HTMLInputElement>, tech: Tech) => {
        const { checked } = e.target;
        setTechStack(prev =>
            checked ? [...prev, tech] : prev.filter(t => t.icon !== tech.icon)
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) { Swal.fire('Erro', 'Não foi possível identificar o autor.', 'error'); return; }
        setLoading(true);
        const formData = new FormData();
        formData.append('titulo', titulo);
        formData.append('descricao', descricao);
        formData.append('status', status);
        formData.append('techStack', JSON.stringify(techStack)); // Serializa o array de objetos
        formData.append('autorId', currentUser.id.toString()); 
        formData.append('maxMembros', "50"); 
        formData.append('grupoPrivado', "false"); 
        links.filter(link => link.trim() !== '').forEach(link => formData.append('linksUteis', link));
        participantes.forEach(p => {
            if (p.tipoUsuario === 'ALUNO') { formData.append('alunoIds', p.id.toString()); } 
            else if (p.tipoUsuario === 'PROFESSOR') { formData.append('professorIds', p.id.toString()); } 
        });
        if (foto) { formData.append('foto', foto); }
        try {
            const response = await axios.post('http://localhost:8080/projetos', formData);
            Swal.fire('Sucesso!', 'Projeto publicado e membros adicionados!', 'success');
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
                        {/* ... (form groups: titulo, descricao) ... */}
                        <div className="form-group">
                            <label htmlFor="proj-titulo">Título do Projeto</label>
                            <input type="text" id="proj-titulo" value={titulo} onChange={e => setTitulo(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="proj-descricao">Descrição</label>
                            <textarea id="proj-descricao" rows={3} value={descricao} onChange={e => setDescricao(e.target.value)} required></textarea>
                        </div>
                        <div className="form-group-row">
                            <div className="form-group">
                                <label htmlFor="proj-status">Status do Projeto</label>
                                <select id="proj-status" value={status} onChange={e => setStatus(e.target.value as typeof status)}>
                                    <option value="IDEIA">⚪ Ideia</option>
                                    <option value="DESENVOLVIMENTO">🔵 Em Desenvolvimento</option>
                                    <option value="CONCLUIDO">🟢 Concluído</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Tecnologias (Selecione as principais)</label>
                            <div className="tech-stack-selector">
                                {availableTechs.map(tech => (
                                    <label key={tech.icon} className={`tech-badge-option ${techStack.some(t => t.icon === tech.icon) ? 'selected' : ''}`}>
                                        <input
                                            type="checkbox"
                                            value={tech.icon}
                                            checked={techStack.some(t => t.icon === tech.icon)}
                                            onChange={(e) => handleTechChange(e, tech)}
                                        />
                                        <FontAwesomeIcon icon={iconMap[tech.icon] || faCode} />
                                        {tech.name}
                                    </label>
                                ))}
                            </div>
                        </div>
                        {/* ... (form group: foto preview) ... */}
                        <div className="form-group">
                            <label htmlFor="proj-foto">Foto de Capa (Opcional)</label>
                            {preview ? (
                                <div className="foto-preview-container">
                                    <img src={preview} alt="Pré-visualização" className="foto-preview-img" />
                                    <button type="button" className="btn-remove-link" onClick={removerPreview}>
                                        <FontAwesomeIcon icon={faTimes} /> Remover Imagem
                                    </button>
                                </div>
                            ) : (
                                <input type="file" id="proj-foto" accept="image/*" onChange={handleFotoChange} />
                            )}
                        </div>
                        {/* ... (form group: links) ... */}
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
                        {/* ... (form group: participantes) ... */}
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
                                                <img src={getCorrectUserImageUrl(user.fotoPerfil, user.id)} alt={user.nome} />
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
    // ... (Sem alterações aqui, continua usando a lógica de preview e getCorrectUserImageUrl) ...
    const [searchTermParticipante, setSearchTermParticipante] = useState('');
    const [buscaResultados, setBuscaResultados] = useState<Usuario[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    const autor = useMemo(() =>
        projeto?.membros.find(m => m.role === 'ADMIN'),
    [projeto]);

    const isAutor = autor?.usuarioId === currentUser?.id;

    const debouncedSearch = useCallback(debounce(async (query: string) => {
        if (!currentUser || !projeto || query.length < 3) {
            setBuscaResultados([]); setIsSearching(false); return;
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
            const params = { usuarioConvidadoId: usuario.id };
            await axios.post(`http://localhost:8080/projetos/${projeto.id}/convites`, null, { params: params });
            Swal.fire('Sucesso!', `Convite enviado para ${usuario.nome}.`, 'success');
            onProjetoAtualizado(projeto.id); 
            setSearchTermParticipante('');
            setBuscaResultados([]);
        } catch (error) {
            console.error("Erro ao enviar convite:", error);
            const errorMsg = (error as any).response?.data?.message || 'Não foi possível enviar o convite.';
            Swal.fire('Erro', errorMsg, 'error');
        } finally { setIsAdding(false); }
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
            setSearchTermParticipante(''); setBuscaResultados([]); setIsSearching(false);
        }
    }, [projeto]);

    if (!projeto) return null;

    const imageUrl = projeto.imagemUrl
        ? projeto.imagemUrl 
        : 'https://placehold.co/600x400/161b22/8b949e?text=Projeto';

    return (
        <div className="modal-overlay visible" onClick={onClose}>
            <div className="modal-content modal-detalhe" onClick={e => e.stopPropagation()}>
                {/* ... (header, body, lista de membros, etc. - Sem alterações) ... */}
                <div className="modal-header detalhe-header" style={{ backgroundImage: `url('${imageUrl}')` }}>
                    <div className="header-overlay">
                        <h2>{projeto.titulo}</h2>
                        <button className="close-modal-btn" onClick={onClose}>&times;</button>
                    </div>
                </div>
                <div className="modal-body detalhe-body">
                    {/* ... (info grid) ... */}
                    <div className="detalhe-info-grid">
                        <div className="detalhe-info-item">
                            <FontAwesomeIcon icon={faInfoCircle} />
                            <div> <strong>Descrição</strong> <p>{projeto.descricao}</p> </div>
                        </div>
                        <div className="detalhe-info-item">
                            <FontAwesomeIcon icon={faCalendarAlt} />
                            <div> <strong>Criado em</strong> <p>{new Date(projeto.dataCriacao).toLocaleDateString('pt-BR')}</p> </div>
                        </div>
                    </div>
                    {/* ... (membros lista) ... */}
                    <h3><FontAwesomeIcon icon={faUserFriends} /> Membros ({projeto.membros?.length || 0})</h3>
                    <div className="detalhe-membros-lista">
                        {projeto.membros?.map(membro => (
                            <div key={membro.usuarioId} className="detalhe-membro-item" title={`${membro.usuarioNome} (${membro.role})`}>
                                <img
                                    src={getCorrectUserImageUrl(membro.usuarioFotoUrl, membro.usuarioId)}
                                    alt={membro.usuarioNome}
                                />
                                <span className={`role-badge ${membro.role.toLowerCase()}`}>{membro.role}</span>
                            </div>
                        ))}
                    </div>
                    {/* ... (links lista) ... */}
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
                    {/* ... (admin section) ... */}
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
                                                    <img src={getCorrectUserImageUrl(user.fotoPerfil, user.id)} alt={user.nome} />
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
    const [projetos, setProjetos] = useState<Projeto[]>([]); 
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<Usuario | null>(null); 
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'TODOS' | 'IDEIA' | 'DESENVOLVIMENTO' | 'CONCLUIDO'>('TODOS');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [projetoSelecionado, setProjetoSelecionado] = useState<Projeto | null>(null); 
    const navigate = useNavigate();

    // ✅✅✅ INÍCIO DA CORREÇÃO (Request 2 - Privacidade) ✅✅✅
    const fetchAllData = useCallback(async () => {
        setLoading(true);
        const token = localStorage.getItem('authToken');
         if (!token) { onLogout(); return; }
        try {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            const [userRes, projetosRes] = await Promise.all([
                 axios.get('http://localhost:8080/usuarios/me'),
                 // Busca apenas os projetos do usuário logado
                 axios.get('http://localhost:8080/projetos/meus-projetos') //
            ]);
            setCurrentUser(userRes.data);
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
    // ✅✅✅ FIM DA CORREÇÃO ✅✅✅

    useEffect(() => {
        document.title = 'Senai Community | Projetos';
        fetchAllData();
    }, [fetchAllData]);

    // ... (handlers handleProjectCreated, GoToChat, Excluido, Atualizado - Sem alterações) ...
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
            // Re-busca os /meus-projetos para garantir que a lista está 100% correta
            // (embora buscar por ID também funcione, isso é mais seguro se o status de membro mudou)
            const projetosRes = await axios.get('http://localhost:8080/projetos/meus-projetos');
            if (Array.isArray(projetosRes.data)) {
                 setProjetos(projetosRes.data.sort((a: Projeto, b: Projeto) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime()));
            }
            // Atualiza o modal de detalhes
            const projetoAtualizado = projetosRes.data.find((p: Projeto) => p.id === projetoId);
            setProjetoSelecionado(projetoAtualizado || null);
            
        } catch (error) {
            console.error("Erro ao atualizar projeto:", error);
            setProjetoSelecionado(null);
        }
    };

    const filteredProjetos = useMemo(() => {
        return projetos.filter(proj => {
            const searchMatch = proj.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                proj.descricao.toLowerCase().includes(searchTerm.toLowerCase());
            const statusMatch = statusFilter === 'TODOS' || proj.status === statusFilter;
            return searchMatch && statusMatch;
        });
    }, [projetos, searchTerm, statusFilter]);


    return (
        <div>
            {/* ... (Renderização - Sem alterações) ... */}
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
                        <div className="filter-buttons">
                            <button className={statusFilter === 'TODOS' ? 'active' : ''} onClick={() => setStatusFilter('TODOS')}>Todos</button>
                            <button className={statusFilter === 'IDEIA' ? 'active' : ''} onClick={() => setStatusFilter('IDEIA')}>💡 Ideias</button>
                            <button className={statusFilter === 'DESENVOLVIMENTO' ? 'active' : ''} onClick={() => setStatusFilter('DESENVOLVIMENTO')}>💻 Em Desenvolvimento</button>
                            <button className={statusFilter === 'CONCLUIDO' ? 'active' : ''} onClick={() => setStatusFilter('CONCLUIDO')}>🚀 Concluídos</button>
                        </div>
                        <div className="view-mode-toggle">
                            <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}><FontAwesomeIcon icon={faTh} /> Grid</button>
                            <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}><FontAwesomeIcon icon={faList} /> Lista</button>
                        </div>
                    </section>

                    <section className={viewMode === 'grid' ? 'projetos-grid' : 'projetos-list'}>
                        {loading ? <p className="loading-state">Carregando projetos...</p> :
                            filteredProjetos.length > 0 ? (
                                filteredProjetos.map(proj =>
                                    viewMode === 'grid' ? (
                                        <ProjetoCard
                                            key={proj.id}
                                            projeto={proj}
                                            onVerDetalhes={setProjetoSelecionado}
                                        />
                                    ) : (
                                        <ProjetoListItem
                                            key={proj.id}
                                            projeto={proj}
                                            onVerDetalhes={setProjetoSelecionado}
                                        />
                                    )
                                )
                            ) : (
                                <div className="empty-state">
                                    <h3>Nenhum projeto encontrado</h3>
                                    <p>Você ainda não participa de nenhum projeto. Crie um!</p>
                                </div>
                            )
                        }
                    </section>
                </main>
                <RightSidebar />
            </div>

            <NovoProjetoModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onProjectCreated={handleProjectCreated}
            />

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