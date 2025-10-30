import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8080',
});

// Interceptador para adicionar o token JWT ao cabeçalho de autorização
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
