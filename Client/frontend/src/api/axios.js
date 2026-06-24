import axios from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api`;

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ── Request Interceptor: attach access token ────────────────
api.interceptors.request.use(
    (config) => {
        const tokens = JSON.parse(localStorage.getItem('tokens'));
        if (tokens?.access) {
            config.headers.Authorization = `Bearer ${tokens.access}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ── Response Interceptor: auto-refresh on 401 ───────────────
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const tokens = JSON.parse(localStorage.getItem('tokens'));
                if (tokens?.refresh) {
                    const res = await axios.post(`${API_BASE_URL}/users/token/refresh/`, {
                        refresh: tokens.refresh,
                    });

                    const newTokens = {
                        access: res.data.access,
                        refresh: res.data.refresh || tokens.refresh,
                    };
                    localStorage.setItem('tokens', JSON.stringify(newTokens));

                    originalRequest.headers.Authorization = `Bearer ${newTokens.access}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                localStorage.removeItem('tokens');
                localStorage.removeItem('user');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
