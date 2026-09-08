import React from 'react';
import {Button, Callout, Flex, Text} from '@radix-ui/themes';
import {Info} from 'lucide-react';

interface Props {
    user: string;
    latestVersion: number;
    hasLocalEdits: boolean;
    onReload: () => void;
    onViewChanges: () => void;
}

export const ConfigUpdateBanner: React.FC<Props> = ({user, latestVersion, hasLocalEdits, onReload, onViewChanges}) => (
    <Callout.Root color="amber" role="status">
        <Callout.Icon><Info size={16}/></Callout.Icon>
        <Flex align="center" justify="between" gap="3" width="100%">
            <Text size="2">
                <Text weight="bold">{user}</Text>
                {` saved version ${latestVersion}.`}
                {hasLocalEdits ? ' Your changes will be merged when you save.' : ''}
            </Text>
            <Flex gap="2" align="center">
                <Button variant="ghost" size="1" onClick={onViewChanges}>View changes</Button>
                {!hasLocalEdits && (
                    <Button variant="soft" size="1" onClick={onReload}>Reload</Button>
                )}
            </Flex>
        </Flex>
    </Callout.Root>
);
