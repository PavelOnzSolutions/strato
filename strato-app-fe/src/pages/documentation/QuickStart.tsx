import {Badge, Box, Card, ContextMenu, Flex, Grid, Heading, Separator, Text} from '@radix-ui/themes';
import {Box as BoxIcon, GitBranch, Github, HandHelping, Layers, MousePointerClick, Panda, Settings, Workflow, Zap} from 'lucide-react';
import {usePageTitle} from '../../context/PageTitleContext';

const QuickStart = () => {
    usePageTitle('Quick Start');

    return (
        <Flex direction="column" gap="6" className="max-w-4xl mx-auto pb-10">
            <Box className="py-10">
                <Flex direction="row" gap="2">
                    <HandHelping size={32} color="var(--accent-11)"/>
                    <Heading size="8" className="mb-4 bg-clip-text text-transparent bg-gradient-to-l from-[var(--gray-12)] to-[var(--accent-10)] inline-block">
                        Welcome to Strato
                    </Heading>
                </Flex>
                <Text size="4" color="gray" className="max-w-2xl block">
                    The Basswood Maintenance Toolbox. Manage your environments, resources, and deployments with ease and precision.
                </Text>
            </Box>




            <ContextMenu.Root>
                <ContextMenu.Trigger>
                    <Card size="3" className="shadow-lg border-l-4 border-l-[var(--accent-9)]">
                        <Flex gap="4" align="start">
                            <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                                <MousePointerClick size={24} />
                            </Box>
                            <Box>
                                <Heading size="4" mb="2">Right-Click Everything!</Heading>
                                <Text as="p" size="3" color="gray" mb="2">
                                    Strato is designed for easy and intuitive use. Almost every table row, card, and interactive element has a context menu.
                                </Text>
                                <Flex gap="2" wrap="wrap">
                                    <Badge color="blue" variant="soft">Edit</Badge>
                                    <Badge color="green" variant="soft">Clone</Badge>
                                    <Badge color="red" variant="soft">Delete</Badge>
                                    <Badge color="orange" variant="soft">View JSON</Badge>
                                </Flex>
                            </Box>
                        </Flex>
                    </Card>
                </ContextMenu.Trigger>
                <ContextMenu.Content>
                    <ContextMenu.Label>Example Menu</ContextMenu.Label>
                    <ContextMenu.Item >
                        <Panda size={20} />
                        See, how easy it is
                    </ContextMenu.Item>
                </ContextMenu.Content>
            </ContextMenu.Root>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card size="2">
                    <Flex direction="column" gap="3">
                        <Box className="w-10 h-10 flex items-center justify-center bg-blue-100 text-blue-600 rounded-lg dark:bg-blue-900/30 dark:text-blue-400">
                            <Layers size={20} />
                        </Box>
                        <Heading size="3">Environments</Heading>
                        <Text size="2" color="gray">
                            Define and configure Basswood environments. Manage configurations and track deployment status in real-time.
                        </Text>
                    </Flex>
                </Card>

                <Card size="2">
                    <Flex direction="column" gap="3">
                        <Box className="w-10 h-10 flex items-center justify-center bg-purple-100 text-purple-600 rounded-lg dark:bg-purple-900/30 dark:text-purple-400">
                            <BoxIcon size={20} />
                        </Box>
                        <Heading size="3">Resources</Heading>
                        <Text size="2" color="gray">
                            Catalog and manage your Azure resources. Classify them with categories and types for better organization.
                        </Text>
                    </Flex>
                </Card>

                <Card size="2">
                    <Flex direction="column" gap="3">
                        <Box className="w-10 h-10 flex items-center justify-center bg-teal-100 text-teal-600 rounded-lg dark:bg-teal-900/30 dark:text-teal-400">
                            <Zap size={20} />
                        </Box>
                        <Heading size="3">ARM Connection</Heading>
                        <Text size="2" color="gray">
                            Strato has direct access to Azure Resource Manager (ARM) to create and manage resources.
                        </Text>
                    </Flex>
                </Card>

            </div>

            <Separator size="4" />

            <section>
                <Heading size="5" mb="4">Key Features</Heading>
                <Grid columns={{ initial: '1', md: '3' }} gap="4">
                    <Card size="2">
                        <Flex direction="column" gap="3">
                            <Box className="w-10 h-10 flex items-center justify-center bg-orange-100 text-orange-600 rounded-lg dark:bg-orange-900/30 dark:text-orange-400">
                                <Settings size={20} />
                            </Box>
                            <Heading size="3">Config Provisioning</Heading>
                            <Text size="2" color="gray">
                                Automatically provision configurations to your environments. Strato can manage and sync settings across multiple targets seamlessly.
                            </Text>
                        </Flex>
                    </Card>
                    <Card size="2">
                        <Flex direction="column" gap="3">
                            <Box className="w-10 h-10 flex items-center justify-center bg-pink-100 text-pink-600 rounded-lg dark:bg-pink-900/30 dark:text-pink-400">
                                <Workflow size={20} />
                            </Box>
                            <Heading size="3">Process Resources</Heading>
                            <Text size="2" color="gray">
                                New <strong>Process</strong> resource class allows you to define complex workflows and sequential operations as part of your infrastructure.
                            </Text>
                        </Flex>
                    </Card>
                    <Card size="2">
                        <Flex direction="column" gap="3">
                            <Flex gap="2">
                                <Box className="w-10 h-10 flex items-center justify-center bg-gray-100 text-gray-900 rounded-lg dark:bg-gray-800 dark:text-gray-100">
                                    <Github size={20} />
                                </Box>
                                <Box className="w-10 h-10 flex items-center justify-center bg-blue-100 text-blue-600 rounded-lg dark:bg-blue-900/30 dark:text-blue-400">
                                    <GitBranch size={20} />
                                </Box>
                            </Flex>
                            <Heading size="3">Git Integration</Heading>
                            <Text size="2" color="gray">
                                Securely store and use <strong>GitHub</strong> and <strong>Bitbucket</strong> credentials to pull configurations, scripts, or templates.
                            </Text>
                        </Flex>
                    </Card>
                </Grid>
            </section>

            <Separator size="4" />

            <Box>
                <Heading size="5" mb="4">Getting Started</Heading>
                <Flex direction="column" gap="4">
                    <Flex gap="3" align="center">
                        <div className="w-8 h-8 rounded-full bg-[var(--gray-3)] flex items-center justify-center font-bold text-[var(--gray-11)]">1</div>
                        <Text>Navigate to <strong>Environment Definitions</strong> to set up an Environment configuration. Use predefined Blueprint for Basswood.</Text>
                    </Flex>
                    <Flex gap="3" align="center">
                        <div className="w-8 h-8 rounded-full bg-[var(--gray-3)] flex items-center justify-center font-bold text-[var(--gray-11)]">2</div>
                        <Text>Define new <strong>Resources</strong> that will be part of your environment.</Text>
                    </Flex>
                    <Flex gap="3" align="center">
                        <div className="w-8 h-8 rounded-full bg-[var(--gray-3)] flex items-center justify-center font-bold text-[var(--gray-11)]">3</div>
                        <Text>Use <strong>Blueprints</strong> to define environment structure.</Text>
                    </Flex>
                </Flex>
            </Box>
        </Flex>
    );
};

export default QuickStart;
