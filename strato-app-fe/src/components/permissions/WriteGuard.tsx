import React from 'react';
import { Tooltip } from '@radix-ui/themes';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

interface WriteGuardProps {
  permission: string;
  children: React.ReactElement;
  deniedMessage?: string;
}

export const WriteGuard: React.FC<WriteGuardProps> = ({ permission, children, deniedMessage }) => {
  const { hasPermission } = useAuth();
  const { t } = useTranslation();
  if (hasPermission(permission)) return children;

  const disabledChild = React.cloneElement(children, { disabled: true } as any);
  const msg = deniedMessage ?? t('msg_requires_permission', {
    permission,
    defaultValue: 'Requires permission: {{permission}}',
  });
  return <Tooltip content={msg}><span>{disabledChild}</span></Tooltip>;
};

export const useCanWrite = (permission: string): boolean => {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
};
