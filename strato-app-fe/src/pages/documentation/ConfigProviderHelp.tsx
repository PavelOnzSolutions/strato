import {Box, Button, Callout, Card, Code, Flex, Heading, Separator, Text} from '@radix-ui/themes';
import {Braces, Database, Eye, Info, Layout, Monitor, Network, Search, ShieldCheck, Terminal, Waypoints, Zap} from 'lucide-react';
import {usePageTitle} from '../../context/PageTitleContext';

interface ConfigProviderHelpProps {
    hideTitle?: boolean;
}

const ConfigProviderHelp = ({ hideTitle }: ConfigProviderHelpProps) => {
    if (!hideTitle) {
        usePageTitle('GraphQL Configuration Provider – Help');
    }

    return (
        <Flex direction="column" gap="6" className={hideTitle ? "" : "max-w-4xl mx-auto pb-10"}>
            {!hideTitle && (
                <Box className="py-10">
                    <Heading size="8" className="mb-4 bg-clip-text text-transparent bg-gradient-to-r from-(--accent-9) to-(--accent-11) inline-block">
                        Configuration Provider Principles
                    </Heading>
                    <Text size="4" color="gray" className="max-w-2xl block">
                        Learn about the schema-driven configuration delivery pipeline and its architectural principles.
                    </Text>
                </Box>
            )}

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Zap size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">The Core Logic</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            The Configuration Provider acts as a <strong>unified aggregator</strong>, serving structured data to external consumers like CD pipelines.
                        </Text>
                        <ol className="list-decimal pl-6 text-[var(--gray-11)] space-y-1">
                            <li>Retrieves the latest version of the specified <strong>Configuration</strong>.</li>
                            <li>Determines the appropriate <strong>Environment</strong> to use (if any).</li>
                            <li><strong>Merges</strong> the configuration data with environment-specific metadata.</li>
                            <li>Processes any <strong>variable placeholders</strong>.</li>
                            <li>Returns the final result (optionally filtered via <strong>JSONPath</strong>).</li>
                        </ol>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Waypoints size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Environment Linking Logic</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            Strato determines which environment to link with a configuration using two methods:
                        </Text>
                        <Box mb="3">
                            <Text as="div" size="3" weight="bold" mb="1">Implicit Linking (Stored Link)</Text>
                            <Text as="p" size="2" color="gray">
                                A Configuration can have a default <Code>environmentId</Code> assigned. If no environment is specified in the API call, Strato uses this stored link.
                            </Text>
                        </Box>
                        <Box>
                            <Text as="div" size="3" weight="bold" mb="1">Explicit Linking (Request Override)</Text>
                            <Text as="p" size="2" color="gray">
                                Specifying an environment name in the API request always takes precedence over any implicit link, allowing you to use the same "base" configuration across different environments.
                            </Text>
                        </Box>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Monitor size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Enhanced UI Features</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            The Configuration Provider View offers a modern, intuitive interface for managing and editing configurations with real-time environment merging.
                        </Text>
                        <ul className="list-disc pl-6 text-[var(--gray-11)] mb-3">
                            <li><strong>Version Selector</strong>: Browse and compare different configuration versions with author and timestamp information.</li>
                            <li><strong>Schema Tree Sidebar</strong>: Navigate the configuration structure with a hierarchical tree view, search/filter fields, and quick field addition.</li>
                            <li><strong>Visual/JSON/Split Modes</strong>: Switch between visual table editor, JSON editor, or split view for flexible editing workflows.</li>
                            <li><strong>Visual Editor</strong>: Edit fields in a table format with inline editing, boolean toggles, array management, and type-aware controls.</li>
                            <li><strong>Whole Config View</strong>: Preview the complete merged configuration in a hierarchical, expandable format.</li>
                        </ul>
                        <Callout.Root color="violet">
                            <Callout.Icon>
                                <Eye size={16} />
                            </Callout.Icon>
                            <Callout.Text>
                                The UI automatically merges configuration data with environment values in real-time, showing you exactly what will be deployed.
                                <Box mt="2">
                                    <Button variant="outline" size="1" onClick={() => window.location.href = '/documentation/config-provider-viewer'}>
                                        <Eye size={12} className="mr-1" /> View Detailed Documentation
                                    </Button>
                                </Box>
                            </Callout.Text>
                        </Callout.Root>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Database size={22} />
                    </Box>
                    <Box className="w-full">
                        <Heading size="4" mb="2">Merging & The _environment Object</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            Strato performs a deep-merge of values. Instead of overwriting data, it injects a special <Code>_environment</Code> metadata object into the root.
                        </Text>
                        
                        <Flex gap="4" direction={{ initial: 'column', sm: 'row' }} mb="3">
                            <Box flexGrow="1">
                                <Text as="div" size="2" weight="bold" mb="1">Metadata provided:</Text>
                                <ul className="list-disc pl-6 text-[var(--gray-11)] text-sm">
                                    <li><Code>name</Code> / <Code>id</Code>: Environment identity.</li>
                                    <li><Code>subscriptionId</Code>: Azure Subscription.</li>
                                    <li><Code>region</Code>: Target region (e.g., westeurope).</li>
                                    <li><Code>resourceGroup</Code>: Target Resource Group.</li>
                                </ul>
                            </Box>
                            <Box className="bg-[var(--gray-3)] p-3 rounded-md overflow-auto max-h-[200px]">
                                <pre className="text-[10px] font-mono text-[var(--gray-12)]">
{`{
  "appSettings": { ... },
  "_environment": {
    "name": "prod-eu",
    "region": "westeurope",
    "resourceGroup": "rg-prod"
  }
}`}
                                </pre>
                            </Box>
                        </Flex>

                        <Callout.Root color="sky">
                            <Callout.Icon>
                                <Info size={16} />
                            </Callout.Icon>
                            <Callout.Text size="2">
                                References like <Code>[[ Node:outputs:Prop ]]</Code> are resolved using the Environment's current state before the merge.
                            </Callout.Text>
                        </Callout.Root>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Braces size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Variable Placeholders</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            Strato scans all string values for placeholders and replaces them before returning the data.
                        </Text>
                        <ul className="list-disc pl-6 text-[var(--gray-11)] mb-3">
                            <li><Code>{"{{ name }}"}</Code>: Replaced with the <strong>Configuration</strong> name.</li>
                            <li><Code>{"{{ environment }}"}</Code>: Replaced with the <strong>Environment</strong> name.</li>
                        </ul>
                        <Callout.Root color="amber">
                            <Callout.Icon>
                                <Info size={16} />
                            </Callout.Icon>
                            <Callout.Text size="2">
                                Whitespace inside braces is ignored (e.g., <Code>{"{{name}}"}</Code> and <Code>{"{{ name }}"}</Code> are both valid).
                            </Callout.Text>
                        </Callout.Root>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Search size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">JSONPath Queries</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            Server-side filtering allows pipelines to retrieve specific pieces of information instead of the whole document.
                        </Text>
                        <Callout.Root color="violet">
                            <Callout.Icon>
                                <Info size={16} />
                            </Callout.Icon>
                            <Callout.Text size="2">
                                Variable placeholders are processed <strong>before</strong> the JSONPath query is executed.
                            </Callout.Text>
                        </Callout.Root>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Network size={22} />
                    </Box>
                    <Box className="w-full">
                        <Heading size="4" mb="2">GraphQL & REST Access</Heading>
                        
                        <Text as="p" size="3" color="gray" mb="3">
                            Primary retrieval endpoints for automation and pipelines:
                        </Text>

                        <Box mb="4">
                            <Heading size="3" mb="1">Retrieve by Name (Recommended)</Heading>
                            <Code className="p-2 block" variant="soft">
                                GET /api/configuration-provider/config/{"{configName}"}/env/{"{envName}"}
                            </Code>
                        </Box>

                        <Box mb="4">
                            <Heading size="3" mb="1">Execute JSONPath Query</Heading>
                            <Code className="p-2 block mb-1" variant="soft">
                                GET /api/configuration-provider/config/{"{configName}"}/query?query={"$.appSettings.key"}
                            </Code>
                            <Text size="1" color="gray">Uses implicit environment link if not specified.</Text>
                        </Box>

                        <Box mb="4">
                            <Heading size="3" mb="1">Retrieve by ID</Heading>
                            <Code className="p-2 block" variant="soft">
                                GET /api/configuration-provider/by-id/{"{configId}"}/{"{envId}"}
                            </Code>
                        </Box>

                        <Heading size="3" mb="2">GraphQL Query</Heading>
                        <Box className="bg-[var(--gray-3)] p-4 rounded-md">
                            <pre className="text-xs font-mono text-[var(--gray-12)] overflow-auto">
                                {`query GetConfig($configId: ID!, $envId: ID) {
  configProviderOutput(configurationId: $configId, environmentId: $envId) {
    configurationName
    environmentName
    version
    data
  }
}`}
                            </pre>
                        </Box>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Terminal size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Pipeline Integration</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            Integrate Strato directly into your CI/CD flow using API Tokens.
                        </Text>
                        <Box className="bg-[var(--gray-12)] p-4 rounded-md">
                            <pre className="text-xs font-mono text-[var(--gray-2)] overflow-auto">
                                {`# Example: Fetching config in a pipeline script
curl -H "Authorization: Bearer $ARBORIST_TOKEN" \\
     "https://strato.io/api/configuration-provider/config/api-services/env/prod"`}
                            </pre>
                        </Box>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--violet-11)]">
                        <ShieldCheck size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Security & Tokens</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            Access is strictly controlled via Issued Tokens.
                        </Text>
                        <ul className="list-disc pl-6 text-[var(--gray-11)]">
                            <li>Tokens can be scoped to specific Configurations or Environments.</li>
                            <li>Inherits standard Strato RBAC rules.</li>
                            <li>Encryption keys for secure values are handled transparently by the provider.</li>
                        </ul>
                    </Box>
                </Flex>
            </Card>

            <Separator size="4" />

            <Box>
                <Heading size="5" mb="2">Related Documentation</Heading>
                <Flex gap="4">
                    <Card variant="ghost" className="flex-1">
                        <Flex direction="column" gap="2">
                            <Heading size="3" className="flex items-center gap-2">
                                <Layout size={16} /> Configurations
                            </Heading>
                            <Text size="2" color="gray">
                                Managing individual configuration maps.
                            </Text>
                        </Flex>
                    </Card>
                    <Card variant="ghost" className="flex-1">
                        <Flex direction="column" gap="2">
                            <Heading size="3" className="flex items-center gap-2">
                                <Waypoints size={16} /> Schemas
                            </Heading>
                            <Text size="2" color="gray">
                                Formal structure definitions.
                            </Text>
                        </Flex>
                    </Card>
                </Flex>
            </Box>
        </Flex>
    );
};

export default ConfigProviderHelp;
