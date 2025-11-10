package com.SenaiCommunity.BackEnd.Controller;

import com.SenaiCommunity.BackEnd.DTO.ComentarioEntradaDTO;
import com.SenaiCommunity.BackEnd.DTO.ComentarioSaidaDTO;
import com.SenaiCommunity.BackEnd.DTO.PostagemSaidaDTO; // ✅ IMPORTAR
import com.SenaiCommunity.BackEnd.Service.ComentarioService;
import com.SenaiCommunity.BackEnd.Service.PostagemService; // ✅ IMPORTAR
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;
import java.util.NoSuchElementException;

@Controller
@PreAuthorize("hasRole('ALUNO') or hasRole('PROFESSOR')")
public class ComentarioController {

    @Autowired
    private ComentarioService comentarioService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private PostagemService postagemService; // ✅ INJETAR O SERVICE DE POSTAGEM

    // --- PARTE WEBSOCKET (para criar comentários em tempo real) ---
    @MessageMapping("/postagem/{postagemId}/comentar")
    @SendTo("/topic/postagem/{postagemId}/comentarios") // Envia o NOVO COMENTÁRIO para o tópico do post
    public ComentarioSaidaDTO novoComentario(@DestinationVariable Long postagemId,
                                             @Payload ComentarioEntradaDTO comentarioDTO,
                                             Principal principal) {

        // 1. Sua lógica original para criar o comentário (está perfeita)
        ComentarioSaidaDTO novoComentario = comentarioService.criarComentario(postagemId, principal.getName(), comentarioDTO);

        // 2. Lógica para notificar respostas (está perfeita)
        if (comentarioDTO.getParentId() != null) {
            Map<String, Object> payload = Map.of(
                    "tipo", "nova_resposta",
                    "comentario", novoComentario,
                    "postagemId", postagemId
            );
            messagingTemplate.convertAndSend("/topic/comentario/" + comentarioDTO.getParentId() + "/respostas", payload);
        }

        // =======================================================
        // ✅ CORREÇÃO DO BUG (POST SUMINDO) ✅
        // =======================================================

        // 3. Buscar o DTO da postagem ATUALIZADA (agora com o novo comentário)
        //    (usando o método do seu PostagemService)
        PostagemSaidaDTO postAtualizado = postagemService.buscarPostagemPorIdComComentarios(postagemId);

        // 4. Enviar o DTO COMPLETO para o tópico público
        //    O frontend vai receber isso e atualizar o post (com a nova contagem de comentários)
        messagingTemplate.convertAndSend("/topic/publico", postAtualizado);
        // =======================================================

        return novoComentario; // 5. Retorna o DTO do comentário para o @SendTo
    }

    // --- PARTE REST (endpoints para editar/excluir) ---
    // (O código da sua classe interna ComentarioRestController que enviei antes está correto)
    @RestController
    @RequestMapping("/comentarios")
    @PreAuthorize("hasRole('ALUNO') or hasRole('PROFESSOR')")
    public static class ComentarioRestController {

        @Autowired
        private ComentarioService comentarioService;

        @Autowired
        private PostagemService postagemService; // (Correto)

        @Autowired
        private SimpMessagingTemplate messagingTemplate;

        @PutMapping("/{id}/destacar")
        public ResponseEntity<?> destacarComentario(@PathVariable Long id, Principal principal) {
            try {
                ComentarioSaidaDTO comentarioAtualizado = comentarioService.destacarComentario(id, principal.getName());
                Long postagemId = comentarioAtualizado.getPostagemId();

                Map<String, Object> payload = Map.of(
                        "tipo", "destaque",
                        "comentario", comentarioAtualizado,
                        "postagemId", postagemId
                );
                messagingTemplate.convertAndSend("/topic/postagem/" + postagemId + "/comentarios", payload);

                // Envia o post completo para o feed público
                PostagemSaidaDTO postAtualizado = postagemService.buscarPostagemPorIdComComentarios(postagemId);
                messagingTemplate.convertAndSend("/topic/publico", postAtualizado);

                return ResponseEntity.ok(comentarioAtualizado);
            } catch (SecurityException e) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
            } catch (EntityNotFoundException | NoSuchElementException e) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
            }
        }

        @PutMapping("/{id}")
        public ResponseEntity<?> editarComentario(@PathVariable Long id,
                                                  @RequestBody ComentarioEntradaDTO dto,
                                                  Principal principal) {
            try {
                ComentarioSaidaDTO comentarioAtualizado = comentarioService.editarComentario(id, principal.getName(),dto.getConteudo());
                Long postagemId = comentarioAtualizado.getPostagemId();

                Map<String, Object> payload = Map.of(
                        "tipo", "edicao",
                        "comentario", comentarioAtualizado,
                        "postagemId", postagemId
                );
                messagingTemplate.convertAndSend("/topic/postagem/" + postagemId + "/comentarios", payload);
                messagingTemplate.convertAndSend("/topic/comentario/" + id + "/respostas", payload);

                // Envia o post completo para o feed público
                PostagemSaidaDTO postAtualizado = postagemService.buscarPostagemPorIdComComentarios(postagemId);
                messagingTemplate.convertAndSend("/topic/publico", postAtualizado);

                return ResponseEntity.ok(comentarioAtualizado);
            } catch (SecurityException e) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
            } catch (EntityNotFoundException | NoSuchElementException e) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
            }
        }

        @DeleteMapping("/{id}")
        public ResponseEntity<?> excluirComentario(@PathVariable Long id, Principal principal) {
            try {
                ComentarioSaidaDTO comentarioExcluido = comentarioService.excluirComentario(id, principal.getName());
                Long postagemId = comentarioExcluido.getPostagemId();

                Map<String, Object> payload = Map.of(
                        "tipo", "remocao",
                        "id", id, // ID do comentário
                        "postagemId", postagemId
                );
                messagingTemplate.convertAndSend("/topic/postagem/" + postagemId + "/comentarios", payload);
                messagingTemplate.convertAndSend("/topic/comentario/" + id + "/respostas", payload);

                // Envia o post completo para o feed público
                PostagemSaidaDTO postAtualizado = postagemService.buscarPostagemPorIdComComentarios(postagemId);
                messagingTemplate.convertAndSend("/topic/publico", postAtualizado);

                return ResponseEntity.ok().build();
            } catch (SecurityException e) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
            } catch (EntityNotFoundException | NoSuchElementException e) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
            }
        }
    }
}