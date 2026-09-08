import {Badge, Box, Button, Callout, Code, Flex, Heading, Table, Text, TextField, Tooltip} from '@radix-ui/themes';
import {ArrowRight, Download, Info, Link2, Plus} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {IImportedItem, IImportResult} from '../../../../models/import.model.ts';
import {IResource} from '../../../../models/resource.model.ts';

type Props = {
    result: IImportResult;
    envName: string;
    setEnvName: (name: string) => void;
    resources?: IResource[];
    loading: boolean;
    onBackToParams: () => void;
    onExportYAML: () => void;
    onFinish: () => void;
    onImportAsClass: (item: IImportedItem) => void;
};

const ImportStepReview = ({
                              result,
                              envName,
                              setEnvName,
                              resources,
                              loading,
                              onBackToParams,
                              onExportYAML,
                              onFinish,
                              onImportAsClass,
                          }: Props) => {
    const {t} = useTranslation();

    return (
        <Flex direction="column" gap="6">
            <Box>
                <Heading size="5">Review Discovery Results</Heading>
                {result.message && (
                    <Callout.Root mt="2" color="blue" variant="soft">
                        <Callout.Icon><Info size={16}/></Callout.Icon>
                        <Callout.Text>{result.message}</Callout.Text>
                    </Callout.Root>
                )}
            </Box>

            <Flex direction="column" gap="4">
                <Heading size="4">Matches ({result.matches.length})</Heading>
                <Box style={{maxWidth: '400px'}}>
                    <Text as="label" size="2" mb="1" weight="bold">Environment Name</Text>
                    <TextField.Root
                        placeholder="My New Environment"
                        value={envName}
                        onChange={(e) => setEnvName(e.target.value)}
                    />
                </Box>
                <Table.Root variant="surface">
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeaderCell>Resource Type</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Resource API Version</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Kind</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Region</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Matched Resource Class</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Confidence</Table.ColumnHeaderCell>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {result.matches.map((m, idx) => (
                            <Table.Row key={idx} align="center">
                                <Table.Cell><Code size="2" color="gold">{m.imported.type}</Code></Table.Cell>
                                <Table.Cell><Code size="2" color="gray">{m.imported.apiVersion}</Code></Table.Cell>
                                <Table.Cell><Code size="2" color="gray">{m.imported.kind}</Code></Table.Cell>
                                <Table.Cell><Code size="2" color="gray">{m.imported.region}</Code></Table.Cell>
                                <Table.Cell><Text weight="bold" size="2">{m.imported.name}</Text></Table.Cell>
                                <Table.Cell>
                                    <Flex align="center" gap="2">
                                        {(() => {
                                            const res = resources?.find(r => r.id === m.matchedResourceId);
                                            return res?.icon && (
                                                <img
                                                    src={`/assets/${res.icon}`}
                                                    alt={res.name}
                                                    className="w-4 h-4"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                            );
                                        })()}
                                        <Badge color="violet">{m.matchedResourceName}</Badge>
                                    </Flex>
                                </Table.Cell>
                                <Table.Cell>
                                    <Badge color={m.confidence >= 0.99 ? 'green' : 'orange'}>
                                        {m.confidence >= 0.99 ? 'Exact' : 'Type Match'} ({Math.round(m.confidence * 100)}%)
                                    </Badge>
                                </Table.Cell>
                            </Table.Row>
                        ))}
                        {result.matches.length === 0 && (
                            <Table.Row>
                                <Table.Cell colSpan={4}><Text align="center" color="gray" size="2">No matches
                                    found.</Text></Table.Cell>
                            </Table.Row>
                        )}
                    </Table.Body>
                </Table.Root>
            </Flex>

            {result.detectedReferences && result.detectedReferences.length > 0 && (
                <Flex direction="column" gap="4">
                    <Flex align="center" gap="2">
                        <Link2 size={18} color="var(--accent-9)" />
                        <Heading size="4">Detected References ({result.detectedReferences.length})</Heading>
                    </Flex>
                    <Callout.Root color="blue" variant="soft">
                        <Callout.Icon><Info size={16}/></Callout.Icon>
                        <Callout.Text>
                            These cross-resource dependencies were detected from ARM properties. They will be saved as connections in the environment graph.
                        </Callout.Text>
                    </Callout.Root>
                    <Table.Root variant="surface">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeaderCell>Provider Resource</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell style={{width: 50}}></Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Consumer Resource</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Property Path</Table.ColumnHeaderCell>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {result.detectedReferences.map((ref, idx) => (
                                <Table.Row key={idx} align="center">
                                    <Table.Cell>
                                        <Text weight="bold" size="2">{ref.fromImportedName}</Text>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <ArrowRight size={14} color="var(--gray-9)" />
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Text weight="bold" size="2">{ref.toImportedName}</Text>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Code size="2" color="gray">{ref.propertyPath}</Code>
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                </Flex>
            )}

            <Flex direction="column" gap="4">
                <Heading size="4">Unmatched ({result.unmatched.length})</Heading>
                <Table.Root variant="surface">
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeaderCell>Resource Type</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Resource API Version</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Region</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell style={{width: 50}}></Table.ColumnHeaderCell>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {result.unmatched.map((u, idx) => (
                            <Table.Row key={idx} align="center">
                                <Table.Cell><Code size="2" color="gold">{u.type}</Code></Table.Cell>
                                <Table.Cell><Code size="2" color="gray">{u.apiVersion}</Code></Table.Cell>
                                <Table.Cell><Text weight="bold" size="2">{u.name}</Text></Table.Cell>
                                <Table.Cell><Code size="2" color="gray">{u.region}</Code></Table.Cell>
                                <Table.Cell>
                                    <Tooltip content={t('btn_import_as_class', 'Import as Class')}>
                                        <Button size="1" variant="ghost" onClick={() => onImportAsClass(u)}>
                                            <Plus size={16}/>
                                        </Button>
                                    </Tooltip>
                                </Table.Cell>
                            </Table.Row>
                        ))}
                        {result.unmatched.length === 0 && (
                            <Table.Row>
                                <Table.Cell colSpan={5}><Text align="center" color="gray" size="2">All resources
                                    matched!</Text></Table.Cell>
                            </Table.Row>
                        )}
                    </Table.Body>
                </Table.Root>
            </Flex>

            <Flex direction="column" gap="4">
                <Heading size="4">All discovered ({result.items.length})</Heading>
                <Table.Root variant="surface">
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeaderCell>Resource Type</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Resource API Version</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Region</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Matched Resource Class</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Confidence</Table.ColumnHeaderCell>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {result.items.map((i, idx) => {
                            const match = result.matches.find(m => m.imported.id === i.id);
                            return (
                                <Table.Row key={idx} align="center">
                                    <Table.Cell><Code size="2" color="gold">{i.type}</Code></Table.Cell>
                                    <Table.Cell><Code size="2" color="gray">{i.apiVersion}</Code></Table.Cell>
                                    <Table.Cell><Text weight="bold" size="2">{i.name}</Text></Table.Cell>
                                    <Table.Cell><Code size="2" color="gray">{i.region}</Code></Table.Cell>
                                    <Table.Cell>
                                        <Flex align="center" gap="2">
                                            {(() => {
                                                const res = resources?.find(r => r.id === match?.matchedResourceId);
                                                return res?.icon && (
                                                    <img
                                                        src={`/assets/${res.icon}`}
                                                        alt={res.name}
                                                        className="w-4 h-4"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                        }}
                                                    />
                                                );
                                            })()}
                                            <Badge color={match ? 'violet' : 'gray'}>
                                                {match?.matchedResourceName ?? '—'}
                                            </Badge>
                                        </Flex>
                                    </Table.Cell>
                                    <Table.Cell>
                                        {match ? (
                                            <Badge color={match.confidence >= 0.99 ? 'green' : 'orange'}>
                                                {match.confidence >= 0.99 ? 'Exact' : 'Type Match'} ({Math.round(match.confidence * 100)}%)
                                            </Badge>
                                        ) : (
                                            <Badge color="gray">None</Badge>
                                        )}
                                    </Table.Cell>
                                </Table.Row>
                            );
                        })}
                        {result.items.length === 0 && (
                            <Table.Row>
                                <Table.Cell colSpan={4}><Text align="center" color="gray" size="2">No resources
                                    discovered.</Text></Table.Cell>
                            </Table.Row>
                        )}
                    </Table.Body>
                </Table.Root>
            </Flex>

            <Flex gap="3" justify="end" mt="4">
                <Button variant="soft" onClick={onBackToParams}>{t('btn_prev', 'Change parameters')}</Button>
                <Button variant="outline" color="gray" onClick={onExportYAML}>
                    <Download size={16}/>
                    {t('btn_export_yaml', 'Export Findings (YAML)')}
                </Button>
                <Button onClick={onFinish} disabled={loading || !envName || result.matches.length === 0}>
                    {loading ? 'Saving...' : t('btn_finish', 'Finish Import')}
                </Button>
            </Flex>
        </Flex>
    );
};

export default ImportStepReview;
