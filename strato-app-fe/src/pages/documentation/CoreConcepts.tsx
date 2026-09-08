import {Badge, Box, Card, Flex, Grid, Heading, Separator, Text} from '@radix-ui/themes';
import {
  ArrowRight,
  Box as BoxIcon,
  Braces,
  Cpu,
  Database,
  Globe, HandHelping,
  Import,
  Key,
  Layers,
  ShieldCheck,
  Workflow,
  Zap,
} from 'lucide-react';
import {usePageTitle} from '../../context/PageTitleContext';

const CoreConcepts = () => {
    usePageTitle('Core Concepts');

    return (
        <Flex direction="column" gap="6" className="max-w-4xl mx-auto pb-10">
            <Box className="py-10">
                <Flex direction="row" gap="2" >
                  <HandHelping size={32} color="var(--accent-10)"/>
                  <Heading size="8" className="mb-4 bg-clip-text text-transparent bg-linear-to-l from-(--gray-12) to-(--accent-10) inline-block" >
                      Core Concepts
                  </Heading>
                </Flex>
                <Text size="4" color="gray" className="max-w-2xl block">
                    Understand the core architecture, object hierarchy, and deployment flow of Strato.
                </Text>
            </Box>

            {/* Object Hierarchy */}
            <section>
                <Heading size="6" mb="4" className="flex items-center gap-2">
                    <Layers className="text-[var(--accent-9)]" /> Object Hierarchy
                </Heading>
                <Grid columns={{ initial: '1', md: '3' }} gap="4">
                    <Card size="3" className="hover-lift">
                        <Heading size="4" mb="2">Environment</Heading>
                        <Text as="p" size="2" color="gray" mb="3">
                            The top-level container for your infrastructure definition. Changes to the Environments are versioned.
                        </Text>
                        <Flex direction="column" gap="2">
                            <Badge variant="surface" color="blue">Metadata (Name, ID)</Badge>
                            <Badge variant="surface" color="blue">Nodes (Resource instances)</Badge>
                            <Badge variant="surface" color="blue">References (Dependencies)</Badge>
                            <Badge variant="surface" color="blue">Configuration (Subscription, Region)</Badge>
                        </Flex>
                    </Card>

                    <Card size="3" className="hover-lift">
                        <Heading size="4" mb="2">Nodes</Heading>
                        <Text as="p" size="2" color="gray" mb="3">
                            Individual components within an Environment. It could be Azure Resource, GraphAPI, or similar.
                        </Text>
                        <Flex direction="column" gap="2">
                            <Badge variant="surface" color="purple">Metadata (Key, Label)</Badge>
                            <Badge variant="surface" color="purple">Resource Class Reference</Badge>
                            <Badge variant="surface" color="purple">Property Overrides (Values)</Badge>
                        </Flex>
                    </Card>

                    <Card size="3" className="hover-lift">
                        <Heading size="4" mb="2">Resource</Heading>
                        <Text as="p" size="2" color="gray" mb="3">
                            Reusable building block. Resource can be e.g. Azure Resource, Credential, Token, GraphAPI call etc.
                        </Text>
                        <Flex direction="column" gap="2">
                            <Badge variant="surface" color="green">Metadata (Name, ID, Type)</Badge>
                            <Badge variant="surface" color="green">Template (ARM/Manifest)</Badge>
                            <Badge variant="surface" color="green">Naming Rule (Format, Length)</Badge>
                            <Badge variant="surface" color="green">Default Values</Badge>
                            <Badge variant="surface" color="green">Output Definitions</Badge>
                        </Flex>
                    </Card>
                </Grid>
            </section>

            <Separator size="4" />

            {/* Deployment Flow */}
            <section>
                <Heading size="6" mb="4" className="flex items-center gap-2">
                    <Workflow className="text-[var(--accent-9)]" /> Deployment Flow
                </Heading>
                <Card size="3" className="hover-lift">
                    <Flex direction={{ initial: 'column', md: 'row' }} align="center" gap="4" justify="between">
                        <Box className="text-center flex-1">
                            <Box className="bg-[var(--accent-3)] p-3 rounded-xl inline-block mb-2">
                                <Layers size={24} className="text-[var(--accent-11)]" />
                            </Box>
                            <Heading size="3">Environment</Heading>
                            <Text size="1" color="gray">Desired State</Text>
                        </Box>

                        <ArrowRight className="hidden md:block text-[var(--gray-8)]" />

                        <Box className="text-center flex-1">
                            <Box className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-xl inline-block mb-2">
                                <Zap size={24} className="text-orange-600" />
                            </Box>
                            <Heading size="3">Deployment Plan</Heading>
                            <Text size="1" color="gray">Dependency Graph</Text>
                        </Box>

                        <ArrowRight className="hidden md:block text-[var(--gray-8)]" />

                        <Box className="text-center flex-1">
                            <Box className="bg-green-100 dark:bg-green-900/30 p-3 rounded-xl inline-block mb-2">
                                <Cpu size={24} className="text-green-600" />
                            </Box>
                            <Heading size="3">Azure Execution</Heading>
                            <Text size="1" color="gray">Resource Deployment</Text>
                        </Box>
                    </Flex>
                    <Box mt="6">
                        <Text as="p" size="3" color="gray">
                            1. An <strong>Environment</strong> is exchanged for a <strong>Deployment Plan</strong>. The plan determines the execution order based on references.<br />
                            2. The plan, together with the <strong>Environment</strong> configuration, is sent for execution.<br />
                            3. Strato uses the assigned <strong>Azure Credential</strong> to authenticate and deploy resources to your subscription.
                        </Text>
                    </Box>
                </Card>
            </section>

            <Separator size="4" />

            {/* Resource Types */}
            <section>
                <Heading size="6" mb="2" className="flex items-center gap-2">
                    <BoxIcon className="text-[var(--accent-9)]" /> Resource Types
                </Heading>
                <Card size="3" mb="4" className="hover-lift">
                    <Text as="p" size="3" mb="4">
                        Most of items user works with in Strato are defined as Resource Classes. They include Azure resources, Kubernetes resources, Credentials, Catalogs and more.
                    </Text>
                </Card>
                <Grid columns={{ initial: '1', md: '2' }} gap="4">
                    <Card size="2" className="hover-lift">
                        <Flex gap="3">
                            <Box className="bg-sky-100 dark:bg-sky-900/30 p-2 rounded-lg h-fit">
                                <BoxIcon size={20} className="text-sky-600" />
                            </Box>
                            <Box>
                                <Heading size="3" mb="1">Azure Resource</Heading>
                                <Text size="2" color="gray">
                                    Consists of a lightweight ARM template (without name and location). It can contain variables and logic for dynamic resource creation.
                                </Text>
                            </Box>
                        </Flex>
                    </Card>

                    <Card size="2" className="hover-lift">
                        <Flex gap="3">
                            <Box className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg h-fit">
                                <Key size={20} className="text-purple-600" />
                            </Box>
                            <Box>
                                <Heading size="3" mb="1">Azure Credential</Heading>
                                <Text size="2" color="gray">
                                    Secure store using AES encryption. Tokens are always obtained fresh at the beginning of each Azure deployment.
                                </Text>
                            </Box>
                        </Flex>
                    </Card>

                    <Card size="2" className="hover-lift">
                        <Flex gap="3">
                            <Box className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg h-fit">
                                <Globe size={20} className="text-red-600" />
                            </Box>
                            <Box>
                                <Heading size="3" mb="1">Azure Region</Heading>
                                <Text size="2" color="gray">
                                    Definition of Azure Region. Contains region full name, short name and abbreviation.
                                </Text>
                            </Box>
                        </Flex>
                    </Card>

                    <Card size="2" className="hover-lift">
                        <Flex gap="3">
                            <Box className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-lg h-fit">
                                <Braces size={20} className="text-yellow-600" />
                            </Box>
                            <Box>
                                <Heading size="3" mb="1">Microsoft Graph API</Heading>
                                <Text size="2" color="gray">
                                    Performs Graph API calls with given payload, e.g. to work with Azure Entra ID, retrieve Azure resources or perform operations on them.
                                </Text>
                            </Box>
                        </Flex>
                    </Card>


                    <Card size="2" className="hover-lift">
                        <Flex gap="3">
                            <Box className="bg-lime-100 dark:bg-lime-900/30 p-2 rounded-lg h-fit">
                                <Database size={20} className="text-lime-600" />
                            </Box>
                            <Box>
                                <Heading size="3" mb="1">Catalog</Heading>
                                <Text size="2" color="gray">
                                    A structured object store for static data, shared configurations, or lookups used across different environments.
                                </Text>
                            </Box>
                        </Flex>
                    </Card>

                    <Card size="2" className="hover-lift">
                        <Flex gap="3">
                            <Box className="bg-cyan-100 dark:bg-cyan-900/30 p-2 rounded-lg h-fit">
                                <Cpu size={20} className="text-cyan-600" />
                            </Box>
                            <Box>
                                <Heading size="3" mb="1">Kubernetes</Heading>
                                <Text size="2" color="gray">
                                    Support for deploying Kubernetes manifests and resources, integrating container orchestration into the Strato workflow.
                                </Text>
                            </Box>
                        </Flex>
                    </Card>

                    <Card size="2" className="hover-lift">
                        <Flex gap="3">
                            <Box className="bg-pink-100 dark:bg-pink-900/30 p-2 rounded-lg h-fit">
                                <Workflow size={20} className="text-pink-600" />
                            </Box>
                            <Box>
                                <Heading size="3" mb="1">Process (Workflow)</Heading>
                                <Text size="2" color="gray">
                                    Define sequential operations and complex workflows as first-class resources, enabling orchestration beyond simple deployments.
                                </Text>
                            </Box>
                        </Flex>
                    </Card>
                </Grid>
            </section>

            <Separator size="4" />

            {/* Importing Environments */}
            <section>
                <Heading size="6" mb="4" className="flex items-center gap-2">
                    <Import className="text-[var(--accent-9)]" /> Importing Environments
                </Heading>
                <Card size="3" className="hover-lift">
                    <Text as="p" size="3" mb="4">
                        Strato allows you to bootstrap your environments by importing existing infrastructure from Azure.
                    </Text>
                    <Grid columns={{ initial: '1', sm: '2' }} gap="4">
                        <Box className="p-4 border border-[var(--gray-5)] rounded-lg bg-[var(--gray-2)]">
                            <Heading size="3" mb="2">Current Support</Heading>
                            <Flex direction="column" gap="1">
                                <Text size="2" className="flex items-center gap-2">✅ Azure Resource Manager (ARM)</Text>
                                <Text size="2" className="flex items-center gap-2">✅ Manual Resource Discovery</Text>
                            </Flex>
                        </Box>
                        <Box className="p-4 border border-[var(--gray-5)] rounded-lg bg-[var(--gray-2)]">
                            <Heading size="3" mb="2">Planned / Roadmap</Heading>
                            <Flex direction="column" gap="1">
                                <Text size="2" color="gray" className="flex items-center gap-2">🕒 Bicep Imports</Text>
                                <Text size="2" color="gray" className="flex items-center gap-2">🕒 AWS CloudFormation</Text>
                            </Flex>
                        </Box>
                    </Grid>
                </Card>
            </section>

            <section>
                <Heading size="6" mb="4" className="flex items-center gap-2">
                    <Braces className="text-[var(--accent-9)]" /> Enhanced Template Editor
                </Heading>
                <Card size="3" className="hover-lift">
                    <Flex direction="column" gap="4">
                        <Box>
                            <Text as="p" size="3" mb="3">
                                The integrated Monaco-powered template editor provides a robust environment for authoring Azure Resource Manager (ARM) templates, Kubernetes manifests, and object definitions. It includes advanced features such as syntax highlighting, IntelliSense-style auto-completion, and real-time validation.
                            </Text>
                        </Box>

                        <Box className="p-4 border border-[var(--gray-5)] rounded-lg bg-[var(--gray-2)]">
                            <Heading size="3" mb="3">Variable Syntax & Phases</Heading>
                            <Grid columns={{ initial: '1', md: '3' }} gap="4">
                                <Box>
                                    <Text as="div" weight="bold" size="2" mb="1" className="flex items-center gap-2">
                                        <code className="text-amber-600">{'{ some-constant }'}</code> System Constant
                                    </Text>
                                    <Text size="2" color="gray">
                                        Pre-defined system constants are also enclosed in single curly braces, providing access to environment-wide fixed parameters.
                                    </Text>
                                </Box>
                                <Box>
                                    <Text as="div" weight="bold" size="2" mb="1" className="flex items-center gap-2">
                                        <code className="text-[var(--accent-9)]">{'{{ value }}'}</code> Static Value
                                    </Text>
                                    <Text size="2" color="gray">
                                        Double curly braces represent values populated during the <strong>planning phase</strong>. These are determined before deployment begins.
                                    </Text>
                                </Box>
                                <Box>
                                    <Text as="div" weight="bold" size="2" mb="1" className="flex items-center gap-2">
                                        <code className="text-red-400">[[ variable ]]</code> Dynamic Variable
                                    </Text>
                                    <Text size="2" color="gray">
                                        Double brackets indicate values populated or obtained during the <strong>deployment/execution phase</strong>. These often depend on outputs from other resources.
                                    </Text>
                                </Box>
                            </Grid>
                        </Box>

                        <Text size="2">
                            With the editor, you can seamlessly define resources, parameters, and outputs, ensuring your infrastructure-as-code is accurate before it ever reaches your cloud provider.
                        </Text>
                    </Flex>
                </Card>
            </section>

            <Separator size="4" />

            {/* Compliance and Security */}
            <section>
                <Heading size="6" mb="4" className="flex items-center gap-2">
                    <ShieldCheck className="text-[var(--accent-9)]" /> Compliance & Security
                </Heading>
                <Card size="3" className="hover-lift">
                    <Flex direction="column" gap="4">
                        <Text as="p" size="3">
                            Strato is built with enterprise-grade security and compliance in mind. We adhere to industry-standard practices to ensure your data and infrastructure management remains secure.
                        </Text>
                        <Grid columns={{ initial: '1', sm: '2' }} gap="4">
                            <Box className="p-4 border border-green-200 dark:border-green-900 rounded-lg bg-green-50 dark:bg-green-950/20">
                                <Flex align="center" gap="2" mb="2">
                                    <ShieldCheck className="text-green-600" size={20} />
                                    <Heading size="3">SOC2 Compliant</Heading>
                                </Flex>
                                <Text size="2" color="gray">
                                    Strato meets SOC2 requirements for security, availability, and confidentiality, ensuring rigorous data protection standards.
                                </Text>
                            </Box>
                            <Box className="p-4 border border-blue-200 dark:border-blue-900 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                                <Flex align="center" gap="2" mb="2">
                                    <ShieldCheck className="text-blue-600" size={20} />
                                    <Heading size="3">ISO 27001</Heading>
                                </Flex>
                                <Text size="2" color="gray">
                                    Strato processes and systems are aligned with ISO 27001 standards for information security management systems and have a full, immutable audit trail
                                </Text>
                            </Box>
                        </Grid>
                    </Flex>
                </Card>
            </section>
        </Flex>
    );
};

export default CoreConcepts;
