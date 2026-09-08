import {Box, Callout, Card, Code, Flex, Heading, Text} from '@radix-ui/themes';
import {ArrowRight, FileJson, History, Info, Layout, Link, Plus, Workflow} from 'lucide-react';
import {usePageTitle} from '../../context/PageTitleContext';

interface ConfigurationsHelpProps {
    hideTitle?: boolean;
}

const ConfigurationsHelp = ({ hideTitle }: ConfigurationsHelpProps) => {
    if (!hideTitle) {
        usePageTitle('Configurations – Help');
    }

    return (
        <Flex direction="column" gap="6" className={hideTitle ? "" : "max-w-4xl mx-auto pb-10"}>
            {!hideTitle && (
                <Box className="py-10">
                    <Heading size="8" className="mb-4 bg-clip-text text-transparent bg-linear-to-r from-(--accent-9) to-(--accent-11) inline-block">
                        Managing Configurations
                    </Heading>
                    <Text size="4" color="gray" className="max-w-2xl block">
                        Bind a configuration to a schema, populate sections with named items, and serve the resulting JSON to your pipelines.
                    </Text>
                </Box>
            )}

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-(--accent-3) rounded-full text-(--accent-11)">
                        <Layout size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">What is a Configuration?</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            A Configuration is the populated counterpart of a schema. The schema decides <em>which</em> sections (Functions, Event Grid Topics, API Management, …) are available; the configuration provides the actual <em>items</em> inside those sections — for example <Code>bw-contracts</Code> and <Code>bw-orders</Code> under <Code>functions</Code>.
                        </Text>
                        <ul className="list-disc pl-6 text-(--gray-11)">
                            <li>Each configuration is bound to exactly one schema.</li>
                            <li>It inherits its flavor (currently <Code>AZURE</Code>) from that schema. The flavor cannot be changed afterwards.</li>
                            <li>An optional environment provides metadata for placeholder substitution.</li>
                        </ul>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-(--accent-3) rounded-full text-(--accent-11)">
                        <Workflow size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Two-Step Creation Flow</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            Creating a new configuration is a guided two-step process. You won't see the rich editor until the basics are set.
                        </Text>
                        <Box mb="3">
                            <Text as="div" size="3" weight="bold" mb="1"><Plus size={14} className="inline mr-1" /> Step 1 — Basics</Text>
                            <Text as="p" size="2" color="gray">
                                Fill in the configuration name, pick a schema from the dropdown (filtered by flavor), and optionally bind an environment. The flavor field is auto-filled from the selected schema and shown read-only. Saving this step creates an empty configuration (no items yet).
                            </Text>
                        </Box>
                        <Box>
                            <Text as="div" size="3" weight="bold" mb="1"><ArrowRight size={14} className="inline mr-1" /> Step 2 — Provider View</Text>
                            <Text as="p" size="2" color="gray">
                                You are taken to the Provider View, where you add items into the schema's sections and fill in their fields. See the dedicated Config Provider View help page for the full editor walkthrough.
                            </Text>
                        </Box>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-(--accent-3) rounded-full text-(--accent-11)">
                        <Link size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Environment Linking</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            Linking an environment is optional but enables real-time substitution and the <Code>_environment</Code> metadata block in the provider output.
                        </Text>
                        <ul className="list-disc pl-6 text-(--gray-11) mb-3">
                            <li>Stored link — the configuration carries an <Code>environmentId</Code> used by default in the by-name provider endpoint.</li>
                            <li>Request override — callers can name a different environment in the URL; that always wins.</li>
                        </ul>
                        <Callout.Root color="violet">
                            <Callout.Icon>
                                <Info size={16} />
                            </Callout.Icon>
                            <Callout.Text>
                                Placeholder tokens <Code>{"{{ name }}"}</Code> and <Code>{"{{ environment }}"}</Code> inside any string field are resolved against the chosen environment before the response is returned.
                            </Callout.Text>
                        </Callout.Root>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-(--accent-3) rounded-full text-(--accent-11)">
                        <FileJson size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">How Items Resolve to JSON Output</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            Pipelines fetch the configuration through the provider endpoint at <Code>/api/configuration-provider/config/&#123;name&#125;/env/&#123;env&#125;</Code> (and its by-id counterpart). The response shape is:
                        </Text>
                        <Box className="bg-[var(--gray-3)] p-4 rounded-md mb-3">
                            <pre className="text-xs font-mono text-[var(--gray-12)] overflow-auto">
{`{
  "configurationName": "platform-prod",
  "environmentName": "prod-eus",
  "version": 7,
  "data": {
    "functions": {
      "bw-contracts": { "appHealthCheck": { "deployToMonitor": false }, "...": "..." },
      "bw-orders": { "...": "..." }
    },
    "eventGridTopics": {
      "order-placed": { "topicName": "...", "inputSchema": "..." }
    },
    "_environment": { "name": "prod-eus", "region": "...", "resourceGroup": "..." }
  }
}`}
                            </pre>
                        </Box>
                        <ul className="list-disc pl-6 text-(--gray-11)">
                            <li>Each top-level key under <Code>data</Code> is a section from the schema (its <Code>sectionKey</Code>).</li>
                            <li>Inside each section, every item appears under its name with its full field map.</li>
                            <li>Sections whose catalog entry declares a <Code>requiredReadPermission</Code> the caller lacks are omitted server-side.</li>
                            <li>Secret fields are decrypted in the response; placeholders are resolved before any JSONPath query runs.</li>
                        </ul>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-(--accent-3) rounded-full text-(--accent-11)">
                        <History size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Versioning & Audit Trail</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            Every save creates a new version. Item adds and deletes are recorded as dedicated audit entries (<Code>ITEM_ADD</Code> / <Code>ITEM_DELETE</Code>) alongside the regular configuration change events.
                        </Text>
                        <ul className="list-disc pl-6 text-(--gray-11)">
                            <li>Switch versions from the header's version selector.</li>
                            <li>Compare versions side by side through the Compare dialog.</li>
                            <li>The audit log retains the full timeline of changes per configuration.</li>
                        </ul>
                    </Box>
                </Flex>
            </Card>
        </Flex>
    );
};

export default ConfigurationsHelp;
