// BackEnd/src/main/java/com/SenaiCommunity/BackEnd/Service/NotificacaoService.java
package com.SenaiCommunity.BackEnd.Service;

import com.SenaiCommunity.BackEnd.DTO.NotificacaoSaidaDTO;
import com.SenaiCommunity.BackEnd.Entity.Notificacao;
import com.SenaiCommunity.BackEnd.Entity.Usuario;
import com.SenaiCommunity.BackEnd.Repository.NotificacaoRepository;
import com.SenaiCommunity.BackEnd.Repository.UsuarioRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class NotificacaoService {

    @Autowired
    private NotificacaoRepository notificacaoRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // --- MÉTODO toDTO ATUALIZADO ---
    private NotificacaoSaidaDTO toDTO(Notificacao notificacao) {
        String remetenteNome = null;
        Long remetenteId = null;
        String remetenteFotoUrl = null;

        // Assumindo que a entidade Notificacao AGORA TEM um campo 'remetente'
        if (notificacao.getRemetente() != null) {
            remetenteId = notificacao.getRemetente().getId();
            remetenteNome = notificacao.getRemetente().getNome();
            if (notificacao.getRemetente().getFotoPerfil() != null && !notificacao.getRemetente().getFotoPerfil().isBlank()) {
                // Monta a URL completa para o frontend consumir
                remetenteFotoUrl = "/api/arquivos/" + notificacao.getRemetente().getFotoPerfil();
            }
        }

        return NotificacaoSaidaDTO.builder()
                .id(notificacao.getId())
                .mensagem(notificacao.getMensagem())
                .dataCriacao(notificacao.getDataCriacao())
                .lida(notificacao.isLida())
                .tipo(notificacao.getTipo() != null ? notificacao.getTipo() : "GERAL")
                .idReferencia(notificacao.getIdReferencia()) // Mantenha este ID para referência
                // Popula os novos campos
                .remetenteId(remetenteId)
                .remetenteNome(remetenteNome)
                .remetenteFotoUrl(remetenteFotoUrl)
                .build();
    }
    // --- FIM DA ATUALIZAÇÃO ---

    // --- MÉTODO criarNotificacao ATUALIZADO ---
    // Agora recebe o 'remetente'
    @Transactional
    public void criarNotificacao(Usuario destinatario, Usuario remetente, String mensagem, String tipo, Long idReferencia) {
        Notificacao notificacao = Notificacao.builder()
                .destinatario(destinatario)
                .remetente(remetente) // Associa o remetente
                .mensagem(mensagem)
                .dataCriacao(LocalDateTime.now())
                .tipo(tipo)
                .idReferencia(idReferencia) // Mantenha o ID de referência original
                .build();

        Notificacao notificacaoSalva = notificacaoRepository.save(notificacao);

        NotificacaoSaidaDTO dto = toDTO(notificacaoSalva); // Converte para o DTO atualizado

        // Envia via WebSocket para o destinatário específico
        messagingTemplate.convertAndSendToUser(
                destinatario.getEmail(), // Usa o email como identificador do usuário no STOMP
                "/queue/notifications", // Destino privado do usuário
                dto
        );
    }

    // Adapte os outros métodos que chamam criarNotificacao para passar o 'remetente'
    // Exemplo para o ProjetoService.enviarConvite:
    /*
        // Dentro de ProjetoService.enviarConvite
        notificacaoService.criarNotificacao(
            usuarioConvidado,
            usuarioConvidador, // Passa quem está convidando como remetente
            mensagem,
            "CONVITE_PROJETO",
            convite.getId() // <<<<<< IMPORTANTE: Passar o ID do CONVITE aqui!
        );
    */

    // Sobrecarga para notificações gerais (sem remetente específico, pode ser o sistema)
    public void criarNotificacao(Usuario destinatario, String mensagem) {
        criarNotificacao(destinatario, null, mensagem, "GERAL", null);
    }
    // --- FIM DA ATUALIZAÇÃO ---


    public List<NotificacaoSaidaDTO> buscarPorDestinatario(String emailDestinatario) {
        Usuario destinatario = usuarioRepository.findByEmail(emailDestinatario)
                .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado."));

        List<Notificacao> notificacoes = notificacaoRepository.findByDestinatarioOrderByDataCriacaoDesc(destinatario);

        return notificacoes.stream()
                .map(this::toDTO) // Usa o toDTO atualizado
                .collect(Collectors.toList());
    }

    @Transactional
    public void marcarComoLida(Long notificacaoId, String emailUsuarioLogado) {
        Notificacao notificacao = notificacaoRepository.findById(notificacaoId)
                .orElseThrow(() -> new EntityNotFoundException("Notificação não encontrada."));

        if (!notificacao.getDestinatario().getEmail().equals(emailUsuarioLogado)) {
            throw new SecurityException("Acesso negado. Você não pode alterar esta notificação.");
        }

        notificacao.setLida(true);
        notificacaoRepository.save(notificacao);
    }

    @Transactional
    public void marcarTodasComoLidas(String emailUsuarioLogado) {
        Usuario destinatario = usuarioRepository.findByEmail(emailUsuarioLogado)
                .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado com o email: " + emailUsuarioLogado));

        List<Notificacao> notificacoesNaoLidas = notificacaoRepository.findByDestinatarioAndLidaIsFalse(destinatario);

        if (!notificacoesNaoLidas.isEmpty()) {
            for (Notificacao notificacao : notificacoesNaoLidas) {
                notificacao.setLida(true);
            }
            notificacaoRepository.saveAll(notificacoesNaoLidas);
        }
    }
}