import { StrictMode, useEffect, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store/store'
import './index.css'
import App from './App'
import "@radix-ui/themes/styles.css";
import { Theme } from "@radix-ui/themes";
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ToolbarProvider } from './context/ToolbarContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { PageTitleProvider } from './context/PageTitleContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import "./i18n";

let toastFn: ((message: string, type?: 'error' | 'success' | 'info') => void) | null = null;

export const setToastFunction = (fn: (message: string, type?: 'error' | 'success' | 'info') => void) => {
    toastFn = fn;
};

import { getAddNotificationFunction } from './context/WebSocketContext';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            // TODO: Fix deprecated symbol
            onError: (error: any) => {
                const message = error?.message?.toString() || 'An error occurred while fetching data';
                const status = error?.response?.status || error?.status; // Adjust based on your fetcher's error structure
                const endpoint = error?.response?.config?.url || error?.config?.url;

                // Generate Notification
                const addNotification = getAddNotificationFunction();
                if (addNotification) {
                    addNotification({
                        id: crypto.randomUUID(),
                        type: 'ERROR',
                        payload: { message: `API Error: `, details: `API: ${endpoint}, Message: ${message}` },
                        timestamp: Date.now(),
                        read: false
                    });
                }

                // Handle specific statuses
                if (status === 401) {
                    window.location.href = '/login';
                } else if (status === 403) {
                    window.location.href = '/403';
                } else if (status === 404) {
                    // Optional: Redirect to 404 page or just show toast
                    // window.location.href = '/404'; 
                }

                toastFn?.(message, 'error');
            },
        },
        mutations: {
            onError: (error: any) => {
                const message = error?.message || 'An error occurred';
                const status = error?.response?.status || error?.status;
                const endpoint = error?.response?.config?.url || error?.config?.url;

                // Generate Notification
                const addNotification = getAddNotificationFunction();
                if (addNotification) {
                    addNotification({
                        id: crypto.randomUUID(),
                        type: 'ERROR',
                        payload: { message: `Operation Failed: ${message}`, details: `API: ${endpoint}, Status: ${status}` },
                        timestamp: Date.now(),
                        read: false
                    });
                }

                if (status === 401) {
                    window.location.href = '/login';
                } else if (status === 403) {
                    window.location.href = '/403';
                }

                toastFn?.(message, 'error');
            },
        },
    },
});

const AppLoader = () => (
    <div className='loader-container'>
        <div className='loader'></div>
    </div>
);

const AppWithTheme = () => {
    const { appearance, accentColor } = useTheme();
    const resolvedAppearance = appearance === 'auto' 
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : appearance;
    
    return (
        <Theme appearance={resolvedAppearance as 'light' | 'dark'} accentColor={accentColor as any} radius="large" scaling="100%">
            <App />
        </Theme>
    );
};

const AppWithToast = () => {
    const { showToast } = useToast();
    useEffect(() => {
        setToastFunction(showToast);
    }, [showToast]);
    return (
        <Suspense fallback={<AppLoader />}>
            <AppWithTheme />
        </Suspense>
    );
};

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <Provider store={store}>
            <QueryClientProvider client={queryClient}>
                <ToastProvider>
                    <ThemeProvider>
                        <ToolbarProvider>
                            <PageTitleProvider>
                                <WebSocketProvider>
                                    <AppWithToast />
                                </WebSocketProvider>
                            </PageTitleProvider>
                        </ToolbarProvider>
                    </ThemeProvider>
                </ToastProvider>
            </QueryClientProvider>
        </Provider>
    </StrictMode>,
)


