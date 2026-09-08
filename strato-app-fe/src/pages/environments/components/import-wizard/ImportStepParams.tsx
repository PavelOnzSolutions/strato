import {AlertCircle, Plus, RefreshCw} from 'lucide-react';
import {Box, Button, Callout, Dialog, Flex, Heading, Select, Text, TextField} from '@radix-ui/themes';
import {useTranslation} from 'react-i18next';
import {IImportRequest} from '../../../../models/import.model.ts';
import {IResource} from '../../../../models/resource.model.ts';
import {Dispatch, SetStateAction} from 'react';

type NewCred = {
  name: string;
  type: string;
  tenantId: string;
  identifier: string;
  secret: string;
};

type Props = {
  form: IImportRequest;
  setForm: Dispatch<SetStateAction<IImportRequest>>;
  azureCredentials: IResource[];
  loading: boolean;
  error: string | null;
  onRun: () => void;
  onBack: () => void;
  credDialogOpen: boolean;
  setCredDialogOpen: (open: boolean) => void;
  newCred: NewCred;
  setNewCred: Dispatch<SetStateAction<NewCred>>;
  savingCred: boolean;
  onCreateCredential: () => void;
  onRefreshResources: () => void;
};

const ImportStepParams = ({
  form,
  setForm,
  azureCredentials,
  loading,
  error,
  onRun,
  onBack,
  credDialogOpen,
  setCredDialogOpen,
  newCred,
  setNewCred,
  savingCred,
  onCreateCredential,
  onRefreshResources,
}: Props) => {
  const { t } = useTranslation();

  return (
    <Flex direction="column" gap="4" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <Heading size="5">Connection Details</Heading>
      <Flex direction="column" gap="4">
        <Box>
          <Text as="label" size="2" mb="1" weight="bold">Subscription ID</Text>
          <TextField.Root
            placeholder="00000000-0000-0000-0000-000000000000"
            value={form.subscriptionId}
            onChange={(e) => setForm(f => ({ ...f, subscriptionId: e.target.value }))}
          />
        </Box>
        <Box>
          <Text as="label" size="2" mb="1" weight="bold">Resource Group</Text>
          <TextField.Root
            placeholder="my-resource-group"
            value={form.resourceGroup}
            onChange={(e) => setForm(f => ({ ...f, resourceGroup: e.target.value }))}
          />
        </Box>
        <Box>
          <Flex justify="between" align="center" mb="1">
            <Text as="label" size="2" weight="bold">Azure Credentials</Text>
            <Flex gap="2">
              <Button variant="ghost" size="1" onClick={() => setCredDialogOpen(true)}>
                <Plus size={14} /> {t('btn_new', 'New')}
              </Button>
              <Button variant="ghost" size="1" onClick={onRefreshResources}>
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </Button>
            </Flex>
          </Flex>
          <Select.Root
            value={form.azureCredentialId}
            onValueChange={(val) => setForm(f => ({ ...f, azureCredentialId: val }))}
          >
            <Select.Trigger style={{ width: '100%' }} placeholder="Select credentials..." />
            <Select.Content>
              {azureCredentials.map(creds => (
                <Select.Item key={creds.id} value={creds.id}>{creds.name}</Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Box>

        <Dialog.Root open={credDialogOpen} onOpenChange={setCredDialogOpen}>
          <Dialog.Content style={{ maxWidth: 450 }}>
            <Dialog.Title>{t('lbl_new_azure_credential', 'New Azure Credential')}</Dialog.Title>
            <Dialog.Description size="2" mb="4">
              Create a new Resource Class of type Azure Credential.
            </Dialog.Description>

            <Flex direction="column" gap="3">
              <label>
                <Text as="div" size="2" mb="1" weight="bold">Name</Text>
                <TextField.Root
                  placeholder="Production SPN"
                  value={newCred.name}
                  onChange={(e) => setNewCred(c => ({ ...c, name: e.target.value }))}
                />
              </label>
              <label>
                <Text as="div" size="2" mb="1" weight="bold">Type</Text>
                <Select.Root
                  value={newCred.type}
                  onValueChange={(val) => setNewCred(c => ({ ...c, type: val }))}
                >
                  <Select.Trigger style={{ width: '100%' }} />
                  <Select.Content>
                    <Select.Item value="SERVICE_PRINCIPAL">Service Principal</Select.Item>
                    <Select.Item value="USER">User (Password)</Select.Item>
                  </Select.Content>
                </Select.Root>
              </label>
              <label>
                <Text as="div" size="2" mb="1" weight="bold">Tenant ID</Text>
                <TextField.Root
                  placeholder="00000000-0000-0000-0000-000000000000"
                  value={newCred.tenantId}
                  onChange={(e) => setNewCred(c => ({ ...c, tenantId: e.target.value }))}
                />
              </label>
              <label>
                <Text as="div" size="2" mb="1" weight="bold">
                  {newCred.type === 'SERVICE_PRINCIPAL' ? 'Client ID' : 'Username'}
                </Text>
                <TextField.Root
                  placeholder={newCred.type === 'SERVICE_PRINCIPAL' ? '00000000-0000-0000-0000-000000000000' : 'admin@tenant.com'}
                  value={newCred.identifier}
                  onChange={(e) => setNewCred(c => ({ ...c, identifier: e.target.value }))}
                />
              </label>
              <label>
                <Text as="div" size="2" mb="1" weight="bold">
                  {newCred.type === 'SERVICE_PRINCIPAL' ? 'Client Secret' : 'Password'}
                </Text>
                <TextField.Root
                  type="password"
                  value={newCred.secret}
                  onChange={(e) => setNewCred(c => ({ ...c, secret: e.target.value }))}
                />
              </label>
            </Flex>

            <Flex gap="3" mt="4" justify="end">
              <Dialog.Close>
                <Button variant="soft" color="gray">
                  {t('btn_cancel', 'Cancel')}
                </Button>
              </Dialog.Close>
              <Button onClick={onCreateCredential} disabled={savingCred} color="green">
                {savingCred ? 'Saving...' : t('btn_save', 'Save')}
              </Button>
            </Flex>
          </Dialog.Content>
        </Dialog.Root>
      </Flex>

      {error && (
        <Callout.Root color="red">
          <Callout.Icon>
            <AlertCircle size={16} />
          </Callout.Icon>
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}

      <Flex gap="3" justify="end" mt="4">
        <Button variant="soft" onClick={onBack}>{t('btn_prev', 'Previous')}</Button>
        <Button onClick={onRun} disabled={loading || !form.resourceGroup || !form.azureCredentialId}>
          {loading ? 'Running...' : 'Run discovery'}
        </Button>
      </Flex>
    </Flex>
  );
};

export default ImportStepParams;
