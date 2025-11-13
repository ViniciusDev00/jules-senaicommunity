// senaicommunity_react/src/pages/Perfil/Perfil.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faCalendarAlt, faPen } from '@fortawesome/free-solid-svg-icons';

// Componentes de Layout (reaproveitados)
import Topbar from '../../components/Layout/Topbar';
import Sidebar from '../../components/Layout/Sidebar';

// Estilos
import '../../pages/Principal/Principal.css'; // Estilo principal do layout
import './Perfil.css'; // Estilos específicos da página de perfil
import EditarPerfilModal from './EditarPerfilModal'; // <-- ADICIONADO
import './EditarPerfilModal.css'; // <-- ADICIONADO

const Perfil = ({ onLogout }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false); // <-- ADICIONADO (Controla o modal)

    useEffect(() => {
        document.title = 'Senai Community | Meu Perfil';

        const fetchCurrentUser = async () => {
            const token = localStorage.getItem('authToken');
            if (!token) {
                onLogout();
                return;
            }
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            try {
                const response = await axios.get('http://localhost:8080/usuarios/me');
                setCurrentUser(response.data);
            } catch (error) {
                console.error("Erro ao buscar dados do usuário:", error);
                onLogout();
            } finally {
                setIsLoading(false);
            }
        };

        fetchCurrentUser();
    }, [onLogout]);

    // <-- ADICIONADO (Função para salvar os dados do modal SÓ NO FRONT-END) -->
    const handleSaveProfile = (novosDados) => {
        // Atualiza o estado 'currentUser' com os novos dados
        setCurrentUser(prevUser => ({
            ...prevUser,
            nome: novosDados.nome,
            urlFotoPerfil: novosDados.urlFotoPerfil, // A URL aqui é o 'preview' (pode ser blob: ou a URL antiga)
            bio: novosDados.bio
        }));
        
        // Fecha o modal
        setIsModalOpen(false);
        
        // No futuro, você adicionará o axios.put() aqui
        // console.log("Novos dados para enviar ao backend:", novosDados);
    };
    // <-- FIM DA FUNÇÃO ADICIONADA -->

    if (isLoading || !currentUser) {
        return <div>Carregando perfil...</div>;
    }

    // ✅ CORREÇÃO PRINCIPAL AQUI
    // Esta lógica agora lida com caminhos relativos (do backend) e blobs (do modal).
    let userImage;
    if (currentUser.urlFotoPerfil && (currentUser.urlFotoPerfil.startsWith('http') || currentUser.urlFotoPerfil.startsWith('blob:'))) {
        // Se já for uma URL completa (blob ou http), use-a diretamente
        userImage = currentUser.urlFotoPerfil;
    } else if (currentUser.urlFotoPerfil) {
        // Se for um caminho relativo (ex: /uploads/...), adicione o host
        userImage = `http://localhost:8080${currentUser.urlFotoPerfil}`;
    } else {
        // Fallback se não houver foto
        userImage = "https://via.placeholder.com/150";
    }

    const userDob = currentUser.dataNascimento
        ? new Date(currentUser.dataNascimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
        : 'Não informado';

    return (
        <>
            <Topbar onLogout={onLogout} currentUser={currentUser} />
            <div className="container">
                <Sidebar currentUser={currentUser} />

                <main className="main-content">
                    <div className="profile-page">
                        <div className="profile-header">
                            <div className="profile-banner">
                                {/* Pode adicionar uma imagem de banner aqui se quiser */}
                            </div>
                            <div className="profile-details">
                                <div className="profile-picture-container">
                                    {/* A tag 'img' agora usa a variável 'userImage' corrigida */}
                                    <img src={userImage} alt="Foto do Perfil" id="profile-pic-img" />
                                </div>
                                <div className="profile-info-actions">
                                    <div className="profile-info">
                                        <h1 id="profile-name">{currentUser.nome}</h1>
                                        <p id="profile-title">{currentUser.tipoUsuario}</p>
                                    </div>
                                    <div className="profile-actions">
                                        {/* <-- MODIFICADO: Adicionado 'onClick' para abrir o modal --> */}
                                        <button 
                                            className="btn btn-primary" 
                                            id="edit-profile-btn-page" 
                                            onClick={() => setIsModalOpen(true)}
                                        >
                                            <FontAwesomeIcon icon={faPen} /> Editar Perfil
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="profile-body">
                            <div className="widget-card">
                                <h3>Sobre</h3>
                                <p id="profile-bio">{currentUser.bio || 'Nenhuma bio informada.'}</p>
                                <ul className="profile-metadata">
                                    <li><FontAwesomeIcon icon={faEnvelope} /><span id="profile-email">{currentUser.email}</span></li>
                                    <li><FontAwesomeIcon icon={faCalendarAlt} />Nascido em <span id="profile-dob">{userDob}</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* <-- ADICIONADO: Renderiza o modal se 'isModalOpen' for true --> */}
            {isModalOpen && (
                <EditarPerfilModal
                    user={currentUser}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveProfile}
                />
            )}
        </>
    );
};

export default Perfil;