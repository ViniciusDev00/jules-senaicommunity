import React, { useState, useEffect } from "react";
// Importa o WebSocketContext do local correto (.tsx)
import { useWebSocket } from "../../contexts/WebSocketContext.tsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faImage,
  faThumbsUp,
  faComment,
  faEllipsisH,
  faSpinner,
  faTimesCircle,
  faPaperPlane,
  faChevronLeft,
  faChevronRight,
  faPen, // ✅ ÍCONE ADICIONADO
  faTrash, // ✅ ÍCONE ADICIONADO
  faTimes, // ✅ ÍCONE ADICIONADO
} from "@fortawesome/free-solid-svg-icons";
import axios from "axios";
import Swal from "sweetalert2"; // ✅ IMPORTADO PARA CONFIRMAÇÃO

// =================================================================
// FUNÇÃO HELPER (Para corrigir URLs de imagem)
// =================================================================
const getCorrectImageUrl = (url) => {
  const placeholder = "https://via.placeholder.com/40";

  if (!url) {
    return placeholder;
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  if (url.startsWith("blob:")) {
    // ✅ Adicionado para suportar previews de edição
    return url;
  }
  if (url.startsWith("/")) {
    return `http://localhost:8080${url}`;
  }
  return `http://localhost:8080/alunoPictures/${url}`;
};

// =================================================================
// FUNÇÃO HELPER (Para formatar a data)
// =================================================================
const formatTimeAgo = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) {
    return seconds + "s";
  }
  let interval = seconds / 31536000;
  if (interval > 1) {
    return Math.floor(interval) + "a";
  }
  interval = seconds / 2592000;
  if (interval > 1) {
    return Math.floor(interval) + "m";
  }
  interval = seconds / 86400;
  if (interval > 1) {
    return Math.floor(interval) + "d";
  }
  interval = seconds / 3600;
  if (interval > 1) {
    return Math.floor(interval) + "h";
  }
  interval = seconds / 60;
  if (interval > 1) {
    return Math.floor(interval) + "min";
  }
  return Math.floor(seconds) + "s";
};

// =================================================================
// COMPONENTE POSTCREATOR (O criador de postagens)
// =================================================================
const PostCreator = ({ currentUser }) => {
  const [postType, setPostType] = useState(null);
  const [postText, setPostText] = useState("");
  const [postFiles, setPostFiles] = useState([]);
  const [isPublishing, setIsPublishing] = useState(false);

  const userImage = getCorrectImageUrl(currentUser?.urlFotoPerfil);

  const handleClose = () => {
    setPostType(null);
    setPostText("");
    setPostFiles([]);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setPostFiles((prevFiles) => [
        ...prevFiles,
        ...Array.from(e.target.files),
      ]);
    }
  };

  const handleRemoveFile = (indexToRemove) => {
    setPostFiles((prevFiles) =>
      prevFiles.filter((_, index) => index !== indexToRemove)
    );
  };

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

    const endpoint = "http://localhost:8080/postagem/upload-mensagem";
    const token = localStorage.getItem("authToken");
    if (!token) {
      alert("Sua sessão expirou. Por favor, faça login novamente.");
      setIsPublishing(false);
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };

    try {
      await axios.post(endpoint, formData, { headers });
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
        <div
          className="post-creator-trigger"
          onClick={() => setPostType("media")}
        >
          <div className="avatar-small">
            <img src={userImage} alt="Seu Perfil" />
          </div>
          <input type="text" placeholder="Começar publicação" readOnly />
        </div>
      </div>
    );
  }

  // VISTA EXPANDIDA
  let title = "Publicar Postagem";
  let placeholder = `No que você está pensando, ${currentUser?.nome || ""}?`;

  return (
    <div className="post-creator-expanded" style={{ display: "block" }}>
      <div className="editor-header">
        <h3>{title}</h3>
      </div>
      <textarea
        className="editor-textarea"
        placeholder={placeholder}
        value={postText}
        onChange={(e) => setPostText(e.target.value)}
        autoFocus
      />
      <div className="file-uploader" style={{ marginTop: "1rem" }}>
        <label htmlFor="file-upload-input" className="file-upload-label">
          <FontAwesomeIcon icon={faImage} />
          <span>Mídia</span>
        </label>
        <input
          id="file-upload-input"
          className="hidden-file-input"
          type="file"
          accept="image/*,video/*"
          onChange={handleFileChange}
          multiple
        />
        {postFiles.length > 0 && (
          <div className="selected-files-preview">
            {postFiles.map((file, index) => (
              <div key={index} className="file-preview-item">
                {file.type.startsWith("image/") ? (
                  <img src={URL.createObjectURL(file)} alt={file.name} />
                ) : (
                  <video src={URL.createObjectURL(file)} controls={false} />
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
          <button
            className="cancel-btn"
            onClick={handleClose}
            disabled={isPublishing}
          >
            Cancelar
          </button>
          <button
            className="publish-btn"
            disabled={
              (!postText.trim() && postFiles.length === 0) || isPublishing
            }
            onClick={handlePublish}
          >
            {isPublishing ? (
              <FontAwesomeIcon icon={faSpinner} spin />
            ) : (
              "Publicar"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// =================================================================
// ✅ NOVO COMPONENTE: POSTEDITOR (para edição inline)
// =================================================================
const PostEditor = ({ post, onCancel, onSave }) => {
  const [editedText, setEditedText] = useState(post.conteudo);
  const [keptMediaUrls, setKeptMediaUrls] = useState(post.urlsMidia || []);
  const [newMediaFiles, setNewMediaFiles] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Limpa os ObjectURLs quando o componente é desmontado
  useEffect(() => {
    return () => {
      newMediaFiles.forEach((file) => URL.revokeObjectURL(file.preview));
    };
  }, [newMediaFiles]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesWithPreview = Array.from(e.target.files).map((file) =>
        Object.assign(file, {
          preview: URL.createObjectURL(file),
        })
      );
      setNewMediaFiles((prevFiles) => [...prevFiles, ...filesWithPreview]);
    }
  };

  const handleRemoveKeptUrl = (urlToRemove) => {
    setKeptMediaUrls(keptMediaUrls.filter((url) => url !== urlToRemove));
  };

  const handleRemoveNewFile = (indexToRemove) => {
    setNewMediaFiles((prevFiles) =>
      prevFiles.filter((_, index) => index !== indexToRemove)
    );
  };

  const handleSaveClick = async () => {
    setIsSaving(true);
    const formData = new FormData();

    // 1. Adiciona o conteúdo de texto
    const postData = { conteudo: editedText };
    formData.append(
      "postagem",
      new Blob([JSON.stringify(postData)], { type: "application/json" })
    );

    // 2. Adiciona as URLs das mídias antigas que devem ser mantidas
    // O backend deve esperar por isso
    formData.append("urlsMidiaParaManter", JSON.stringify(keptMediaUrls));

    // 3. Adiciona os novos arquivos de mídia
    newMediaFiles.forEach((file) => {
      formData.append("arquivos", file); // Envia o File object
    });

    // Chama a função onSave passada pelo MainContent
    await onSave(formData, post.id);

    setIsSaving(false);
  };

  const totalMedia = keptMediaUrls.length + newMediaFiles.length;

  return (
    <div className="post-editor-inline">
      <textarea
        className="editor-textarea"
        value={editedText}
        onChange={(e) => setEditedText(e.target.value)}
        autoFocus
      />

      <div className="edit-media-container">
        {/* Mídia existente (URLs) */}
        {keptMediaUrls.map((url, index) => {
          const fullUrl = getCorrectImageUrl(url);
          const isVideo = fullUrl.match(/\.(mp4|webm|ogg)$/i);
          return (
            <div key={`kept-${index}`} className="edit-media-item">
              {isVideo ? (
                <video src={fullUrl} controls={false} />
              ) : (
                <img src={fullUrl} alt={`Mídia existente ${index + 1}`} />
              )}
              {/* Só permite remover se houver mais de uma mídia total */}
              {totalMedia > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveKeptUrl(url)}
                  className="remove-media-btn"
                  title="Remover mídia"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              )}
            </div>
          );
        })}

        {/* Nova mídia (File objects com preview) */}
        {newMediaFiles.map((file, index) => {
          const isVideo = file.type.startsWith("video/");
          return (
            <div key={`new-${index}`} className="edit-media-item">
              {isVideo ? (
                <video src={file.preview} controls={false} />
              ) : (
                <img src={file.preview} alt={file.name} />
              )}
              <button
                type="button"
                onClick={() => handleRemoveNewFile(index)}
                className="remove-media-btn"
                title="Remover mídia"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="post-editor-footer">
        <div className="editor-actions-left">
          <label
            htmlFor={`edit-file-upload-${post.id}`}
            className="file-upload-label small"
          >
            <FontAwesomeIcon icon={faImage} />
            <span>Adicionar Mídia</span>
          </label>
          <input
            id={`edit-file-upload-${post.id}`}
            className="hidden-file-input"
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            multiple
          />
        </div>
        <div className="editor-actions">
          <button className="cancel-btn" onClick={onCancel} disabled={isSaving}>
            Cancelar
          </button>
          <button
            className="publish-btn"
            disabled={(!editedText.trim() && totalMedia === 0) || isSaving}
            onClick={handleSaveClick}
          >
            {isSaving ? <FontAwesomeIcon icon={faSpinner} spin /> : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
};

// =================================================================
// COMPONENTE: COMMENTSECTION (Sem alterações)
// =================================================================
const CommentSection = ({
  postId,
  comments = [],
  currentUser,
  stompClient,
  isConnected,
}) => {
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const userImage = getCorrectImageUrl(currentUser?.urlFotoPerfil);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    if (!isConnected || !stompClient) {
      alert("A conexão com o chat não está ativa. Tente novamente.");
      return;
    }
    setIsSubmitting(true);
    const payload = { conteudo: commentText, parentId: null };
    const destination = `/app/postagem/${postId}/comentar`;
    try {
      stompClient.publish({
        destination: destination,
        body: JSON.stringify(payload),
      });
      setCommentText("");
    } catch (error) {
      console.error("Erro ao enviar comentário via WebSocket:", error);
      alert("Falha ao comentar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="comment-section">
      <form className="comment-form" onSubmit={handleSubmitComment}>
        <div className="avatar-small">
          <img src={userImage} alt="Seu Perfil" />
        </div>
        <input
          type="text"
          placeholder="Escreva um comentário..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          disabled={isSubmitting || !isConnected}
        />
        <button
          type="submit"
          className="comment-submit-btn"
          disabled={isSubmitting || !commentText.trim() || !isConnected}
        >
          {isSubmitting ? (
            <FontAwesomeIcon icon={faSpinner} spin />
          ) : (
            <FontAwesomeIcon icon={faPaperPlane} />
          )}
        </button>
      </form>

      <div className="comment-list">
        {comments.length > 0 ? (
          comments.map((comment) => (
            <div className="comment-item" key={comment.id}>
              <div className="avatar-small">
                <img
                  src={getCorrectImageUrl(comment.urlFotoAutor)}
                  alt={comment.nomeAutor}
                />
              </div>
              <div className="comment-body">
                <div className="comment-content">
                  <strong>{comment.nomeAutor}</strong>
                  <p>{comment.conteudo}</p>
                </div>
                <div className="comment-actions-below">
                  <span>{formatTimeAgo(comment.dataCriacao)}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p
            style={{
              textAlign: "center",
              fontSize: "0.9em",
              color: "#888",
              paddingTop: "10px",
            }}
          >
            Nenhum comentário ainda.
          </p>
        )}
      </div>
    </div>
  );
};

// =================================================================
// COMPONENTE MAINCONTENT (Lógica principal atualizada)
// =================================================================
const MainContent = ({ currentUser }) => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { stompClient, isConnected } = useWebSocket();
  const [activeCommentBox, setActiveCommentBox] = useState(null);
  const [currentSlide, setCurrentSlide] = useState({});

  // ✅ NOVOS ESTADOS PARA EDIÇÃO E MENU
  const [activePostMenu, setActivePostMenu] = useState(null);
  const [editingPost, setEditingPost] = useState(null); // Guarda o post que está sendo editado

  // --- WebSocket useEffect (Lógica de atualização em tempo real) ---
  useEffect(() => {
    const handleFeedUpdate = (message) => {
      try {
        const payload = JSON.parse(message.body);

        if (payload.id && (payload.tipo === "atualizacao" || !payload.tipo)) {
          const updatedPost = payload.postagem || payload; // Aceita ambos os formatos
          const postId = updatedPost.id;

          setPosts((currentPosts) => {
            const postIndex = currentPosts.findIndex((p) => p.id === postId);

            if (postIndex > -1) {
              // Atualiza o post existente
              const newPosts = [...currentPosts];
              newPosts[postIndex] = updatedPost;
              return newPosts;
            } else {
              // É um post novo (de outro usuário)
              setCurrentSlide((prevSlides) => ({
                ...prevSlides,
                [updatedPost.id]: 0,
              }));
              return [updatedPost, ...currentPosts];
            }
          });
        } else if (payload.tipo === "remocao") {
          // Remove o post
          setPosts((currentPosts) =>
            currentPosts.filter((p) => p.id !== payload.postagemId)
          );
        }
      } catch (error) {
        console.error("Falha ao processar mensagem do WebSocket:", error);
      }
    };

    if (isConnected && stompClient) {
      const subscription = stompClient.subscribe(
        "/topic/publico",
        handleFeedUpdate
      );
      return () => {
        if (subscription) {
          subscription.unsubscribe();
        }
      };
    }
  }, [isConnected, stompClient]);

  // --- Busca inicial de posts ---
  useEffect(() => {
    const fetchPosts = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setIsLoading(false);
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };

      try {
        const response = await axios.get(
          "http://localhost:8080/api/chat/publico",
          { headers }
        );
        setPosts(response.data);
        const initialSlides = {};
        response.data.forEach((post) => {
          initialSlides[post.id] = 0;
        });
        setCurrentSlide(initialSlides);
      } catch (error) {
        console.error("Erro ao carregar o feed:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPosts();
  }, []);

  // =================================================================
  // HANDLERS (Funções de clique)
  // =================================================================

  const handleLike = async (postId) => {
    const likeEndpoint = `http://localhost:8080/curtidas/toggle`;
    const payload = { postagemId: postId, comentarioId: null };
    const token = localStorage.getItem("authToken");
    if (!token) return;
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    try {
      await axios.post(likeEndpoint, payload, { headers });
      // A atualização da UI virá via WebSocket
    } catch (error) {
      console.error("Erro ao curtir post:", error);
      alert("Não foi possível curtir a postagem.");
    }
  };

  const handleToggleComments = (postId) => {
    setActiveCommentBox((prevId) => (prevId === postId ? null : postId));
  };

  // ✅ NOVO: Abre/fecha o menu de 3 pontos
  const handleTogglePostMenu = (postId) => {
    setActivePostMenu((prevId) => (prevId === postId ? null : postId));
  };

  // ✅ NOVO: Define o post a ser editado
  const handleEditPost = (post) => {
    setEditingPost(post);
    setActivePostMenu(null); // Fecha o menu
  };

  // ✅ NOVO: Lida com a exclusão do post
  const handleDeletePost = async (postId) => {
    setActivePostMenu(null); // Fecha o menu

    const result = await Swal.fire({
      title: "Você tem certeza?",
      text: "Esta ação não pode ser revertida!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "var(--danger)",
      cancelButtonColor: "var(--bg-quaternary)",
      confirmButtonText: "Sim, excluir postagem",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      const deleteEndpoint = `http://localhost:8080/postagem/${postId}`;
      const token = localStorage.getItem("authToken");
      if (!token) {
        alert("Sessão expirada.");
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };

      try {
        await axios.delete(deleteEndpoint, { headers });
        // Remove o post do estado local (a notificação WS pode demorar)
        setPosts((prevPosts) => prevPosts.filter((p) => p.id !== postId));
        Swal.fire("Excluída!", "Sua postagem foi excluída.", "success");
      } catch (error) {
        console.error("Erro ao excluir post:", error);
        alert("Não foi possível excluir a postagem.");
      }
    }
  };

  // ✅ NOVO: Salva a edição
  const handleSaveEdit = async (formData, postId) => {
    const updateEndpoint = `http://localhost:8080/postagem/${postId}`;
    const token = localStorage.getItem("authToken");
    if (!token) {
      alert("Sessão expirada.");
      return;
    }

    // O FormData cuida do Content-Type
    const headers = { Authorization: `Bearer ${token}` };

    try {
      // Usamos PUT para atualização
      const response = await axios.put(updateEndpoint, formData, { headers });

      // Atualiza o post no estado local com a resposta do backend
      setPosts((prevPosts) =>
        prevPosts.map((p) => (p.id === postId ? response.data : p))
      );
      setEditingPost(null); // Fecha o modo de edição
    } catch (error) {
      console.error("Erro ao salvar edição:", error);
      alert("Não foi possível salvar as alterações.");
    }
  };

  // --- Funções do Carrossel (Sem alterações) ---
  const nextSlide = (postId, totalSlides) => {
    setCurrentSlide((prevSlides) => {
      const currentIndex = prevSlides[postId] || 0;
      const nextIndex = (currentIndex + 1) % totalSlides;
      return { ...prevSlides, [postId]: nextIndex };
    });
  };
  const prevSlide = (postId, totalSlides) => {
    setCurrentSlide((prevSlides) => {
      const currentIndex = prevSlides[postId] || 0;
      const prevIndex = (currentIndex - 1 + totalSlides) % totalSlides;
      return { ...prevSlides, [postId]: prevIndex };
    });
  };

  // =================================================================
  // RENDERIZAÇÃO
  // =================================================================
  return (
    <main className="main-content">
      <div className="post-creator">
        <PostCreator currentUser={currentUser} />
      </div>
      <div className="feed-separator">
        <hr />
      </div>
      <div className="posts-container">
        {isLoading ? (
          <p style={{ textAlign: "center", padding: "2rem" }}>
            <FontAwesomeIcon icon={faSpinner} spin /> Carregando feed...
          </p>
        ) : (
          posts.map((post) => {
            if (!post || !post.id) {
              return null;
            }

            // ✅ NOVO: Verifica se o post está sendo editado
            if (editingPost && editingPost.id === post.id) {
              return (
                <PostEditor
                  key={post.id}
                  post={editingPost}
                  onCancel={() => setEditingPost(null)}
                  onSave={handleSaveEdit}
                />
              );
            }

            // --- Renderização Padrão do Post ---
            const autorAvatar = getCorrectImageUrl(post.urlFotoAutor);
            const totalMidia = post.urlsMidia ? post.urlsMidia.length : 0;
            const currentPostSlide = currentSlide[post.id] || 0;

            return (
              <div className="post" key={post.id}>
                <div className="post-header">
                  <div className="post-author">
                    <div className="post-icon">
                      <img src={autorAvatar} alt={post.nomeAutor} />
                    </div>
                    <div className="post-info">
                      <h2>{post.nomeAutor || "Usuário"}</h2>
                      <span>{formatTimeAgo(post.dataCriacao)}</span>
                    </div>
                  </div>

                  {/* ✅ NOVO: Botão de 3 pontos e Dropdown */}
                  {currentUser && post.autorId === currentUser.id && (
                    <div
                      className="post-options-btn"
                      onClick={() => handleTogglePostMenu(post.id)}
                    >
                      <FontAwesomeIcon icon={faEllipsisH} />
                    </div>
                  )}

                  {activePostMenu === post.id && (
                    <div className="post-options-dropdown">
                      <button onClick={() => handleEditPost(post)}>
                        <FontAwesomeIcon icon={faPen} /> Editar Postagem
                      </button>
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="danger"
                      >
                        <FontAwesomeIcon icon={faTrash} /> Excluir Postagem
                      </button>
                    </div>
                  )}
                  {/* ✅ FIM DA ÁREA DO DROPDOWN */}
                </div>

                <p className="post-text">{post.conteudo}</p>

                {totalMidia > 0 && (
                  <div className="post-media-carousel">
                    {totalMidia > 1 && (
                      <button
                        className="carousel-button prev"
                        onClick={() => prevSlide(post.id, totalMidia)}
                      >
                        <FontAwesomeIcon icon={faChevronLeft} />
                      </button>
                    )}
                    <div
                      className="carousel-inner"
                      style={{
                        transform: `translateX(-${currentPostSlide * 100}%)`,
                      }}
                    >
                      {post.urlsMidia.map((url, index) => {
                        const fullUrl = getCorrectImageUrl(url);
                        const isVideo = fullUrl.match(/\.(mp4|webm|ogg)$/i);
                        return (
                          <div key={index} className="carousel-item">
                            {isVideo ? (
                              <video src={fullUrl} controls />
                            ) : (
                              <img src={fullUrl} alt={`Mídia ${index + 1}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {totalMidia > 1 && (
                      <button
                        className="carousel-button next"
                        onClick={() => nextSlide(post.id, totalMidia)}
                      >
                        <FontAwesomeIcon icon={faChevronRight} />
                      </button>
                    )}
                    {totalMidia > 1 && (
                      <div className="carousel-indicators">
                        {Array.from({ length: totalMidia }).map((_, idx) => (
                          <span
                            key={idx}
                            className={`indicator-dot ${
                              currentPostSlide === idx ? "active" : ""
                            }`}
                            onClick={() =>
                              setCurrentSlide((prevSlides) => ({
                                ...prevSlides,
                                [post.id]: idx,
                              }))
                            }
                          ></span>
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
                    Curtir ({post.totalCurtidas || 0})
                  </button>
                  <button onClick={() => handleToggleComments(post.id)}>
                    <FontAwesomeIcon icon={faComment} />
                    Comentar ({post.comentarios ? post.comentarios.length : 0})
                  </button>
                </div>

                {activeCommentBox === post.id && (
                  <CommentSection
                    postId={post.id}
                    comments={post.comentarios}
                    currentUser={currentUser}
                    stompClient={stompClient}
                    isConnected={isConnected}
                  />
                )}
              </div>
            );
          })
        )}
        {!isLoading && posts.length === 0 && (
          <p style={{ textAlign: "center", padding: "2rem" }}>
            Nenhuma publicação encontrada. Seja o primeiro a postar!
          </p>
        )}
      </div>
    </main>
  );
};

export default MainContent;
