// src/components/Layout/ConviteProjetoModal.jsx (CORRIGIDO - Importação do axios removida)

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faTimes, faSpinner } from '@fortawesome/free-solid-svg-icons';
import './ConviteProjetoModal.css'; // Importa o CSS

const ConviteProjetoModal = ({ convite, onClose, onAccept, onDecline }) => {
    const [isLoadingAccept, setIsLoadingAccept] = useState(false);
    const [isLoadingDecline, setIsLoadingDecline] = useState(false);
    
    // Estado para guardar o nome do projeto (será buscado na API)
    const [projetoNome, setProjetoNome] = useState('...');
    const [loadingProjetoInfo, setLoadingProjetoInfo] = useState(true);

    useEffect(() => {
        setLoadingProjetoInfo(true);
        // Tenta extrair o nome do projeto da mensagem
        const matchProjeto = convite.mensagem.match(/projeto '(.*?)'/);
        if (matchProjeto && matchProjeto[1]) {
            setProjetoNome(matchProjeto[1]);
            setLoadingProjetoInfo(false);
        } else {
             // Fallback se não conseguir extrair
             setProjetoNome("um novo projeto"); 
             setLoadingProjetoInfo(false);
        }
    }, [convite]);


    const handleAcceptClick = async () => {
        setIsLoadingAccept(true);
        try {
            // Chama a função passada pelo Topbar (é o Topbar que usa o axios)
            await onAccept(convite.conviteId);
            Swal.fire('Aceito!', 'Você entrou no projeto.', 'success');
        } catch (err) {
            console.error("Erro no handleAcceptClick (Modal):", err);
            const errorMsg = err.response?.data?.message || 'Não foi possível aceitar o convite.';
            Swal.fire('Erro', errorMsg, 'error');
            setIsLoadingAccept(false);
        } 
    };

    const handleDeclineClick = async () => {
        setIsLoadingDecline(true);
        try {
            // Chama a função passada pelo Topbar (é o Topbar que usa o axios)
            await onDecline(convite.conviteId);
            Swal.fire('Recusado', 'O convite foi recusado.', 'info');
        } catch (err) {
            console.error("Erro no handleDeclineClick (Modal):", err);
            const errorMsg = err.response?.data?.message || 'Não foi possível recusar o convite.';
            Swal.fire('Erro', errorMsg, 'error');
            setIsLoadingDecline(false);
        }
    };

    return (
        <div className="modal-overlay visible" onClick={onClose}>
            <div className="modal-content modal-convite" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Convite para Projeto</h2>
                    <button className="close-modal-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <p className="convite-remetente">
                        <strong>{convite.remetenteNome || 'Alguém'}</strong> convidou você para o projeto:
                    </p>
                    
                    <h3 className="convite-projeto-nome">
                        {loadingProjetoInfo ? <FontAwesomeIcon icon={faSpinner} spin /> : projetoNome}
                    </h3>
                    
                    <p className="convite-mensagem-original">"{convite.mensagem}"</p>

                </div>
                <div className="modal-footer footer-convite">
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