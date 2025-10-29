// BackEnd/src/main/java/com/SenaiCommunity/BackEnd/DTO/NotificacaoSaidaDTO.java
package com.SenaiCommunity.BackEnd.DTO;

import com.SenaiCommunity.BackEnd.Entity.Notificacao;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificacaoSaidaDTO {

    private Long id;
    private String mensagem;
    private LocalDateTime dataCriacao; // Corrigido para dataCriacao (como está no seu Service)
    private boolean lida;
    private String tipo;
    private Long idReferencia; // ID da entidade relacionada (Projeto, Comentário, Amizade, etc.)

    // --- NOVOS CAMPOS ---
    private Long remetenteId;       // ID de quem originou a ação (quem convidou, comentou, etc.)
    private String remetenteNome;   // Nome de quem originou
    private String remetenteFotoUrl;// URL da foto de quem originou
    // --- FIM DOS NOVOS CAMPOS ---


    // Método de conversão estático (OPCIONAL, seu Service já tem um conversor)
    public static NotificacaoSaidaDTO fromEntity(Notificacao notificacao) {
        String fotoUrl = null;
        Long remetenteId = null;
        String remetenteNome = null;

        // Tenta obter o remetente (precisa adicionar a relação na entidade Notificacao)
        /*
        if (notificacao.getRemetente() != null) {
            remetenteId = notificacao.getRemetente().getId();
            remetenteNome = notificacao.getRemetente().getNome();
            if (notificacao.getRemetente().getFotoPerfil() != null && !notificacao.getRemetente().getFotoPerfil().isBlank()){
                 fotoUrl = "/api/arquivos/" + notificacao.getRemetente().getFotoPerfil();
            }
        }
        */

        return new NotificacaoSaidaDTO(
                notificacao.getId(),
                notificacao.getMensagem(),
                notificacao.getDataCriacao(),
                notificacao.isLida(),
                notificacao.getTipo(),
                notificacao.getIdReferencia(),
                // --- Passa os novos campos ---
                remetenteId,
                remetenteNome,
                fotoUrl
                // --- Fim ---
        );
    }
}