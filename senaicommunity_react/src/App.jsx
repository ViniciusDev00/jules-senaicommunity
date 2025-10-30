import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthContext from './contexts/Auth/AuthContext';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';

// Importe as páginas de autenticação
import Login from './pages/Login/Login.jsx';
import Cadastro from './pages/Cadastro/Cadastro.jsx';

// Importe as outras páginas
import Principal from './pages/Principal/Principal.jsx';
import Perfil from './pages/Perfil/Perfil.jsx';
import Projetos from './pages/Projetos/Projetos.jsx';
import Vagas from './pages/Vagas/Vagas.jsx';
import Eventos from './pages/Eventos/Eventos.jsx';
import Mensagens from './pages/Mensagens/Mensagens.jsx';
import EncontrarPessoas from './pages/EncontrarPessoas/EncontrarPessoas.jsx';
import MinhasConexoes from './pages/MinhasConexoes/MinhasConexoes.jsx';
import Configuracoes from './pages/Configuracoes/Configuracoes.jsx';

function App() {
    const { token } = useContext(AuthContext);

    return (
        <Router>
            <Routes>
                {/* Rotas Públicas */}
                <Route path="/login" element={!token ? <Login /> : <Navigate to="/principal" />} />
                <Route path="/cadastro" element={!token ? <Cadastro /> : <Navigate to="/principal" />} />

                {/* Rotas Privadas */}
                <Route element={<ProtectedRoute />}>
                    <Route path="/principal" element={<Principal />} />
                    <Route path="/perfil" element={<Perfil />} />
                    <Route path="/projetos" element={<Projetos />} />
                    <Route path="/vagas" element={<Vagas />} />
                    <Route path="/eventos" element={<Eventos />} />
                    <Route path="/mensagens" element={<Mensagens />} />
                    <Route path="/encontrar-pessoas" element={<EncontrarPessoas />} />
                    <Route path="/conexoes" element={<MinhasConexoes />} />
                    <Route path="/configuracoes" element={<Configuracoes />} />
                </Route>

                {/* Rota Padrão */}
                <Route path="/" element={<Navigate to={token ? "/principal" : "/login"} />} />
            </Routes>
        </Router>
    );
}

export default App;
