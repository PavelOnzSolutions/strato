export interface IUserAccount {
    id: string;
    username: string;
    source: EUserOrigin;
    roles: string[];
    imageUrl: string;
    enabled: boolean;
    displayName?: string | null;
    email?: string | null;
}

export enum EUserOrigin {
    LOCAL = 'LOCAL',
    OAUTH2 = 'OAUTH2',
    SYNCHRONIZED = 'SYNCHRONIZED',
}

export interface IUpdateUserRequest {
    enabled?: boolean;
    displayName?: string | null;
    email?: string | null;
}
