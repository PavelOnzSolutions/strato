import React, {useMemo} from 'react';
import {Box, Button, Dialog, Flex, Text, TextField} from '@radix-ui/themes';
import {useTranslation} from 'react-i18next';
import {DraggableDialogContent} from '../../../../components/system/DraggableDialogContent.tsx';

const SECTION_KEY_RE = /^[a-z][a-zA-Z0-9]*$/;

interface CloneSectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    name: string;
    onNameChange: (name: string) => void;
    sectionKey: string;
    onSectionKeyChange: (key: string) => void;
    onConfirm: () => void;
    isPending: boolean;
}

export const CloneSectionDialog: React.FC<CloneSectionDialogProps> = ({
    open, onOpenChange, name, onNameChange, sectionKey, onSectionKeyChange, onConfirm, isPending,
}) => {
    const {t} = useTranslation();

    const keyError = useMemo(() => {
        if (!sectionKey) return null;
        if (!SECTION_KEY_RE.test(sectionKey)) {
            return t('err_section_key_invalid',
                'Must start with a lowercase letter and contain only letters and digits');
        }
        return null;
    }, [sectionKey, t]);

    const canClone =
        name.trim().length > 0 && sectionKey.trim().length > 0 && !keyError && !isPending;

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <DraggableDialogContent maxWidth="450px" title={t('dlg_clone_section_title', 'Clone section type')}>
                <Box mb="3">
                    <Text as="div" size="2" mb="1" weight="bold">{t('lbl_new_name', 'New Name')}</Text>
                    <TextField.Root
                        value={name}
                        onChange={(e) => onNameChange(e.target.value)}
                        placeholder={t('ph_enter_new_name', 'Enter new name...')}
                        autoFocus
                    />
                </Box>
                <Box mb="3">
                    <Text as="div" size="2" mb="1" weight="bold">{t('lbl_section_key', 'Section key')}</Text>
                    <TextField.Root
                        value={sectionKey}
                        onChange={(e) => onSectionKeyChange(e.target.value)}
                        placeholder="myCustomSection"
                    />
                    {keyError && (
                        <Text size="1" color="red" mt="1" as="div">{keyError}</Text>
                    )}
                </Box>
                <Flex gap="3" mt="4" justify="end">
                    <Dialog.Close>
                        <Button variant="soft" color="gray">{t('btn_cancel', 'Cancel')}</Button>
                    </Dialog.Close>
                    <Button variant="solid" disabled={!canClone} onClick={onConfirm}>
                        {isPending ? t('btn_cloning', 'Cloning...') : t('btn_clone', 'Clone')}
                    </Button>
                </Flex>
            </DraggableDialogContent>
        </Dialog.Root>
    );
};
