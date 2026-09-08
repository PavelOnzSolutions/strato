import {Box, Button, Dialog, Flex, ScrollArea, Tabs, Text, TextField, Tooltip} from '@radix-ui/themes';
import {Search} from 'lucide-react';
import {CATEGORY_ICONS} from '../../../../constants/svgIcons.ts';

interface IconSelectorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    t: any;
    iconCategory: string;
    setIconCategory: (val: string) => void;
    iconSearch: string;
    setIconSearch: (val: string) => void;
    icon: string;
    setIcon: (val: string) => void;
}

export const IconSelectorDialog = ({
                                       open,
                                       onOpenChange,
                                       t,
                                       iconCategory,
                                       setIconCategory,
                                       iconSearch,
                                       setIconSearch,
                                       icon,
                                       setIcon
                                   }: IconSelectorDialogProps) => {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Content style={{maxWidth: 800, maxHeight: '80vh'}}>
                <Dialog.Title>{t('lbl_select_icon', 'Select Icon')}</Dialog.Title>
                <Dialog.Description size="2" mb="4">
                    {t('lbl_choose_icon', 'Choose an icon for this resource.')}
                </Dialog.Description>

                <Tabs.Root value={iconCategory} onValueChange={setIconCategory}>
                    <Tabs.List>
                        <Tabs.Trigger value="aws">{t('lbl_aws', 'AWS')}</Tabs.Trigger>
                        <Tabs.Trigger value="azure">{t('lbl_azure', 'Azure')}</Tabs.Trigger>
                        <Tabs.Trigger value="generics">{t('lbl_generics', 'Generics')}</Tabs.Trigger>
                        <Tabs.Trigger value="kubernetes">{t('lbl_kubernetes', 'Kubernetes')}</Tabs.Trigger>
                    </Tabs.List>

                    <Box pt="4">
                        <TextField.Root
                            placeholder={t('ph_search_icons', 'Search icons...')}
                            value={iconSearch}
                            onChange={(e) => setIconSearch(e.target.value)}
                            mb="4"
                        >
                            <TextField.Slot>
                                <Search height="16" width="16"/>
                            </TextField.Slot>
                        </TextField.Root>

                        <ScrollArea style={{height: 400}}>
                            <Box p="2" style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                                gap: '0.75rem'
                            }}>
                                {(CATEGORY_ICONS[iconCategory] || []).filter(iconName => iconName.toLowerCase().includes(iconSearch.toLowerCase())).sort().map((iconName) => {
                                    const iconPath = `${iconCategory}/${iconName}`;
                                    const isSelected = icon === iconPath;

                                    return (
                                        <Flex
                                            key={iconName}
                                            direction="column"
                                            align="center"
                                            justify="center"
                                            gap="2"
                                            onClick={() => {
                                                setIcon(iconPath);
                                                onOpenChange(false);
                                            }}
                                            className="cursor-pointer p-2 rounded hover:bg-[var(--accent-2)] transition-colors"
                                            style={{
                                                border: isSelected ? '2px solid var(--accent-9)' : '2px solid transparent',
                                                height: '100px'
                                            }}
                                        >
                                            <img src={`/assets/${iconCategory}/${iconName}`} alt={iconName}
                                                 className="w-10 h-10"/>
                                            <Tooltip content={iconName.replace('.svg', '').replace(/-/g, ' ')}>
                                                <Text size="1" align="center" style={{
                                                    width: '100%',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {iconName.replace('.svg', '').replace(/-/g, ' ')}
                                                </Text>
                                            </Tooltip>
                                        </Flex>
                                    );
                                })}
                            </Box>
                        </ScrollArea>
                    </Box>
                </Tabs.Root>

                <Flex gap="3" mt="4" justify="end">
                    <Dialog.Close>
                        <Button variant="soft" color="gray">
                            {t('btn_cancel', 'Cancel')}
                        </Button>
                    </Dialog.Close>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
};
