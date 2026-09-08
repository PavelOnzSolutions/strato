import {Badge, Box, Card, Code, Flex, Heading, Separator, Text} from '@radix-ui/themes';
import {Activity, FileJson, GitCompare, ListTree} from 'lucide-react';
import {usePageTitle} from '../../context/PageTitleContext';

interface ConfigComparatorHelpProps {
    hideTitle?: boolean;
}

export const ConfigComparatorHelp = ({ hideTitle }: ConfigComparatorHelpProps) => {
    if (!hideTitle) {
        usePageTitle('Configuration Comparator – Documentation');
    }

    return (
        <Flex direction="column" gap="6" className={hideTitle ? "" : "max-w-4xl mx-auto pb-10"}>
            {!hideTitle && (
                <Box className="py-10">
                    <Heading size="8" className="mb-4 bg-clip-text text-transparent bg-linear-to-r from-(--accent-9) to-(--accent-11) inline-block">
                        Configuration Comparator
                    </Heading>
                    <Text size="4" color="gray" className="max-w-2xl block">
                        Compare different configurations or versions side-by-side to understand changes and differences.
                    </Text>
                </Box>
            )}

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-(--accent-3) rounded-full text-(--accent-11)">
                        <GitCompare size={22} />
                    </Box>
                    <Box className="flex-1">
                        <Heading size="4" mb="2">Overview</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            The Configuration Comparator lets you pick two configurations (or two versions of the same configuration) and visualize their differences in real time. The diff now runs over the section/item tree — the same shape the provider endpoint returns — so changes line up with how pipelines see the data.
                        </Text>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-(--accent-3) rounded-full text-(--accent-11)">
                        <ListTree size={22} />
                    </Box>
                    <Box className="flex-1">
                        <Heading size="4" mb="2">Visual Diff (D3 Tree)</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            The visual mode renders the materialized output as a hierarchical tree (<Code>section</Code> → <Code>item</Code> → fields). Differences are highlighted at each node:
                        </Text>
                        <ul className="list-disc pl-6 text-(--gray-11) space-y-2">
                            <li><Badge color="green">Added</Badge> Sections, items, or fields present in the target but not in the source.</li>
                            <li><Badge color="red">Removed</Badge> Sections, items, or fields present in the source but missing in the target.</li>
                            <li><Badge color="amber">Changed</Badge> Fields whose value differs between the two sides.</li>
                        </ul>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-(--accent-3) rounded-full text-(--accent-11)">
                        <FileJson size={22} />
                    </Box>
                    <Box className="flex-1">
                        <Heading size="4" mb="2">JSON Diff (Monaco Editor)</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            For power users, the JSON mode shows the full materialized output side by side in the Monaco editor:
                        </Text>
                        <ul className="list-disc pl-6 text-(--gray-11) space-y-2">
                            <li><strong>Standard diff view</strong> — high-fidelity line-by-line comparison of the section/item JSON.</li>
                            <li><strong>Syntax highlighting</strong> — full JSON colouring for readability.</li>
                            <li><strong>Search</strong> — standard editor shortcuts to find specific keys or values.</li>
                        </ul>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-(--accent-3) rounded-full text-(--accent-11)">
                        <Activity size={22} />
                    </Box>
                    <Box className="flex-1">
                        <Heading size="4" mb="2">Comparison Scope</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            You can compare:
                        </Text>
                        <ul className="list-disc pl-6 text-(--gray-11) space-y-2">
                            <li><strong>Cross-configuration</strong> — the current configuration against any other configuration bound to the same schema (and therefore the same flavor).</li>
                            <li><strong>Cross-version</strong> — the current draft against any historical version of the same configuration.</li>
                        </ul>
                    </Box>
                </Flex>
            </Card>

            <Separator size="4" />

            <Box>
                <Heading size="5" mb="2">Pro Tips</Heading>
                <Card variant="soft" color="indigo">
                    <Text size="2">
                        Use the <strong>"Compare configurations"</strong> button in the Provider View toolbar to open the comparator. It automatically filters to configurations that share the current schema, so the section list lines up.
                    </Text>
                </Card>
            </Box>
        </Flex>
    );
};

export default ConfigComparatorHelp;
