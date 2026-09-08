import {useMemo, useState} from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  Dialog,
  Flex,
  IconButton,
  Progress,
  ScrollArea,
  Table,
  Text,
  TextField, Tooltip
} from '@radix-ui/themes';
import {
  ArrowBigLeft,
  CircleHelp,
  Edit2, Eye,
  Lock,
  Plus,
  RefreshCw,
  Save,
  Search,
  Shield, ShieldUser,
  Trash2,
  Unlock,
  X
} from 'lucide-react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {fetchWithAuth} from '../../../utils/api';
import {IAuthority} from '../../../models/authority.model';
import {usePageTitle} from '../../../context/PageTitleContext';
import {useToolbar} from '../../../context/ToolbarContext';
import {useCanWrite} from '../../../components/permissions/WriteGuard';
import RoleManagementHelp from '../../documentation/RoleManagementHelp';
import PermissionSelector from '../../../components/permissions/PermissionSelector';

const RoleManagement = () => {
  const {t} = useTranslation();
  const canWrite = useCanWrite('PERM_ROLE_WRITE');
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingRole, setEditingRole] = useState<IAuthority | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);

  usePageTitle(t('mit_role_management', 'Role Management'));

  const {data: authorities, isLoading, refetch} = useQuery<IAuthority[]>({
    queryKey: ['authorities'],
    queryFn: async () => {
      const response = await fetchWithAuth('/authorities');
      if (!response.ok) throw new Error('Failed to fetch authorities');
      return response.json();
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (role: IAuthority) => {
      const response = await fetchWithAuth('/authorities', {
        method: 'POST',
        body: JSON.stringify(role)
      });
      if (!response.ok) {
        try {
          const problem = await response.json();
          if (problem && problem.detail) {
            throw new Error(problem.detail);
          }
        } catch (e) {
          // Fallback if not JSON or no detail
        }
        throw new Error('Failed to save role');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['authorities']});
      setIsDialogOpen(false);
      setEditingRole(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetchWithAuth(`/authorities/${name}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        try {
          const problem = await response.json();
          if (problem && problem.detail) {
            throw new Error(problem.detail);
          }
        } catch (e) {
          // Fallback
        }
        throw new Error('Failed to delete role');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['authorities']});
    }
  });

  const filteredAuthorities = useMemo(() => {
    if (!authorities) return [];
    return authorities.filter(auth =>
      auth.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [authorities, search]);

  const handleCreate = () => {
    setEditingRole({
      name: '',
      system: false,
      permissions: []
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (role: IAuthority) => {
    setEditingRole({...role});
    setIsDialogOpen(true);
  };

  const handleDelete = (name: string) => {
    setRoleToDelete(name);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (roleToDelete) {
      deleteMutation.mutate(roleToDelete);
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
    }
  };

  const handleSave = () => {
    if (editingRole) {
      saveMutation.mutate(editingRole);
    }
  };

  useToolbar([
    {
      id: 'new',
      label: t('btn_create_role', 'Create Role'),
      icon: Plus,
      onClick: handleCreate,
      variant: 'solid' as const,
      disabled: !canWrite,
    },
    {id: 'refresh', label: t('btn_refresh', 'Refresh'), icon: RefreshCw, onClick: () => refetch()},
    {id: 'help', label: t('btn_help', 'Help'), icon: CircleHelp, onClick: () => setHelpDialogOpen(true), color: 'sky'},
  ]);

  return (
    <Flex direction="column" gap="4">
      <Card>
        <Flex direction="column" mb="2">
          <Flex direction="row" gap="2">
            <ShieldUser size={32} color="var(--accent-11)"/>
            <Text size="5" weight="bold">
                  <span
                    className="bg-linear-to-l from-(--gray-12) to-(--accent-11) bg-clip-text text-transparent">
                  {t('lbl_role_mgmt', 'Roles & Permissions Management')}
                  </span>
            </Text>
          </Flex>
          <Text size="2"
                color="gray">{t('lbl_role_mgmt_desc', 'Define Roles with permissions')}</Text>
        </Flex>

        <Flex direction="column" gap="3">
          <TextField.Root
            placeholder={t('placeholder_search_roles', 'Search roles...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          >
            <TextField.Slot>
              <Search size={16}/>
            </TextField.Slot>
          </TextField.Root>

          {isLoading && (
            <div className="mb-4">
              <Progress/>
            </div>
          )}

          <Table.Root variant="surface">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>{t('lbl_role_name', 'Role Name')}</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>{t('lbl_type', 'Type')}</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>{t('lbl_permissions', 'Permissions')}</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell align="right">{t('lbl_actions', 'Actions')}</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {filteredAuthorities.length === 0 && !isLoading ? (
                <Table.Row>
                  <Table.Cell colSpan={4} align="center">
                    <Text color="gray" size="2">{t('msg_no_roles_found', 'No roles found')}</Text>
                  </Table.Cell>
                </Table.Row>
              ) : (
                filteredAuthorities.map((role) => (
                  <Table.Row key={role.name} className="hover:bg-(--accent-2)">
                    <Table.RowHeaderCell>
                      <Flex align="center" gap="2">
                        <Shield size={16}/>
                        <Text weight="bold">{role.name}</Text>
                      </Flex>
                    </Table.RowHeaderCell>
                    <Table.Cell>
                      {role.system ? (
                        <Badge color="amber" variant="soft">
                          <Lock size={12} style={{marginRight: 4}}/>
                          {t('lbl_system', 'System')}
                        </Badge>
                      ) : (
                        <Badge color="green" variant="soft">
                          <Unlock size={12} style={{marginRight: 4}}/>
                          {t('lbl_custom', 'Custom')}
                        </Badge>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <Flex gap="1" wrap="wrap">
                        {role.permissions.map(perm => (
                          <Badge key={perm} size="1" color="gray" variant="outline">
                            {perm}
                          </Badge>
                        ))}
                        {role.permissions.length === 0 && (
                          <Text size="1" color="gray"
                                style={{fontStyle: 'italic'}}>{t('msg_no_permissions', 'No permissions')}</Text>
                        )}
                      </Flex>
                    </Table.Cell>
                    <Table.Cell align="right">
                      <Flex gap="2" justify="end">
                        {!role.system ? (
                          <Tooltip content={t('btn_edit', 'Edit')}>
                            <IconButton
                              variant="ghost"
                              onClick={() => handleEdit(role)}
                            >
                              <Edit2 size={16}/>
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip content={t('btn_view', 'View')}>
                            <IconButton
                              variant="ghost"
                              onClick={() => handleEdit(role)}
                            >
                              <Eye size={16}/>
                            </IconButton>
                          </Tooltip>
                        )}
                        {!role.system && (
                          <Tooltip content={t('btn_delete', 'Delete')} role="button" >
                            <IconButton
                              variant="ghost"
                              color="red"
                              onClick={() => handleDelete(role.name)}

                            >
                              <Trash2 size={16}/>
                            </IconButton>
                          </Tooltip>
                        )}
                      </Flex>
                    </Table.Cell>
                  </Table.Row>
                ))
              )}
            </Table.Body>
          </Table.Root>
        </Flex>
      </Card>

      <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Dialog.Content style={{maxWidth: 700, maxHeight: '80vh', display: 'flex', flexDirection: 'column'}}>
          <Dialog.Title>
            {editingRole?.name ? t('title_edit_role', 'Edit Role') : t('title_create_role', 'Create Role')}
          </Dialog.Title>
          <Dialog.Description size="2" mb="4">
            {t('msg_role_dialog_desc', 'Configure role name and associated permissions.')}
          </Dialog.Description>

          <Flex direction="column" gap="4">
            <Box>
              <Text as="div" size="2" mb="1" weight="bold">
                {t('lbl_role_name', 'Role Name')}
              </Text>
              <TextField.Root
                disabled={editingRole?.system}
                value={editingRole?.name || ''}
                onChange={(e) => setEditingRole(prev => prev ? {...prev, name: e.target.value} : null)}
                placeholder="ROLE_EXAMPLE"
              />
              {editingRole?.system && (
                <Text size="1" color="amber" mt="1">
                  {t('msg_system_role_rename_locked', 'System roles cannot be renamed.')}
                </Text>
              )}
            </Box>

            <Box>
              <Text as="div" size="2" mb="2" weight="bold">
                {t('lbl_permissions', 'Permissions')}
              </Text>
              <PermissionSelector
                selected={editingRole?.permissions ?? []}
                onChange={(perms) => setEditingRole(prev => prev ? {...prev, permissions: perms} : null)}
                readOnly={editingRole?.system}
              />
            </Box>
          </Flex>

          <Flex gap="3" mt="5" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                <X size={16}/>
                {t('btn_cancel', 'Cancel')}
              </Button>
            </Dialog.Close>
            <Button onClick={handleSave} loading={saveMutation.isPending} color="green" disabled={editingRole?.system}>
              <Save size={16}/>
              {t('btn_save', 'Save')}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <Dialog.Content style={{maxWidth: 450}}>
          <Dialog.Title>{t('title_delete_role', 'Delete Role')}</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            {t('msg_confirm_delete_role', 'Are you sure you want to delete this role?')}
            {' '}<Text weight="bold">{roleToDelete}</Text>
            <br/>
            {t('msg_delete_confirmation_warning', 'This action cannot be undone.')}
          </Dialog.Description>

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                <ArrowBigLeft className="w-5 h-5"/>
                {t('btn_back', 'Back')}
              </Button>
            </Dialog.Close>
            <Button variant="solid" color="red" onClick={confirmDelete} loading={deleteMutation.isPending}>
              <Trash2 className="w-5 h-5"/>
              {t('btn_delete', 'Delete')}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
        <Dialog.Content style={{maxWidth: 1400, maxHeight: '90vh', display: 'flex', flexDirection: 'column'}}>
          <Dialog.Title>{t('btn_help', 'Help')}</Dialog.Title>
          <ScrollArea style={{flex: 1, minHeight: 0}} type="auto">
            <RoleManagementHelp hideTitle/>
          </ScrollArea>
          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray" onClick={() => setHelpDialogOpen(false)}>
                {t('btn_close', 'Close')}
              </Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  );
};

export default RoleManagement;
