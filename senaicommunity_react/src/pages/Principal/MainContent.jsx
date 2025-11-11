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
  faPaperPlane, // ✅ ÍCONE ADICIONADO
} from "@fortawesome/free-solid-svg-icons";
import axios from "axios";

// =================================================================
// FUNÇÃO HELPER (Para corrigir URLs de imagem)
// =================================================================
const getCorrectImageUrl = (url) => {
  const placeholder = "https://via.placeholder.com/40";

  if (!url) {
    return placeholder;
  }
  // O backend envia URLs de 2 formas: completas (Cloudinary) ou locais (/api/arquivos/...)
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  // Se for um caminho local, prefixamos com a URL do backend
  if (url.startsWith("/")) {
    return `http://localhost:8080${url}`;
  }
  // Fallback para um padrão antigo que você possa ter
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

  let interval = seconds / 31536000; // Anos
  if (interval > 1) {
    return Math.floor(interval) + "a";
  }
  interval = seconds / 2592000; // Meses
  if (interval > 1) {
    return Math.floor(interval) + "m"; // 'm' para meses
  }
  interval = seconds / 86400; // Dias
  if (interval > 1) {
    return Math.floor(interval) + "d";
  }
  interval = seconds / 3600; // Horas
  if (interval > 1) {
    return Math.floor(interval) + "h";
  }
  interval = seconds / 60; // Minutos
  if (interval > 1) {
    return Math.floor(interval) + "min"; // 'min' para minutos
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

  // Função de publicação (usa FormData)
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

    // Este endpoint é para UPLOAD (diferente de curtir)
    const endpoint = "http://localhost:8080/postagem/upload-mensagem";

    const token = localStorage.getItem("authToken");
    if (!token) {
      alert("Sua sessão expirou. Por favor, faça login novamente.");
      setIsPublishing(false);
      return;
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      // Não defina 'Content-Type', o FormData cuida disso
    };

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
// COMPONENTE: COMMENTSECTION (HTML e CSS atualizados)
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

    const payload = {
      conteudo: commentText,
      parentId: null,
    };

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

  // ✅ JSX DO FORMULÁRIO ATUALIZADO
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
        {/* ✅ BOTÃO ATUALIZADO (NÃO MAIS OCULTO) */}
        <button
          type="submit"
          className="comment-submit-btn" // Nova classe para estilizar
          disabled={isSubmitting || !commentText.trim() || !isConnected}
        >
          {isSubmitting ? (
            <FontAwesomeIcon icon={faSpinner} spin />
          ) : (
            <FontAwesomeIcon icon={faPaperPlane} />
          )}
        </button>
      </form>

      {/* ... (resto do .comment-list, que está correto) ... */}
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
// COMPONENTE MAINCONTENT (A lógica principal do feed)
// =================================================================
const MainContent = ({ currentUser }) => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { stompClient, isConnected } = useWebSocket();
  const [activeCommentBox, setActiveCommentBox] = useState(null);

  // --- WebSocket useEffect (A LÓGICA QUE CORRIGE O BUG) ---
  useEffect(() => {
    const handleFeedUpdate = (message) => {
      try {
        // ✅ O 'payload' agora é o PostagemSaidaDTO COMPLETO
        const payload = JSON.parse(message.body);

        // ✅ CORREÇÃO: O backend agora envia o Post completo em vez de {tipo: "edicao", postagem: ...}
        // Vamos checar se o payload é um post direto (novo post, curtida, comentário)
        if (payload.id && payload.tipo === "atualizacao") {
          const postId = payload.id;

          setPosts((currentPosts) => {
            const postIndex = currentPosts.findIndex((p) => p.id === postId);

            if (postIndex > -1) {
              // ===============================================
              // ✅ ✅ ✅ A CORREÇÃO DE AMBOS OS BUGS ✅ ✅ ✅
              // ===============================================
              // O 'payload' é o post COMPLETO e atualizado
              // enviado pelo CurtidaController OU ComentarioController.
              // Nós simplesmente o substituímos no array.
              const newPosts = [...currentPosts];
              newPosts[postIndex] = payload;
              return newPosts;
            } else {
              // É um post novo
              return [payload, ...currentPosts];
            }
          });
        } else if (payload.tipo === "remocao") {
          // Remove o post (lógica antiga ainda válida)
          setPosts(
            (currentPosts) =>
              currentPosts.filter((p) => p.id !== payload.postagemId) // Ajuste se o backend mandar 'id' ou 'postagemId'
          );
        } else if (payload.tipo === "edicao") {
          // Lógica de edição (se o backend mandar um payload diferente para edição)
          const postAtualizado = payload.postagem;
          setPosts((currentPosts) => {
            const postIndex = currentPosts.findIndex(
              (p) => p.id === postAtualizado.id
            );
            if (postIndex > -1) {
              const newPosts = [...currentPosts];
              newPosts[postIndex] = postAtualizado;
              return newPosts;
            }
            return currentPosts; // Não faz nada se o post editado não estava no feed
          });
        }
      } catch (error) {
        console.error("Falha ao processar mensagem do WebSocket:", error);
      }
    };

    if (isConnected && stompClient) {
      // Se inscreve no tópico público para receber todas as atualizações
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

  // --- Busca inicial de posts (ao carregar a página) ---
  useEffect(() => {
    const fetchPosts = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        alert("Sua sessão expirou. Por favor, faça login novamente.");
        setIsLoading(false);
        // TODO: Redirecionar para a página de login
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      try {
        // O backend (PostagemService) agora retorna os posts já com
        // 'curtidoPeloUsuario' calculado.
        const response = await axios.get(
          "http://localhost:8080/api/chat/publico",
          { headers }
        );

        // O backend já ordena, então só precisamos setar os dados
        setPosts(response.data);
      } catch (error) {
        console.error("Erro ao carregar o feed:", error);
        if (
          error.response &&
          (error.response.status === 401 || error.response.status === 403)
        ) {
          alert("Sua sessão expirou. Faça login novamente.");
          // TODO: Redirecionar para /login
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, []); // Executa apenas uma vez

  // =================================================================
  // HANDLERS (Funções de clique)
  // =================================================================

  const handleLike = async (postId) => {
    // Endpoint correto do CurtidaController
    const likeEndpoint = `http://localhost:8080/curtidas/toggle`;

    // Payload que o CurtidaEntradaDTO espera
    const payload = {
      postagemId: postId,
      comentarioId: null, // null porque é um like no POST
    };

    const token = localStorage.getItem("authToken");
    if (!token) {
      alert("Sua sessão expirou. Por favor, faça login novamente.");
      return;
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    try {
      // Esta chamada apenas "notifica" o backend
      await axios.post(likeEndpoint, payload, { headers });

      // Não fazemos mais nada aqui.
      // O backend vai enviar a mensagem WebSocket,
      // e o 'useEffect' acima vai cuidar da atualização.
      console.log(`Like/unlike enviado para o post ${postId}`);
    } catch (error) {
      console.error("Erro ao curtir post:", error);
      if (
        error.response &&
        (error.response.status === 401 || error.response.status === 403)
      ) {
        alert("Sua sessão expirou ou é inválida. Faça login novamente.");
      } else {
        alert("Não foi possível curtir a postagem.");
      }
    }
  };

  // Abre/Fecha a caixa de comentários
  const handleToggleComments = (postId) => {
    setActiveCommentBox((prevId) => (prevId === postId ? null : postId));
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
            // Proteção para evitar posts "quebrados"
            if (!post || !post.id) {
              return null;
            }

            const urlDoBackend = post.urlFotoAutor;
            const autorAvatar = getCorrectImageUrl(urlDoBackend);

            return (
              <div className="post" key={post.id}>
                <div className="post-header">
                  <div className="post-author">
                    <div className="post-icon">
                      <img src={autorAvatar} alt={post.nomeAutor} />
                    </div>
                    <div className="post-info">
                      <h2>{post.nomeAutor || "Usuário"}</h2>
                      {/* ✅ ALTERAÇÃO AQUI: Usando a nova função formatTimeAgo */}
                      <span>{formatTimeAgo(post.dataCriacao)}</span>
                    </div>
                  </div>
                  <div className="post-options-btn">
                    <FontAwesomeIcon icon={faEllipsisH} />
                  </div>
                </div>

                <p className="post-text">{post.conteudo}</p>

                {post.urlsMidia && post.urlsMidia.length > 0 && (
                  <div className="post-images">
                    {post.urlsMidia.map((url, index) => {
                      const fullUrl = getCorrectImageUrl(url);

                      if (fullUrl.match(/\.(mp4|webm|ogg)$/i)) {
                        return (
                          <video
                            key={index}
                            src={fullUrl}
                            controls
                            style={{ maxWidth: "100%", borderRadius: "8px" }}
                          />
                        );
                      } else {
                        return (
                          <img
                            key={index}
                            src={fullUrl}
                            alt={`Mídia ${index + 1}`}
                          />
                        );
                      }
                    })}
                  </div>
                )}

                <div className="post-actions">
                  {/* ======================================= */}
                  {/* ✅ BOTÃO AZUL (A MÁGICA DO CSS) ✅ */}
                  {/* ======================================= */}
                  <button
                    onClick={() => handleLike(post.id)}
                    // Adiciona a classe 'liked' se o backend disse que você curtiu
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
