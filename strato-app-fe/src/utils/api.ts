import config from '../config';

interface FetchOptions extends RequestInit {
    headers?: Record<string, string>;
}

export class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
        this.name = 'ApiError';
    }
}

export const fetchWithAuth = async (endpoint: string, options: FetchOptions = {}) => {
    const token = localStorage.getItem('token');

    const headers: Record<string, string> = {
        ...options.headers,
    };

    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const url = endpoint.startsWith('http') ? endpoint : `${config.apiBaseUrl}${endpoint}`;

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        // Try to refresh token once
        try {
            const refreshResponse = await fetch(`${config.baseUrl}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (refreshResponse.ok) {
                const tokenResponse = await refreshResponse.json();
                localStorage.setItem('token', tokenResponse.token);
                
                // Retry original request with new token
                headers['Authorization'] = `Bearer ${tokenResponse.token}`;
                return fetch(url, { ...options, headers });
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
        }

        // If refresh failed, clear session
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        throw new ApiError('Session expired. Please log in again.', 401);
    }

    if (response.status === 403) {
        throw new ApiError('Access forbidden', 403);
    }

    return response;
};

