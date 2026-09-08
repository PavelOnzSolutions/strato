import {Badge, Box, Callout, Card, Flex, Heading, Separator, Text} from '@radix-ui/themes';
import {Bot, Info, MessageSquare, Search, ShieldCheck, Zap} from 'lucide-react';
import {usePageTitle} from '../../context/PageTitleContext';

const AssistantHelp = () => {
    usePageTitle('DevOps Assistant – Help');

    return (
        <Flex direction="column" gap="6" className="max-w-4xl mx-auto pb-10">
            <Box className="py-10">
                <Flex direction="row" gap="2">
                    <Bot size={32} color="var(--accent-11)"/>
                    <Heading size="8" className="mb-4 bg-clip-text text-transparent bg-gradient-to-l from-[var(--gray-12)] to-[var(--accent-10)] inline-block">
                        DevOps Assistant
                    </Heading>
                </Flex>
                <Text size="4" color="gray" className="max-w-2xl block">
                    Strato AI is an expert in DevOps and Azure architecture, integrated directly into the platform to help you manage environments and design cloud infrastructure using natural language.
                </Text>
            </Box>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <MessageSquare size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Natural Language Control</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            You can interact with Strato using simple English commands. The assistant understands the context of your project and can perform complex multi-step operations.
                        </Text>
                        <ul className="list-disc pl-6 text-[var(--gray-11)]">
                            <li>"Deploy environment 'Production'"</li>
                            <li>"Create a new environment with basic Kubernetes cluster"</li>
                            <li>"List all users in the system"</li>
                            <li>"What's the best way to secure AKS?"</li>
                        </ul>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <ShieldCheck size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Safety First: Two-Stage Execution</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            To prevent accidental or unauthorized modifications, the assistant follows a strict two-stage flow:
                        </Text>
                        <Flex direction="column" gap="3">
                            <Box className="bg-[var(--gray-3)] p-3 rounded-md border-l-4 border-[var(--accent-9)]">
                                <Text size="2" weight="bold">1. Planning Phase</Text>
                                <Text size="2" color="gray" as="p">The assistant analyzes your request and presents a list of "Proposed Actions" (tool calls) it intends to execute.</Text>
                            </Box>
                            <Box className="bg-[var(--gray-3)] p-3 rounded-md border-l-4 border-green-500">
                                <Text size="2" weight="bold">2. Confirmation Phase</Text>
                                <Text size="2" color="gray" as="p">No changes are made until you manually review and click "Confirm and Execute".</Text>
                            </Box>
                        </Flex>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Search size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Azure Architecture Integration</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            The assistant is powered by Microsoft Semantic Kernel and has access to the <strong>Azure Architecture Center</strong>.
                        </Text>
                        <ul className="list-disc pl-6 text-[var(--gray-11)] mb-3">
                            <li>It prioritizes Microsoft best practices when suggesting environment designs.</li>
                            <li>It can search for the latest architectural patterns and security recommendations.</li>
                        </ul>
                        <Callout.Root>
                            <Callout.Icon>
                                <Info />
                            </Callout.Icon>
                            <Callout.Text>
                                Ask the assistant for architectural advice, such as "Suggest a high-availability setup for SQL Server in Azure".
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
                        <Heading size="4" mb="2">Capabilities</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            The assistant is integrated with the following core services:
                        </Text>
                        <Flex gap="2" wrap="wrap">
                            <Badge color="blue" size="2">Environments Service</Badge>
                            <Badge color="blue" size="2">Azure RM Service</Badge>
                            <Badge color="blue" size="2">MS Graph Service</Badge>
                            <Badge color="orange" size="2">System Health & Metrics</Badge>
                            <Badge color="green" size="2">Architecture Search</Badge>
                        </Flex>
                    </Box>
                </Flex>
            </Card>

            <Separator size="4" />

            <Box>
                <Heading size="5" mb="2">Getting Started</Heading>
                <Text size="3" color="gray" mb="4">
                    Look for the <Badge variant="soft" color="violet"><Bot size={14} className="mr-1" /> Assistant</Badge> button in the bottom-right corner of your screen to start a conversation.
                </Text>
            </Box>
        </Flex>
    );
};

export default AssistantHelp;
