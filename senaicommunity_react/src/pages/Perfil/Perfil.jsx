// senaicommunity_react/src/pages/Perfil/Perfil.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faCalendarAlt, faPen } from '@fortawesome/free-solid-svg-icons';

// Componentes de Layout (reaproveitados)
import Topbar from '../../components/Layout/Topbar';
import Sidebar from '../../components/Layout/Sidebar';

// Estilos
import '../../pages/Principal/Principal.css';
import './Perfil.css';
import EditarPerfilModal from './EditarPerfilModal';
import './EditarPerfilModal.css';

const Perfil = ({ onLogout }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false); 

    const fetchCurrentUser = async () => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            onLogout(); // Se NÃO tem token, desloga (correto)
            return;
        }
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        try {
            const response = await axios.get('http://localhost:8080/usuarios/me');
            setCurrentUser(response.data);
        } catch (error) {
            console.error("Erro ao buscar dados do usuário:", error);
            
            // ✅ CORREÇÃO APLICADA AQUI (LINHA 35) ✅
            // Se o 'fetch' falhar (ex: erro 500), não queremos deslogar o usuário
            // que JÁ ESTÁ logado. Apenas logamos o erro.
            // onLogout(); // LINHA REMOVIDA
            
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        document.title = 'Senai Community | Meu Perfil';
        fetchCurrentUser();
    }, [onLogout]);

    
    // ===================================================================
    // FUNÇÃO handleSaveProfile CORRIGIDA
    // ===================================================================
    const handleSaveProfile = async (novosDados) => {
        const { nome, bio, arquivoFoto } = novosDados;
        const token = localStorage.getItem('authToken');
        
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        setIsSaving(true); 

        try {
            // --- 1. Atualizar Nome e Bio (Isto estava correto) ---
            await axios.put('http://localhost:8080/usuarios/me', { nome, bio });

            // --- 2. Atualizar Foto (SEÇÃO CORRIGIDA) ---
            if (arquivoFoto) {
                const formData = new FormData();
                
                // O back-end espera 'foto' (baseado no seu JS antigo)
                // O seu código React estava enviando 'file'
                formData.append('foto', arquivoFoto); 

                // A rota e o método corretos.
                // Esta rota atualiza a foto do usuário "logado" (me)
                await axios.put('http://localhost:8080/usuarios/me/foto', formData);
            }

            // --- 3. Refetchar dados do usuário (Isto estava correto) ---
            await fetchCurrentUser(); 
            setIsModalOpen(false); 
            
        } catch (error)
        {
            // O erro 404 não deve mais acontecer aqui
            console.error("Erro ao salvar perfil:", error);
        } finally {
            setIsSaving(false); 
        }
    };
    // ===================================================================
    // FIM DA CORREÇÃO
    // ===================================================================

    if (isLoading || !currentUser) {
        return <div>Carregando perfil...</div>;
    }

    // Lógica da imagem de perfil (sem alterações)
    let userImage;
    if (currentUser.urlFotoPerfil && (currentUser.urlFotoPerfil.startsWith('http') || currentUser.urlFotoPerfil.startsWith('blob:'))) {
        userImage = currentUser.urlFotoPerfil;
    } else if (currentUser.urlFotoPerfil) {
        userImage = `http://localhost:8080${currentUser.urlFotoPerfil}`;
    } else {
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
                            </div>
                            <div className="profile-details">
                                <div className="profile-picture-container">
                                    <img src={userImage} alt="Foto do Perfil" id="profile-pic-img" />
                                </div> 
                                <div className="profile-info-actions">
                                    <div className="profile-info">
                                        <h1 id="profile-name">{currentUser.nome}</h1>
                                        <p id="profile-title">{currentUser.tipoUsuario}</p>
                                    </div>
                                    <div className="profile-actions">
                                        <button 
                                            className="btn btn-primary" 
                                            id="edit-profile-btn-page" 
                                            onClick={() => setIsModalOpen(true)}
                                            disabled={isSaving} 
                                        >
                                            {isSaving ? 'Salvando...' : (
                                                <><FontAwesomeIcon icon={faPen} /> Editar Perfil</>
                                            )}
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

            {/* Renderização do Modal */}
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