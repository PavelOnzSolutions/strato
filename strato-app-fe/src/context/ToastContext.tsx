import React, { createContext, useContext, useCallback, useState, useRef, type ReactNode } from 'react';
import * as Toast from '@radix-ui/react-toast';
import { Text } from '@radix-ui/themes';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

type ToastType = 'error' | 'success' | 'info';

interface ToastItem {
    id: number;
    message: string;
    type: ToastType;
    open: boolean;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

const ACCENT: Record<ToastType, string> = {
    error: 'var(--red-9)',
    success: 'var(--green-9)',
    info: 'var(--blue-9)',
};

const ICON: Record<ToastType, typeof AlertCircle> = {
    error: AlertCircle,
    success: CheckCircle2,
    info: Info,
};

const TITLE: Record<ToastType, string> = {
    error: 'Error',
    success: 'Success',
    info: 'Info',
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const nextId = useRef(0);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = nextId.current++;
        setToasts((prev) => [...prev, { id, message, type, open: true }]);
    }, []);

    const dismiss = useCallback((id: number) => {
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, open: false } : t)));
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 300);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            <Toast.Provider swipeDirection="right" duration={5000}>
                {children}
                {toasts.map((t) => {
                    const Icon = ICON[t.type];
                    const color = ACCENT[t.type];
                    return (
                        <Toast.Root
                            key={t.id}
                            open={t.open}
                            onOpenChange={(open) => { if (!open) dismiss(t.id); }}
                            type="background"
                            className="toast-root"
                            style={{ '--toast-accent': color } as React.CSSProperties}
                        >
                            <div className="toast-accent-bar" />
                            <div className="toast-body">
                                <div className="toast-icon">
                                    <Icon size={18} color={color} />
                                </div>
                                <div className="toast-content">
                                    <Toast.Title asChild>
                                        <Text size="2" weight="bold" style={{ color: 'var(--gray-12)' }}>
                                            {TITLE[t.type]}
                                        </Text>
                                    </Toast.Title>
                                    <Toast.Description asChild>
                                        <Text size="2" style={{ color: 'var(--gray-11)' }}>
                                            {t.message}
                                        </Text>
                                    </Toast.Description>
                                </div>
                                <Toast.Close asChild>
                                    <button className="toast-close" aria-label="Dismiss">
                                        <X size={14} />
                                    </button>
                                </Toast.Close>
                            </div>
                        </Toast.Root>
                    );
                })}
                <Toast.Viewport className="toast-viewport" />
            </Toast.Provider>
        </ToastContext.Provider>
    );
};
