import {Box, Callout, Card, Code, Flex, Heading, Separator, Text} from '@radix-ui/themes';
import {AlertCircle, Clock, GitBranch, Info, Play, Settings, Variable, Workflow, Zap} from 'lucide-react';
import {usePageTitle} from '../../context/PageTitleContext';

interface WorkflowEditorHelpProps {
    hideTitle?: boolean;
}

const WorkflowEditorHelp = ({ hideTitle }: WorkflowEditorHelpProps) => {
    if (!hideTitle) {
        usePageTitle('Workflow Editor – Help');
    }

    return (
        <Flex direction="column" gap="6" className={hideTitle ? "" : "max-w-4xl mx-auto pb-10"}>
            {!hideTitle && (
                <Box className="py-10">
                    <Heading size="8" className="mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent-9)] to-[var(--accent-10)] inline-block">
                        Workflow Editor
                    </Heading>
                    <Text size="4" color="gray" className="max-w-2xl block">
                        Design and manage sequential workflow processes using the visual node-based editor.
                    </Text>
                </Box>
            )}

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Workflow size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Overview</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            The Workflow Editor provides a visual canvas for creating and editing workflow definitions. 
                            Workflows are sequential processes that execute a series of steps, with each step performing 
                            a specific action like REST API calls or custom Java logic.
                        </Text>
                        <ul className="list-disc pl-6 text-[var(--gray-11)]">
                            <li><strong>Visual Design</strong>: Drag-and-drop nodes to create workflow steps.</li>
                            <li><strong>Connection-Based Flow</strong>: Connect nodes to define execution order.</li>
                            <li><strong>Auto Layout</strong>: Automatically arrange nodes for better visualization.</li>
                        </ul>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <GitBranch size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Workflow Structure</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            A workflow consists of the following components:
                        </Text>
                        <ul className="list-disc pl-6 text-[var(--gray-11)] mb-3">
                            <li><strong>Workflow Definition</strong>: The blueprint containing ID, name, description, and steps.</li>
                            <li><strong>Steps</strong>: Individual tasks with a type, configuration, and link to the next step.</li>
                            <li><strong>Variables</strong>: Shared data map available to all steps during execution.</li>
                        </ul>
                        <Callout.Root color="sky">
                            <Callout.Icon>
                                <Info size={16} />
                            </Callout.Icon>
                            <Callout.Text>
                                Each step points to the next step via <Code>nextStepId</Code>. When <Code>nextStepId</Code> is null, the workflow completes.
                            </Callout.Text>
                        </Callout.Root>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Settings size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Step Types</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            The workflow engine supports different step handler types:
                        </Text>

                        <Heading size="3" mb="2" mt="4">REST_CALL</Heading>
                        <Text as="p" size="2" color="gray" mb="2">
                            Executes HTTP requests to external services. Supports variable interpolation in URLs using <Code>{"{{variableName}}"}</Code> syntax.
                        </Text>

                        <Heading size="3" mb="2" mt="4">JAVA_DELEGATE</Heading>
                        <Text as="p" size="2" color="gray" mb="2">
                            Executes custom Java logic by looking up Spring beans. Use this for complex business logic that cannot be expressed as simple REST calls.
                        </Text>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Variable size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Variable Management</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            Variables allow data to flow between steps in a workflow.
                        </Text>
                        <ul className="list-disc pl-6 text-[var(--gray-11)] mb-3">
                            <li><strong>Input Variables</strong>: Passed when starting the workflow.</li>
                            <li><strong>Step Outputs</strong>: Each step can return outputs that are merged into the workflow variables.</li>
                            <li><strong>Interpolation</strong>: Use <Code>{"{{variableName}}"}</Code> in step configurations to reference variables.</li>
                        </ul>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Clock size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Async Execution</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            Steps can be configured to run asynchronously.
                        </Text>
                        <ul className="list-disc pl-6 text-[var(--gray-11)]">
                            <li>When <Code>async: true</Code>, the step executes in a separate thread.</li>
                            <li>The main workflow process remains responsive during async execution.</li>
                            <li>Useful for long-running operations that shouldn't block the workflow.</li>
                        </ul>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Play size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Execution Flow</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            When a workflow is started:
                        </Text>
                        <ol className="list-decimal pl-6 text-[var(--gray-11)] mb-3">
                            <li>A <strong>WorkflowInstance</strong> is created with initial variables.</li>
                            <li>The engine identifies the first step and its corresponding handler.</li>
                            <li>The handler executes and returns an <strong>ActionResult</strong>.</li>
                            <li>Outputs are merged into the instance variables.</li>
                            <li>The engine moves to <Code>nextStepId</Code> or marks the workflow as completed.</li>
                        </ol>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <AlertCircle size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Workflow Status</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            Workflow instances track their execution status:
                        </Text>
                        <ul className="list-disc pl-6 text-[var(--gray-11)]">
                            <li><strong>PENDING</strong>: Workflow is created but not yet started.</li>
                            <li><strong>RUNNING</strong>: Workflow is currently executing steps.</li>
                            <li><strong>COMPLETED</strong>: All steps finished successfully.</li>
                            <li><strong>FAILED</strong>: An error occurred during execution.</li>
                        </ul>
                    </Box>
                </Flex>
            </Card>

            <Separator size="4" />

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Zap size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Editor Toolbar</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            The workflow editor toolbar provides the following actions:
                        </Text>
                        <ul className="list-disc pl-6 text-[var(--gray-11)]">
                            <li><strong>Add Step</strong>: Creates a new workflow step node on the canvas.</li>
                            <li><strong>Delete Selected</strong>: Removes selected nodes and their connections.</li>
                            <li><strong>Auto Layout</strong>: Automatically arranges nodes using the dagre layout algorithm.</li>
                        </ul>
                        <Callout.Root color="amber" mt="3">
                            <Callout.Icon>
                                <Info size={16} />
                            </Callout.Icon>
                            <Callout.Text>
                                Click on a node's settings icon to open the step configuration dialog where you can edit the step name, type, configuration, and async flag.
                            </Callout.Text>
                        </Callout.Root>
                    </Box>
                </Flex>
            </Card>
        </Flex>
    );
};

export default WorkflowEditorHelp;
