import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('authToken'));
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            if (token) {
                try {
                    // Adiciona o token ao cabeçalho do axios para esta requisição
                    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

                    // Endpoint para buscar dados do usuário logado (será criado no backend)
                    const response = await axios.get('http://localhost:8080/api/usuarios/me');
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
        delete axios.defaults.headers.common['Authorization'];
    };

    return (
        <AuthContext.Provider value={{ token, user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
