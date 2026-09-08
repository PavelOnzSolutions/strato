import React from 'react';
import {Badge, Flex, Text} from '@radix-ui/themes';

interface ConfigProviderHeaderProps {
  configName?: string;
  envName?: string;
  version?: number;
}

export const ConfigProviderHeader: React.FC<ConfigProviderHeaderProps> = ({ configName, envName, version }) => {
  return (
    <Flex className="config-provider-header" gap="3" align="center" p="3" style={{ borderBottom: '1px solid var(--gray-6)' }}>
      <Text weight="bold" size="4">{configName}</Text>
      <Badge variant="outline" color="gray">v{version}</Badge>
      <Text color="gray" size="2">linked to</Text>
      <Badge color="blue" size="2">{envName || 'No Environment'}</Badge>
    </Flex>
  );
};
