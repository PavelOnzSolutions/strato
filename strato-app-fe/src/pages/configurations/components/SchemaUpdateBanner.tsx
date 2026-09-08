import React from 'react';
import {Button, Callout, Flex, Text} from '@radix-ui/themes';
import {Info} from 'lucide-react';

interface Props {
    user: string;
    schemaName: string;
    onUseNew: () => void;
    onContinue: () => void;
}

export const SchemaUpdateBanner: React.FC<Props> = ({user, schemaName, onUseNew, onContinue}) => (
  <Callout.Root color="amber" role="status">
    <Callout.Icon><Info size={16}/></Callout.Icon>
    <Flex align="center" justify="between" gap="3" width="100%">
      <Text size="2">
        <Text weight="bold">{user}</Text>
        {` updated schema ${schemaName}.`}
      </Text>
      <Flex gap="2" align="center">
        <Button variant="ghost" size="1" onClick={onUseNew}>Load New</Button>
        <Button variant="ghost" size="1" onClick={onContinue}>Continue editing</Button>
      </Flex>
    </Flex>
  </Callout.Root>
);
