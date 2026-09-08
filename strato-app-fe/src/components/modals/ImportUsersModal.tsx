import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Box, Button, Checkbox, Dialog, Flex, Table, Text, TextField } from '@radix-ui/themes';
import { DirectoryService } from '../../services/DirectoryService';
import type { IDirectoryUser, IImportUserResult } from '../../models/directory.model';
import { EImportStatus } from '../../models/directory.model';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export const ImportUsersModal: React.FC<Props> = ({ open, onOpenChange, onImported }) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importResults, setImportResults] = useState<IImportUserResult[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSearch('');
      setDebouncedSearch('');
      setSelected(new Set());
      setImportResults(null);
      setImportError(null);
    }
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setSelected(new Set());
  }, [debouncedSearch]);

  const { data: users, isLoading } = useQuery({
    queryKey: ['directory-users', debouncedSearch],
    queryFn: () =>
      debouncedSearch.trim()
        ? DirectoryService.searchUsers(debouncedSearch)
        : DirectoryService.listUsers(),
    enabled: open,
  });

  const toggleSelect = (user: IDirectoryUser) => {
    if (user.alreadyExists) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(user.directoryId)) next.delete(user.directoryId);
      else next.add(user.directoryId);
      return next;
    });
  };

  const handleImport = async () => {
    if (!users || selected.size === 0) return;
    const toImport = users
      .filter(u => selected.has(u.directoryId))
      .map(({ directoryId, displayName, email, upn, department }) => ({
        directoryId, displayName, email, upn, department,
      }));
    setImporting(true);
    setImportError(null);
    try {
      const results = await DirectoryService.importUsers(toImport);
      setImportResults(results);
      onImported();
    } catch (e) {
      setImportError((e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  if (importResults) {
    const created = importResults.filter(r => r.status === EImportStatus.CREATED).length;
    const skipped = importResults.filter(r => r.status === EImportStatus.ALREADY_EXISTS).length;
    const failed = importResults.filter(r => r.status === EImportStatus.FAILED);
    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Content style={{ maxWidth: 520 }}>
          <Dialog.Title>{t('import_ad_result_title', 'Import Complete')}</Dialog.Title>
          <Flex direction="column" gap="2" my="4">
            {created > 0 && <Text size="2" color="green">✓ {created} {t('import_ad_users_created', 'users imported successfully')}</Text>}
            {skipped > 0 && <Text size="2" color="yellow">⚠ {skipped} {t('import_ad_users_skipped', 'users already existed (skipped)')}</Text>}
            {failed.map(f => <Text key={f.directoryId} size="2" color="red">✗ {f.upn}: {f.reason}</Text>)}
          </Flex>
          <Flex justify="end">
            <Dialog.Close><Button>{t('btn_close', 'Close')}</Button></Dialog.Close>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 640 }}>
        <Dialog.Title>{t('import_ad_title', 'Import Users from Active Directory')}</Dialog.Title>

        <Box my="3">
          <TextField.Root
            placeholder={t('import_ad_search', 'Search by name, email or UPN…')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </Box>

        <Box style={{ maxHeight: 360, overflowY: 'auto' }}>
          {isLoading ? (
            <Flex justify="center" p="4">
              <Text size="2" color="gray">{t('lbl_loading', 'Loading…')}</Text>
            </Flex>
          ) : (
            <Table.Root variant="surface">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell style={{ width: 40 }} />
                  <Table.ColumnHeaderCell>{t('lbl_user', 'User')}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t('lbl_email', 'Email')}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t('lbl_dept', 'Dept')}</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {(users ?? []).map(user => (
                  <Table.Row
                    key={user.directoryId}
                    onClick={() => toggleSelect(user)}
                    style={{ cursor: user.alreadyExists ? 'default' : 'pointer' }}
                  >
                    <Table.Cell>
                      <Checkbox checked={selected.has(user.directoryId)} disabled={user.alreadyExists} />
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="2" weight={selected.has(user.directoryId) ? 'bold' : 'regular'}>
                        {user.displayName ?? user.upn}
                      </Text>
                      {user.alreadyExists && (
                        <Text size="1" color="yellow"> · {t('import_ad_already_present', 'already in Strato')}</Text>
                      )}
                    </Table.Cell>
                    <Table.Cell><Text size="2" color="gray">{user.email}</Text></Table.Cell>
                    <Table.Cell><Text size="2" color="gray">{user.department ?? '—'}</Text></Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Box>

        {importError && <Text size="2" color="red" mt="2">{importError}</Text>}

        <Flex justify="between" align="center" mt="3">
          <Text size="2" color="gray">
            {selected.size} {t('import_ad_selected', 'selected')} · {(users ?? []).length} {t('import_ad_shown', 'shown')}
            {!debouncedSearch && ` · ${t('import_ad_type_to_search', 'type to search more')}`}
          </Text>
          <Flex gap="2">
            <Dialog.Close>
              <Button variant="soft" color="gray">{t('btn_cancel', 'Cancel')}</Button>
            </Dialog.Close>
            <Button onClick={handleImport} loading={importing} disabled={selected.size === 0}>
              {t('import_ad_btn_import', 'Import')}
              {selected.size > 0 ? ` ${selected.size} ${t('import_ad_users_label', 'Users')}` : ''}
            </Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};
