import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Dialog,
  Flex,
  Progress,
  ScrollArea,
  Select,
  Table,
  Text,
  TextField
} from '@radix-ui/themes';
import {Ban, Check, Copy, Key, LifeBuoy, Plus, RefreshCw, Trash2} from 'lucide-react';
import {useToolbar} from '../../context/ToolbarContext';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useEffect, useRef, useState} from 'react';
import {useToast} from '../../context/ToastContext';
import {usePageTitle} from '../../context/PageTitleContext';
import {CreateTokenRequest, CreateTokenResponse, IApiToken} from '../../models/api-token.model';
import {fetchWithAuth} from '../../utils/api';
import {useTranslation} from 'react-i18next';
import ApiTokensHelp from "../documentation/ApiTokens.tsx";
import {DraggableDialogContent} from '../../components/system/DraggableDialogContent.tsx';
import PermissionSelector from '../../components/permissions/PermissionSelector';

const fetchApiTokens = async (): Promise<IApiToken[]> => {
    const response = await fetchWithAuth('/tokens');
    if (!response.ok) {
        throw new Error('Network response was not ok: Status ' + response.statusText.toString() + ', ' + response.status.toString() + ', ' + response.url.toString());
    }
    return response.json();
};

const createApiToken = async (request: CreateTokenRequest): Promise<CreateTokenResponse> => {
    const response = await fetchWithAuth('/tokens', {
        method: 'POST',
        body: JSON.stringify(request),
    });
    if (!response.ok) {
        throw new Error('Failed to create token');
    }
    return response.json();
};

const revokeApiToken = async (id: string): Promise<IApiToken> => {
    const response = await fetchWithAuth(`/tokens/${id}/revoke`, {
        method: 'POST',
    });
    if (!response.ok) {
        throw new Error('Failed to revoke token');
    }
    return response.json();
};

const deleteApiTokens = async (ids: string[]) => {
    const response = await fetchWithAuth(`/tokens?id=${ids.join('&id=')}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error('Failed to delete tokens');
    }
};

const ApiTokens = () => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [tokenDisplayDialogOpen, setTokenDisplayDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [newTokenName, setNewTokenName] = useState('');
    const [newTokenExpiration, setNewTokenExpiration] = useState('30');
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [generatedToken, setGeneratedToken] = useState<CreateTokenResponse | null>(null);
    const [copied, setCopied] = useState(false);
    const [hideUserSessions, setHideUserSessions] = useState(true);
    const [helpDialogOpen, setHelpDialogOpen] = useState(false);
    const { showToast } = useToast();
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    const { data: tokens, isLoading, refetch } = useQuery({
        queryKey: ['api-tokens'],
        queryFn: fetchApiTokens,
    });

    const createMutation = useMutation({
        mutationFn: createApiToken,
        onSuccess: (data) => {
            setGeneratedToken(data);
            setCreateDialogOpen(false);
            setTokenDisplayDialogOpen(true);
            setNewTokenName('');
            setNewTokenExpiration('30');
            setSelectedPermissions([]);
            queryClient.invalidateQueries({ queryKey: ['api-tokens'] });
            showToast('Token created successfully', 'success');
        },
        onError: () => {
            showToast('Failed to create token', 'error');
        },
    });

    const revokeMutation = useMutation({
        mutationFn: revokeApiToken,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['api-tokens'] });
            showToast('Token revoked successfully', 'success');
            setSelectedIds([]);
        },
        onError: () => {
            showToast('Failed to revoke token', 'error');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteApiTokens,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['api-tokens'] });
            showToast('Token(s) deleted successfully', 'success');
            setSelectedIds([]);
            setDeleteDialogOpen(false);
        },
        onError: () => {
            showToast('Failed to delete tokens', 'error');
        },
    });

    usePageTitle(t('ptitle_api_tokens', 'API Tokens'));

    const filteredTokens = tokens?.filter(token => {
        if (hideUserSessions) {
            return !['local-login', 'oauth2-login', 'token-refresh'].includes(token.description)
        }
        return true;
    });

    const handleSelectAll = (checked: boolean) => {
        if (checked && filteredTokens) {
            setSelectedIds(filteredTokens.map(t => t.id));
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

    const handleCreateToken = () => {
        setCreateDialogOpen(true);
    };

    const handleConfirmCreate = () => {
        createMutation.mutate({
            name: newTokenName || 'API Token',
            expirationDays: parseInt(newTokenExpiration) || 30,
            permissions: selectedPermissions,
        });
    };

    const handleRevokeSelected = () => {
        if (selectedIds.length === 0) {
            showToast('Please select at least one token to revoke', 'error');
            return;
        }
        // Revoke tokens one by one
        selectedIds.forEach(id => {
            revokeMutation.mutate(id);
        });
    };

    const handleDeleteSelected = () => {
        if (selectedIds.length === 0) {
            showToast('Please select at least one token to delete', 'error');
            return;
        }
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        deleteMutation.mutate(selectedIds);
    };

    const handleCopyToken = async () => {
        if (generatedToken) {
            try {
                await navigator.clipboard.writeText(generatedToken.token);
                setCopied(true);
                showToast('Token copied to clipboard', 'success');
                setTimeout(() => setCopied(false), 2000);
            } catch {
                showToast('Failed to copy token', 'error');
            }
        }
    };

    // Use refs for toolbar actions
    const handleCreateTokenRef = useRef(handleCreateToken);
    const handleRevokeSelectedRef = useRef(handleRevokeSelected);
    const handleDeleteSelectedRef = useRef(handleDeleteSelected);

    useEffect(() => {
        handleCreateTokenRef.current = handleCreateToken;
        handleRevokeSelectedRef.current = handleRevokeSelected;
        handleDeleteSelectedRef.current = handleDeleteSelected;
    }, [handleCreateToken, handleRevokeSelected, handleDeleteSelected]);


    useToolbar([
        { id: 'new', label: t('btn_new', 'New'), icon: Plus, onClick: () => handleCreateTokenRef.current(), variant: 'solid' },
        { id: 'refresh', label: t('btn_refresh', 'Refresh'), icon: RefreshCw, onClick: () => refetch(), isLoading: isLoading },
        { id: 'revoke', label: t('btn_revoke', 'Revoke'), icon: Ban, variant: 'solid',onClick: () => handleRevokeSelectedRef.current(), color: 'amber' },
        { id: 'delete', label: t('btn_delete', 'Delete'), icon: Trash2, variant: 'solid', onClick: () => handleDeleteSelectedRef.current(), color: 'ruby' },
        { id: 'help', label: t('btn_help', 'Help'), icon: LifeBuoy, onClick: () => setHelpDialogOpen(true), color: 'sky' },
        { id: 'hideUserSessions', label: t('btn_hide_user_sessions', 'Hide Session Tokens'), isSwitch: true, checked: hideUserSessions, onCheckedChange: setHideUserSessions },
    ]);

    const allSelected = filteredTokens && filteredTokens.length > 0 && selectedIds.length === filteredTokens.length;
    const someSelected = selectedIds.length > 0 && selectedIds.length < (filteredTokens?.length || 0);

    const getTokenStatus = (token: IApiToken): { label: string; color: 'green' | 'amber' | 'ruby' | 'gray' } => {
        if (token.revoked) {
            return { label: 'Revoked', color: 'ruby' };
        }
        const expiresAt = new Date(token.expiresAt);
        if (expiresAt < new Date()) {
            return { label: 'Expired', color: 'gray' };
        }
        return { label: 'Active', color: 'green' };
    };

    return (
        <Card size="4" className="w-full shadow-lg">

            <Flex direction="column" mb="2">
                <Flex direction="row" gap="2">
                    <Key size={32} color="var(--accent-11)"/>
                    <Text size="5" weight="bold">
                  <span
                    className="bg-gradient-to-l from-[var(--gray-12)] to-[var(--accent-10)] bg-clip-text text-transparent">
                  {t('lbl_api_tokens', 'API Tokens')}
                  </span>
                    </Text>
                </Flex>
                <Text size="2"
                      color="gray">{t('lbl_api_tokens_desc', 'List or create JWT tokens')}</Text>
            </Flex>

            {isLoading && (
                <div className="mb-4">
                    <Progress />
                </div>
            )}

            <Table.Root variant="surface">
                <Table.Header>
                    <Table.Row>
                        <Table.ColumnHeaderCell>
                            <Checkbox
                                checked={allSelected}
                                onCheckedChange={handleSelectAll}
                                {...(someSelected && { 'data-state': 'indeterminate' })}
                            />
                        </Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t('thead_name', 'Name')}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t('thead_issued_at', 'Issued At')}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t('thead_expires_at', 'Expires At')}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t('thead_status', 'Status')}</Table.ColumnHeaderCell>
                    </Table.Row>
                </Table.Header>

                <Table.Body>
                    {filteredTokens && filteredTokens.length > 0 ? (
                        filteredTokens.map((token) => {
                            const status = getTokenStatus(token);
                            return (
                                <Table.Row key={token.id} className="hover:bg-[var(--accent-2)]">
                                    <Table.Cell>
                                        <Checkbox
                                            checked={selectedIds.includes(token.id)}
                                            onCheckedChange={(checked) => handleSelectOne(token.id, checked === true)}
                                        />
                                    </Table.Cell>
                                    <Table.Cell>{token.description || '-'}</Table.Cell>
                                    <Table.Cell>{new Date(token.issuedAt).toLocaleString()}</Table.Cell>
                                    <Table.Cell>{new Date(token.expiresAt).toLocaleString()}</Table.Cell>
                                    <Table.Cell><Badge color={status.color}>{status.label}</Badge></Table.Cell>
                                </Table.Row>
                            );
                        })
                    ) : (
                        !isLoading && (
                            <Table.Row>
                                <Table.Cell colSpan={5} className="text-center text-[var(--gray-11)]">
                                    No API tokens found. Click "New Token" to create one.
                                </Table.Cell>
                            </Table.Row>
                        )
                    )}
                </Table.Body>
            </Table.Root>

            {/* Create Token Dialog */}
            <Dialog.Root open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <Dialog.Content style={{ maxWidth: 600 }}>
                    <Dialog.Title>Create New API Token</Dialog.Title>
                    <Dialog.Description size="2" mb="4">
                        Create a new API token for programmatic access. The token will only be displayed once after creation.
                    </Dialog.Description>

                    <Flex direction="column" gap="3">
                        <label>
                            <Text as="div" size="2" mb="1" weight="bold">
                                Token Name
                            </Text>
                            <TextField.Root
                                placeholder="e.g., CI/CD Pipeline Token"
                                value={newTokenName}
                                onChange={(e) => setNewTokenName(e.target.value)}
                            />
                        </label>

                        <label>
                            <Text as="div" size="2" mb="1" weight="bold">
                                Expiration
                            </Text>
                            <Select.Root value={newTokenExpiration} onValueChange={setNewTokenExpiration}>
                                <Select.Trigger placeholder="Select expiration..." />
                                <Select.Content>
                                    <Select.Item value="7">7 days</Select.Item>
                                    <Select.Item value="30">30 days</Select.Item>
                                    <Select.Item value="90">90 days</Select.Item>
                                    <Select.Item value="180">180 days</Select.Item>
                                    <Select.Item value="365">1 year</Select.Item>
                                </Select.Content>
                            </Select.Root>
                        </label>

                        <Box>
                            <Text as="div" size="2" mb="1" weight="bold">
                                {t('lbl_permissions', 'Permissions')}
                            </Text>
                            <PermissionSelector
                                selected={selectedPermissions}
                                onChange={setSelectedPermissions}
                                maxHeight={200}
                            />
                        </Box>
                    </Flex>

                    <Flex gap="3" mt="4" justify="end">
                        <Dialog.Close>
                            <Button variant="soft" color="gray">
                                Cancel
                            </Button>
                        </Dialog.Close>
                        <Button variant="solid" color="green" onClick={handleConfirmCreate} disabled={createMutation.isPending}>
                            <Plus className="w-4 h-4" />
                            {createMutation.isPending ? 'Creating...' : 'Create Token'}
                        </Button>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

            {/* Token Display Dialog */}
            <Dialog.Root open={tokenDisplayDialogOpen} onOpenChange={setTokenDisplayDialogOpen}>
                <DraggableDialogContent maxWidth="600px" title="Token Created Successfully">
                    <Dialog.Description size="2" mb="4" color="amber">
                        <strong>Important:</strong> Copy this token now. You won't be able to see it again!
                    </Dialog.Description>

                    {generatedToken && (
                        <Flex direction="column" gap="3">
                            <Text size="2" weight="bold">Token Name: {generatedToken.name}</Text>
                            <Text size="2" color="gray">Expires: {new Date(generatedToken.expiresAt).toLocaleString()}</Text>

                            <Flex gap="2" align="center">
                                <TextField.Root
                                    value={generatedToken.token}
                                    readOnly
                                    style={{ flex: 1, fontFamily: 'monospace', fontSize: '12px' }}
                                />
                                <Button variant="soft" onClick={handleCopyToken}>
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    {copied ? 'Copied!' : 'Copy'}
                                </Button>
                            </Flex>
                        </Flex>
                    )}

                    <Flex gap="3" mt="4" justify="end">
                        <Dialog.Close>
                            <Button variant="solid">
                                Done
                            </Button>
                        </Dialog.Close>
                    </Flex>
                </DraggableDialogContent>
            </Dialog.Root>

            {/* Delete Confirmation Dialog */}
            <Dialog.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DraggableDialogContent maxWidth="450px" title="Delete Selected Tokens">
                    <Dialog.Description size="2" mb="4">
                        Are you sure you want to delete {selectedIds.length} selected token{selectedIds.length !== 1 ? 's' : ''}?
                        This action cannot be undone.
                    </Dialog.Description>

                    <Flex gap="3" mt="4" justify="end">
                        <Dialog.Close>
                            <Button variant="soft" color="gray">
                                Cancel
                            </Button>
                        </Dialog.Close>
                        <Button variant="solid" color="red" onClick={confirmDelete} disabled={deleteMutation.isPending}>
                            <Trash2 className="w-5 h-5" />
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                        </Button>
                    </Flex>
                </DraggableDialogContent>
            </Dialog.Root>

            <Dialog.Root open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
                <DraggableDialogContent maxWidth="1000px" maxHeight="90vh" title={t('btn_help', 'Help')}>
                    <ScrollArea style={{ flex: 1, minHeight: 0 }} type="auto">
                        <ApiTokensHelp />
                    </ScrollArea>
                    <Flex gap="3" mt="4" justify="end">
                        <Dialog.Close>
                            <Button variant="soft" color="gray" onClick={() => setHelpDialogOpen(false)}>
                                {t('btn_close', 'Close')}
                            </Button>
                        </Dialog.Close>
                    </Flex>
                </DraggableDialogContent>
            </Dialog.Root>
        </Card>
    );
};

export default ApiTokens;
