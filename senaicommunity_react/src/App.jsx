import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Importe as páginas de autenticação
import Login from './pages/Login/Login.jsx';
import Cadastro from './pages/Cadastro/Cadastro.jsx';

// ✅ IMPORTANDO TODAS AS SUAS PÁGINAS NOVAS
import Principal from './pages/Principal/Principal.jsx';
import Perfil from './pages/Perfil/Perfil.jsx';
import Projetos from './pages/Projetos/Projetos.jsx';
import Vagas from './pages/Vagas/Vagas.jsx';
import Eventos from './pages/Eventos/Eventos.jsx';
import Mensagens from './pages/Mensagens/Mensagens.jsx';
import EncontrarPessoas from './pages/EncontrarPessoas/EncontrarPessoas.jsx'; // Usando o componente mais novo
import MinhasConexoes from './pages/MinhasConexoes/MinhasConexoes.jsx'; // Usando o componente mais novo

// ✅ 1. IMPORTAÇÃO DA NOVA PÁGINA
import Configuracoes from './pages/Configuracoes/Configuracoes.jsx';

// Componente para proteger rotas
const PrivateRoute = ({ children }) => {
    const token = localStorage.getItem('authToken');
    return token ? children : <Navigate to="/login" />;
};

function App() {
    const [token, setToken] = useState(localStorage.getItem('authToken'));

    const handleLogin = (newToken) => {
        localStorage.setItem('authToken', newToken);
        setToken(newToken);
    };

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        setToken(null);
    };

    return (
        <Router>
            <Routes>
                {/* Rotas Públicas */}
                <Route path="/login" element={<Login onLogin={handleLogin} />} />
                <Route path="/cadastro" element={<Cadastro />} />
<<<<<<< HEAD

                {/* Rotas Privadas (dentro do PrivateRoute) */}
                <Route
=======
                
                {/* Rotas Privadas (dentro do PrivateRoute) */}
                <Route 
>>>>>>> main
                    path="/principal"
                    element={
                        <PrivateRoute>
                            <Principal onLogout={handleLogout} />
                        </PrivateRoute>
<<<<<<< HEAD
                    }
                />
                <Route
=======
                    } 
                />
                <Route 
>>>>>>> main
                    path="/perfil"
                    element={
                        <PrivateRoute>
                            <Perfil onLogout={handleLogout} />
                        </PrivateRoute>
<<<<<<< HEAD
                    }
                />

                {/* ✅ NOVAS ROTAS ADICIONADAS */}
                <Route
=======
                    } 
                />
                
                {/* ✅ NOVAS ROTAS ADICIONADAS */}
                <Route 
>>>>>>> main
                    path="/projetos"
                    element={
                        <PrivateRoute>
                            <Projetos onLogout={handleLogout} />
                        </PrivateRoute>
<<<<<<< HEAD
                    }
                />
                <Route
=======
                    } 
                />
                <Route 
>>>>>>> main
                    path="/vagas"
                    element={
                        <PrivateRoute>
                            <Vagas onLogout={handleLogout} />
                        </PrivateRoute>
<<<<<<< HEAD
                    }
                />
                <Route
=======
                    } 
                />
                <Route 
>>>>>>> main
                    path="/eventos"
                    element={
                        <PrivateRoute>
                            <Eventos onLogout={handleLogout} />
                        </PrivateRoute>
<<<<<<< HEAD
                    }
                />
                <Route
=======
                    } 
                />
                <Route 
>>>>>>> main
                    path="/mensagens"
                    element={
                        <PrivateRoute>
                            <Mensagens onLogout={handleLogout} />
                        </PrivateRoute>
<<<<<<< HEAD
                    }
                />
                <Route
=======
                    } 
                />
                <Route 
>>>>>>> main
                    path="/encontrar-pessoas"
                    element={
                        <PrivateRoute>
                            <EncontrarPessoas onLogout={handleLogout} />
                        </PrivateRoute>
<<<<<<< HEAD
                    }
                />
                <Route
=======
                    } 
                />
                <Route 
>>>>>>> main
                    path="/conexoes"
                    element={
                        <PrivateRoute>
                            <MinhasConexoes onLogout={handleLogout} />
                        </PrivateRoute>
<<<<<<< HEAD
                    }
                />

                {/* ✅ 2. NOVA ROTA DE CONFIGURAÇÕES ADICIONADA */}
                <Route
=======
                    } 
                />
                
                {/* ✅ 2. NOVA ROTA DE CONFIGURAÇÕES ADICIONADA */}
                <Route 
>>>>>>> main
                    path="/configuracoes"
                    element={
                        <PrivateRoute>
                            <Configuracoes onLogout={handleLogout} />
                        </PrivateRoute>
<<<<<<< HEAD
                    }
=======
                    } 
>>>>>>> main
                />
                {/* ✅ FIM DAS NOVAS ROTAS */}

                {/* Rota Padrão: Redireciona para /principal se logado, senão para /login */}
                <Route path="/" element={<Navigate to={token ? "/principal" : "/login"} />} />
            </Routes>
        </Router>
    );
}

export default App;
