import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Button, Card, Flex, Heading, Select, Separator, Text } from '@radix-ui/themes';
import {BookOpen, CheckCircle, XCircle} from 'lucide-react';
import { fetchWithAuth } from '../../../../../utils/api';
import { DirectoryService } from '../../../../../services/DirectoryService';
import type { IEntraIdTestResponse } from '../../../../../models/directory.model';
import {useNavigate} from "react-router-dom";

interface AzureCredentialResource {
  id: string;
  name: string;
  type: string;
}

async function fetchAzureCredentials(): Promise<AzureCredentialResource[]> {
  const res = await fetchWithAuth('/resources/type/AZURE_CREDENTIAL');
  if (!res.ok) throw new Error('Failed to load credentials');
  return res.json();
}

export const GeneralSettingsTab: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: config } = useQuery({
    queryKey: ['directory-config'],
    queryFn: DirectoryService.getConfig,
  });

  const { data: credentials } = useQuery({
    queryKey: ['azure-credentials'],
    queryFn: fetchAzureCredentials,
  });

  const [selected, setSelected] = useState<string>('');
  const [testResult, setTestResult] = useState<IEntraIdTestResponse | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setSelected(config?.credentialResourceId ?? '');
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: (id: string) => DirectoryService.saveConfig(id),
    onSuccess: () => {
      setSaveError(null);
      setTestResult(null);
      queryClient.invalidateQueries({ queryKey: ['directory-config'] });
    },
    onError: (e: Error) => setSaveError(e.message),
  });

  const testMutation = useMutation({
    mutationFn: () => DirectoryService.testConnection(),
    onSuccess: (r) => setTestResult(r),
    onError: (e: Error) => setTestResult({ success: false, message: e.message, userCount: null }),
  });

  return (
    <Box>
      <Card size="3">
        <Flex direction="column" gap="4">
          <Flex direction="row" gap="2">
            <BookOpen size={24} color="var(--accent-9)" />
            <Heading size="5" mb="2">
              <span
                className="bg-linear-to-l from-(--gray-12) to-(--accent-10) bg-clip-text text-transparent">
                {t('general_entra_title', 'Entra ID / Active Directory')}
              </span>
            </Heading>
          </Flex>

          <Text size="2" color="gray">
            {t('general_entra_desc',
              'Connect to Microsoft Entra ID to import users from your organization directory.')}
          </Text>

          <Separator size="4" />

          <Box>
            <Flex direction="row" gap="3" align="center" mb="2">
              <Box style={{ flex: 1 }}>
                <Text size="2" weight="bold" as="div" mb="1">
                  {t('general_entra_credential', 'Azure Credential')}
                </Text>
                <Text size="1" color="gray" as="div">
                  {t('general_entra_credential_hint',
                    'Select an Azure Credential resource (User or Service Principal). It must have Microsoft Graph User.Read.All access.')}
                </Text>
              </Box>
            </Flex>

            <Flex gap="2" align="center">
              <Box style={{ flex: 1 }}>
                <Select.Root value={selected} onValueChange={setSelected}>
                  <Select.Trigger
                    placeholder={t('general_entra_select_cred', 'Select credential…')}
                    style={{ width: '100%' }}
                  />
                  <Select.Content>
                    {(credentials ?? []).map(c => (
                      <Select.Item key={c.id} value={c.id}>{c.name}</Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Box>
              <Button variant="outline" onClick={() => navigate(`/resources/definitions/${selected}`)}>
                {t('general_entra_manage_creds', 'Manage')}
              </Button>
            </Flex>
          </Box>

          <Separator size="4" />

          <Flex gap="2" mt="1">
            <Button
              onClick={() => saveMutation.mutate(selected)}
              loading={saveMutation.isPending}
              disabled={!selected}
            >
              {t('btn_save', 'Save')}
            </Button>
            <Button
              variant="outline"
              onClick={() => testMutation.mutate()}
              loading={testMutation.isPending}
              disabled={!config?.enabled}
            >
              {t('general_entra_test', 'Test Connection')}
            </Button>
          </Flex>

          {saveError && <Text size="2" color="red">{saveError}</Text>}

          {testResult && (
            <Flex align="center" gap="2">
              {testResult.success
                ? <CheckCircle size={14} color="var(--green-11)" />
                : <XCircle size={14} color="var(--red-11)" />}
              <Text size="2" color={testResult.success ? 'green' : 'red'}>
                {testResult.success
                  ? `${t('general_entra_verified', 'Connection verified')}${testResult.userCount != null
                      ? ` — ${testResult.userCount} ${t('general_entra_users_available', 'users available')}`
                      : ''}`
                  : testResult.message}
              </Text>
            </Flex>
          )}
        </Flex>
      </Card>
    </Box>
  );
};
