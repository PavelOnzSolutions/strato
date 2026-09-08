import React, {useEffect, useState} from 'react';
import {Badge, Box, Button, Dialog, Flex, Select, Text, TextField} from '@radix-ui/themes';
import {CurlyBraces, Waypoints} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useNavigate} from 'react-router-dom';
import {DraggableDialogContent} from '../../../../components/system/DraggableDialogContent.tsx';
import {IConfiguration, IConfigurationSchema} from '../../../../models/configuration.model';
import {IEnvironment} from '../../../../models/environment.model';
import {FLAVOR_LABELS} from '../../../../constants/flavors';
import {fetchWithAuth} from '../../../../utils/api';
import {useToast} from '../../../../context/ToastContext';
import {fetchSchemas, saveConfiguration} from '../../api';

interface NewConfigurationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const fetchEnvironments = async (): Promise<IEnvironment[]> => {
    const r = await fetchWithAuth('/environments');
    if (!r.ok) throw new Error('Failed to fetch environments');
    return r.json();
};

export const NewConfigurationDialog: React.FC<NewConfigurationDialogProps> = ({open, onOpenChange}) => {
    const {t} = useTranslation();
    const {showToast} = useToast();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [name, setName] = useState('');
    const [schemaId, setSchemaId] = useState('');
    const [envId, setEnvId] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (!open) {
            setName('');
            setSchemaId('');
            setEnvId(undefined);
        }
    }, [open]);

    const {data: schemas} = useQuery({
        queryKey: ['configuration-schemas-dropdown'],
        queryFn: fetchSchemas,
        enabled: open,
    });

    const {data: environments} = useQuery({
        queryKey: ['environments-dropdown'],
        queryFn: fetchEnvironments,
        enabled: open,
    });

    const selectedSchema: IConfigurationSchema | undefined = schemas?.find(s => s.id === schemaId);
    const flavor = selectedSchema?.flavor;

    const mutation = useMutation({
        mutationFn: saveConfiguration,
        onSuccess: (saved) => {
            queryClient.invalidateQueries({queryKey: ['configurations']});
            showToast(t('msg_config_saved', 'Configuration saved'), 'success');
            onOpenChange(false);
            navigate(`/configurations/maps/${saved.id}/provider-view`);
        },
        onError: (e: Error) => showToast(e.message, 'error'),
    });

    const handleCreate = () => {
        if (!name.trim()) {
            showToast(t('msg_name_required', 'Name is required'), 'error');
            return;
        }
        if (!schemaId) {
            showToast(t('msg_select_schema', 'Please select a schema'), 'error');
            return;
        }
        if (!flavor) return;
        mutation.mutate({
            name: name.trim(),
            schemaId,
            environmentId: envId,
            data: {},
            flavor,
        } as Partial<IConfiguration>);
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <DraggableDialogContent maxWidth="500px" title={t('dlg_new_configuration_title', 'New Configuration')}>
                <Flex direction="column" gap="3">
                    <Box>
                        <Text as="div" size="2" mb="1" weight="bold">
                            {t('lbl_name', 'Name')}
                        </Text>
                        <TextField.Root
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('ph_config_name', 'Configuration name...')}
                            autoFocus
                        />
                    </Box>

                    <Box>
                        <Text as="label" size="2" mb="1" weight="bold">
                            {t('lbl_schema', 'Schema')}
                        </Text>
                        <Select.Root value={schemaId} onValueChange={setSchemaId}>
                            <Select.Trigger
                                placeholder={t('ph_select_schema', 'Select a schema...')}
                                style={{width: '100%'}}
                            />
                            <Select.Content>
                                {schemas?.map(s => (
                                    <Select.Item key={s.id} value={s.id}>
                                        <Flex gap="2" align="center">
                                            <CurlyBraces size={16} className="text-(--cyan-9)"/>
                                            {s.name}
                                            <Badge size="1" color="gray">{FLAVOR_LABELS[s.flavor]}</Badge>
                                        </Flex>
                                    </Select.Item>
                                ))}
                            </Select.Content>
                        </Select.Root>
                    </Box>

                    {flavor && (
                        <Box>
                            <Text as="div" size="2" mb="1" weight="bold">
                                {t('lbl_flavor', 'Flavor')}
                            </Text>
                            <Badge color="blue">{FLAVOR_LABELS[flavor]}</Badge>
                        </Box>
                    )}

                    <Box>
                        <Text as="label" size="2" mb="1" weight="bold">
                            {t('lbl_linked_environment', 'Linked Environment')}
                        </Text>
                        <Select.Root
                            value={envId ?? 'none'}
                            onValueChange={(val) => setEnvId(val === 'none' ? undefined : val)}
                        >
                            <Select.Trigger
                                placeholder={t('ph_select_environment', 'Select an environment...')}
                                style={{width: '100%'}}
                            />
                            <Select.Content>
                                <Select.Item value="none">{t('lbl_none', 'None')}</Select.Item>
                                {environments?.map(env => (
                                    <Select.Item key={env.id} value={env.id}>
                                        <Flex gap="2" align="center">
                                            <Waypoints size={16} className="text-(--crimson-9)"/>
                                            {env.name}
                                        </Flex>
                                    </Select.Item>
                                ))}
                            </Select.Content>
                        </Select.Root>
                    </Box>
                </Flex>

                <Flex gap="3" mt="4" justify="end">
                    <Dialog.Close>
                        <Button variant="soft" color="gray">{t('btn_cancel', 'Cancel')}</Button>
                    </Dialog.Close>
                    <Button
                        variant="solid"
                        disabled={!name.trim() || !schemaId || mutation.isPending}
                        onClick={handleCreate}
                    >
                        {mutation.isPending ? t('btn_creating', 'Creating...') : t('btn_create', 'Create')}
                    </Button>
                </Flex>
            </DraggableDialogContent>
        </Dialog.Root>
    );
};
