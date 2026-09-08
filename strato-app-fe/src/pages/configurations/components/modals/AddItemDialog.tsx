import React, {useEffect, useMemo, useState} from 'react';
import {Button, Dialog, Flex, Text, TextField} from '@radix-ui/themes';
import {useTranslation} from 'react-i18next';

const NAME_RE = /^[a-z0-9][a-z0-9\-_]*$/;

interface AddItemDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    existingNames: string[];
    onConfirm: (name: string) => void;
}

export const AddItemDialog: React.FC<AddItemDialogProps> = ({
    open,
    onOpenChange,
    existingNames,
    onConfirm,
}) => {
    const {t} = useTranslation();
    const [value, setValue] = useState('');

    useEffect(() => {
        if (open) setValue('');
    }, [open]);

    const error = useMemo(() => {
        if (!value) return null;
        if (!NAME_RE.test(value)) {
            return t(
                'msg_item_name_invalid',
                'Use lowercase letters, digits, dash and underscore; must start with a letter or digit.',
            );
        }
        if (existingNames.includes(value)) {
            return t('msg_item_name_duplicate', 'An item with this name already exists.');
        }
        return null;
    }, [value, existingNames, t]);

    const isValid = value.length > 0 && error === null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;
        onConfirm(value);
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Content maxWidth="420px">
                <Dialog.Title>{t('title_add_item', 'Add item')}</Dialog.Title>
                <Dialog.Description size="2" mb="3">
                    {t('msg_add_item_hint', 'Provide a unique name for the new item.')}
                </Dialog.Description>
                <form onSubmit={handleSubmit}>
                    <Flex direction="column" gap="2">
                        <TextField.Root
                            placeholder={t('ph_item_name', 'item-name')}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            autoFocus
                        />
                        {error && (
                            <Text size="1" color="red">{error}</Text>
                        )}
                    </Flex>
                    <Flex gap="2" mt="4" justify="end">
                        <Dialog.Close>
                            <Button variant="soft" color="gray" type="button">
                                {t('btn_cancel', 'Cancel')}
                            </Button>
                        </Dialog.Close>
                        <Button type="submit" disabled={!isValid}>
                            {t('btn_add', 'Add')}
                        </Button>
                    </Flex>
                </form>
            </Dialog.Content>
        </Dialog.Root>
    );
};

export default AddItemDialog;
