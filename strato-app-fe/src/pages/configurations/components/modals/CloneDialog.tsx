import React from 'react';
import {Box, Button, Dialog, Flex, Text, TextField} from '@radix-ui/themes';
import {useTranslation} from 'react-i18next';
import {DraggableDialogContent} from '../../../../components/system/DraggableDialogContent.tsx';

interface CloneDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    name: string;
    onNameChange: (name: string) => void;
    onConfirm: () => void;
    isPending: boolean;
}

export const CloneDialog: React.FC<CloneDialogProps> = ({open, onOpenChange, name, onNameChange, onConfirm, isPending}) => {
    const {t} = useTranslation();

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <DraggableDialogContent maxWidth="450px" title={t('dlg_clone_item_title', 'Clone Item')}>
                <Box mb="4">
                    <Text as="div" size="2" mb="1" weight="bold">
                        {t('lbl_new_name', 'New Name')}
                    </Text>
                    <TextField.Root
                        value={name}
                        onChange={(e) => onNameChange(e.target.value)}
                        placeholder={t('ph_enter_new_name', 'Enter new name...')}
                        autoFocus
                    />
                </Box>
                <Flex gap="3" mt="4" justify="end">
                    <Dialog.Close>
                        <Button variant="soft" color="gray">{t('btn_cancel', 'Cancel')}</Button>
                    </Dialog.Close>
                    <Button
                        variant="solid"
                        disabled={!name.trim() || isPending}
                        onClick={onConfirm}
                    >
                        {isPending ? t('btn_cloning', 'Cloning...') : t('btn_clone', 'Clone')}
                    </Button>
                </Flex>
            </DraggableDialogContent>
        </Dialog.Root>
    );
};
