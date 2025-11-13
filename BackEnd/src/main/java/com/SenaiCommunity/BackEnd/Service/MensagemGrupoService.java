package com.SenaiCommunity.BackEnd.Service;

import com.SenaiCommunity.BackEnd.DTO.MensagemGrupoEntradaDTO;
import com.SenaiCommunity.BackEnd.DTO.MensagemGrupoSaidaDTO;
import com.SenaiCommunity.BackEnd.Entity.MensagemGrupo;
import com.SenaiCommunity.BackEnd.Entity.Projeto;
import com.SenaiCommunity.BackEnd.Entity.Usuario;
import com.SenaiCommunity.BackEnd.Repository.MensagemGrupoRepository;
import com.SenaiCommunity.BackEnd.Repository.ProjetoRepository;
import com.SenaiCommunity.BackEnd.Repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@Service
public class MensagemGrupoService {

    @Autowired
    private UsuarioRepository usuarioRepository;
    @Autowired
    private ProjetoRepository projetoRepository;
    @Autowired
    private MensagemGrupoRepository mensagemGrupoRepository;
    @Autowired
    private NotificacaoService notificacaoService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    private MensagemGrupoSaidaDTO toDTO(MensagemGrupo mensagem) {
        // Se o autor for null (mensagem de sistema), define como "Sistema"
        String nomeAutor = (mensagem.getAutor() != null) ? mensagem.getAutor().getNome() : "Sistema";
        Long autorId = (mensagem.getAutor() != null) ? mensagem.getAutor().getId() : null;

        return MensagemGrupoSaidaDTO.builder()
                .id(mensagem.getId())
                .conteudo(mensagem.getConteudo())
                .dataEnvio(mensagem.getDataEnvio())
                .grupoId(mensagem.getProjeto().getId())
                .autorId(autorId)
                .nomeAutor(nomeAutor)
                .dataEdicao(mensagem.getDataEdicao()) // Inclui o campo dataEdicao
                .build();
    }

    private MensagemGrupo toEntity(MensagemGrupoEntradaDTO dto, Usuario autor, Projeto projeto) {
        return MensagemGrupo.builder()
                .conteudo(dto.getConteudo())
                .dataEnvio(LocalDateTime.now())
                .projeto(projeto)
                .autor(autor)
                .build();
    }

    @Transactional
    public MensagemGrupoSaidaDTO salvarMensagemGrupo(MensagemGrupoEntradaDTO dto, Long projetoId, String autorUsername) {
        Usuario autor = usuarioRepository.findByEmail(autorUsername)
                .orElseThrow(() -> new NoSuchElementException("Usuário não encontrado"));

        Projeto projeto = projetoRepository.findById(projetoId)
                .orElseThrow(() -> new NoSuchElementException("Projeto não encontrado"));

        // Verifica se o autor é membro do projeto
        boolean isMember = projeto.getAlunos().stream().anyMatch(aluno -> aluno.getId().equals(autor.getId())) ||
                projeto.getProfessores().stream().anyMatch(prof -> prof.getId().equals(autor.getId()));

        if (!isMember) {
            // Verifica se é membro pelo repositório de membros (lógica mais recente)
            isMember = projeto.getMembros().stream().anyMatch(membro -> membro.getUsuario().getId().equals(autor.getId()));
        }

        if (!isMember) {
            throw new SecurityException("Acesso negado: você não é membro deste projeto.");
        }

        MensagemGrupo novaMensagem = toEntity(dto, autor, projeto);
        MensagemGrupo mensagemSalva = mensagemGrupoRepository.save(novaMensagem);

        MensagemGrupoSaidaDTO dtoSaida = toDTO(mensagemSalva);

        // Notifica todos os membros do projeto, exceto o próprio autor da mensagem.
        // Notifica Alunos
        projeto.getAlunos().stream()
                .filter(aluno -> !aluno.getId().equals(autor.getId()))
                .forEach(aluno -> notificacaoService.criarNotificacao(
                        aluno,
                        "Nova mensagem no projeto '" + projeto.getTitulo() + "': " + autor.getNome() + " disse..."
                ));

        // Notifica Professores
        projeto.getProfessores().stream()
                .filter(professor -> !professor.getId().equals(autor.getId()))
                .forEach(professor -> notificacaoService.criarNotificacao(
                        professor,
                        "Nova mensagem no projeto '" + projeto.getTitulo() + "': " + autor.getNome() + " disse..."
                ));

        // NOTIFICA O WEBSOCKET
        messagingTemplate.convertAndSend("/topic/grupo/" + projetoId, dtoSaida);

        return dtoSaida;
    }

    @Transactional
    public void criarMensagemDeSistema(Projeto projeto, String conteudo) {
        MensagemGrupo mensagemSistema = MensagemGrupo.builder()
                .conteudo(conteudo)
                .dataEnvio(LocalDateTime.now())
                .projeto(projeto)
                .autor(null) // Autor nulo indica mensagem do sistema
                .build();
        MensagemGrupo msgSalva = mensagemGrupoRepository.save(mensagemSistema);

        // Envia a mensagem de sistema para o tópico do grupo no WebSocket
        messagingTemplate.convertAndSend("/topic/grupo/" + projeto.getId(), toDTO(msgSalva));
    }


    @Transactional // ✅ Adicionado @Transactional para o save
    // ✅ CORRIGIDO: Retorna MensagemGrupoSaidaDTO
    public MensagemGrupoSaidaDTO editarMensagemGrupo(Long id, String novoConteudo, String autorUsername) {
        MensagemGrupo mensagem = mensagemGrupoRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Mensagem não encontrada"));
        if (!mensagem.getAutorUsername().equals(autorUsername)) {
            throw new SecurityException("Você não pode editar esta mensagem.");
        }
        mensagem.setConteudo(novoConteudo);
        mensagem.setDataEdicao(LocalDateTime.now()); // ✅ Adiciona data de edição
        MensagemGrupo mensagemAtualizada = mensagemGrupoRepository.save(mensagem);

        return toDTO(mensagemAtualizada); // ✅ Retorna o DTO
    }


    @Transactional // ✅ Adicionado @Transactional para o delete
    // ✅ CORRIGIDO: Retorna MensagemGrupoSaidaDTO (da mensagem excluída para pegar o grupoId)
    public MensagemGrupoSaidaDTO excluirMensagemGrupo(Long id, String autorUsername) {
        MensagemGrupo mensagem = mensagemGrupoRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Mensagem não encontrada"));

        if (!mensagem.getAutorUsername().equals(autorUsername)) {
            throw new SecurityException("Você não pode excluir esta mensagem.");
        }

        MensagemGrupoSaidaDTO dtoExcluido = toDTO(mensagem); // ✅ Converte ANTES de deletar

        mensagemGrupoRepository.delete(mensagem);

        return dtoExcluido; // ✅ Retorna o DTO
    }

    public List<MensagemGrupoSaidaDTO> buscarMensagensPorProjeto(Long projetoId) {
        List<MensagemGrupo> mensagens = mensagemGrupoRepository.findByProjetoIdOrderByDataEnvioAsc(projetoId);

        // Converte a lista de entidades para uma lista de DTOs antes de retornar
        return mensagens.stream()
                .map(this::toDTO) // Usa o método toDTO que você já criou
                .collect(Collectors.toList());
    }
}