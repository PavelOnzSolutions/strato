import React, {useEffect, useState} from 'react';
import {Box, Button, Dialog, Flex, Select, Text, TextField} from '@radix-ui/themes';
import {useTranslation} from 'react-i18next';
import {EResourceType, IResource} from '../../../../models/resource.model.ts';
import {IEnvironmentConfig} from '../../../../models/environment.model.ts';

interface EnvironmentConfigDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    confirmLabel: string;
    initialName?: string;
    initialConfig?: Partial<IEnvironmentConfig>;
    resources: IResource[] | undefined;
    onConfirm: (name: string, config: IEnvironmentConfig) => void;
    isNew?: boolean;
    envId?: string;
    loading?: boolean;
}

const EMPTY_CONFIG: Partial<IEnvironmentConfig> = {};

const EnvironmentConfigModal: React.FC<EnvironmentConfigDialogProps> = ({
    open,
    onOpenChange,
    title,
    confirmLabel,
    initialName = '',
    initialConfig = EMPTY_CONFIG,
    resources,
    onConfirm,
    isNew = false,
    envId = '',
    loading = false
}) => {
    const { t } = useTranslation();
    const [name, setName] = useState(initialName);
    const [config, setConfig] = useState<IEnvironmentConfig>({
        subscriptionId: initialConfig.subscriptionId || '',
        azureCredentialId: initialConfig.azureCredentialId || '',
        region: initialConfig.region || '',
        resourceGroup: initialConfig.resourceGroup || '',
        values: initialConfig.values || {}
    });
    const [resourceGroupManuallyEdited, setResourceGroupManuallyEdited] = useState(false);

    useEffect(() => {
        if (open) {
            setName(initialName);
            setConfig({
                subscriptionId: initialConfig.subscriptionId || '',
                azureCredentialId: initialConfig.azureCredentialId || '',
                region: initialConfig.region || '',
                resourceGroup: initialConfig.resourceGroup || '',
                values: initialConfig.values || {}
            });
            setResourceGroupManuallyEdited(false);
        }
    }, [open]); // Only reset when the dialog opens

    useEffect(() => {
        if (!resourceGroupManuallyEdited && name) {
            setConfig(prev => ({
                ...prev,
                resourceGroup: `rg-${name}`
            }));
        }
    }, [name, resourceGroupManuallyEdited]);

    const azureRegionClasses = (resources || []).filter(r => r.type === EResourceType.AZURE_REGION);
    const azureCredentials = (resources || []).filter(r => r.type === EResourceType.AZURE_CREDENTIAL);

    const handleConfirm = () => {
        onConfirm(name, config);
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Content style={{ maxWidth: 450 }}>
                <Dialog.Title>{title}</Dialog.Title>
                <Flex direction="column" gap="3">
                    {!isNew && envId && (
                        <Box>
                            <Text size="2" weight="bold" mb="1" as="div">ID</Text>
                            <TextField.Root
                                placeholder="Environment ID"
                                value={envId}
                                disabled={true}
                            />
                        </Box>
                    )}
                    <Box>
                        <Text size="2" weight="bold" mb="1" as="div">{t('lbl_env_name', 'Name')}</Text>
                        <TextField.Root
                            placeholder={t('ph_env_name', 'Environment Name')}
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </Box>
                    <Box>
                        <Text size="2" weight="bold" mb="1" as="div">{t('lbl_subscription_id', 'Subscription ID')}</Text>
                        <TextField.Root
                            placeholder={t('ph_subscription_id', 'Subscription ID')}
                            value={config.subscriptionId}
                            onChange={e => setConfig({ ...config, subscriptionId: e.target.value })}
                        />
                    </Box>
                    <Box>
                        <Text size="2" weight="bold" mb="1" as="div">{t('lbl_region', 'Region')}</Text>
                        <Select.Root value={config.region} onValueChange={(val) => setConfig({ ...config, region: val })}>
                            <Select.Trigger placeholder={t('ph_select_region', 'Select Region')} />
                            <Select.Content>
                                {azureRegionClasses.map(rc => (
                                    <Select.Item key={rc.id} value={rc.id}>
                                        <Flex gap="2" align="center">
                                            <img src={`/assets/${rc.icon}`} alt={rc.name} className="w-4 h-4" />
                                            {rc.name}
                                        </Flex>
                                    </Select.Item>
                                ))}
                            </Select.Content>
                        </Select.Root>
                    </Box>
                    <Box>
                        <Text size="2" weight="bold" mb="1" as="div">{t('lbl_deployment_credential', 'Deployment Credential')}</Text>
                        <Select.Root
                            value={config.azureCredentialId || 'null'}
                            onValueChange={(val) => setConfig({ ...config, azureCredentialId: val === 'null' ? '' : val })}
                        >
                            <Select.Trigger placeholder={t('ph_select_credential', 'Select Credential')} />
                            <Select.Content>
                                <Select.Item value="null">(System Default)</Select.Item>
                                {azureCredentials.map(cred => (
                                    <Select.Item key={cred.id} value={cred.id}>
                                        <Flex gap="2" align="center">
                                            <img src={`/assets/${cred.icon}`} alt={cred.name} className="w-4 h-4" />
                                            {cred.name}
                                        </Flex>
                                    </Select.Item>
                                ))}
                            </Select.Content>
                        </Select.Root>
                    </Box>
                    <Box>
                        <Text size="2" weight="bold" mb="1" as="div">{t('lbl_resource_group', 'Resource Group')}</Text>
                        <TextField.Root
                            placeholder={t('ph_resource_group', 'Resource Group')}
                            value={config.resourceGroup}
                            onChange={e => {
                                setConfig({ ...config, resourceGroup: e.target.value });
                                setResourceGroupManuallyEdited(true);
                            }}
                        />
                    </Box>
                </Flex>
                <Flex justify="end" mt="4" gap="3">
                    <Dialog.Close>
                        <Button variant="soft" color="gray">{t('btn_cancel', 'Cancel')}</Button>
                    </Dialog.Close>
                    <Button onClick={handleConfirm} loading={loading}>{confirmLabel}</Button>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
};

export default EnvironmentConfigModal;
