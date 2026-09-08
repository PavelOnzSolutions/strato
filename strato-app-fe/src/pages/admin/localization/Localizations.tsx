import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Code,
  ContextMenu,
  Dialog,
  Flex,
  Progress,
  Table,
  Text,
  TextField
} from '@radix-ui/themes';
import {
    ArrowBigLeft,
    Braces,
    CircleHelp,
    Copy,
    CopyCheck,
    Edit,
    Globe,
    Plus,
    RefreshCw,
    Trash2
} from 'lucide-react';
import {useToolbar} from '../../../context/ToolbarContext';
import {useQuery} from '@tanstack/react-query';
import {useEffect, useRef, useState} from 'react';
import {ILocaleCompact} from '../../../models/locale.model';
import {useNavigate} from 'react-router-dom';
import {useToast} from '../../../context/ToastContext';
import {usePageTitle} from '../../../context/PageTitleContext';
import {useWebSocket} from '../../../context/WebSocketContext';
import {fetchWithAuth} from "../../../utils/api.ts";
import {useTranslation} from 'react-i18next';
import LocalizationHelp from '../../documentation/LocalizationHelp';

export const COLLECTION = 'translations';

const fetchLocales = async (): Promise<ILocaleCompact[]> => {
    const response = await fetchWithAuth('/locales');
    if (!response.ok) {
        throw new Error('Network response was not ok: Status ' + response.statusText.toString() + ', ' + response.status.toString() + ', ' + response.url.toString());
    }
    return response.json();
};

const deleteLocales = async (ids: string[]) => {
    const response = await fetchWithAuth('/locales?id=' + (ids.length > 1 ? ids.join('&id=') : ids[0]), {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error('Network response was not ok: Status ' + response.statusText.toString() + ', ' + response.status.toString() + ', ' + response.url.toString());
    }
};

const Localizations = () => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
    const [helpDialogOpen, setHelpDialogOpen] = useState(false);
    const [cloneSourceId, setCloneSourceId] = useState<string | null>(null);
    const [newLabel, setNewLabel] = useState('');
    const [newKey, setNewKey] = useState('');
    const navigate = useNavigate();
    const {showToast} = useToast();
    const {subscribe, addNotification} = useWebSocket();
    const {t} = useTranslation();

    const {data: locales, isLoading, refetch} = useQuery({
        queryKey: ['locales'],
        queryFn: fetchLocales,
    });

    useEffect(() => {
        const unsubscribe = subscribe(`/topic/observable/${COLLECTION}`, (message) => {
            console.log('Received translation update:', message);
            const {operation, collection, user, ids} = message;
            let text = '';

            if (operation === 'CREATE') {
                text = `New ${collection} created by ${user}`;
            } else if (operation === 'UPDATE') {
                text = `${collection} updated by ${user}`;
            } else if (operation === 'DELETE') {
                const count = ids ? ids.length : 1;
                text = `${count} ${collection} deleted by ${user}`;
            }

            if (text) {
                showToast(text, 'info');
                addNotification({
                    id: crypto.randomUUID(),
                    type: 'OBSERVABLE_CHANGE',
                    payload: {message: text, details: `Operation: ${operation}, User: ${user}`},
                    timestamp: Date.now(),
                    read: true
                });
            }
            refetch();
        });

        return () => {
            unsubscribe();
        };
    }, [subscribe, showToast, refetch, addNotification]);

    const handleSelectAll = (checked: boolean) => {
        if (checked && locales) {
            setSelectedIds(locales.map(l => l.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedIds([...selectedIds, id]);
        } else {
            setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
        }
    };

    const confirmDelete = async () => {
        await deleteLocales(selectedIds);
        setSelectedIds([]);
        setDeleteDialogOpen(false);
        refetch();
    };

    const handleDeleteSelected = () => {
        if (selectedIds.length === 0) {
            showToast(`Please select at least one translation to delete`, 'error');
            return;
        }
        setDeleteDialogOpen(true);
    };

    // Use a ref to keep the latest handleDeleteSelected accessible
    const handleDeleteSelectedRef = useRef(handleDeleteSelected);
    useEffect(() => {
        handleDeleteSelectedRef.current = handleDeleteSelected;
    }, [handleDeleteSelected]);

    const allSelected = locales && locales.length > 0 && selectedIds.length === locales.length;
    const someSelected = selectedIds.length > 0 && selectedIds.length < (locales?.length || 0);

    usePageTitle(t('ptitle_locale', 'Localization'));

    useToolbar([
        {
            id: 'new',
            label: t('btn_new', 'New'),
            icon: Plus,
            onClick: () => navigate('/admin/localization/new'),
            variant: 'solid'
        },
        {id: 'refresh', label: t('btn_refresh', 'Refresh'), icon: RefreshCw, onClick: () => refetch()},
        {
            id: 'delete',
            label: t('btn_delete_selected', 'Delete Selected'),
            icon: Trash2,
            variant: 'solid',
            onClick: () => handleDeleteSelectedRef.current(),
            color: 'ruby'
        },
        {
            id: 'help',
            label: t('btn_help', 'Help'),
            icon: CircleHelp,
            onClick: () => setHelpDialogOpen(true),
            color: 'sky'
        },
    ]);

    const confirmClone = async () => {
        if (!cloneSourceId || !newLabel || !newKey) {
            showToast('Please fill in all fields', 'error');
            return;
        }

        try {
            // 1. Fetch source locale
            const sourceResponse = await fetchWithAuth(`/locales/id/${cloneSourceId}`);
            if (!sourceResponse.ok) throw new Error('Failed to fetch source locale');
            const sourceLocale = await sourceResponse.json();

            // 2. Create new locale payload
            // Omit ID to let backend generate it
            const {id, ...rest} = sourceLocale;
            const newLocale = {
                ...rest,
                label: newLabel,
                key: newKey,
            };

            // 3. Create new locale
            const createResponse = await fetchWithAuth(`/locales`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(newLocale),
            });

            if (!createResponse.ok) throw new Error('Failed to create new locale');

            showToast('Locale cloned successfully', 'success');
            setCloneDialogOpen(false);
            setCloneSourceId(null);
            setNewLabel('');
            setNewKey('');
            refetch();
        } catch (error) {
            console.error(error);
            showToast('Failed to clone locale', 'error');
        }
    };

    return (
        <Card size="4" className="w-full shadow-lg">

            <Flex direction="column" mb="2">
                <Flex direction="row" gap="2">
                    <Globe size={32} color="var(--accent-11)"/>
                    <Text size="5" weight="bold">
                  <span
                    className="bg-gradient-to-l from-[var(--gray-12)] to-[var(--accent-10)] bg-clip-text text-transparent">
                  {t('lbl_localization', 'Localization')}
                  </span>
                    </Text>
                </Flex>
                <Text size="2"
                      color="gray">{t('lbl_localization_desc', 'Add or modify localizations or localization keys')}</Text>
            </Flex>

            {isLoading && (
                <div className="mb-4">
                    <Progress/>
                </div>
            )}

            <Table.Root variant="surface">
                <Table.Header>
                    <Table.Row>
                        <Table.ColumnHeaderCell>
                            <Checkbox
                                checked={allSelected}
                                onCheckedChange={handleSelectAll}
                                {...(someSelected && {'data-state': 'indeterminate'})}
                            />
                        </Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t('thead_id', 'ID')}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t('thead_label', 'Label')}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t('thead_key', 'Key')}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t('thead_count', 'Count')}</Table.ColumnHeaderCell>
                    </Table.Row>
                </Table.Header>

                <Table.Body>
                    {locales && locales.length > 0 ? (
                        locales.map((locale) => (
                            <ContextMenu.Root key={locale.id}>
                                <ContextMenu.Trigger>
                                    <Table.Row className={`hover:bg-[var(--accent-2)] cursor-pointer`} onClick={() => navigate(`/admin/localization/${locale.id}`)}>
                                        <Table.Cell>
                                            <Checkbox
                                                checked={selectedIds.includes(locale.id)}
                                                onCheckedChange={(checked) => handleSelectOne(locale.id, checked === true)}
                                            />
                                        </Table.Cell>
                                        <Table.RowHeaderCell
                                            onClick={() => setSelectedIds([locale.id])}><Code>{locale.id}</Code></Table.RowHeaderCell>
                                        <Table.Cell onClick={() => setSelectedIds([locale.id])}><Text
                                            weight="medium">{locale.label}</Text></Table.Cell>
                                        <Table.Cell
                                            onClick={() => setSelectedIds([locale.id])}><Code>{locale.key}</Code></Table.Cell>
                                        <Table.Cell><Badge color="gray" variant="soft" radius="full">
                                            {locale.items || 0}
                                        </Badge></Table.Cell>
                                    </Table.Row>
                                </ContextMenu.Trigger>
                                <ContextMenu.Content>
                                    <ContextMenu.Label>{locale.label} - {locale.key}</ContextMenu.Label>
                                    <ContextMenu.Item onClick={() => navigate(`/admin/localization/${locale.id}`)}>
                                        <Edit size={16}/>
                                        <b>{t('mit_edit', 'Edit')}</b>
                                    </ContextMenu.Item>
                                    <ContextMenu.Item onClick={() => {
                                        setCloneSourceId(locale.id);
                                        setNewLabel(`${locale.label} (Copy)`);
                                        setNewKey(`${locale.key}-copy`);
                                        setCloneDialogOpen(true);
                                    }}>
                                        <Copy size={16}/>
                                        <b>{t('mit_clone', 'Clone')}</b>
                                    </ContextMenu.Item>
                                    <ContextMenu.Item onClick={() => navigate(`/admin/localization/${locale.id}/json`)}>
                                        <Braces size={16}/>
                                        <b>{t('mit_edit_json', 'Edit JSON')}</b>
                                    </ContextMenu.Item>
                                    <ContextMenu.Separator/>
                                    <ContextMenu.Item color='ruby' onClick={() => {
                                        setSelectedIds([locale.id]);
                                        setDeleteDialogOpen(true);
                                    }}>
                                        <Trash2 size={16}/>
                                        <b>{t('mit_delete', 'Delete')}</b>
                                    </ContextMenu.Item>
                                </ContextMenu.Content>
                            </ContextMenu.Root>
                        ))
                    ) : (
                        !isLoading && (
                            <Table.Row>
                                <Table.Cell colSpan={5} className="text-center text-[var(--gray-11)]">
                                    {t('lbl_no_locales_found', 'No locales found')}
                                </Table.Cell>
                            </Table.Row>
                        )
                    )}
                </Table.Body>
            </Table.Root>

            <Dialog.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <Dialog.Content style={{maxWidth: 450}} draggable={true}>
                    <Dialog.Title>{t('lbl_delete_selected_translations', 'Delete Selected Translations')}</Dialog.Title>
                    <Dialog.Description size="2" mb="4">
                        Are you sure you want to delete {selectedIds.length} selected
                        translation{selectedIds.length !== 1 ? 's' : ''}?
                        {t('lbl_delete_confirmation', 'This action cannot be undone.')}
                    </Dialog.Description>

                    <Flex gap="3" mt="4" justify="end">
                        <Dialog.Close>
                            <Button variant="soft" color="gray">
                                <ArrowBigLeft className="w-5 h-5"/>
                                {t('btn_back', 'Back')}
                            </Button>
                        </Dialog.Close>
                        <Dialog.Close>
                            <Button variant="solid" color="red" onClick={confirmDelete}>
                                <Trash2 className="w-5 h-5"/>
                                {t('btn_delete', 'Delete')}
                            </Button>
                        </Dialog.Close>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

            <Dialog.Root open={cloneDialogOpen} onOpenChange={setCloneDialogOpen}>
                <Dialog.Content style={{maxWidth: 450}} draggable={true}>
                    <Dialog.Title>{t('lbl_clone_translation', 'Clone Translation')}</Dialog.Title>
                    <Dialog.Description size="2" mb="4">
                        {t('lbl_enter_new_label_key', 'Enter the new Label and Key for the cloned locale.')}
                    </Dialog.Description>

                    <Flex direction="column" gap="3">
                        <Box>
                            <Text as="div" size="2" mb="1" weight="bold">{t('lbl_new_label', 'New Label')}</Text>
                            <TextField.Root
                                value={newLabel}
                                onChange={(e) => setNewLabel(e.target.value)}
                                placeholder="e.g. English (US)"
                            />
                        </Box>
                        <Box>
                            <Text as="div" size="2" mb="1" weight="bold">{t('lbl_new_key', 'New Key')}</Text>
                            <TextField.Root
                                value={newKey}
                                onChange={(e) => setNewKey(e.target.value)}
                                placeholder="e.g. en-US"
                            />
                        </Box>
                    </Flex>

                    <Flex gap="3" mt="4" justify="end">
                        <Dialog.Close>
                            <Button variant="soft" color="gray">
                                <ArrowBigLeft className="w-5 h-5"/>
                                {t('btn_back', 'Back')}
                            </Button>
                        </Dialog.Close>
                        <Button variant="solid" color="green" onClick={confirmClone}>
                            <CopyCheck className="w-5 h-5"/>
                            {t('btn_clone', 'Clone')}
                        </Button>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

            <Dialog.Root open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
                <Dialog.Content style={{maxWidth: 800}}>
                    <LocalizationHelp hideTitle/>
                    <Flex gap="3" mt="4" justify="end">
                        <Button variant="soft" color="gray" onClick={() => setHelpDialogOpen(false)}>
                            {t('btn_close', 'Close')}
                        </Button>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>
        </Card>
    );
};

export default Localizations;