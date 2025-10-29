// src/components/Layout/ConviteProjetoModal.tsx (NOVO E MELHORADO)

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faTimes, faSpinner, faEnvelopeOpenText } from '@fortawesome/free-solid-svg-icons';
import './ConviteProjetoModal.css'; // Importa o NOVO CSS

// Define o tipo de dados que o modal espera
interface Convite {
    id: any;
    conviteId: any;
    mensagem: string;
    remetenteNome?: string;
    remetenteFotoUrl?: string; // Espera a foto do remetente
}

interface ConviteProjetoModalProps {
    convite: Convite;
    onClose: () => void;
    onAccept: (conviteId: any) => Promise<void>; // Espera uma Promise
    onDecline: (conviteId: any) => Promise<void>; // Espera uma Promise
}

const ConviteProjetoModal: React.FC<ConviteProjetoModalProps> = ({ convite, onClose, onAccept, onDecline }) => {
    const [isLoadingAccept, setIsLoadingAccept] = useState(false);
    const [isLoadingDecline, setIsLoadingDecline] = useState(false);
    const [error, setError] = useState('');
    const [projetoNome, setProjetoNome] = useState('...');

    // Pega a foto do remetente ou um placeholder
    const fotoRemetente = convite.remetenteFotoUrl
        ? `http://localhost:8080${convite.remetenteFotoUrl}`
        : `https://i.pravatar.cc/80?u=${convite.id}`; // Usa o ID da notificação como fallback

    // Extrai o nome do projeto da mensagem
    useEffect(() => {
        const match = convite.mensagem.match(/projeto '(.*?)'/);
        if (match && match[1]) {
            setProjetoNome(match[1]);
        } else {
            setProjetoNome("este projeto"); // Fallback
        }
    }, [convite.mensagem]);

    const handleAcceptClick = async () => {
        setIsLoadingAccept(true);
        setError('');
        try {
            await onAccept(convite.conviteId); // Chama a função do Topbar
            Swal.fire('Aceito!', `Você entrou no projeto '${projetoNome}'.`, 'success');
            // O Topbar é quem fecha o modal (no 'onAccept')
        } catch (err: any) {
            console.error("Erro ao aceitar convite (Modal):", err);
            const errorMsg = err.response?.data?.message || 'Não foi possível aceitar o convite.';
            setError(errorMsg); // Mostra o erro no modal
            setIsLoadingAccept(false);
        }
    };

    const handleDeclineClick = async () => {
        setIsLoadingDecline(true);
        setError('');
        try {
            await onDecline(convite.conviteId); // Chama a função do Topbar
            Swal.fire('Recusado', 'O convite foi recusado.', 'info');
            // O Topbar é quem fecha o modal (no 'onDecline')
        } catch (err: any) {
            console.error("Erro ao recusar convite (Modal):", err);
            const errorMsg = err.response?.data?.message || 'Não foi possível recusar o convite.';
            setError(errorMsg);
            setIsLoadingDecline(false);
        }
    };

    return (
        <div className="modal-overlay convite-modal-overlay visible" onClick={onClose}>
            <div className="convite-modal-content" onClick={e => e.stopPropagation()}>
                
                <button className="convite-modal-close-btn" onClick={onClose} aria-label="Fechar modal">
                    <FontAwesomeIcon icon={faTimes} />
                </button>

                <div className="convite-modal-header">
                    <img 
                        src={fotoRemetente} 
                        alt={`Foto de ${convite.remetenteNome || 'Usuário'}`} 
                        className="convite-remetente-foto"
                    />
                    <h2>
                        <strong>{convite.remetenteNome || 'Alguém'}</strong> convidou você!
                    </h2>
                </div>

                <div className="convite-modal-body">
                    <p>
                        Você recebeu um convite para entrar no projeto: <strong>{projetoNome}</strong>
                    </p>
                    
                    {error && <p className="convite-error">{error}</p>}
                </div>

                <div className="convite-modal-actions">
                    <button
                        className="btn-convite btn-recusar"
                        onClick={handleDeclineClick}
                        disabled={isLoadingAccept || isLoadingDecline}
                    >
                        {isLoadingDecline ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faTimes} />}
                        Recusar
                    </button>
                    <button
                        className="btn-convite btn-aceitar"
                        onClick={handleAcceptClick}
                        disabled={isLoadingAccept || isLoadingDecline}
                    >
                        {isLoadingAccept ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faCheck} />}
                        Aceitar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConviteProjetoModal;