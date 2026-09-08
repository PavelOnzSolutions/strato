import {useEffect} from 'react';
import {useWebSocket} from '../../context/WebSocketContext.tsx';

export const useDeploymentNotifications = (onMessage: (payload: any) => void) => {
  const { subscribe, connected } = useWebSocket();

  useEffect(() => {
    if (!connected) return;

    const unsubscribe = subscribe('/topic/deployments', (payload) => {
      onMessage(payload);
    });

    return () => {
      unsubscribe();
    };
  }, [subscribe, connected, onMessage]);
};
