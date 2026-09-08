import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import config from '../config';
import { useToast } from './ToastContext';


export interface WebSocketEvent {
    id: string;
    type: string;
    payload: any;
    timestamp: number;
    read: boolean;
}

interface WebSocketContextType {
    connected: boolean;
    subscribe: (topic: string, callback: (message: any) => void) => () => void;
    notifications: WebSocketEvent[];
    markAllAsRead: () => void;
    unreadCount: number;
    addNotification: (notification: WebSocketEvent) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
};

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [connected, setConnected] = useState(false);
    const [notifications, setNotifications] = useState<WebSocketEvent[]>([]);
    const clientRef = useRef<Client | null>(null);
    const subscriptionsRef = useRef<Map<string, StompSubscription>>(new Map());
    const { showToast } = useToast();

    useEffect(() => {
        const client = new Client({
            webSocketFactory: () => new SockJS(config.wsUrl),
            onConnect: () => {
                console.log('Connected to WebSocket');
                setConnected(true);

                // Global event listener
                client.subscribe('/topic/events', (message: IMessage) => {
                    try {
                        const body = JSON.parse(message.body);
                        const newEvent: WebSocketEvent = {
                            id: crypto.randomUUID(),
                            type: 'EVENT',
                            payload: body,
                            timestamp: Date.now(),
                            read: false
                        };
                        setNotifications(prev => [newEvent, ...prev].slice(0, 10));
                        showToast(`New event received`, 'info');
                    } catch (e) {
                        console.error('Failed to parse WebSocket message', e);
                    }
                });

                // Deployment event listener
                client.subscribe('/topic/deployments', (message: IMessage) => {
                    try {
                        const body = JSON.parse(message.body);
                        const newEvent: WebSocketEvent = {
                            id: crypto.randomUUID(),
                            type: 'DEPLOYMENT',
                            payload: body,
                            timestamp: Date.now(),
                            read: false
                        };
                        setNotifications(prev => [newEvent, ...prev].slice(0, 10));

                        if (body.status === 'SUCCESS') {
                            showToast(`Deployment successful: ${body.message || body.environmentId}`, 'success');
                        } else if (body.status === 'FAILURE') {
                            showToast(`Deployment failed: ${body.message || body.environmentId}`, 'error');
                        } else if (body.status === 'START' || body.status === 'PENDING') {
                            showToast(`Deployment ${body.status.toLowerCase()}: ${body.message || body.environmentId}`, 'info');
                        }
                    } catch (e) {
                        console.error('Failed to parse deployment WebSocket message', e);
                    }
                });

                // Workflow instances observable listener
                client.subscribe('/topic/observable/workflow_instances', (message: IMessage) => {
                    try {
                        const body = JSON.parse(message.body); // { entityId, operation, payload }
                        const newEvent: WebSocketEvent = {
                            id: crypto.randomUUID(),
                            type: 'WORKFLOW',
                            payload: body,
                            timestamp: Date.now(),
                            read: false,
                        };
                        setNotifications(prev => [newEvent, ...prev].slice(0, 10));

                        const status = body?.payload?.status || body?.operation;
                        if (status === 'COMPLETED') {
                            showToast(`Workflow by ${body?.payload?.startedBy} ${body?.entityId} completed`, 'success');
                        } else if (status === 'FAILED') {
                            showToast(`Workflow by ${body?.payload?.startedBy} ${body?.entityId} failed`, 'error');
                        } else if (status === 'RUNNING' || status === 'PENDING') {
                            showToast(`Workflow by ${body?.payload?.startedBy} ${body?.entityId} ${String(status).toLowerCase()}`, 'info');
                        }
                    } catch (e) {
                        console.error('Failed to parse workflow WebSocket message', e);
                    }
                });
            },
            onDisconnect: () => {
                console.log('Disconnected from WebSocket');
                setConnected(false);
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                console.error('Additional details: ' + frame.body);
            },
        });

        client.activate();
        clientRef.current = client;

        return () => {
            client.deactivate();
        };
    }, [showToast]);

    const subscribe = useCallback((topic: string, callback: (message: any) => void) => {
        if (!clientRef.current || !connected) {
            console.warn('WebSocket is not connected, cannot subscribe');
            return () => { };
        }

        const subscription = clientRef.current.subscribe(topic, (message: IMessage) => {
            try {
                const body = JSON.parse(message.body);
                callback(body);
            } catch (e) {
                console.error('Failed to parse message for topic ' + topic, e);
            }
        });

        const subId = crypto.randomUUID();
        subscriptionsRef.current.set(subId, subscription);

        return () => {
            subscription.unsubscribe();
            subscriptionsRef.current.delete(subId);
        };
    }, [connected]);

    const markAllAsRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }, []);

    const addNotification = useCallback((notification: WebSocketEvent) => {
        setNotifications(prev => [notification, ...prev].slice(0, 10));
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    useEffect(() => {
        setAddNotificationFunction(addNotification);
    }, [addNotification]);

    return (
        <WebSocketContext.Provider value={{ connected, subscribe, notifications, markAllAsRead, unreadCount, addNotification }}>
            {children}
        </WebSocketContext.Provider>
    );
};

let addNotificationFn: ((notification: WebSocketEvent) => void) | null = null;

export const setAddNotificationFunction = (fn: (notification: WebSocketEvent) => void) => {
    addNotificationFn = fn;
};

export const getAddNotificationFunction = () => addNotificationFn;
