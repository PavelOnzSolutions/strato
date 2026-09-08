import {useState} from 'react';
import {
    Badge,
    Box,
    Button,
    Card,
    Checkbox,
    ContextMenu,
    Dialog,
    Flex,
    Progress,
    Table,
    Text,
    TextField
} from '@radix-ui/themes';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {CircleHelp, Download, KeyRound, Lock, Plus, RefreshCw, Shield, Trash, User2, Users} from 'lucide-react';
import {useToolbar} from '../../../context/ToolbarContext';
import {usePageTitle} from '../../../context/PageTitleContext';
import {fetchWithAuth} from '../../../utils/api';
import {useToast} from '../../../context/ToastContext';
import {useCanWrite} from '../../../components/permissions/WriteGuard';
import {EUserOrigin, IUserAccount} from '../../../models/user-account.model';
import {IAuthority} from '../../../models/authority.model';
import UserManagementHelp from '../../documentation/UserManagementHelp';
import {DirectoryService} from '../../../services/DirectoryService';
import {ImportUsersModal} from '../../../components/modals/ImportUsersModal';
import {DraggableDialogContent} from "../../../components/system/DraggableDialogContent.tsx";
import {fetchUsers, deleteUser} from "./api.ts";
import {UserDetailsModal} from './UserDetailsModal';
import Avatar from "react-avatar";

const UserManagement = () => {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const canWrite = useCanWrite('PERM_USER_WRITE');
    const queryClient = useQueryClient();
    usePageTitle(t('ptitle_users', 'User Management'));

    const [changePasswordOpen, setChangePasswordOpen] = useState(false);
    const [editRolesOpen, setEditRolesOpen] = useState(false);
    const [helpDialogOpen, setHelpDialogOpen] = useState(false);
    const [deleteUserOpen, setDeleteUserOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<IUserAccount | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [detailsUser, setDetailsUser] = useState<IUserAccount | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

    const { data: users, isLoading, refetch } = useQuery({
        queryKey: ['users'],
        queryFn: fetchUsers,
    });

    const { data: directoryConfig } = useQuery({
        queryKey: ['directory-config'],
        queryFn: DirectoryService.getConfig,
        staleTime: 5 * 60 * 1000,
    });

    const [importModalOpen, setImportModalOpen] = useState(false);

    const { data: authorities } = useQuery<IAuthority[]>({
        queryKey: ['authorities'],
        queryFn: async () => {
            const response = await fetchWithAuth('/authorities');
            if (!response.ok) throw new Error('Failed to fetch authorities');
            return response.json();
        }
    });

    const updateRolesMutation = useMutation({
        mutationFn: async ({ username, roles }: { username: string; roles: string[] }) => {
            const response = await fetchWithAuth(`/user-accounts/${username}/roles`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roles }),
            });
            if (!response.ok) {
                throw new Error('Failed to update roles: ' + (await response.text()));
            }
            return response.json();
        },
        onSuccess: () => {
            showToast(t('msg_roles_updated', 'User roles updated successfully'), 'success');
            setEditRolesOpen(false);
            setSelectedUser(null);
            setSelectedRoles([]);
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
        onError: () => {
            showToast(t('msg_roles_update_failed', 'Failed to update roles'), 'error');
        },
    });

    const changePasswordMutation = useMutation({
        mutationFn: async ({ username, password }: { username: string; password: string }) => {
            const response = await fetchWithAuth(`/user-accounts/${username}/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword: password }),
            });
            if (!response.ok) {
                throw new Error('Failed to change password: ' + (await response.text()));
            }
        },
        onSuccess: () => {
            showToast(t('msg_password_changed', 'Password changed successfully'), 'success');
            setChangePasswordOpen(false);
            setNewPassword('');
            setConfirmPassword('');
            setSelectedUser(null);
        },
        onError: () => {
            showToast(t('msg_password_change_failed', 'Failed to change password'), 'error');
        },
    });

    const deleteUserMutation = useMutation({
        mutationFn: deleteUser,
        onSuccess: () => {
            showToast('User deleted successfully', 'success');
            setSelectedUser(null);

            queryClient.invalidateQueries({queryKey: ['users']});
        },
        onError: (error: any) => showToast(selectedUser?.username + ' - ' + error.message, 'error'),
    });

    const handleChangePassword = () => {
        if (newPassword !== confirmPassword) {
            showToast(t('msg_passwords_do_not_match', 'Passwords do not match'), 'error');
            return;
        }
        if (selectedUser) {
            changePasswordMutation.mutate({ username: selectedUser.username, password: newPassword });
        }
    };

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserConfirmPassword, setNewUserConfirmPassword] = useState('');
    const [newUserRoles, setNewUserRoles] = useState('USER');

    const createMutation = useMutation({
        mutationFn: async () => {
            if (newUserPassword !== newUserConfirmPassword) {
                throw new Error(t('msg_passwords_do_not_match', 'Passwords do not match'));
            }
            const response = await fetchWithAuth('/user-accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: newUsername,
                    password: newUserPassword,
                    roles: newUserRoles.split(',').map(r => r.trim()).filter(r => r)
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || t('msg_create_failed', 'Failed to create user'));
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setIsCreateDialogOpen(false);
            setNewUsername('');
            setNewUserPassword('');
            setNewUserConfirmPassword('');
            setNewUserRoles('USER');
            showToast(t('msg_user_created', 'User created successfully'), 'success');
        },
        onError: (error: Error) => {
            showToast(error.message, 'error');
        },
    });

    const handleCreateUser = () => {
        createMutation.mutate();
    };

    useToolbar([
        {
            id: 'new',
            label: t('btn_new_user', 'New User'),
            icon: Plus,
            variant: 'solid',
            onClick: () => setIsCreateDialogOpen(true),
            disabled: !canWrite,
        },
        ...(directoryConfig?.enabled && canWrite ? [{
            id: 'import-ad',
            label: t('btn_import_from_ad', 'Import from EntraID'),
            icon: Download,
            color: 'violet' as const,
            variant: 'solid' as const,
            onClick: () => setImportModalOpen(true),
        }] : []),
        { id: 'refresh', label: t('btn_refresh', 'Refresh'), icon: RefreshCw, onClick: () => refetch() },
        { id: 'help', label: t('btn_help', 'Help'), icon: CircleHelp, color: 'sky', onClick: () => setHelpDialogOpen(true) },
    ]);

    const openChangePasswordDialog = (user: IUserAccount) => {
        setSelectedUser(user);
        setNewPassword('');
        setConfirmPassword('');
        setChangePasswordOpen(true);
    };

    const openEditRolesDialog = (user: IUserAccount) => {
        setSelectedUser(user);
        setSelectedRoles([...user.roles]);
        setEditRolesOpen(true);
    };

    const openDeleteUserDialog = (user: IUserAccount) => {
        setSelectedUser(user);
        setDeleteUserOpen(true);
    };

    const openUserDetails = (user: IUserAccount) => {
        setDetailsUser(user);
        setDetailsOpen(true);
    };

    const handleUpdateRoles = () => {
        if (selectedUser) {
            updateRolesMutation.mutate({ username: selectedUser.username, roles: selectedRoles });
        }
    };

    const confirmDelete = async (id: string) => {
        await deleteUserMutation.mutateAsync(id);
        setDeleteUserOpen(false);
    };

    const toggleRole = (role: string) => {
        setSelectedRoles(prev =>
            prev.includes(role)
                ? prev.filter(r => r !== role)
                : [...prev, role]
        );
    };
    
    const origin = (origin: EUserOrigin): {label: string, color: any} => {
        switch (origin) {
            case EUserOrigin.LOCAL:
                return {label: t('lbl_user_local', 'Local User'), color: 'violet'};
            case EUserOrigin.OAUTH2:
                return {label: t('lbl_user_oauth', 'OAuth2 User'), color: 'gold'};
            case EUserOrigin.SYNCHRONIZED:
                return {label: t('lbl_user_sync', 'Synchronized'), color: 'grass'}
            default:
                return {label: t('lbl_unknown', 'Unknown'), color: 'gray'};
        }
    }


    return (
        <Card size="4" className="w-full shadow-lg">

            <Flex direction="column" mb="2">
                <Flex direction="row" gap="2">
                    <Users size={32} color="var(--accent-11)"/>
                    <Text size="5" weight="bold">
                  <span
                    className="bg-linear-to-l from-(--gray-12) to-(--accent-10) bg-clip-text text-transparent">
                  {t('lbl_user_mgmt', 'User Management')}
                  </span>
                    </Text>
                </Flex>
                <Text size="2"
                      color="gray">{t('lbl_user_mgmt_desc', 'Manage users and their roles')}</Text>
            </Flex>

            {isLoading && (
                <div className="mb-4">
                    <Progress />
                </div>
            )}

            <Table.Root variant="surface">
                <Table.Header>
                    <Table.Row>
                        <Table.ColumnHeaderCell>{t('thead_user', 'User')}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t('thead_user_origin', 'Origin')}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t('thead_roles', 'Roles')}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t('thead_status', 'Status')}</Table.ColumnHeaderCell>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {users?.map((user) => (
                        <ContextMenu.Root key={user.id}>
                            <ContextMenu.Trigger>
                                <Table.Row
                                    className="hover:bg-[var(--accent-2)] cursor-pointer"
                                    onClick={() => openUserDetails(user)}
                                >
                                    <Table.Cell>
                                        <Flex align="center" gap="3">
                                            <Avatar
                                              src={user.imageUrl ?? undefined}
                                              name={user.displayName || user.username}
                                              size="32"
                                              round={true}
                                            />
                                            <Flex direction="column">
                                                <Text weight="bold">{user.username}</Text>
                                                {user.displayName && (
                                                    <Text size="1" color="gray">{user.displayName}</Text>
                                                )}
                                            </Flex>
                                        </Flex>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Badge color={origin(user.source).color}>
                                            {origin(user.source).label}
                                        </Badge>
                                    </Table.Cell>
                                    <Table.Cell>
                                {user.roles.length > 0 ? (
                                    <Flex gap="2" wrap="wrap">
                                        {user.roles.map((role) => (
                                            <Badge key={role} color="blue" variant="soft">
                                                {role.replace('ROLE_', '')}
                                            </Badge>
                                        ))}
                                    </Flex>
                                ) : (
                                    <Text size="1" color="gray" style={{ fontStyle: 'italic' }}>
                                        {t('msg_no_roles', 'No roles')}
                                    </Text>
                                )}
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Badge color={user.enabled ? 'green' : 'gray'}>
                                            {user.enabled ? t('lbl_active', 'Active') : t('lbl_disabled', 'Disabled')}
                                        </Badge>
                                    </Table.Cell>
                                </Table.Row>
                            </ContextMenu.Trigger>
                            <ContextMenu.Content>
                                <ContextMenu.Label>{t('lbl_user', 'User') + ' ' + user.username}</ContextMenu.Label>
                                <ContextMenu.Item onClick={() => openUserDetails(user)}>
                                    <User2 size={20} />
                                    {t('btn_profile', 'Profile')}
                                </ContextMenu.Item>
                                <ContextMenu.Separator />
                                <ContextMenu.Item disabled={!canWrite} onClick={() => openEditRolesDialog(user)}>
                                    <Shield size={20} />
                                    {t('btn_edit_roles', 'Edit Roles')}
                                </ContextMenu.Item>
                                <ContextMenu.Item disabled={!canWrite} onClick={() => openChangePasswordDialog(user)}>
                                    <KeyRound size={20} />
                                    {t('btn_change_password', 'Change Password')}
                                </ContextMenu.Item>
                                <ContextMenu.Item color='orange' disabled={!canWrite}>
                                    <Lock size={20} />
                                    {t('btn_deactivate', 'Deactivate')}
                                </ContextMenu.Item>
                                <ContextMenu.Separator />
                                <ContextMenu.Item color='red' disabled={!canWrite} onClick={() => openDeleteUserDialog(user)}>
                                    <Trash size={20} />
                                    {t('btn_delete', 'Delete')}
                                </ContextMenu.Item>
                            </ContextMenu.Content>
                        </ContextMenu.Root>
                    ))
                    }
                </Table.Body>
            </Table.Root>

            <Dialog.Root open={deleteUserOpen} onOpenChange={setDeleteUserOpen}>
                <DraggableDialogContent maxWidth="450px" title={t('lbl_delete_user', 'Delete User')}>
                    <Text size="2"
                          mb="4">{t('lbl_confirm_delete_user', `Are you sure you want to delete user ${selectedUser?.username}?`)}</Text>
                    <Flex gap="3" mt="4" justify="end">
                        <Dialog.Close><Button variant="soft" color="gray">{t('btn_back', 'Back')}</Button></Dialog.Close>
                        <Button variant="solid" color="red" onClick={() => confirmDelete(selectedUser?.username ?? '')} disabled={!canWrite}>{t('btn_delete', 'Delete')}</Button>
                    </Flex>
                </DraggableDialogContent>
            </Dialog.Root>

            <Dialog.Root open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
                <Dialog.Content style={{ maxWidth: 450 }}>
                    <Dialog.Title>
                        {t('lbl_change_password_for', 'Change Password for')} {selectedUser?.username}
                    </Dialog.Title>
                    <Dialog.Description size="2" mb="4">
                        {t('lbl_enter_new_password_admin', 'Enter the new password for this user.')}
                    </Dialog.Description>

                    <Flex direction="column" gap="3">
                        <label>
                            <Text as="div" size="2" mb="1" weight="bold">
                                {t('lbl_new_password', 'New Password')}
                            </Text>
                            <TextField.Root
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder={t('ph_new_password', 'Enter new password')}
                            />
                        </label>
                        <label>
                            <Text as="div" size="2" mb="1" weight="bold">
                                {t('lbl_confirm_password', 'Confirm Password')}
                            </Text>
                            <TextField.Root
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder={t('ph_confirm_password', 'Confirm new password')}
                            />
                        </label>
                    </Flex>

                    <Flex gap="3" mt="4" justify="end">
                        <Dialog.Close>
                            <Button variant="soft" color="gray">
                                {t('btn_cancel', 'Cancel')}
                            </Button>
                        </Dialog.Close>
                        <Button onClick={handleChangePassword} color="green">
                            {t('btn_save', 'Save')}
                        </Button>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

            {/* Edit Roles Dialog */}
            <Dialog.Root open={editRolesOpen} onOpenChange={setEditRolesOpen}>
                <Dialog.Content style={{ maxWidth: 450 }}>
                    <Dialog.Title>
                        {t('lbl_edit_roles_for', 'Edit Roles for')} {selectedUser?.username}
                    </Dialog.Title>
                    <Dialog.Description size="2" mb="4">
                        {t('lbl_select_user_roles', 'Select roles for this user.')}
                    </Dialog.Description>

                    <Box>
                        <Card variant="surface">
                            <Flex direction="column" gap="2" style={{ maxHeight: 300, overflowY: 'auto', padding: 4 }}>
                                {authorities?.map(role => (
                                    <label key={role.name} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 8px', borderRadius: 4 }}>
                                        <Checkbox
                                            checked={selectedRoles.includes(role.name)}
                                            onCheckedChange={() => toggleRole(role.name)}
                                        />
                                        <Text size="2">{role.name.replace('ROLE_', '')}</Text>
                                    </label>
                                ))}
                            </Flex>
                        </Card>
                    </Box>

                    <Flex gap="3" mt="4" justify="end">
                        <Dialog.Close>
                            <Button variant="soft" color="gray">
                                {t('btn_cancel', 'Cancel')}
                            </Button>
                        </Dialog.Close>
                        <Button onClick={handleUpdateRoles} loading={updateRolesMutation.isPending} color="green">
                            {t('btn_save', 'Save')}
                        </Button>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

            {/* Create User Dialog */}
            <Dialog.Root open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <Dialog.Content style={{ maxWidth: 450 }}>
                    <Dialog.Title>{t('lbl_new_user', 'New User')}</Dialog.Title>
                    <Dialog.Description size="2" mb="4">
                        {t('lbl_enter_user_details', 'Enter details for the new user.')}
                    </Dialog.Description>

                    <Flex direction="column" gap="3">
                        <label>
                            <Text as="div" size="2" mb="1" weight="bold">
                                {t('lbl_username', 'Username')}
                            </Text>
                            <TextField.Root
                                placeholder={t('ph_username', 'Enter username')}
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                            />
                        </label>
                        <label>
                            <Text as="div" size="2" mb="1" weight="bold">
                                {t('lbl_password', 'Password')}
                            </Text>
                            <TextField.Root
                                type="password"
                                placeholder={t('ph_password', 'Enter password')}
                                value={newUserPassword}
                                onChange={(e) => setNewUserPassword(e.target.value)}
                            />
                        </label>
                        <label>
                            <Text as="div" size="2" mb="1" weight="bold">
                                {t('lbl_confirm_password', 'Confirm Password')}
                            </Text>
                            <TextField.Root
                                type="password"
                                placeholder={t('ph_confirm_password', 'Confirm password')}
                                value={newUserConfirmPassword}
                                onChange={(e) => setNewUserConfirmPassword(e.target.value)}
                            />
                        </label>
                        <Box>
                            <Text as="div" size="2" mb="1" weight="bold">
                                {t('lbl_roles', 'Roles')}
                            </Text>
                            <Card variant="surface">
                                <Flex direction="column" gap="2" style={{ maxHeight: 200, overflowY: 'auto', padding: 4 }}>
                                    {authorities?.map(role => (
                                        <label key={role.name} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 8px', borderRadius: 4 }}>
                                            <Checkbox
                                                checked={newUserRoles.split(',').map(r => r.trim()).includes(role.name)}
                                                onCheckedChange={(checked) => {
                                                    const currentRoles = newUserRoles.split(',').map(r => r.trim()).filter(r => r);
                                                    if (checked) {
                                                        setNewUserRoles([...currentRoles, role.name].join(', '));
                                                    } else {
                                                        setNewUserRoles(currentRoles.filter(r => r !== role.name).join(', '));
                                                    }
                                                }}
                                            />
                                            <Text size="2">{role.name.replace('ROLE_', '')}</Text>
                                        </label>
                                    ))}
                                </Flex>
                            </Card>
                        </Box>
                    </Flex>

                    <Flex gap="3" mt="4" justify="end">
                        <Dialog.Close>
                            <Button variant="soft" color="gray">
                                {t('btn_cancel', 'Cancel')}
                            </Button>
                        </Dialog.Close>
                        <Button onClick={handleCreateUser} disabled={createMutation.isPending}>
                            {createMutation.isPending ? t('lbl_saving', 'Saving...') : t('btn_create', 'Create')}
                        </Button>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

            {/* Help Dialog */}
            <Dialog.Root open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
                <Dialog.Content style={{ maxWidth: 800 }}>
                    <UserManagementHelp hideTitle />
                    <Flex gap="3" mt="4" justify="end">
                        <Button variant="soft" color="gray" onClick={() => setHelpDialogOpen(false)}>
                            {t('btn_close', 'Close')}
                        </Button>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

            <ImportUsersModal
                open={importModalOpen}
                onOpenChange={setImportModalOpen}
                onImported={refetch}
            />

            <UserDetailsModal
                user={detailsUser}
                open={detailsOpen}
                onOpenChange={setDetailsOpen}
            />
        </Card>
    );
};

export default UserManagement;
