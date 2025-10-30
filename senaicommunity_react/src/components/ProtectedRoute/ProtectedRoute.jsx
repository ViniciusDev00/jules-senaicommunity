import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import AuthContext from '../../contexts/Auth/AuthContext';

const ProtectedRoute = () => {
    const { token, loading } = useContext(AuthContext);

    if (loading) {
        // Exibe um spinner ou um componente de carregamento enquanto o estado de autenticação é verificado
        return <div>Carregando...</div>;
    }

    return token ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;
