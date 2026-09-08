import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { jwtDecode } from "jwt-decode";
import { LoginRequest, TokenResponse, User } from '../models/auth.model';
import config from '../config';
import { getImpliedByPermission } from '../constants/permissions';

interface AuthContextType {
    user: User | null;
    login: (data: LoginRequest) => Promise<void>;
    loginWithMicrosoft: () => void;
    logout: () => void;
    refreshToken: () => Promise<void>;
    isAuthenticated: boolean;
    isLoading: boolean;
    hasAnyRole: (roles: string[]) => boolean;
    hasPermission: (permission: string) => boolean;
    hasAnyPermissions: (permissions: string[]) => boolean;
    tokenExpiration: number | null;
    tokenIssuedAt: number | null;
}

interface JwtPayload {
    sub: string;
    displayName?: string;
    roles: string[];
    authorities?: string[];
    exp: number;
    iat: number;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null);
    const [tokenExpiration, setTokenExpiration] = useState<number | null>(null);
    const [tokenIssuedAt, setTokenIssuedAt] = useState<number | null>(null);

    // Token refresh function
    const refreshToken = useCallback(async () => {
        const currentToken = localStorage.getItem('token');
        if (!currentToken) return;

        try {
            const response = await fetch(`${config.baseUrl}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${currentToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Token refresh failed');
            }

            const tokenResponse: TokenResponse = await response.json();
            const decoded = jwtDecode<JwtPayload>(tokenResponse.token);

            const updatedUser: User = {
                ...user!,
                displayName: decoded.displayName,
                token: tokenResponse.token,
                roles: decoded.roles || [],
                authorities: decoded.authorities || [],
            };

            setUser(updatedUser);
            localStorage.setItem('token', tokenResponse.token);
            setTokenExpiration(decoded.exp);
            setTokenIssuedAt(decoded.iat);
            
            // Schedule next refresh
            scheduleTokenRefresh(decoded.exp);
        } catch (error) {
            console.error('Token refresh failed:', error);
            logout();
        }
    }, [user]);

    // Schedule token refresh before expiration
    const scheduleTokenRefresh = useCallback((exp: number) => {
        if (refreshTimer) {
            clearTimeout(refreshTimer);
        }

        const now = Math.floor(Date.now() / 1000);
        const expiresIn = exp - now;
        
        // Refresh 1 minute (60 seconds) before expiration
        const refreshIn = Math.max(0, (expiresIn - 60) * 1000);
        
        console.log(`Token will be refreshed in ${refreshIn / 1000} seconds`);
        
        const timer = setTimeout(() => {
            refreshToken();
        }, refreshIn);
        
        setRefreshTimer(timer);
    }, [refreshToken, refreshTimer]);

    // Initialize token refresh on mount and when user changes
    useEffect(() => {
        if (user?.token) {
            try {
                const decoded = jwtDecode<JwtPayload>(user.token);
                setTokenExpiration(decoded.exp);
                setTokenIssuedAt(decoded.iat);
                scheduleTokenRefresh(decoded.exp);
            } catch (e) {
                console.error('Failed to decode token for refresh scheduling', e);
            }
        }

        return () => {
            if (refreshTimer) {
                clearTimeout(refreshTimer);
            }
        };
    }, [user?.token]);

    useEffect(() => {
        // Check for token in URL (OAuth2 callback)
        const params = new URLSearchParams(window.location.search);
        const urlToken = params.get('token');
        const urlUserId = params.get('userId');
        const urlUsername = params.get('username');
        const displayName = params.get('displayName');
        const urlImageUrl = params.get('imageUrl');

        if (urlToken) {
            let roles: string[] = [];
            let authorities: string[] = [];
            try {
                const decoded = jwtDecode<JwtPayload>(urlToken);
                roles = decoded.roles || [];
                authorities = decoded.authorities || [];
            } catch (e) {
                console.error('Failed to decode token', e);
            }

            const newUser: User = {
                id: urlUserId || 'unknown',
                username: urlUsername || 'Microsoft User',
                displayName: displayName || jwtDecode<JwtPayload>(urlToken).displayName || urlUsername || 'User',
                token: urlToken,
                roles: roles,
                authorities: authorities,
                imageUrl: urlImageUrl || undefined,
            };
            setTokenExpiration(jwtDecode<JwtPayload>(urlToken).exp);
            setTokenIssuedAt(jwtDecode<JwtPayload>(urlToken).iat);
            setUser(newUser);
            localStorage.setItem('token', newUser.token);
            localStorage.setItem('user', JSON.stringify({ id: newUser.id, username: newUser.username, displayName: newUser.displayName, imageUrl: newUser.imageUrl }));

            // Clear URL params
            window.history.replaceState({}, document.title, window.location.pathname);
            setIsLoading(false);
            return;
        }

        // Check for existing token in localStorage on mount
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                const decoded = jwtDecode<JwtPayload>(storedToken);
                setTokenExpiration(decoded.exp);
                setTokenIssuedAt(decoded.iat);
                setUser({ 
                    ...parsedUser, 
                    displayName: parsedUser.displayName || decoded.displayName,
                    token: storedToken, 
                    roles: decoded.roles || [], 
                    authorities: decoded.authorities || [] 
                });
            } catch (e) {
                console.error('Failed to parse stored user', e);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }
        setIsLoading(false);
    }, []);

    const login = async (data: LoginRequest) => {
        setIsLoading(true);
        try {
            const response = await fetch(`${config.baseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error('Invalid credentials');
            }

            const tokenResponse: TokenResponse = await response.json();
            const decoded = jwtDecode<JwtPayload>(tokenResponse.token);

            const newUser: User = {
                id: tokenResponse.userId,
                username: tokenResponse.username,
                displayName: tokenResponse.displayName,
                token: tokenResponse.token,
                roles: decoded.roles || [],
                authorities: decoded.authorities || [],
                imageUrl: undefined, // Local login might not return image URL initially
            };

            setTokenExpiration(decoded.exp);
            setTokenIssuedAt(decoded.iat);
            setUser(newUser);
            localStorage.setItem('token', newUser.token);
            localStorage.setItem('user', JSON.stringify({ id: newUser.id, username: newUser.username, displayName: newUser.displayName }));
        } finally {
            setIsLoading(false);
        }
    };

    const loginWithMicrosoft = () => {
        // Redirect to backend OAuth2 endpoint
        window.location.href = `${config.baseUrl}/oauth2/authorization/azure`;
    };

    const logout = () => {
        if (refreshTimer) {
            clearTimeout(refreshTimer);
        }
        setUser(null);
        setTokenExpiration(null);
        setTokenIssuedAt(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Optional: Call backend logout if needed
    };

    const hasAnyRole = (requiredRoles: string[]) => {
        if (!user || !user.roles) return false;
        return requiredRoles.some(role => user.roles.includes(role));
    };

    const hasPermission = (permission: string) => {
        if (user?.roles.includes('ADMIN')) return true;
        if (!user?.authorities) return false;
        // Check if any authority the user holds implies the requested permission
        return user.authorities.some(auth => getImpliedByPermission(auth).includes(permission));
    };

    const hasAnyPermissions = (permissions: string[]) => {
        return permissions.some(permission => hasPermission(permission));
    }

    return (
        <AuthContext.Provider value={{ 
            user, 
            login, 
            loginWithMicrosoft, 
            logout, 
            refreshToken,
            isAuthenticated: !!user, 
            isLoading, 
            hasAnyRole, 
            hasPermission,
            hasAnyPermissions,
            tokenExpiration,
            tokenIssuedAt
        }}>
            {children}
        </AuthContext.Provider>
    );
};
