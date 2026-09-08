import {useState} from 'react';
import {Avatar, Badge, Button, Card, Flex, Separator, Text, TextField, Box, Heading, Grid} from '@radix-ui/themes';
import {useTranslation} from 'react-i18next';
import {useAuth} from '../../context/AuthContext';
import {usePageTitle} from '../../context/PageTitleContext';
import {useMutation} from '@tanstack/react-query';
import {fetchWithAuth} from '../../utils/api';
import {useToast} from '../../context/ToastContext';
import {User, ArrowBigLeft, Lock, UserCircle} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

const UserProfile = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    usePageTitle(t('ptitle_profile', 'User Profile'));

    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const changePasswordMutation = useMutation({
        mutationFn: async () => {
            const response = await fetchWithAuth(`/user-accounts/${user?.username}/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldPassword, newPassword }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Failed to change password');
            }
        },
        onSuccess: () => {
            showToast(t('msg_password_changed', 'Password changed successfully'), 'success');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        },
        onError: (error: Error) => {
            showToast(error.message || t('msg_password_change_failed', 'Failed to change password'), 'error');
        },
    });

    const handleChangePassword = () => {
        if (newPassword !== confirmPassword) {
            showToast(t('msg_passwords_do_not_match', 'Passwords do not match'), 'error');
            return;
        }
        if (!oldPassword) {
            showToast(t('msg_enter_old_password', 'Please enter your old password'), 'error');
            return;
        }
        changePasswordMutation.mutate();
    };

    if (!user) {
        return <Text>{t('lbl_loading', 'Loading...')}</Text>;
    }

    const handleBack = () => {
        navigate(-1);
    };

    return (
        <Box p="4">
            <Flex direction="column" gap="6" maxWidth="800px" mx="auto">
                <header>
                    <Flex justify="between" align="center" mb="2">
                        <Heading size="6">
                            <Flex align="center" gap="2">
                                <UserCircle size={32} color="var(--accent-11)"/>
                                <span
                                    className="bg-gradient-to-l from-[var(--gray-12)] to-[var(--accent-10)] bg-clip-text text-transparent">
                                    {t('head_user_profile', 'User Profile')}
                                </span>
                            </Flex>
                        </Heading>
                        <Button onClick={handleBack} variant="soft" color="amber">
                            <ArrowBigLeft size={16} /> {t('btn_back', 'Back')}
                        </Button>
                    </Flex>
                    <Text color="gray" size="2">
                        {t('sub_user_profile', 'View and manage your account details.')}
                    </Text>
                </header>

                <Card size="3">
                    <Flex direction="column" gap="4">
                        <Flex direction="row" gap="2" align="center">
                            <UserCircle size={24} color="var(--accent-11)" />
                            <Heading size="5">
                                <span
                                    className="bg-gradient-to-l from-[var(--gray-12)] to-[var(--accent-10)] bg-clip-text text-transparent">
                                    {t('title_profile_info', 'Account Information')}
                                </span>
                            </Heading>
                        </Flex>

                        <Flex gap="4" align="center">
                            {user.imageUrl ? (
                                <Avatar
                                    src={user.imageUrl}
                                    fallback={user.username.charAt(0).toUpperCase()}
                                    size="8"
                                    radius="full"
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-[var(--gray-4)] flex items-center justify-center">
                                    <User className="w-12 h-12 text-[var(--gray-11)]" />
                                </div>
                            )}
                            <Flex direction="column" gap="1">
                                <Text size="6" weight="bold">{user.username}</Text>
                                <Text size="2" color="gray">ID: {user.id}</Text>
                                <Flex gap="2" mt="2">
                                    {user.roles.map((role) => (
                                        <Badge key={role} color="blue" variant="soft">
                                            {role.replace('ROLE_', '')}
                                        </Badge>
                                    ))}
                                </Flex>
                            </Flex>
                        </Flex>
                    </Flex>
                </Card>

                <Card size="3">
                    <Flex direction="column" gap="4">
                        <Flex direction="row" gap="2" align="center">
                            <Lock size={24} color="var(--accent-11)" />
                            <Heading size="5">
                                <span
                                    className="bg-gradient-to-l from-[var(--gray-12)] to-[var(--accent-10)] bg-clip-text text-transparent">
                                    {t('title_change_password', 'Security')}
                                </span>
                            </Heading>
                        </Flex>

                        <Grid columns={{ initial: '1', sm: '2' }} gap="4" align="center">
                            <Box>
                                <Text as="div" size="2" weight="bold">{t('lbl_old_password', 'Old Password')}</Text>
                                <Text as="div" size="1" color="gray">{t('desc_old_password', 'Enter your current password to verify identity')}</Text>
                            </Box>
                            <TextField.Root
                                type="password"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                placeholder={t('ph_old_password', 'Enter current password')}
                            />

                            <Box>
                                <Text as="div" size="2" weight="bold">{t('lbl_new_password', 'New Password')}</Text>
                                <Text as="div" size="1" color="gray">{t('desc_new_password', 'Choose a strong new password')}</Text>
                            </Box>
                            <TextField.Root
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder={t('ph_new_password', 'Enter new password')}
                            />

                            <Box>
                                <Text as="div" size="2" weight="bold">{t('lbl_confirm_password', 'Confirm Password')}</Text>
                                <Text as="div" size="1" color="gray">{t('desc_confirm_password', 'Re-type your new password')}</Text>
                            </Box>
                            <TextField.Root
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder={t('ph_confirm_password', 'Confirm new password')}
                            />
                        </Grid>

                        <Separator size="4" />

                        <Flex justify="end">
                            <Button onClick={handleChangePassword} disabled={changePasswordMutation.isPending} size="3" variant="soft">
                                {changePasswordMutation.isPending ? t('lbl_saving', 'Saving...') : t('btn_change_password', 'Change Password')}
                            </Button>
                        </Flex>
                    </Flex>
                </Card>
            </Flex>
        </Box>
    );
};

export default UserProfile;
