// src/pages/Mensagens/InfoSidebar.jsx
import React from 'react';
import './InfoSidebar.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faUserFriends, faBell, faTrashAlt } from '@fortawesome/free-solid-svg-icons';

const InfoSidebar = ({ conversa, onClose }) => {
    if (!conversa) return null;

    const isGrupo = conversa.tipo === 'grupo';

    return (
        <aside className="info-sidebar">
            <header className="info-sidebar-header">
                <h3>{isGrupo ? 'Dados do Grupo' : 'Detalhes do Contato'}</h3>
                <button onClick={onClose} className="info-close-btn">
                    <FontAwesomeIcon icon={faTimes} />
                </button>
            </header>

            <div className="info-sidebar-content">
                <div className="info-profile-section">
                    <img src={conversa.avatar} alt={`Avatar de ${conversa.nome}`} className="info-avatar" />
                    <h2>{conversa.nome}</h2>
                    {isGrupo && <p className="info-description">{conversa.descricao}</p>}
                </div>

                {isGrupo && (
                    <div className="info-members-section">
                        <h4><FontAwesomeIcon icon={faUserFriends} /> Membros ({conversa.membros ? conversa.membros.length : 0})</h4>
                        <ul className="info-members-list">
                            {conversa.membros && conversa.membros.map(membro => (
                                <li key={membro.id}>
                                    {/* Supondo que o objeto 'membro' tenha 'fotoPerfil' e 'nome' */}
                                    <img src={membro.fotoPerfil ? `http://localhost:8080${membro.fotoPerfil}` : `https://i.pravatar.cc/32?u=${membro.id}`} alt={membro.nome} />
                                    <span>{membro.nome}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="info-actions-section">
                    <button className="info-action-btn">
                        <FontAwesomeIcon icon={faBell} /> Notificações
                    </button>
                    <button className="info-action-btn danger">
                        <FontAwesomeIcon icon={faTrashAlt} /> {isGrupo ? 'Sair do Grupo' : 'Bloquear'}
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default InfoSidebar;
