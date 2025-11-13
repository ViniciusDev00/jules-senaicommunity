package com.SenaiCommunity.BackEnd.Controller;

import com.SenaiCommunity.BackEnd.DTO.MensagemGrupoEntradaDTO;
import com.SenaiCommunity.BackEnd.DTO.MensagemGrupoSaidaDTO;
import com.SenaiCommunity.BackEnd.Service.MensagemGrupoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;
import java.util.NoSuchElementException;

@Controller
@PreAuthorize("hasRole('ALUNO') or hasRole('PROFESSOR')")
public class MensagemGrupoController {

    @Autowired
    private MensagemGrupoService mensagemGrupoService;

    @MessageMapping("/chat/grupo/{projetoId}")
    public void enviarParaGrupo(@DestinationVariable Long projetoId,
                                @Payload MensagemGrupoEntradaDTO dto,
                                Principal principal) {
        // O Service salva a mensagem E envia o eco para o tópico /topic/grupo/{projetoId}
        mensagemGrupoService.salvarMensagemGrupo(dto, projetoId, principal.getName());
    }

    // Classe interna para os endpoints REST (para Editar e Excluir)
    @RestController
    @RequestMapping("/api/chat/grupo")
    public static class MensagemGrupoRestController {

        @Autowired
        private MensagemGrupoService mensagemGrupoService;

        @Autowired
        private SimpMessagingTemplate messagingTemplate;

        @PutMapping("/{id}")
        public ResponseEntity<?> editarMensagem(@PathVariable Long id,
                                                @RequestBody String novoConteudo,
                                                Principal principal) {
            try {
                MensagemGrupoSaidaDTO mensagemAtualizada = mensagemGrupoService.editarMensagemGrupo(id, novoConteudo, principal.getName());
                // Envia a mensagem atualizada para o tópico
                messagingTemplate.convertAndSend("/topic/grupo/" + mensagemAtualizada.getGrupoId(), mensagemAtualizada);
                return ResponseEntity.ok(mensagemAtualizada);
            } catch (SecurityException e) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());

            } catch (NoSuchElementException e) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
            }
        }

        @DeleteMapping("/{id}")
        public ResponseEntity<?> excluirMensagem(@PathVariable Long id, Principal principal) {
            try {
                MensagemGrupoSaidaDTO mensagemExcluida = mensagemGrupoService.excluirMensagemGrupo(id, principal.getName());
                Long projetoId = mensagemExcluida.getGrupoId();
                // Envia a notificação de remoção para o tópico
                messagingTemplate.convertAndSend("/topic/grupo/" + projetoId, Map.of("tipo", "remocao", "id", id));
                return ResponseEntity.ok().build();
            } catch (SecurityException e) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
            } catch (NoSuchElementException e) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
            }
        }
    }
}