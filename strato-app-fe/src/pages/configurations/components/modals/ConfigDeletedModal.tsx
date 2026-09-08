import React from 'react';
import {Dialog, Button, Flex, Text} from '@radix-ui/themes';

interface Props {
    open: boolean;
    user: string;
    onClose: () => void;
    onSaveAsNew: () => void;
}

export const ConfigDeletedModal: React.FC<Props> = ({open, user, onClose, onSaveAsNew}) => {
    return (
        <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <Dialog.Content maxWidth="440px">
                <Dialog.Title>Configuration deleted</Dialog.Title>
                <Dialog.Description size="2" mb="3">
                    This configuration was deleted by <Text weight="bold">{user}</Text>.
                </Dialog.Description>
                <Text as="p" size="2" mb="4">
                    Your unsaved edits are still in this editor.
                </Text>
                <Flex gap="3" justify="end">
                    <Button variant="soft" color="gray" onClick={onClose}>Close</Button>
                    <Button variant="solid" onClick={onSaveAsNew}>Save as new</Button>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
};
