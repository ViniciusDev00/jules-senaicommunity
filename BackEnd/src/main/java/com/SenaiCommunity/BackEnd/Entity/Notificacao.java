// BackEnd/src/main/java/com/SenaiCommunity/BackEnd/Entity/Notificacao.java
package com.SenaiCommunity.BackEnd.Entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notificacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY) // Evita carregar o usuário desnecessariamente
    @JoinColumn(name = "destinatario_id", nullable = false)
    private Usuario destinatario;

    // --- NOVA RELAÇÃO ---
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "remetente_id") // Pode ser nulo (notificação do sistema)
    private Usuario remetente;
    // --- FIM DA NOVA RELAÇÃO ---

    private String mensagem;
    @Builder.Default // Garante que a data seja definida se não for passada no builder
    private LocalDateTime dataCriacao = LocalDateTime.now();
    @Builder.Default // Garante que 'lida' seja false por padrão
    private boolean lida = false;
    private String tipo; // Ex: "CONVITE_PROJETO", "PEDIDO_AMIZADE", "NOVA_MENSAGEM", "GERAL"
    private Long idReferencia; // ID da entidade principal relacionada (Projeto, Amizade, Mensagem, etc.)

}