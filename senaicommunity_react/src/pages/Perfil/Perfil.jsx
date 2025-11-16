    // senaicommunity_react/src/pages/Perfil/Perfil.jsx

    import React, { useState, useEffect } from 'react';
    import axios from 'axios';
    import { useParams } from 'react-router-dom';
    import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
    import { faEnvelope, faCalendarAlt, faPen } from '@fortawesome/free-solid-svg-icons';

    // Componentes de Layout
    import Topbar from '../../components/Layout/Topbar';
    import Sidebar from '../../components/Layout/Sidebar';
    import RightSidebar from '../../pages/Principal/RightSidebar'; 

    // Estilos
    import '../../pages/Principal/Principal.css'; 
    import './Perfil.css';
    import EditarPerfilModal from './EditarPerfilModal';
    import './EditarPerfilModal.css';

    const Perfil = ({ onLogout }) => {
        const [profileData, setProfileData] = useState(null); 
        const [loggedInUser, setLoggedInUser] = useState(null); 
        
        const [isLoading, setIsLoading] = useState(true);
        const [isModalOpen, setIsModalOpen] = useState(false);
        const [isSaving, setIsSaving] = useState(false); 
        const [isSidebarOpen, setIsSidebarOpen] = useState(false);

        const { userId } = useParams();

        const fetchPageData = async () => {
            const token = localStorage.getItem('authToken');
            if (!token) {
                onLogout();
                return;
            }
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            setIsLoading(true);

            // --- 1. Sempre buscar o usuário LOGADO (para Topbar/Sidebar) ---
            try {
                const meResponse = await axios.get('http://localhost:8080/usuarios/me');
                setLoggedInUser(meResponse.data);
            } catch (error) {
                console.error("Erro ao buscar usuário logado:", error);
                if (error.response?.status === 401 || error.response?.status === 403) {
                    onLogout(); 
                }
                return; 
            }

            // --- 2. Buscar o perfil a ser EXIBIDO ---
            const apiUrl = userId 
                ? `http://localhost:8080/usuarios/${userId}` 
                : 'http://localhost:8080/usuarios/me';

            try {
                const profileResponse = await axios.get(apiUrl);
                setProfileData(profileResponse.data);
                document.title = `Senai Community | ${profileResponse.data.nome}`;
            } catch (error) {
                console.error("Erro ao buscar dados do perfil:", error);
            } finally {
                setIsLoading(false);
            }
        };

        useEffect(() => {
            fetchPageData();
        }, [onLogout, userId]); 

        
        const handleSaveProfile = async (novosDados) => {
            const { nome, bio, arquivoFoto } = novosDados;
            const token = localStorage.getItem('authToken');
            
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            setIsSaving(true); 

            try {
                await axios.put('http://localhost:8080/usuarios/me', { nome, bio });

                if (arquivoFoto) {
                    const formData = new FormData();
                    formData.append('foto', arquivoFoto); 
                    await axios.put('http://localhost:8080/usuarios/me/foto', formData);
                }

                await fetchPageData(); 
                setIsModalOpen(false); 
                
            } catch (error)
            {
                console.error("Erro ao salvar perfil:", error);
            } finally {
                setIsSaving(false); 
            }
        };

        if (isLoading || !profileData || !loggedInUser) {
            return <div>Carregando perfil...</div>;
        }

        // ✅ ================================================================
        // ✅ CORREÇÃO APLICADA AQUI
        // ✅ O DTO (UsuarioSaidaDTO) envia 'urlFotoPerfil', não 'fotoPerfil'.
        // ✅ ================================================================
        let userImage;
        if (profileData.urlFotoPerfil && profileData.urlFotoPerfil.startsWith('http')) {
            userImage = profileData.urlFotoPerfil; // Foto do Cloudinary
        } else if (profileData.urlFotoPerfil) {
            userImage = `http://localhost:8080${profileData.urlFotoPerfil}`; // Foto local (fallback)
        } else {
            userImage = "https://via.placeholder.com/150"; // Foto placeholder
        }

        const userDob = profileData.dataNascimento
            ? new Date(profileData.dataNascimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
            : 'Não informado';

        const isMyProfile = loggedInUser.id === profileData.id;

        return (
            <>
                <Topbar 
                    onLogout={onLogout} 
                    currentUser={loggedInUser} 
                    onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                />

                {isSidebarOpen && (
                    <div 
                        className="sidebar-overlay"
                        onClick={() => setIsSidebarOpen(false)}
                    ></div>
                )}

                <div className="container">
                    <Sidebar 
                        currentUser={loggedInUser} 
                        isOpen={isSidebarOpen}
                    />

                    <main className="main-content">
                        <div className="profile-page">
                            <div className="profile-header">
                                <div className="profile-banner">
                                </div>
                                <div className="profile-details">
                                    <div className="profile-picture-container">
                                        {/* Esta 'userImage' agora vai ler a variável correta */}
                                        <img src={userImage} alt="Foto do Perfil" id="profile-pic-img" />
                                    </div> 
                                    <div className="profile-info-actions">
                                        <div className="profile-info">
                                            <h1 id="profile-name">{profileData.nome}</h1>
                                            <p id="profile-title">{profileData.tipoUsuario}</p>
                                        </div>
                                        
                                        {isMyProfile && (
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
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="profile-body">
                                <div className="widget-card">
                                    <h3>Sobre</h3>
                                    <p id="profile-bio">{profileData.bio || 'Nenhuma bio informada.'}</p>
                                    <ul className="profile-metadata">
                                        <li><FontAwesomeIcon icon={faEnvelope} /><span id="profile-email">{profileData.email}</span></li>
                                        <li><FontAwesomeIcon icon={faCalendarAlt} />Nascido em <span id="profile-dob">{userDob}</span></li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </main>

                    <RightSidebar />

                </div>

                {isModalOpen && isMyProfile && (
                    <EditarPerfilModal
                        user={profileData} 
                        onClose={() => setIsModalOpen(false)}
                        onSave={handleSaveProfile}
                    />
                )}
            </>
        );
    };

    export default Perfil;