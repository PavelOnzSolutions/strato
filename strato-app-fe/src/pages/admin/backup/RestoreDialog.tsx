import React, {useRef, useState} from 'react';
import {Box, Button, Callout, Checkbox, Dialog, Flex, Spinner, Table, Text} from '@radix-ui/themes';
import {CheckCircle2, FileArchive, ShieldAlert, TriangleAlert, Upload,} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {useToast} from '../../../context/ToastContext';
import {fetchWithAuth} from '../../../utils/api';
import {IBackupMetadataDto, IRestoreRequestDto} from '../../../models/backup.model';

interface RestoreDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

enum RestoreStep {
    UPLOAD,
    ANALYZE,
    SELECTION,
    CONFIRMATION,
    EXECUTING
}

const RestoreDialog: React.FC<RestoreDialogProps> = ({ open, onOpenChange }) => {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const [step, setStep] = useState<RestoreStep>(RestoreStep.UPLOAD);
    const [file, setFile] = useState<File | null>(null);
    const [metadata, setMetadata] = useState<IBackupMetadataDto | null>(null);
    const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
    // @ts-ignore
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetState = () => {
        setStep(RestoreStep.UPLOAD);
        setFile(null);
        setMetadata(null);
        setSelectedCollections([]);
        setIsAnalyzing(false);
        setIsRestoring(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.type !== 'application/x-zip-compressed' && 
                selectedFile.type !== 'application/zip' && 
                !selectedFile.name.endsWith('.zip')) {
                showToast(t('msg_invalid_file_type', 'Please upload a ZIP file'), 'error');
                return;
            }
            setFile(selectedFile);
            handleAnalyze(selectedFile);
        }
    };

    const handleAnalyze = async (uploadFile: File) => {
        setIsAnalyzing(true);
        setStep(RestoreStep.ANALYZE);

        
        const formData = new FormData();
        formData.append('file', uploadFile);

        try {
            const response = await fetchWithAuth('/backup/restore/analyze', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Analysis failed');
            }

            const data: IBackupMetadataDto = await response.json();
            setMetadata(data);
            setSelectedCollections(data.collections); // Select all by default
            setStep(RestoreStep.SELECTION);
        } catch (error) {
            console.error('Analysis error:', error);
            showToast(t('msg_analysis_failed', 'Failed to analyze backup file'), 'error');
            setStep(RestoreStep.UPLOAD);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleRestore = async () => {
        if (!file || selectedCollections.length === 0) return;

        setIsRestoring(true);
        setStep(RestoreStep.EXECUTING);

        const formData = new FormData();
        formData.append('file', file);
        
        const restoreRequest: IRestoreRequestDto = {
            collections: selectedCollections
        };
        formData.append('request', new Blob([JSON.stringify(restoreRequest)], { type: 'application/json' }));

        try {
            const response = await fetchWithAuth('/backup/restore', {
                method: 'PUT',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Restore failed');
            }

            showToast(t('msg_restore_success', 'Data restored successfully'), 'success');
            onOpenChange(false);
            resetState();
        } catch (error) {
            console.error('Restore error:', error);
            showToast(t('msg_restore_failed', 'Failed to restore data'), 'error');
            setStep(RestoreStep.SELECTION);
        } finally {
            setIsRestoring(false);
        }
    };

    const handleToggleCollection = (collection: string, checked: boolean) => {
        if (checked) {
            setSelectedCollections([...selectedCollections, collection]);
        } else {
            setSelectedCollections(selectedCollections.filter(c => c !== collection));
        }
    };

    const handleToggleAll = (checked: boolean) => {
        if (checked && metadata) {
            setSelectedCollections([...metadata.collections]);
        } else {
            setSelectedCollections([]);
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={(val) => {
            if (!val && !isRestoring) {
                onOpenChange(val);
                resetState();
            } else if (val) {
                onOpenChange(val);
            }
        }}>
            <Dialog.Content style={{ maxWidth: 600 }}>
                <Dialog.Title>
                    <Flex align="center" gap="2">
                        <Upload size={20} />
                        {t('lbl_restore_data', 'Restore Data')}
                    </Flex>
                </Dialog.Title>
                <Dialog.Description size="2" mb="4">
                    {t('lbl_restore_description', 'Restore your system state from a previously generated backup file.')}
                </Dialog.Description>

                <Box my="4">
                    {step === RestoreStep.UPLOAD && (
                        <Flex 
                            direction="column" 
                            align="center" 
                            justify="center" 
                            p="8" 
                            className="border-2 border-dashed border-[var(--gray-5)] rounded-lg hover:border-[var(--accent-9)] cursor-pointer transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <FileArchive size={48} className="text-[var(--gray-8)] mb-4" />
                            <Text weight="bold">{t('lbl_click_to_upload', 'Click to upload or drag and drop')}</Text>
                            <Text size="1" color="gray">ZIP files only</Text>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                style={{ display: 'none' }} 
                                onChange={handleFileChange} 
                                accept=".zip"
                            />
                        </Flex>
                    )}

                    {step === RestoreStep.ANALYZE && (
                        <Flex direction="column" align="center" justify="center" p="8" gap="4">
                            <Spinner size="3" />
                            <Text>{t('lbl_analyzing_backup', 'Analyzing backup file...')}</Text>
                        </Flex>
                    )}

                    {step === RestoreStep.SELECTION && metadata && (
                        <Flex direction="column" gap="4">
                            <Card variant="surface">
                                <Grid columns="2" gap="2">
                                    <Box>
                                        <Text size="1" color="gray" as="div">{t('lbl_creator', 'Creator')}</Text>
                                        <Text size="2" weight="bold">{metadata.creator}</Text>
                                    </Box>
                                    <Box>
                                        <Text size="1" color="gray" as="div">{t('lbl_timestamp', 'Timestamp')}</Text>
                                        <Text size="2" weight="bold">{new Date(metadata.timestamp).toLocaleString()}</Text>
                                    </Box>
                                    <Box className="col-span-2">
                                        <Text size="1" color="gray" as="div">{t('lbl_signature', 'Signature')}</Text>
                                        <Text size="1" className="truncate font-mono">{metadata.signature}</Text>
                                    </Box>
                                    <Box className="col-span-2">
                                        <Text size="1" color="gray" as="div">{t('lbl_app_id', 'App ID')}</Text>
                                        <Text size="1" className="truncate font-mono">{metadata.appId}</Text>
                                    </Box>
                                    <Box className="col-span-2">
                                        <Text size="1" color="gray" as="div">{t('lbl_version', 'Version')}</Text>
                                        <Text size="1" className="truncate font-mono">{metadata.version}</Text>
                                    </Box>
                                </Grid>
                            </Card>

                            <Box>
                                <Text size="2" weight="bold" mb="2" as="div">{t('lbl_select_collections_to_restore', 'Select collections to restore')}</Text>
                                <Table.Root variant="surface">
                                    <Table.Header>
                                        <Table.Row>
                                            <Table.ColumnHeaderCell width="40px">
                                                <Checkbox 
                                                    checked={selectedCollections.length === metadata.collections.length}
                                                    onCheckedChange={handleToggleAll}
                                                />
                                            </Table.ColumnHeaderCell>
                                            <Table.ColumnHeaderCell>{t('lbl_collection_name', 'Collection Name')}</Table.ColumnHeaderCell>
                                        </Table.Row>
                                    </Table.Header>
                                    <Table.Body>
                                        {metadata.collections.map(col => (
                                            <Table.Row key={col}>
                                                <Table.Cell>
                                                    <Checkbox 
                                                        checked={selectedCollections.includes(col)}
                                                        onCheckedChange={(checked) => handleToggleCollection(col, !!checked)}
                                                    />
                                                </Table.Cell>
                                                <Table.Cell>{col}</Table.Cell>
                                            </Table.Row>
                                        ))}
                                    </Table.Body>
                                </Table.Root>
                            </Box>

                            <Callout.Root color="amber">
                                <Callout.Icon>
                                    <ShieldAlert size={16} />
                                </Callout.Icon>
                                <Callout.Text>
                                    {t('msg_restore_encrypt_warning', 'Important: In case the Encryption Master Key has changed since this backup was taken, all encrypted values will be rendered unreadable.')}
                                </Callout.Text>
                            </Callout.Root>

                            <Callout.Root color="red">
                                <Callout.Icon>
                                    <TriangleAlert size={16} />
                                </Callout.Icon>
                                <Callout.Text>
                                    {t('msg_restore_loss_warning', 'Warning: Restoring data will overwrite existing records in the selected collections. This action cannot be undone.')}
                                </Callout.Text>
                            </Callout.Root>
                        </Flex>
                    )}

                    {step === RestoreStep.EXECUTING && (
                        <Flex direction="column" align="center" justify="center" p="8" gap="4">
                            <Spinner size="3" />
                            <Text size="3" weight="bold">{t('lbl_restoring_data', 'Restoring data...')}</Text>
                            <Text size="2" color="gray">{t('lbl_please_wait', 'Please wait, this may take a few moments.')}</Text>
                        </Flex>
                    )}
                </Box>

                <Flex gap="3" mt="4" justify="end">
                    <Dialog.Close>
                        <Button variant="soft" color="gray" disabled={isRestoring}>
                            {t('btn_cancel', 'Cancel')}
                        </Button>
                    </Dialog.Close>
                    {step === RestoreStep.SELECTION && (
                        <Button 
                            variant="solid" 
                            color="red" 
                            onClick={handleRestore} 
                            disabled={selectedCollections.length === 0 || isRestoring}
                        >
                            <CheckCircle2 size={16} />
                            {t('btn_confirm_restore', 'Confirm Restore')}
                        </Button>
                    )}
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
};

// Simple Grid component since Radix UI Themes might not export it or it might be named differently in this version
const Grid: React.FC<{ children: React.ReactNode, columns: string, gap: string, className?: string }> = ({ children, columns, gap, className }) => (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: `var(--space-${gap})` }} className={className}>
        {children}
    </div>
);

const Card: React.FC<{ children: React.ReactNode, variant?: 'surface' | 'ghost' | 'inset' }> = ({ children, variant = 'surface' }) => (
    <Box p="3" className={`rounded-lg border border-[var(--gray-5)] ${variant === 'surface' ? 'bg-[var(--gray-2)]' : ''}`}>
        {children}
    </Box>
);

export default RestoreDialog;
