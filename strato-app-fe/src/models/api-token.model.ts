export interface IApiToken {
    id: string;
    userId: string;
    description: string;
    issuedAt: string;
    expiresAt: string;
    revoked: boolean;
}

export interface CreateTokenRequest {
    name: string;
    expirationDays?: number;
    permissions?: string[];
}

export interface CreateTokenResponse {
    id: string;
    token: string;
    name: string;
    expiresAt: string;
}
