import {useEffect, useState} from 'react';
import {Badge, Box, Button, Card, Checkbox, Dialog, Flex, Switch, Text, TextField} from '@radix-ui/themes';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {KeyRound} from 'lucide-react';
import Avatar from 'react-avatar';
import {EUserOrigin, IUpdateUserRequest, IUserAccount} from '../../../models/user-account.model';
import {IAuthority} from '../../../models/authority.model';
import {DraggableDialogContent} from '../../../components/system/DraggableDialogContent.tsx';
import {fetchWithAuth} from '../../../utils/api';
import {useToast} from '../../../context/ToastContext';
import {useCanWrite} from '../../../components/permissions/WriteGuard';
import {updateUser} from './api';

interface UserDetailsModalProps {
    user: IUserAccount | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const originBadge = (source: EUserOrigin, t: (k: string, fb?: string) => string) => {
    switch (source) {
        case EUserOrigin.LOCAL:
            return {label: t('lbl_user_local', 'Local User'), color: 'violet' as const};
        case EUserOrigin.OAUTH2:
            return {label: t('lbl_user_oauth', 'OAuth2 User'), color: 'gold' as const};
        case EUserOrigin.SYNCHRONIZED:
            return {label: t('lbl_user_sync', 'Synchronized'), color: 'grass' as const};
        default:
            return {label: t('lbl_unknown', 'Unknown'), color: 'gray' as const};
    }
};

const sortedEq = (a: string[], b: string[]) => {
    if (a.length !== b.length) return false;
    const sa = [...a].sort();
    const sb = [...b].sort();
    return sa.every((v, i) => v === sb[i]);
};

export const UserDetailsModal = ({user, open, onOpenChange}: UserDetailsModalProps) => {
    const {t} = useTranslation();
    const {showToast} = useToast();
    const canWrite = useCanWrite('PERM_USER_WRITE');
    const queryClient = useQueryClient();

    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [enabled, setEnabled] = useState(true);
    const [roles, setRoles] = useState<string[]>([]);
    const [passwordOpen, setPasswordOpen] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const {data: authorities} = useQuery<IAuthority[]>({
        queryKey: ['authorities'],
        queryFn: async () => {
            const res = await fetchWithAuth('/authorities');
            if (!res.ok) throw new Error('Failed to fetch authorities');
            return res.json();
        },
        enabled: open,
    });

    useEffect(() => {
        if (user) {
            setDisplayName(user.displayName ?? '');
            setEmail(user.email ?? '');
            setEnabled(user.enabled);
            setRoles([...user.roles]);
            setPasswordOpen(false);
            setNewPassword('');
            setConfirmPassword('');
        }
    }, [user]);

    const isLocal = user?.source === EUserOrigin.LOCAL;
    const profileDirty = user
        ? (displayName !== (user.displayName ?? '')
            || email !== (user.email ?? '')
            || enabled !== user.enabled)
        : false;
    const rolesDirty = user ? !sortedEq(roles, user.roles) : false;
    const anyDirty = profileDirty || rolesDirty;

    const updateProfile = useMutation({
        mutationFn: (req: IUpdateUserRequest) => updateUser(user!.username, req),
    });

    const updateRoles = useMutation({
        mutationFn: async (newRoles: string[]) => {
            const res = await fetchWithAuth(`/user-accounts/${user!.username}/roles`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({roles: newRoles}),
            });
            if (!res.ok) throw new Error(await res.text() || 'Failed to update roles');
            return res.json();
        },
    });

    const changePassword = useMutation({
        mutationFn: async (password: string) => {
            const res = await fetchWithAuth(`/user-accounts/${user!.username}/change-password`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({newPassword: password}),
            });
            if (!res.ok) throw new Error(await res.text() || 'Failed to change password');
        },
        onSuccess: () => {
            showToast(t('msg_password_changed', 'Password changed successfully'), 'success');
            setNewPassword('');
            setConfirmPassword('');
            setPasswordOpen(false);
        },
        onError: (e: Error) => {
            showToast(e.message || t('msg_password_change_failed', 'Failed to change password'), 'error');
        },
    });

    const handleChangePassword = () => {
        if (newPassword !== confirmPassword) {
            showToast(t('msg_passwords_do_not_match', 'Passwords do not match'), 'error');
            return;
        }
        if (!newPassword) return;
        changePassword.mutate(newPassword);
    };

    const handleSave = async () => {
        if (!user) return;
        if (isLocal && email && !EMAIL_RE.test(email)) {
            showToast(t('msg_invalid_email', 'Invalid email address'), 'error');
            return;
        }

        try {
            if (profileDirty) {
                const req: IUpdateUserRequest = {enabled};
                if (isLocal) {
                    req.displayName = displayName;
                    req.email = email;
                }
                await updateProfile.mutateAsync(req);
            }
            if (rolesDirty) {
                await updateRoles.mutateAsync(roles);
            }
            showToast(t('msg_user_updated', 'User updated successfully'), 'success');
            queryClient.invalidateQueries({queryKey: ['users']});
            onOpenChange(false);
        } catch (e: any) {
            showToast(e?.message || t('msg_user_update_failed', 'Failed to update user'), 'error');
        }
    };

    const toggleRole = (role: string) => {
        setRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
    };



    if (!user) return null;
    const ob = originBadge(user.source, t);
    const saving = updateProfile.isPending || updateRoles.isPending;

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <DraggableDialogContent maxWidth="800px" width="500px" title={t('lbl_user_details', 'User Details')}>
                <Flex direction="column" gap="4">
                    {/* Header */}
                    <Flex align="center" gap="3">
                        <Avatar
                            src={user.imageUrl ?? undefined}
                            name={user.displayName || user.username}
                            size="48"
                            round={true}
                        />
                        <Flex direction="column">
                            <Text size="4" weight="bold">{user.username}</Text>
                            {user.displayName && (
                                <Text size="2" color="gray">{user.displayName}</Text>
                            )}
                        </Flex>
                        <Badge color={ob.color} ml="auto">{ob.label}</Badge>
                    </Flex>

                    {/* Identity */}
                    <Flex direction="column" gap="2">
                        <Text size="2" weight="bold">{t('lbl_identity', 'Identity')}</Text>
                        <Text size="2"><b>{t('lbl_username', 'Username')}:</b> {user.username}</Text>
                        <label>
                            <Text as="div" size="2" mb="1">{t('lbl_display_name', 'Display name')}</Text>
                            {isLocal ? (
                                <TextField.Root
                                    value={displayName}
                                    onChange={e => setDisplayName(e.target.value)}
                                    disabled={!canWrite}
                                />
                            ) : (
                                <Text size="2" color="gray">{user.displayName ?? '—'}</Text>
                            )}
                        </label>
                        <label>
                            <Text as="div" size="2" mb="1">{t('lbl_email', 'Email')}</Text>
                            {isLocal ? (
                                <TextField.Root
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    disabled={!canWrite}
                                />
                            ) : (
                                <Text size="2" color="gray">{user.email ?? '—'}</Text>
                            )}
                        </label>
                    </Flex>

                    {/* Status */}
                    <Flex direction="column" gap="2">
                        <Text size="2" weight="bold">{t('lbl_status', 'Status')}</Text>
                        <Flex align="center" gap="2">
                            <Switch
                                checked={enabled}
                                onCheckedChange={setEnabled}
                                disabled={!canWrite}
                            />
                            <Text size="2">{enabled ? t('lbl_active', 'Active') : t('lbl_disabled', 'Disabled')}</Text>
                        </Flex>
                    </Flex>

                    {/* Roles */}
                    <Flex direction="column" gap="2">
                        <Text size="2" weight="bold">{t('lbl_roles', 'Roles')}</Text>
                        <Card variant="surface">
                            <Flex direction="column" gap="2" style={{maxHeight: 220, overflowY: 'auto', padding: 4}}>
                                {authorities?.map(role => (
                                    <label key={role.name} style={{display: 'flex', alignItems: 'center', gap: 8, cursor: canWrite ? 'pointer' : 'default', padding: '4px 8px', borderRadius: 4}}>
                                        <Checkbox
                                            checked={roles.includes(role.name)}
                                            onCheckedChange={() => toggleRole(role.name)}
                                            disabled={!canWrite}
                                        />
                                        <Text size="2">{role.name.replace('ROLE_', '')}</Text>
                                    </label>
                                ))}
                            </Flex>
                        </Card>
                    </Flex>

                    {isLocal && canWrite && (
                        <Flex direction="column" gap="2">
                            <Flex align="center" justify="between">
                                <Text size="2" weight="bold">
                                    <KeyRound size={14} style={{verticalAlign: 'middle', marginRight: 4}}/>
                                    {t('lbl_change_password', 'Change Password')}
                                </Text>
                                <Button
                                    variant="soft"
                                    size="1"
                                    onClick={() => setPasswordOpen(o => !o)}
                                >
                                    {passwordOpen ? t('btn_hide', 'Hide') : t('btn_show', 'Show')}
                                </Button>
                            </Flex>
                            {passwordOpen && (
                                <Flex direction="column" gap="2">
                                    <TextField.Root
                                        type="password"
                                        placeholder={t('ph_new_password', 'Enter new password')}
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                    />
                                    <TextField.Root
                                        type="password"
                                        placeholder={t('ph_confirm_password', 'Confirm new password')}
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                    />
                                    <Flex justify="end">
                                        <Button
                                            onClick={handleChangePassword}
                                            disabled={!newPassword || changePassword.isPending}
                                            loading={changePassword.isPending}
                                            color="green"
                                        >
                                            {t('btn_change_password', 'Change Password')}
                                        </Button>
                                    </Flex>
                                </Flex>
                            )}
                        </Flex>
                    )}

                    <Box mt="2" />

                    <Flex gap="3" justify="end">
                        <Button variant="soft" color="gray" onClick={() => onOpenChange(false)}>
                            {t('btn_cancel', 'Cancel')}
                        </Button>
                        {canWrite && (
                            <Button onClick={handleSave} disabled={!anyDirty || saving} color="green" loading={saving}>
                                {t('btn_save', 'Save')}
                            </Button>
                        )}
                    </Flex>
                </Flex>
            </DraggableDialogContent>
        </Dialog.Root>
    );
};
