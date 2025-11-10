package com.SenaiCommunity.BackEnd.Service;

import com.SenaiCommunity.BackEnd.DTO.ComentarioSaidaDTO;
import com.SenaiCommunity.BackEnd.DTO.PostagemEntradaDTO;
import com.SenaiCommunity.BackEnd.DTO.PostagemSaidaDTO;
import com.SenaiCommunity.BackEnd.Entity.ArquivoMidia;
import com.SenaiCommunity.BackEnd.Entity.Postagem;
import com.SenaiCommunity.BackEnd.Entity.Usuario;
import com.SenaiCommunity.BackEnd.Repository.PostagemRepository;
import com.SenaiCommunity.BackEnd.Repository.UsuarioRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
// import org.springframework.messaging.simp.SimpMessagingTemplate; // Não é usado aqui
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.Comparator; // ✅ Import Adicionado (para ordenar comentários)


@Service
public class PostagemService {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PostagemRepository postagemRepository;

    @Autowired
    private ArquivoMidiaService midiaService;

    @Transactional
    public PostagemSaidaDTO criarPostagem(String autorUsername, PostagemEntradaDTO dto, List<MultipartFile> arquivos) {
        Usuario autor = usuarioRepository.findByEmail(autorUsername)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        Postagem novaPostagem = toEntity(dto, autor);

        if (arquivos != null && !arquivos.isEmpty()) {
            List<ArquivoMidia> midias = new ArrayList<>();
            for (MultipartFile file : arquivos) {
                try {
                    String url = midiaService.upload(file);
                    ArquivoMidia midia = ArquivoMidia.builder()
                            .url(url)
                            .tipo(midiaService.detectarTipoPelaUrl(url))
                            .postagem(novaPostagem)
                            .build();
                    midias.add(midia);
                } catch (IOException e) {
                    throw new RuntimeException("Erro ao fazer upload do arquivo: " + file.getOriginalFilename(), e);
                }
            }
            novaPostagem.setArquivos(midias);
        }

        Postagem postagemSalva = postagemRepository.save(novaPostagem);
        return toDTO(postagemSalva);
    }

    @Transactional
    public PostagemSaidaDTO editarPostagem(Long id, String username, PostagemEntradaDTO dto, List<MultipartFile> novosArquivos) {
        Postagem postagem = buscarPorId(id);

        if (!postagem.getAutor().getEmail().equals(username)) {
            throw new SecurityException("Você não pode editar esta postagem.");
        }

        postagem.setConteudo(dto.getConteudo());

        if (dto.getUrlsParaRemover() != null && !dto.getUrlsParaRemover().isEmpty()) {
            Set<String> urlsParaRemover = Set.copyOf(dto.getUrlsParaRemover());
            postagem.getArquivos().removeIf(arquivo -> {
                if (urlsParaRemover.contains(arquivo.getUrl())) {
                    try {
                        midiaService.deletar(arquivo.getUrl());
                        return true;
                    } catch (IOException e) {
                        System.err.println("Erro ao deletar arquivo do Cloudinary: " + arquivo.getUrl());
                        return false;
                    }
                }
                return false;
            });
        }

        if (novosArquivos != null && !novosArquivos.isEmpty()) {
            for (MultipartFile file : novosArquivos) {
                try {
                    String url = midiaService.upload(file);
                    ArquivoMidia midia = ArquivoMidia.builder()
                            .url(url)
                            .tipo(midiaService.detectarTipoPelaUrl(url))
                            .postagem(postagem)
                            .build();
                    postagem.getArquivos().add(midia);
                } catch (IOException e) {
                    throw new RuntimeException("Erro ao fazer upload do novo arquivo: " + file.getOriginalFilename(), e);
                }
            }
        }

        Postagem atualizada = postagemRepository.save(postagem);
        return toDTO(atualizada);
    }

    @Transactional
    public void excluirPostagem(Long id, String username) {
        Postagem postagem = buscarPorId(id);

        if (!postagem.getAutor().getEmail().equals(username)) {
            throw new SecurityException("Você não pode excluir esta postagem.");
        }

        if (postagem.getArquivos() != null && !postagem.getArquivos().isEmpty()) {
            for (ArquivoMidia midia : new ArrayList<>(postagem.getArquivos())) {
                try {
                    midiaService.deletar(midia.getUrl());
                } catch (Exception e) {
                    System.err.println("AVISO: Falha ao deletar arquivo no Cloudinary: " + midia.getUrl() + ". Erro: " + e.getMessage());
                }
            }
        }

        postagemRepository.deleteById(id);
    }

    public List<PostagemSaidaDTO> buscarPostagensPublicas() {
        List<Postagem> posts = postagemRepository.findTop50ByOrderByDataPostagemDesc();
        return posts.stream()
                .map(this::toDTO) // Perfeito, já usa seu toDTO
                .collect(Collectors.toList());
    }

    public Postagem buscarPorId(Long id) {
        return postagemRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Postagem não encontrada"));
    }

    public PostagemSaidaDTO ordenarComentarios(PostagemSaidaDTO postagem) {
        if (postagem.getComentarios() != null && !postagem.getComentarios().isEmpty()) {
            List<ComentarioSaidaDTO> comentariosOrdenados = postagem.getComentarios().stream()
                    .sorted((a, b) -> {
                        if (a.isDestacado() != b.isDestacado()) {
                            return Boolean.compare(b.isDestacado(), a.isDestacado());
                        }
                        return a.getDataCriacao().compareTo(b.getDataCriacao());
                    })
                    .collect(Collectors.toList());

            postagem.setComentarios(comentariosOrdenados);
        }
        return postagem;
    }

    public PostagemSaidaDTO buscarPostagemPorIdComComentarios(Long id) {
        Postagem postagem = postagemRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Postagem não encontrada com o ID: " + id));
        return toDTO(postagem); // Perfeito
    }

    private PostagemSaidaDTO toDTO(Postagem postagem) {
        List<String> urls = postagem.getArquivos() != null
                ? postagem.getArquivos().stream().map(ArquivoMidia::getUrl).collect(Collectors.toList())
                : Collections.emptyList();

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        final Long usuarioLogadoId = usuarioRepository.findByEmail(username)
                .map(Usuario::getId)
                .orElse(null);

        List<ComentarioSaidaDTO> comentariosDTO = postagem.getComentarios() != null
                ? postagem.getComentarios().stream().map(comentario -> {

            int totalCurtidasComentario = comentario.getCurtidas() != null ? comentario.getCurtidas().size() : 0;

            boolean curtidoPeloUsuarioComentario = false;
            if (usuarioLogadoId != null && comentario.getCurtidas() != null) {
                curtidoPeloUsuarioComentario = comentario.getCurtidas().stream()
                        .anyMatch(curtida -> curtida.getUsuario().getId().equals(usuarioLogadoId));
            }

            String nomeFotoComentario = comentario.getAutor().getFotoPerfil();
            String urlFotoComentarioCorrigida;
            if (nomeFotoComentario != null && !nomeFotoComentario.isBlank()) {
                if (nomeFotoComentario.startsWith("http")) {
                    urlFotoComentarioCorrigida = nomeFotoComentario;
                } else {
                    urlFotoComentarioCorrigida = "/api/arquivos/" + nomeFotoComentario;
                }
            } else {
                urlFotoComentarioCorrigida = "/images/default-avatar.jpg";
            }

            return ComentarioSaidaDTO.builder()
                    .id(comentario.getId())
                    .conteudo(comentario.getConteudo())
                    .dataCriacao(comentario.getDataCriacao())
                    .autorId(comentario.getAutor().getId())
                    .nomeAutor(comentario.getAutor().getNome())
                    .postagemId(comentario.getPostagem().getId())
                    .parentId(comentario.getParent() != null ? comentario.getParent().getId() : null)
                    .replyingToName(comentario.getParent() != null ? comentario.getParent().getAutor().getNome() : null)
                    .destacado(comentario.isDestacado())
                    .totalCurtidas(totalCurtidasComentario)
                    .curtidoPeloUsuario(curtidoPeloUsuarioComentario)
                    .urlFotoAutor(urlFotoComentarioCorrigida)
                    .build();

        }).collect(Collectors.toList())
                : Collections.emptyList();

        int totalCurtidasPostagem = postagem.getCurtidas() != null ? postagem.getCurtidas().size() : 0;
        boolean curtidoPeloUsuarioPostagem = false;
        if (usuarioLogadoId != null && postagem.getCurtidas() != null) {
            curtidoPeloUsuarioPostagem = postagem.getCurtidas().stream()
                    .anyMatch(c -> c.getUsuario().getId().equals(usuarioLogadoId));
        }

        String nomeFotoAutor = postagem.getAutor().getFotoPerfil();
        String urlFotoAutorCorrigida;
        if (nomeFotoAutor != null && !nomeFotoAutor.isBlank()) {
            if (nomeFotoAutor.startsWith("http")) {
                urlFotoAutorCorrigida = nomeFotoAutor;
            } else {
                urlFotoAutorCorrigida = "/api/arquivos/" + nomeFotoAutor;
            }
        } else {
            urlFotoAutorCorrigida = "/images/default-avatar.jpg";
        }

        return PostagemSaidaDTO.builder()
                .id(postagem.getId())
                .conteudo(postagem.getConteudo())
                .dataCriacao(postagem.getDataPostagem()) // Nota: aqui você usa dataPostagem
                .autorId(postagem.getAutor().getId())
                .nomeAutor(postagem.getAutor().getNome())
                .urlsMidia(urls)
                .comentarios(comentariosDTO)
                .totalCurtidas(totalCurtidasPostagem)
                .urlFotoAutor(urlFotoAutorCorrigida)
                .curtidoPeloUsuario(curtidoPeloUsuarioPostagem)
                .tipo("atualizacao") // ✅ ÚNICA LINHA ADICIONADA
                .build();
    }

    private Postagem toEntity(PostagemEntradaDTO dto, Usuario autor) {
        return Postagem.builder()
                .conteudo(dto.getConteudo())
                .dataPostagem(LocalDateTime.now())
                .autor(autor)
                .build();
    }
}