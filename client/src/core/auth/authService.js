// client/src/core/auth/authService.js

const TOKEN_KEY = 'neurogrid_auth_token';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const authService = {
    login: async (username, password) => {
        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok && data.token) {
                localStorage.setItem(TOKEN_KEY, data.token);
                if (data.user) {
                    localStorage.setItem('neurogrid_user', JSON.stringify(data.user));
                }
                return { success: true };
            }

            return { success: false, message: data.message || 'Login failed' };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Network error or server unreachable' };
        }
    },

    logout: () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('neurogrid_user');
    },

    getUser: () => {
        try {
            return JSON.parse(localStorage.getItem('neurogrid_user'));
        } catch (err) {
            return null;
        }
    },

    getToken: () => {
        return localStorage.getItem(TOKEN_KEY);
    },

    isAuthenticated: () => {
        const token = localStorage.getItem(TOKEN_KEY);
        // Add basic JWT expiration check later if needed
        return !!token;
    },

    // Helper to add token to fetch requests
    getAuthHeaders: () => {
        const token = localStorage.getItem(TOKEN_KEY);
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }
};
