import {Badge, Box, Callout, Card, Code, Flex, Heading, Separator, Text} from '@radix-ui/themes';
import {
    Activity,
    Container,
    History,
    Info,
    Layout,
    Network,
    PenTool,
    ShieldCheck,
    Waypoints,
    Zap
} from 'lucide-react';
import {usePageTitle} from '../../context/PageTitleContext';

const EnvironmentsHelp = () => {
    usePageTitle('Environments – Help');

    return (
        <Flex direction="column" gap="6" className="max-w-4xl mx-auto pb-10">
            <Box className="py-10">
                <Flex direction="row" gap="2">
                    <Waypoints size={32} color="var(--accent-11)"/>
                    <Heading size="8" className="mb-4 bg-clip-text text-transparent bg-gradient-to-l from-[var(--gray-12)] to-[var(--accent-10)] inline-block">
                        Environments Help
                    </Heading>
                </Flex>
                <Text size="4" color="gray" className="max-w-2xl block">
                    Understand how to manage, configure, and monitor your cloud environments within Strato.
                </Text>
            </Box>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Container size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Environment Definitions</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            An Environment Definition is a blueprint-based or manual configuration of resources that represent a logical deployment unit (e.g., <Code>Development</Code>, <Code>Staging</Code>, <Code>Production</Code>).
                        </Text>
                        <ul className="list-disc pl-6 text-[var(--gray-11)]">
                            <li>Linked to specific Azure Subscriptions and Resource Groups.</li>
                            <li>Can be inspired by a <Code>Blueprint</Code> or built from scratch.</li>
                            <li>Contains specific configuration values (variables) for all included resources.</li>
                        </ul>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <PenTool size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Environment Editor</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            The visual editor allows you to manage the topology of your environment using a node-graph interface.
                        </Text>
                        <ul className="list-disc pl-6 text-[var(--gray-11)] mb-3">
                            <li>Add resources from the catalog.</li>
                            <li>Define dependencies between resources to control deployment order.</li>
                            <li>Configure resource-specific properties in the side panel.</li>
                        </ul>
                        <Callout.Root>
                            <Callout.Icon>
                                <Info />
                            </Callout.Icon>
                            <Callout.Text>
                                Pro-tip: Connections between nodes represent deployment dependencies. Strato will ensure that the "source" resource is ready before starting the "target" resource.
                            </Callout.Text>
                        </Callout.Root>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Zap size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Deployment Plans</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            Before any changes are applied, Strato generates a Deployment Plan. This plan calculates the exact sequence of operations needed.
                        </Text>
                        <ul className="list-disc pl-6 text-[var(--gray-11)] mb-3">
                            <li><strong>Parallel Execution</strong>: Resources without mutual dependencies are deployed simultaneously.</li>
                            <li><strong>Validation</strong>: The plan is validated against ARM constraints before execution.</li>
                            <li><strong>Preview</strong>: You can preview the graph of the deployment plan to understand the execution flow.</li>
                        </ul>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Activity size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Environment States</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            Each environment tracks its current synchronization state with the actual cloud resources.
                        </Text>
                        <ul className="list-disc pl-6 text-[var(--gray-11)]">
                            <li><Badge color="blue">Draft</Badge>: Changes are saved in Strato but not yet deployed.</li>
                            <li><Badge color="orange">Deploying</Badge>: A deployment plan is currently being executed.</li>
                            <li><Badge color="green">Synced</Badge>: The cloud state matches the Strato definition.</li>
                            <li><Badge color="red">Failed</Badge>: The last deployment encountered errors.</li>
                        </ul>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Network size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Connectivity & Networking</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            Environments can be configured to use specific Virtual Networks and Subnets.
                        </Text>
                        <ul className="list-disc pl-6 text-[var(--gray-11)]">
                            <li>Define environment-wide CIDR blocks.</li>
                            <li>Strato handles private endpoint creation and DNS integration automatically.</li>
                            <li>Manage network security groups and routing through environment-level policies.</li>
                        </ul>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <History size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Version Matrix</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            The Version Matrix provides a visual overview of all components and their specific versions deployed in the environment.
                        </Text>
                        <ul className="list-disc pl-6 text-[var(--gray-11)]">
                            <li>Track backend, frontend, and microservice versions separately.</li>
                            <li>Manual and automated (CI/CD) updates are supported via API.</li>
                            <li>Audit-ready history of what was deployed and when.</li>
                        </ul>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--violet-11)]">
                        <ShieldCheck size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Secure Values (Encryption)</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            Strato supports transparent encryption for sensitive environment variables using AES-GCM.
                        </Text>
                        <ul className="list-disc pl-6 text-[var(--gray-11)]">
                            <li>Values marked with <Code>!</Code> (e.g., <Code>password:string!</Code>) in resource template are encrypted in the database.</li>
                            <li>Encrypted fields are displayed with a green shield icon and masked in the editor.</li>
                            <li>Decryption happens automatically during deployment execution.</li>
                        </ul>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Network size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Advanced Configuration</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            You can reference outputs from other nodes dynamically in your configuration.
                        </Text>
                        <ul className="list-disc pl-6 text-[var(--gray-11)]">
                            <li>Use <Code>[[ NodeName:outputs:OutputName ]]</Code> to inject values from other resources.</li>
                            <li>Autocomplete is available in text fields to help you find valid references.</li>
                        </ul>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Layout size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Import Wizard</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            Existing infrastructure can be imported into Strato to bring it under management.
                        </Text>
                        <ul className="list-disc pl-6 text-[var(--gray-11)]">
                            <li><strong>Terraform/Bicep</strong>: Analyze IaC files to reverse-engineer the topology.</li>
                            <li><strong>Azure Resource Groups</strong>: Scan live resources and map them to known catalog definitions.</li>
                        </ul>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <History size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Version History & Restore</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            Every change to an environment is versioned. You can browse the full history of changes.
                        </Text>
                        <ul className="list-disc pl-6 text-[var(--gray-11)]">
                            <li>Compare any version with the current state.</li>
                            <li><strong>Restore</strong>: Rollback the environment definition to any previous point in time (creates a new version).</li>
                        </ul>
                    </Box>
                </Flex>
            </Card>

            <Separator size="4" />

            <Box>
                <Heading size="5" mb="2">Related Concepts</Heading>
                <Flex gap="4">
                    <Card variant="ghost" className="flex-1">
                        <Flex direction="column" gap="2">
                            <Heading size="3" className="flex items-center gap-2">
                                <Waypoints size={16} /> Blueprints
                            </Heading>
                            <Text size="2" color="gray">
                                Templates for recurring environment structures.
                            </Text>
                        </Flex>
                    </Card>
                    <Card variant="ghost" className="flex-1">
                        <Flex direction="column" gap="2">
                            <Heading size="3" className="flex items-center gap-2">
                                <Layout size={16} /> Resources
                            </Heading>
                            <Text size="2" color="gray">
                                The building blocks used within your environments.
                            </Text>
                        </Flex>
                    </Card>
                    <Card variant="ghost" className="flex-1">
                        <Flex direction="column" gap="2">
                            <Heading size="3" className="flex items-center gap-2">
                                <History size={16} /> Audit Log
                            </Heading>
                            <Text size="2" color="gray">
                                Track who changed what and when in your environment.
                            </Text>
                        </Flex>
                    </Card>
                </Flex>
            </Box>
        </Flex>
    );
};

export default EnvironmentsHelp;
