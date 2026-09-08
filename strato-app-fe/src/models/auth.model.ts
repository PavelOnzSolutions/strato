export interface LoginRequest {
    username: string;
    password: string;
}

export interface TokenResponse {
    token: string;
    userId: string;
    username: string;
    displayName?: string;
    roles: string[];
    authorities: string[];
    imageUrl?: string;
    expiresAt: string;
}

export interface User {
    id: string;
    username: string;
    displayName?: string;
    token: string;
    roles: string[];
    authorities: string[];
    imageUrl?: string;
}
