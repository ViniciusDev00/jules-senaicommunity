import React, { useState, useEffect } from 'react';
// Importa o WebSocketContext do local correto (.tsx)
import { useWebSocket } from '../../contexts/WebSocketContext.tsx'; 
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faImage, faThumbsUp, faComment, 
    faShareSquare, faEllipsisH, faSpinner, faTimesCircle
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

// =================================================================
// FUNÇÃO HELPER (A CORREÇÃO DEFINITIVA)
// =================================================================
/**
 * Trata as URLs de imagem do backend, que podem ser locais ou do Cloudinary.
 * @param {string} url - A URL da foto vinda do backend
 * @returns {string} - Uma URL de imagem válida.
 */
const getCorrectImageUrl = (url) => {
    const placeholder = 'https://via.placeholder.com/40'; // Placeholder padrão
    
    if (!url) {
        return placeholder;
    }
    
    // CASO 1: URL Completa (Cloudinary)
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url; 
    }
    
    // CASO 2: URL Local Correta (Salva com / no início - Ex: Professores)
    if (url.startsWith('/')) {
        return `http://localhost:8080${url}`; 
    }
    
    // ✅ CASO 3: DADO CORROMPIDO (Salvo sem / no início - O SEU BUG)
    return `http://localhost:8080/alunoPictures/${url}`; 
};


// =================================================================
// COMPONENTE POSTCREATOR
// =================================================================
const PostCreator = ({ currentUser }) => {
    const [postType, setPostType] = useState(null);
    const [postText, setPostText] = useState('');
    const [postFiles, setPostFiles] = useState([]); 
    const [isPublishing, setIsPublishing] = useState(false);

    const userImage = getCorrectImageUrl(currentUser?.urlFotoPerfil);

    const handleClose = () => {
        setPostType(null);
        setPostText('');
        setPostFiles([]);
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setPostFiles(prevFiles => [...prevFiles, ...Array.from(e.target.files)]);
        }
    };

    const handleRemoveFile = (indexToRemove) => {
        setPostFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
    };

    // Função de publicação alinhada com o Backend
    const handlePublish = async () => {
        const textIsEmpty = !postText.trim();
        const filesAreEmpty = postFiles.length === 0;

        if (textIsEmpty && filesAreEmpty) return;

        setIsPublishing(true);
        const formData = new FormData();
        
        const postData = { conteudo: postText };
        formData.append(
            "postagem", 
            new Blob([JSON.stringify(postData)], { type: "application/json" })
        );

        postFiles.forEach((file) => {
            formData.append("arquivos", file);
        });

        const endpoint = 'http://localhost:8080/postagem/upload-mensagem';

        try {
            await axios.post(endpoint, formData);
            handleClose(); 
        } catch (error) {
            console.error("Erro ao publicar:", error);
            alert("Não foi possível publicar a postagem.");
        } finally {
            setIsPublishing(false);
        }
    };

    // --- RENDERIZAÇÃO ---
    if (postType === null) {
        return (
            <div className="post-creator-simple">
                <div className="post-creator-trigger" onClick={() => setPostType('media')}>
                    <div className="avatar-small"><img src={userImage} alt="Seu Perfil" /></div>
                    <input type="text" placeholder="Começar publicação" readOnly />
                </div>
                {/* ✅ BOTÃO "MÍDIA" REMOVIDO (O div .post-options foi apagado) */}
            </div>
        );
    }

    // VISTA EXPANDIDA
    let title = "Publicar Postagem";
    let placeholder = `No que você está pensando, ${currentUser?.nome || ''}?`;
    
    return (
        <div className="post-creator-expanded" style={{ display: 'block' }}>
            <div className="editor-header"><h3>{title}</h3></div>
            <textarea
                className="editor-textarea"
                placeholder={placeholder}
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                autoFocus
            />

            <div className="file-uploader" style={{marginTop: '1rem'}}>
                
                {/* Botão "Mídia" para upload */}
                <label htmlFor="file-upload-input" className="file-upload-label">
                    <FontAwesomeIcon icon={faImage} />
                    <span>Mídia</span>
                </label>

                {/* Input original escondido */}
                <input
                    id="file-upload-input"
                    className="hidden-file-input"
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    multiple
                />
                
                {/* Visualização de arquivos */}
                {postFiles.length > 0 && (
                    <div className="selected-files-preview">
                        {postFiles.map((file, index) => (
                            <div key={index} className="file-preview-item">
                                {file.type.startsWith('image/') ? (
                                    <img 
                                        src={URL.createObjectURL(file)} 
                                        alt={file.name} 
                                    />
                                ) : (
                                    <video 
                                        src={URL.createObjectURL(file)} 
                                        controls={false} 
                                    />
                                )}
                                <button 
                                    type="button" 
                                    onClick={() => handleRemoveFile(index)} 
                                    className="remove-file-btn"
                                >
                                    <FontAwesomeIcon icon={faTimesCircle} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="post-editor-footer">
                <div className="editor-actions">
                    <button className="cancel-btn" onClick={handleClose} disabled={isPublishing}>Cancelar</button>
                    <button
                        className="publish-btn"
                        disabled={(!postText.trim() && postFiles.length === 0) || isPublishing}
                        onClick={handlePublish}
                    >
                        {isPublishing ? <FontAwesomeIcon icon={faSpinner} spin /> : "Publicar"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// =================================================================
// COMPONENTE MAINCONTENT (Renderização principal)
// =================================================================
const MainContent = ({ currentUser }) => {
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { stompClient, isConnected } = useWebSocket();

    // --- WebSocket useEffect ---
    useEffect(() => {
        const handleFeedUpdate = (message) => {
            try {
                const payload = JSON.parse(message.body); // Este é o PostagemSaidaDTO
                const postId = payload.id;
                if (!postId) return;

                if (payload.tipo === "remocao") { // Lógica de remoção
                    setPosts(currentPosts => 
                        currentPosts.filter(p => p.id !== postId)
                    );
                } else { // Lógica de Adicionar ou Atualizar
                    setPosts(currentPosts => {
                        const postIndex = currentPosts.findIndex(p => p.id === postId);
                        if (postIndex > -1) { // Atualiza post existente
                            const newPosts = [...currentPosts];
                            newPosts[postIndex] = payload;
                            return newPosts;
                        } else { // Adiciona novo post no topo
                            return [payload, ...currentPosts];
                        }
                    });
                }
            } catch (error) {
                console.error("Falha ao processar mensagem do WebSocket:", error);
            }
        };

        if (isConnected && stompClient) {
            const subscription = stompClient.subscribe('/topic/publico', handleFeedUpdate);
            return () => {
                subscription.unsubscribe();
            };
        }
    }, [isConnected, stompClient]);

    // --- Busca inicial de posts ---
    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const response = await axios.get('http://localhost:8080/api/chat/publico'); 
                const sortedPosts = response.data.sort(
                    (a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao)
                );
                setPosts(sortedPosts);
            } catch (error) {
                console.error("Erro ao carregar o feed:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPosts();
    }, []); // Executa apenas uma vez

    return (
        <main className="main-content">
            <div className="post-creator">
                <PostCreator currentUser={currentUser} />
            </div>
            <div className="feed-separator"><hr/></div>
            <div className="posts-container">
                {isLoading ? (
                    <p style={{textAlign: 'center', padding: '2rem'}}>
                        <FontAwesomeIcon icon={faSpinner} spin /> Carregando feed...
                    </p>
                ) : (
                    posts.map(post => {
                        const urlDoBackend = post.urlFotoAutor; 
                        const autorAvatar = getCorrectImageUrl(urlDoBackend);
                        
                        console.log(`--- POST ID: ${post.id} ---
Autor: ${post.nomeAutor}
URL vinda do Backend: ${urlDoBackend}
URL Final usada no <img>: ${autorAvatar}
`);

                        return (
                            <div className="post" key={post.id}>
                                <div className="post-header">
                                    <div className="post-author">
                                        <div className="post-icon"><img src={autorAvatar} alt={post.nomeAutor} /></div>
                                        <div className="post-info">
                                            <h2>{post.nomeAutor || 'Usuário'}</h2>
                                            <span>{new Date(post.dataCriacao).toLocaleString('pt-BR')}</span>
                                        </div>
                                    </div>
                                    <div className="post-options-btn"><FontAwesomeIcon icon={faEllipsisH} /></div>
                                </div>
                                
                                <p className="post-text">{post.conteudo}</p>
                                
                                {post.urlsMidia && post.urlsMidia.length > 0 && (
                                    <div className="post-images">
                                        {post.urlsMidia.map((url, index) => {
                                            const fullUrl = getCorrectImageUrl(url);
                                            
                                            if (fullUrl.match(/\.(mp4|webm|ogg)$/i)) {
                                                return <video key={index} src={fullUrl} controls style={{maxWidth: '100%', borderRadius: '8px'}} />;
                                            } else {
                                                return <img key={index} src={fullUrl} alt={`Mídia ${index + 1}`} />;
                                            }
                                        })}
                                    </div>
                                )}

                                <div className="post-actions">
                                    <button>
                                        <FontAwesomeIcon icon={faThumbsUp} /> 
                                        Curtir ({post.totalCurtidas || 0})
                                    </button>
                                    <button>
                                        <FontAwesomeIcon icon={faComment} /> 
                                        Comentar ({post.comentarios?.length || 0})
                                    </button>
                                    <button><FontAwesomeIcon icon={faShareSquare} /> Compartilhar</button>
                                </div>
                            </div>
                        );
                    })
                )}
                {!isLoading && posts.length === 0 && (
                     <p style={{textAlign: 'center', padding: '2rem'}}>Nenhuma publicação encontrada. Seja o primeiro a postar!</p>
                )}
            </div>
        </main>
    );
};

export default MainContent;