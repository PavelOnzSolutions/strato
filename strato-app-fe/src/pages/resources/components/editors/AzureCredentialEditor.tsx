import {Box, Button, Flex, Select, Text, TextField} from '@radix-ui/themes';
import {isValidGuid} from '../../../../utils/utils.ts';
import {AzureCredentialTestResult} from './AzureCredentialTestResult';
import type {IAzureCredentialValidationResult} from '../../../../models/resource.model';

interface AzureCredentialEditorProps {
    credType: string;
    setCredType: (val: string) => void;
    tenantId: string;
    setTenantId: (val: string) => void;
    identifier: string;
    setIdentifier: (val: string) => void;
    secret: string;
    setSecret: (val: string) => void;
    handleTestCredential: () => void;
    isTesting: boolean;
    testResult?: IAzureCredentialValidationResult | null;
    onClearTestResult?: () => void;
}

export const AzureCredentialEditor = ({
    credType,
    setCredType,
    tenantId,
    setTenantId,
    identifier,
    setIdentifier,
    secret,
    setSecret,
    handleTestCredential,
    isTesting,
    testResult,
    onClearTestResult
}: AzureCredentialEditorProps) => {
    const isMasked = (val: string) => val.startsWith('***');
    const isTenantIdValid = !tenantId || isMasked(tenantId) || isValidGuid(tenantId);

    const clearResultIfPresent = () => {
        if (testResult) {
            onClearTestResult?.();
        }
    };

    return (
        <Flex direction="column" gap="4">
            <Box style={{ maxWidth: '300px' }}>
                <Text as="div" size="2" mb="1" weight="bold">Credential Type *</Text>
                <Select.Root
                    value={credType}
                    onValueChange={(val) => {
                        clearResultIfPresent();
                        setCredType(val);
                    }}
                >
                    <Select.Trigger style={{ width: '100%' }} />
                    <Select.Content>
                        <Select.Item value="USER">User</Select.Item>
                        <Select.Item value="SERVICE_PRINCIPAL">Service Principal</Select.Item>
                    </Select.Content>
                </Select.Root>
            </Box>
            <Flex gap="4" wrap="wrap">
                <Box style={{ flex: '1 1 300px' }}>
                    <Text as="div" size="2" mb="1" weight="bold">Tenant ID *</Text>
                    <TextField.Root
                        value={tenantId}
                        onChange={(e) => {
                            clearResultIfPresent();
                            setTenantId(e.target.value);
                        }}
                        placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                        color={!isTenantIdValid ? 'red' : undefined}
                    />
                    {!isTenantIdValid && (
                        <Text color="red" size="1">
                            Invalid GUID format
                        </Text>
                    )}
                </Box>
                <Box style={{ flex: '1 1 300px' }}>
                    <Text as="div" size="2" mb="1" weight="bold">
                        {credType === 'USER' ? 'User name *' : 'Application ID *'}
                    </Text>
                    <TextField.Root
                        value={identifier}
                        onChange={(e) => {
                            clearResultIfPresent();
                            setIdentifier(e.target.value);
                        }}
                        placeholder={credType === 'USER' ? 'e.g. john.doe@example.com' : 'e.g. 00000000-0000-0000-0000-000000000000'}
                    />
                </Box>
                <Box style={{ flex: '1 1 300px' }}>
                    <Text as="div" size="2" mb="1" weight="bold">
                        {credType === 'USER' ? 'Password *' : 'Secret *'}
                    </Text>
                    <TextField.Root
                        value={secret}
                        onChange={(e) => {
                            clearResultIfPresent();
                            setSecret(e.target.value);
                        }}
                        placeholder="Enter secure value..."
                    />
                </Box>
            </Flex>
            <Box>
                <Button
                    onClick={handleTestCredential}
                    loading={isTesting}
                    variant="soft"
                    disabled={!tenantId || !identifier || !secret || (!isMasked(tenantId) && !isValidGuid(tenantId))}
                >
                    Test Credential
                </Button>
                <AzureCredentialTestResult
                    result={testResult ?? null}
                    onClear={onClearTestResult ?? (() => {})}
                />
            </Box>
        </Flex>
    );
};
