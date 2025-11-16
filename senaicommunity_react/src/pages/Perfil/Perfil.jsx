import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useParams, Link, } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    // Ícones do Perfil
    faEnvelope,
    faCalendarAlt,
    faPen,
    // Ícones das Postagens (copiados do MainContent)
    faThumbsUp,
    faComment,
    faEllipsisH,
    faSpinner,
    faChevronLeft,
    faChevronRight,
    faPaperPlane, // Para o CommentSection
    faReply       // Para o CommentSection
} from '@fortawesome/free-solid-svg-icons';

// Contexto e Componentes
import { useWebSocket } from '../../contexts/WebSocketContext.tsx';
// REMOVIDO: import CommentSection from... (Esta é a correção do erro)
import Topbar from '../../components/Layout/Topbar';
import Sidebar from '../../components/Layout/Sidebar';
import RightSidebar from '../../pages/Principal/RightSidebar';
import EditarPerfilModal from './EditarPerfilModal';

// Estilos
import '../../pages/Principal/Principal.css'; // Para os estilos da postagem
import './Perfil.css'; // Para os estilos do perfil
import './EditarPerfilModal.css';

// =================================================================
// FUNÇÕES HELPER (COPIADAS DO MAINCONTENT)
// =================================================================
const getCorrectImageUrl = (url) => {
    const placeholder = "https://via.placeholder.com/40";
    if (!url) return placeholder;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (url.startsWith("blob:")) return url;
    if (url.startsWith("/")) return `http://localhost:8080${url}`;
    // Ajuste este caminho se for diferente
    return `http://localhost:8080/alunoPictures/${url}`; 
};

const formatarData = (data) => {
    const agora = new Date();
    const dataPost = new Date(data);
    const diff = agora - dataPost;
    const minutos = Math.floor(diff / 60000);
    if (minutos < 1) return "agora";
    if (minutos < 60) return `há ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `há ${horas} h`;
    const dias = Math.floor(horas / 24);
    if (dias === 1) return "ontem";
    return `há ${dias} dias`;
};

const buildCommentTree = (comments, parentId = null) => {
    return comments
        .filter(comment => comment.parentId === parentId)
        .sort((a, b) => new Date(a.dataCriacao) - new Date(b.dataCriacao));
};

// =================================================================
// SUB-COMPONENTE: Comment (COPIADO DO MAINCONTENT)
// =================================================================
const Comment = ({ comment, currentUser, onLikeComment, onReply, allComments }) => {
    const [showReplies, setShowReplies] = useState(false);
    const replies = buildCommentTree(allComments, comment.id); // Pega as respostas
    const userImage = getCorrectImageUrl(comment.urlFotoAutor);

    return (
        <div className="comment-container" style={{ marginLeft: comment.parentId ? '20px' : '0' }}>
            <img 
                src={userImage} 
                alt={comment.nomeAutor} 
                className="comment-author-img" 
            />
            <div className="comment-content">
                <div className="comment-bubble">
                    <Link to={`/perfil/${comment.autorId}`} className="comment-author-name">{comment.nomeAutor}</Link>
                    {comment.replyingToName && (
                        <span className="replying-to"> respondendo a {comment.replyingToName}</span>
                    )}
                    <p className="comment-text">{comment.conteudo}</p>
                </div>
                <div className="comment-actions">
                    <span className="comment-time">{formatarData(comment.dataCriacao)}</span>
                    <button 
                        className={`comment-action-btn ${comment.curtidoPeloUsuario ? 'liked' : ''}`}
                        onClick={() => onLikeComment(comment.id)}
                    >
                        <FontAwesomeIcon icon={faThumbsUp} />
                        {comment.totalCurtidas > 0 && <span>{comment.totalCurtidas}</span>}
                    </button>
                    <button className="comment-action-btn" onClick={() => onReply(comment.autorId, comment.nomeAutor)}>
                        <FontAwesomeIcon icon={faReply} />
                        Responder
                    </button>
                </div>
                
                {replies && replies.length > 0 && (
                    <button className="comment-view-replies" onClick={() => setShowReplies(!showReplies)}>
                        {showReplies ? 'Ocultar' : `Ver ${replies.length} respostas`}
                    </button>
                )}

                {showReplies && replies.map(reply => (
                    <Comment
                        key={reply.id}
                        comment={reply}
                        currentUser={currentUser}
                        onLikeComment={onLikeComment}
                        onReply={onReply}
                        allComments={allComments} // Passa a lista completa
                    />
                ))}
            </div>
        </div>
    );
};

// =================================================================
// SUB-COMPONENTE: CommentSection (COPIADO DO MAINCONTENT)
// =================================================================
const CommentSection = ({ postId, comments, currentUser, stompClient, isConnected, onLikeComment }) => {
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [replyTo, setReplyTo] = useState(null); // { id, nome }

    // Lógica de enviar comentário
    const handleCommentSubmit = (e) => {
        e.preventDefault();
        if (!stompClient || !isConnected || !newComment.trim()) return;

        setIsSubmitting(true);
        
        const destination = `/app/chat.sendComment`;
        const payload = {
            conteudo: newComment,
            autorId: currentUser.id,
            postagemId: postId,
            parentId: replyTo ? replyTo.id : null 
        };

        stompClient.send(destination, {}, JSON.stringify(payload));
        
        setNewComment("");
        setReplyTo(null);
        setIsSubmitting(false);
    };

    const handleReply = (autorId, nomeAutor) => {
        setReplyTo({ id: autorId, nome: nomeAutor });
    };

    const rootComments = buildCommentTree(comments, null); // Apenas comentários principais
    const userImage = getCorrectImageUrl(currentUser.urlFotoPerfil);

    return (
        <div className="comment-section">
            <form onSubmit={handleCommentSubmit} className="comment-form">
                <img 
                    src={userImage} 
                    alt="Seu avatar" 
                    className="comment-author-img" 
                />
                <div className="comment-input-wrapper">
                    <input
                        type="text"
                        placeholder={replyTo ? `Respondendo a ${replyTo.nome}...` : "Escreva um comentário..."}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        disabled={isSubmitting}
                    />
                    <button type="submit" disabled={isSubmitting}>
                        <FontAwesomeIcon icon={isSubmitting ? faSpinner : faPaperPlane} spin={isSubmitting} />
                    </button>
                </div>
            </form>
            {replyTo && (
                <button className="cancel-reply-btn" onClick={() => setReplyTo(null)}>
                    Cancelar Resposta
                </button>
            )}

            <div className="comment-list">
                {rootComments.map(comment => (
                    <Comment
                        key={comment.id}
                        comment={comment}
                        currentUser={currentUser}
                        onLikeComment={onLikeComment}
                        onReply={handleReply}
                        allComments={comments} // Passa a lista completa
                    />
                ))}
            </div>
        </div>
    );
};

// =========================================================================
// ✅ SUB-COMPONENTE: PostagemItem (Idêntico ao MainContent)
// =========================================================================
const PostagemItem = ({
    post,
    loggedInUser,
    activeCommentBox,
    handleToggleComments,
    handleLike,
    handleLikeComment,
    currentUser, 
    stompClient,
    isConnected
}) => {

    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const scrollerRef = useRef(null);

    const handleMediaScroll = () => {
        if (scrollerRef.current) {
            const scrollLeft = scrollerRef.current.scrollLeft;
            const itemWidth = scrollerRef.current.clientWidth;
            const newIndex = Math.round(scrollLeft / itemWidth);
            setCurrentMediaIndex(newIndex);
        }
    };

    const scrollMedia = (direction) => {
        if (scrollerRef.current) {
            const itemWidth = scrollerRef.current.clientWidth;
            const newScrollLeft = scrollerRef.current.scrollLeft + direction * itemWidth;
            scrollerRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
        }
    };

    const autorImage = getCorrectImageUrl(post.urlFotoAutor);
    const isMyPost = loggedInUser && loggedInUser.id === post.autorId;
    const totalCurtidas = post.totalCurtidas || 0;
    const totalComentarios = post.comentarios?.length || 0;

    return (
        <div className="post-card">
            <div className="post-header">
                <Link to={`/perfil/${post.autorId}`} className="post-author-link">
                    <img src={autorImage} alt={post.nomeAutor} className="post-author-img" />
                    <div className="post-author-info">
                        <strong>{post.nomeAutor}</strong>
                        <span>{formatarData(post.dataCriacao)}</span>
                    </div>
                </Link>
                {isMyPost && (
                    <button className="post-options-btn">
                        <FontAwesomeIcon icon={faEllipsisH} />
                    </button>
                )}
            </div>

            <div className="post-content">
                <p>{post.conteudo}</p>
            </div>

            {post.urlsMidia && post.urlsMidia.length > 0 && (
                <div className="post-media-container">
                    {post.urlsMidia.length > 1 && currentMediaIndex > 0 && (
                        <button className="media-nav-btn prev" onClick={() => scrollMedia(-1)}>
                            <FontAwesomeIcon icon={faChevronLeft} />
                        </button>
                    )}
                    <div className="post-media-scroller" ref={scrollerRef} onScroll={handleMediaScroll}>
                        {post.urlsMidia.map((url, index) => (
                            <div key={index} className="post-media-item">
                                <img src={url} alt={`Mídia ${index + 1}`} />
                            </div>
                        ))}
                    </div>
                    {post.urlsMidia.length > 1 && currentMediaIndex < post.urlsMidia.length - 1 && (
                        <button className="media-nav-btn next" onClick={() => scrollMedia(1)}>
                            <FontAwesomeIcon icon={faChevronRight} />
                        </button>
                    )}
                    {post.urlsMidia.length > 1 && (
                        <div className="media-dots">
                            {post.urlsMidia.map((_, index) => (
                                <span key={index} className={`dot ${index === currentMediaIndex ? 'active' : ''}`}></span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            

            <div className="post-actions">
                <button
                    onClick={() => handleLike(post.id)}
                    className={post.curtidoPeloUsuario ? "liked" : ""}
                >
                    <FontAwesomeIcon icon={faThumbsUp} />
                    Curtir
                </button>
                <button onClick={() => handleToggleComments(post.id)}>
                    <FontAwesomeIcon icon={faComment} />
                    Comentar
                </button>
            </div>

            {/* AQUI ESTÁ A MÁGICA: Ele chama o CommentSection que está NESTE ARQUIVO */}
            {activeCommentBox === post.id && (
                <CommentSection
                    postId={post.id}
                    comments={post.comentarios || []}
                    currentUser={currentUser}
                    stompClient={stompClient}
                    isConnected={isConnected}
                    onLikeComment={handleLikeComment}
                />
            )}
        </div>
    );
};
// =========================================================================
// ✅ FIM DO PostagemItem
// =========================================================================


// =========================================================================
// ✅ COMPONENTE PRINCIPAL: Perfil (AGORA COM A LÓGICA DE COMENTÁRIOS)
// =========================================================================
const Perfil = ({ onLogout }) => {
    const [profileData, setProfileData] = useState(null);
    const [loggedInUser, setLoggedInUser] = useState(null);
    const [postagens, setPostagens] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const { userId } = useParams();
    

    // --- Lógica de Comentários e Likes (copiada do MainContent) ---
    const { stompClient, isConnected } = useWebSocket();
    const [activeCommentBox, setActiveCommentBox] = useState(null);

   const handleToggleComments = (postId) => {
        setActiveCommentBox((prev) => (prev === postId ? null : postId));
    };

    const handleLike = (postId) => {
        if (!stompClient || !isConnected) {
            console.error("Stomp client não conectado");
            return;
        }
        const payload = {
            tipo: "POST", // 'POST' para postagem
            id: postId,
            usuarioId: loggedInUser.id, // Use loggedInUser que já existe no Perfil
        };
        stompClient.send("/app/chat.toggleLike", {}, JSON.stringify(payload));
    };

    const handleLikeComment = (commentId) => {
        if (!stompClient || !isConnected) {
            console.error("Stomp client não conectado");
            return;
        }
        const payload = {
            tipo: "COMENTARIO",
            id: commentId,
            usuarioId: loggedInUser.id, // Use loggedInUser
        };
        stompClient.send("/app/chat.toggleLike", {}, JSON.stringify(payload));
    };
    // --- Fim da Lógica ---

    // --- Função para buscar os dados ---
    const fetchPageData = async () => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            onLogout();
            return;
        }
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setIsLoading(true);
        setPostagens([]);

        let meResponse;
        try {
            meResponse = await axios.get('http://localhost:8080/usuarios/me');
            setLoggedInUser(meResponse.data);
        } catch (error) {
            console.error("Erro ao buscar usuário logado:", error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                onLogout();
            }
            return;
        }

        const apiUrl = userId
            ? `http://localhost:8080/usuarios/${userId}`
            : 'http://localhost:8080/usuarios/me';
        let perfilId;

        try {
            const profileResponse = await axios.get(apiUrl);
            setProfileData(profileResponse.data);
            perfilId = profileResponse.data.id;
            document.title = `Senai Community | ${profileResponse.data.nome}`;
        } catch (error) {
            console.error("Erro ao buscar dados do perfil:", error);
            setIsLoading(false);
            return;
        }

        if (perfilId) {
            try {
                const postagensResponse = await axios.get(`http://localhost:8080/postagem/usuario/${perfilId}`);
                // Ordena os comentários de cada postagem
                const postsComComentariosOrdenados = postagensResponse.data.map(post => ({
                    ...post,
                    comentarios: post.comentarios.sort((a, b) => {
                        if (a.destacado !== b.destacado) return b.destacado ? 1 : -1;
                        return new Date(a.dataCriacao) - new Date(b.dataCriacao);
                    })
                }));
                setPostagens(postsComComentariosOrdenados);
            } catch (error) {
                console.error("Erro ao buscar postagens do usuário:", error);
            }
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchPageData();
    }, [onLogout, userId]);

    // --- Função para Salvar Perfil ---
    const handleSaveProfile = async (novosDados) => {
        const { nome, bio, arquivoFoto } = novosDados;
        const token = localStorage.getItem('authToken');
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setIsSaving(true);
        try {
            await axios.put('http://localhost:8080/usuarios/me', { nome, bio });
            if (arquivoFoto) {
                const formData = new FormData();
                formData.append('foto', arquivoFoto);
                await axios.put('http://localhost:8080/usuarios/me/foto', formData);
            }
            await fetchPageData();
            setIsModalOpen(false);
        } catch (error) {
            console.error("Erro ao salvar perfil:", error);
        } finally {
            setIsSaving(false);
        }
    };

    // --- Renderização ---
    if (isLoading || !profileData || !loggedInUser) {
        return <div>Carregando perfil...</div>;
    }

    let userImage;
    if (profileData.urlFotoPerfil && profileData.urlFotoPerfil.startsWith('http')) {
        userImage = profileData.urlFotoPerfil;
    } else if (profileData.urlFotoPerfil) {
        userImage = `http://localhost:8080${profileData.urlFotoPerfil}`;
    } else {
        userImage = "https://via.placeholder.com/150";
    }

    const userDob = profileData.dataNascimento
        ? new Date(profileData.dataNascimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
        : 'Não informado';

    const isMyProfile = loggedInUser.id === profileData.id;

    return (
        <>
            <Topbar
                onLogout={onLogout}
                currentUser={loggedInUser}
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
                    currentUser={loggedInUser}
                    isOpen={isSidebarOpen}
                />

                <main className="main-content">
                    <div className="profile-page">
                        <div className="profile-header">
                            <div className="profile-banner"></div>
                            <div className="profile-details">
                                <div className="profile-picture-container">
                                    <img src={userImage} alt="Foto do Perfil" id="profile-pic-img" />
                                </div>
                                <div className="profile-info-actions">
                                    <div className="profile-info">
                                        <h1 id="profile-name">{profileData.nome}</h1>
                                        <p id="profile-title">{profileData.tipoUsuario}</p>
                                    </div>
                                    {isMyProfile && (
                                        <div className="profile-actions">
                                            <button
                                                className="btn btn-primary"
                                                id="edit-profile-btn-page"
                                                onClick={() => setIsModalOpen(true)}
                                                disabled={isSaving}
                                            >
                                                {isSaving ? 'Salvando...' : (
                                                    <><FontAwesomeIcon icon={faPen} /> Editar Perfil</>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="profile-body">
                            <div className="widget-card">
                                <h3>Sobre</h3>
                                <p id="profile-bio">{profileData.bio || 'Nenhuma bio informada.'}</p>
                                <ul className="profile-metadata">
                                    <li><FontAwesomeIcon icon={faEnvelope} /><span id="profile-email">{profileData.email}</span></li>
                                    <li><FontAwesomeIcon icon={faCalendarAlt} />Nascido em <span id="profile-dob">{userDob}</span></li>
                                </ul>
                            </div>

                            <div className="profile-posts-container">
                                <h3>Postagens de {profileData.nome.split(' ')[0]}</h3>
                                
                                {isLoading && postagens.length === 0 && <p>Carregando postagens...</p>}
                                
                                {!isLoading && postagens.length > 0 ? (
                                    <div className="feed-lista">
                                        {postagens.map(post => (
                                            <PostagemItem
                                                key={post.id}
                                                post={post}
                                                loggedInUser={loggedInUser}
                                                activeCommentBox={activeCommentBox}
                                                handleToggleComments={handleToggleComments}
                                                handleLike={handleLike}
                                                handleLikeComment={handleLikeComment}
                                                currentUser={loggedInUser}
                                                stompClient={stompClient}
                                                isConnected={isConnected}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    !isLoading && (
                                        <div className="widget-card">
                                            <p>{profileData.nome.split(' ')[0]} ainda não fez nenhuma postagem.</p>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                </main>
                <RightSidebar />
            </div>

            {isModalOpen && isMyProfile && (
                <EditarPerfilModal
                    user={profileData}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveProfile}
                />
            )}
        </>
    );
};

export default Perfil;