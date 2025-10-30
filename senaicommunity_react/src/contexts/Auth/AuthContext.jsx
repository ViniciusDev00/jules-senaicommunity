import React, { createContext, useState, useEffect } from 'react';
import api from '../../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('authToken'));
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            if (token) {
                try {
                    // Endpoint para buscar dados do usuário logado (será criado no backend)
                    const response = await api.get('/api/usuarios/me');
                    setUser(response.data);
                } catch (error) {
                    console.error('Falha ao buscar usuário. Token inválido?', error);
                    // Se o token for inválido, limpa o estado
                    logout();
                }
            }
            setLoading(false);
        };

        fetchUser();
    }, [token]);

    const login = (newToken) => {
        localStorage.setItem('authToken', newToken);
        setToken(newToken);
    };

    const logout = () => {
        localStorage.removeItem('authToken');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ token, user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
