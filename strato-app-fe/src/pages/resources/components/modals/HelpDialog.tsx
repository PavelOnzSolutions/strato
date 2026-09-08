import {Button, Dialog, Flex, ScrollArea} from '@radix-ui/themes';
import {DraggableDialogContent} from '../../../../components/system/DraggableDialogContent.tsx';
import ResourcesHelp from '../../../documentation/ResourcesHelp';

interface HelpDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    t: any;
}

export const HelpDialog = ({
    open,
    onOpenChange,
    t
}: HelpDialogProps) => {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <DraggableDialogContent maxWidth="1000px" maxHeight="90vh" title={t('btn_help', 'Help')}>
                <ScrollArea style={{ flex: 1, minHeight: 0 }} type="auto">
                    <ResourcesHelp hideTitle />
                </ScrollArea>
                <Flex gap="3" mt="4" justify="end">
                    <Dialog.Close>
                        <Button variant="soft" color="gray" onClick={() => onOpenChange(false)}>
                            {t('btn_close', 'Close')}
                        </Button>
                    </Dialog.Close>
                </Flex>
            </DraggableDialogContent>
        </Dialog.Root>
    );
};
