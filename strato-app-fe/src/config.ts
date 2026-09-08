interface Config {
    apiBaseUrl: string;
    baseUrl: string;
    wsUrl: string;
    brand: string;
    version: string;
    prod: boolean;
}

const config: Config = {
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
    baseUrl: (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api').replace('/api', ''),
    wsUrl: import.meta.env.VITE_WS_URL || 'http://localhost:8080/ws',
    brand: import.meta.env.VITE_BRAND || '',
    version: import.meta.env.VITE_VERSION || '0.0.0',
    prod: import.meta.env.VITE_PROD || false,
};

export default config;
