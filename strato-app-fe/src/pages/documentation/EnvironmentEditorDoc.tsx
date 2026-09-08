import {Box, Callout, Card, Code, Flex, Heading, Table, Text} from '@radix-ui/themes';
import { Info, Link, Map, MousePointer2, PenTool, Play, Save} from 'lucide-react';
import {usePageTitle} from '../../context/PageTitleContext';

export const EnvironmentEditorHelpContent = () => {
    return (
        <Flex direction="column" gap="6" className="pb-10">
            <Box>
                <Flex direction="row" gap="2">
                    <PenTool size={32} color="var(--accent-11)"/>
                    <Heading size="8" className="mb-4 bg-clip-text text-transparent bg-gradient-to-l from-[var(--gray-12)] to-[var(--accent-10)] inline-block">
                        Environment Editor
                    </Heading>
                </Flex>
                <Text size="4" color="gray" className="max-w-2xl block">
                    Master the visual interface for designing and configuring your cloud infrastructure topologies.
                </Text>
            </Box>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <PenTool size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Visual Graph Interface</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            The Environment Editor uses a node-based graph system powered by ReactFlow to represent your infrastructure.
                        </Text>
                        <ul className="list-disc pl-6 text-[var(--gray-11)] mb-3">
                            <li><strong>Nodes</strong>: Represent cloud resources (e.g., App Service, SQL Database, VNet).</li>
                            <li><strong>Edges</strong>: Represent deployment dependencies and data flow between resources.</li>
                            <li><strong>Canvas</strong>: Drag and drop to organize your architecture visually.</li>
                        </ul>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Link size={22} />
                    </Box>
                    <Box className="flex-1">
                        <Heading size="4" mb="2">Node Reference Expressions</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            One of the most powerful features of the editor is the ability to reference outputs of one resource in the configuration of another.
                        </Text>
                        
                        <Box className="bg-[var(--gray-2)] p-4 rounded-lg border border-[var(--gray-5)] mb-3">
                            <Text size="2" weight="bold" color="indigo" mb="1" className="rt-r-display-block">Syntax:</Text>
                            <Code variant="ghost" size="4">
                                [[ NodeLabel:outputs:OutputName ]]
                            </Code>
                        </Box>

                        <Text as="p" size="3" color="gray" mb="3">
                            When you connect two nodes, the editor automatically helps you map these outputs to inputs. 
                            At runtime, Strato will resolve these expressions to the actual values produced during deployment.
                        </Text>
                        
                        <Callout.Root color="blue" size="1">
                            <Callout.Icon>
                                <Info />
                            </Callout.Icon>
                            <Callout.Text>
                                Example: <Code>[[ MyDatabase:outputs:connectionString ]]</Code> used in an App Service environment variable.
                            </Callout.Text>
                        </Callout.Root>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Map size={22} />
                    </Box>
                    <Box className="flex-1">
                        <Heading size="4" mb="2">Configuration Map</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            The Configuration Map provides a bird's-eye view of all variables and references across your entire environment.
                        </Text>
                        <ul className="list-disc pl-6 text-[var(--gray-11)] mb-3">
                            <li><strong>Global Overview</strong>: See which resources depend on which values.</li>
                            <li><strong>Reference Tracking</strong>: Easily identify where a specific output is being used.</li>
                            <li><strong>Validation</strong>: Quick check for missing or broken references.</li>
                        </ul>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <MousePointer2 size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Editor Controls</Heading>
                        <Table.Root variant="surface">
                            <Table.Header>
                                <Table.Row>
                                    <Table.ColumnHeaderCell>Action</Table.ColumnHeaderCell>
                                    <Table.ColumnHeaderCell>Description</Table.ColumnHeaderCell>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                <Table.Row>
                                    <Table.RowHeaderCell>Add Resource</Table.RowHeaderCell>
                                    <Table.Cell>Click the "Add" button or use the context menu to choose a resource from the catalog.</Table.Cell>
                                </Table.Row>
                                <Table.Row>
                                    <Table.RowHeaderCell>Connect</Table.RowHeaderCell>
                                    <Table.Cell>Drag from a resource's handle to another to create a dependency and map attributes.</Table.Cell>
                                </Table.Row>
                                <Table.Row>
                                    <Table.RowHeaderCell>Configure</Table.RowHeaderCell>
                                    <Table.Cell>Select a node to open the properties panel on the right and edit configuration values.</Table.Cell>
                                </Table.Row>
                                <Table.Row>
                                    <Table.RowHeaderCell>Layout</Table.RowHeaderCell>
                                    <Table.Cell>Use the "Auto Layout" button to automatically organize your nodes neatly.</Table.Cell>
                                </Table.Row>
                            </Table.Body>
                        </Table.Root>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Play size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Deployment Plan Preview</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            Click on "Show Plan" to see the execution graph. This shows how Strato will parallelize the deployment based on the dependencies you've defined.
                        </Text>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Save size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Saving & Versions</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            When you save an environment, you can define the Azure target (Subscription, Region, Resource Group). 
                            Strato keeps track of your changes as drafts until they are explicitly deployed.
                        </Text>
                    </Box>
                </Flex>
            </Card>
        </Flex>
    );
};

const EnvironmentEditorDoc = () => {
    usePageTitle('Environment Editor – Documentation');

    return (
        <Box className="max-w-4xl mx-auto py-10">
            <EnvironmentEditorHelpContent />
        </Box>
    );
};

export default EnvironmentEditorDoc;
