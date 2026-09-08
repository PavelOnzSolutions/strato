import {useState} from 'react';
import {Badge, Box, Callout, Card, Code, Flex, Heading, Text} from '@radix-ui/themes';
import {
  BookType, Boxes,
  ClipboardList,
  FileCode2,
  Github,
  Info,
  Key,
  Layers3,
  Lock,
  Shapes,
  ShieldAlert,
  ShieldCheck,
  Variable,
  Workflow,
} from 'lucide-react';
import {usePageTitle} from '../../context/PageTitleContext';

const HELP_SECTIONS = [
  { id: 'general', label: 'General Concepts', icon: <Info size={16} /> },
  { id: 'azure_resource', label: 'Azure Resource', icon: <Shapes size={16} /> },
  { id: 'kubernetes', label: 'Kubernetes', icon: <Shapes size={16} /> },
  { id: 'msgraph', label: 'MS Graph API', icon: <FileCode2 size={16} /> },
  { id: 'process', label: 'Process', icon: <Workflow size={16} /> },
  { id: 'azure_credential', label: 'Azure Credential', icon: <Key size={16} /> },
  { id: 'github_credential', label: 'GitHub Credential', icon: <Github size={16} /> },
  { id: 'bitbucket_credential', label: 'Bitbucket Credential', icon: <Key size={16} /> },
  { id: 'catalog', label: 'Catalog', icon: <Layers3 size={16} /> },
  { id: 'naming', label: 'Naming Rules', icon: <ClipboardList size={16} /> },
];

const ResourcesHelp = ({ hideTitle }: { hideTitle?: boolean }) => {
  const [activeSection, setActiveSection] = useState('general');

  if (!hideTitle) {
    usePageTitle('Resources – Help');
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return (
          <Flex direction="column" gap="4">
            <Card size="3">
              <Flex gap="4" align="start">
                <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                  <Layers3 size={22} />
                </Box>
                <Box>
                  <Heading size="4" mb="2">Resource Categories</Heading>
                  <Text as="p" size="3" color="gray" mb="3">
                    Categories are high‑level groupings for Resource Classes. They help you organize classes by technology or purpose
                    (for example: <Code>Compute</Code>, <Code>Networking</Code>, <Code>Storage</Code>, <Code>Security</Code>).
                  </Text>
                  <ul className="list-disc pl-6 text-(--gray-11)">
                    <li>Categories can define a properties common for given category of resources.</li>
                    <li>Used for filtering, navigation, and discoverability in the UI.</li>
                    <li>A Category can contain many Classes; a Class belongs to one Category.</li>
                  </ul>
                </Box>
              </Flex>
            </Card>

            <Card size="3">
              <Flex gap="4" align="start">
                <Box className="p-3 bg-(--accent-3) rounded-full text-(--accent-11)">
                  <Shapes size={22} />
                </Box>
                <Box>
                  <Heading size="4" mb="2">Resource Classes</Heading>
                  <Text as="p" size="3" color="gray" mb="3">
                    A Resource Class describes how a specific kind of resource is defined and provisioned. Think of it as a reusable definition
                    (for example: Azure StorageAccount, MS Graph API Call, GitHub Credential, Bitbucket Credential etc.).
                  </Text>
                  <ul className="list-disc pl-6 text-(--gray-11) mb-3">
                    <li>Contains a JSON template that Strato uses to create resources.</li>
                    <li>Defines variables and default values that parameterize the template.</li>
                    <li>Is referenced by Environments and Blueprints when building deployment plans.</li>
                  </ul>
                  <Callout.Root size="1" color="cyan" mb="2">
                    <Callout.Icon>
                      <BookType size={16} />
                    </Callout.Icon>
                    <Callout.Text>
                      <strong>Immutable Type</strong>: Once a Resource Class is created, its <strong>type cannot be changed.</strong> This ensures data consistency and predictability in resource management.
                    </Callout.Text>
                  </Callout.Root>
                  <Callout.Root size="1" color="amber">
                    <Callout.Icon>
                      <Lock size={16} />
                    </Callout.Icon>
                    <Callout.Text>
                      <strong>System Classes</strong>: Some classes are marked as "System" (indicated by an <Badge color="amber" variant="soft" size="1"><Lock size={10} /></Badge> amber lock icon). These are core definitions required by the system. They <strong>can be modified</strong> but <strong>cannot be deleted</strong>.
                    </Callout.Text>
                  </Callout.Root>
                </Box>
              </Flex>
            </Card>

            <Card size="3">
              <Flex gap="4" align="start">
                <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                  <Variable size={22} />
                </Box>
                <Box>
                  <Heading size="4" mb="2">Variables and Defaults</Heading>
                  <Text as="p" size="3" color="gray" mb="3">
                    Variables parameterize your template. Each variable can have a description, type hint, and an optional default.
                  </Text>
                  <ul className="list-disc pl-6 text-[var(--gray-11)] mb-3">
                    <li>
                      Define variables in the Resource editor using <Code>{`{{ varName:type }}`}</Code>.
                    </li>
                    <li>
                      Supported types: <Code>string</Code>, <Code>number</Code>, <Code>boolean</Code>, <Code>array</Code>, <Code>object</Code>.
                    </li>
                    <li>
                      Supported array element types: <Code>string</Code>, <Code>number</Code>, <Code>object</Code>.
                    </li>
                    <li>
                      For example:
                      <ul>
                        <li>
                          <Code>{"{{ myString:string }}"}</Code>
                        </li>
                        <li>
                          <Code>{"{{ stringArray:array:string }}"}</Code>
                        </li>
                      </ul>
                    </li>
                    <li>
                      <strong>Secure Values</strong>: Add <Code>!</Code> after the type (e.g., <Code>{`{{ pwd:string! }}`}</Code>) to enable AES-GCM encryption in the database. Valid for <Code>string</Code> and <Code>object</Code> types.
                    </li>
                  </ul>
                  <Callout.Root size="1" mb="2">
                    <Callout.Icon>
                      <Info size={16} />
                    </Callout.Icon>
                    <Callout.Text>
                      Typed variables automatically generate appropriate input fields in the Environment properties panel.
                    </Callout.Text>
                  </Callout.Root>
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
                    <li>Values marked with <Code>!</Code> (e.g., <Code>password:string!</Code>) are encrypted in the database.</li>
                    <li>Encrypted fields are displayed with a green shield icon and masked in the editor.</li>
                    <li>Decryption happens automatically during deployment execution.</li>
                  </ul>
                </Box>
              </Flex>
            </Card>

          </Flex>
        );
      case 'azure_resource':
        return (
          <Flex direction="column" gap="4">
            <Card size="3">
              <Flex gap="4" align="start">
                <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                  <FileCode2 size={22} />
                </Box>
                <Box>
                  <Heading size="4" mb="2">Azure Resource Templates</Heading>
                  <Text as="p" size="3" color="gray" mb="3">
                    The template defines the shape of the resource sent to Azure Resource Manager (ARM).
                  </Text>
                  <ul className="list-disc pl-6 text-[var(--gray-11)] mb-3">
                    <li>Use placeholders like <Code>{`{{ variableName }}`}</Code> inside the template body.</li>
                    <li>Strato uses either direct SDK calls or ARM template deployments based on the resource type.</li>
                  </ul>
                  <Callout.Root>
                    <Callout.Icon>
                      <Info size={16} />
                    </Callout.Icon>
                    <Callout.Text>
                      Tip: Prefer variables for anything that changes across environments (names, SKUs, locations).
                    </Callout.Text>
                  </Callout.Root>
                </Box>
              </Flex>
            </Card>
          </Flex>
        );
      case 'kubernetes':
        return (
          <Flex direction="column" gap="4">
            <Card size="3">
              <Flex gap="4" align="start">
                <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                  <FileCode2 size={22} />
                </Box>
                <Box>
                  <Heading size="4" mb="2">Kubernetes Resource Type</Heading>
                  <Text as="p" size="3" color="gray" mb="3">
                    Kubernetes resources allow you to manage objects within a Kubernetes cluster using standard manifests.
                  </Text>
                  <ul className="list-disc pl-6 text-[var(--gray-11)] mb-3">
                    <li><strong>Template</strong>: Define your resource using YAML or JSON (e.g., Pod, Service, Deployment, ConfigMap).</li>
                    <li><strong>Variables</strong>: Use <Code>{`{{ variableName }}`}</Code> to parameterize your manifests.</li>
                    <li><strong>Icons</strong>: A wide range of Kubernetes-specific icons (Pods, Nodes, Services, etc.) is available to represent your resources.</li>
                  </ul>
                  <Callout.Root size="1">
                    <Callout.Icon>
                      <Info size={16} />
                    </Callout.Icon>
                    <Callout.Text>
                      Strato applies these manifests to the target cluster during deployment. Ensure your template contains valid Kubernetes API syntax.
                    </Callout.Text>
                  </Callout.Root>
                </Box>
              </Flex>
            </Card>
          </Flex>
        );
      case 'msgraph':
        return (
          <Flex direction="column" gap="4">
            <Card size="3">
              <Flex gap="4" align="start">
                <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                  <FileCode2 size={22} />
                </Box>
                <Box>
                  <Heading size="4" mb="2">MS Graph Resource Type</Heading>
                  <Text as="p" size="3" color="gray" mb="3">
                    MS Graph resources allow you to manage entities in Microsoft Entra ID via the Graph API.
                  </Text>
                  <ul className="list-disc pl-6 text-[var(--gray-11)] mb-3">
                    <li><strong>Method</strong>: HTTP verb (GET, POST, PUT, PATCH, DELETE).</li>
                    <li><strong>Endpoint</strong>: The relative URL (e.g., <Code>/applications</Code>).</li>
                    <li><strong>Payload</strong>: The JSON body sent with the request.</li>
                  </ul>
                  <Callout.Root size="1">
                    <Callout.Icon>
                      <Info size={16} />
                    </Callout.Icon>
                    <Callout.Text>
                      Strato handles authentication automatically using its configured service principal.
                    </Callout.Text>
                  </Callout.Root>
                </Box>
              </Flex>
            </Card>
          </Flex>
        );
      case 'process':
        return (
          <Flex direction="column" gap="4">
            <Card size="3">
              <Flex gap="4" align="start">
                <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                  <Workflow size={22} />
                </Box>
                <Box>
                  <Heading size="4" mb="2">Process Resource Type</Heading>
                  <Text as="p" size="3" color="gray" mb="3">
                    Process resources bridge Environment Nodes with the Workflow Engine, enabling automated sequential task execution during deployments.
                  </Text>
                  <ul className="list-disc pl-6 text-[var(--gray-11)] mb-3">
                    <li><strong>Workflow Definition</strong>: Select the linked workflow that will be executed.</li>
                    <li><strong>Input Mappings</strong>: Map workflow input variables to expressions (e.g., <Code>{"{{node.values.owner}}"}</Code>).</li>
                    <li><strong>Output Mappings</strong>: Capture workflow variables as resource outputs.</li>
                  </ul>
                  <Callout.Root size="1" mb="2">
                    <Callout.Icon>
                      <Info size={16} />
                    </Callout.Icon>
                    <Callout.Text>
                      During deployment, the engine triggers the workflow using the mapped inputs and captures outputs for use by dependent resources.
                    </Callout.Text>
                  </Callout.Root>
                  <Heading size="3" mb="2" mt="4">Configuration Flow</Heading>
                  <ol className="list-decimal pl-6 text-[var(--gray-11)]">
                    <li>Create a Workflow Definition in the Workflow Editor.</li>
                    <li>Create a Resource Class with type <Code>PROCESS</Code>.</li>
                    <li>Set <Code>workflowDefinitionId</Code> to link the workflow.</li>
                    <li>Define input mappings to populate workflow variables from node data.</li>
                    <li>Define output mappings to capture workflow results.</li>
                  </ol>
                </Box>
              </Flex>
            </Card>
          </Flex>
        );
      case 'azure_credential':
        return (
          <Flex direction="column" gap="4">
            <Card size="3">
              <Flex gap="4" align="start">
                <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                  <ClipboardList size={22} />
                </Box>
                <Box>
                  <Heading size="4" mb="2">Azure Credential Resource</Heading>
                  <Text as="p" size="3" color="gray" mb="3">
                    Azure Credentials store information needed to authenticate against Azure services. They can represent a User or a Service Principal.
                  </Text>
                  <ul className="list-disc pl-6 text-[var(--gray-11)] mb-3">
                    <li><strong>User</strong>: Requires a User name, Password, and Tenant ID.</li>
                    <li><strong>Service Principal</strong>: Requires an Application ID, Secret, and Tenant ID.</li>
                    <li><strong>Security</strong>: Sensitive fields like passwords and secrets are always encrypted in the database.</li>
                  </ul>
                  <Callout.Root size="1">
                    <Callout.Icon>
                      <Info size={16} />
                    </Callout.Icon>
                    <Callout.Text>
                      Use the "Test Credential" button in the Resource editor to verify that the credentials are correct.
                    </Callout.Text>
                  </Callout.Root>
                </Box>
              </Flex>
            </Card>
          </Flex>
        );
      case 'github_credential':
        return (
          <Flex direction="column" gap="4">
            <Card size="3">
              <Flex gap="4" align="start">
                <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                  <Github size={22} />
                </Box>
                <Box>
                  <Heading size="4" mb="2">GitHub Credential Resource</Heading>
                  <Text as="p" size="3" color="gray" mb="3">
                    GitHub Credentials store information needed to authenticate against GitHub services. They are stored as AES-encrypted data in Database.
                  </Text>
                </Box>
              </Flex>
            </Card>
          </Flex>
        );
      case 'bitbucket_credential':
        return (
          <Flex direction="column" gap="4">
            <Card size="3">
              <Flex gap="4" align="start">
                <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                  <Key size={22} />
                </Box>
                <Box>
                  <Heading size="4" mb="2">Bitbucket Credential Resource</Heading>
                  <Text as="p" size="3" color="gray" mb="3">
                    Bitbucket Credentials store information needed to authenticate against Bitbucket services.
                  </Text>
                  <ul className="list-disc pl-6 text-[var(--gray-11)] mb-3">
                    <li><strong>App Password</strong>: Requires a User Name and an App Password.</li>
                    <li><strong>Access Token</strong>: Requires a Personal Access Token.</li>
                    <li><strong>Security</strong>: Sensitive fields like passwords and tokens are always encrypted in the database.</li>
                  </ul>
                  <Callout.Root size="1" mb="2">
                    <Callout.Icon>
                      <Info size={16} />
                    </Callout.Icon>
                    <Callout.Text>
                      Use the "Test Credential" button in the Resource editor to verify that the credentials are correct.
                    </Callout.Text>
                  </Callout.Root>
                  <Callout.Root size="1" color="amber">
                    <Callout.Icon>
                      <ShieldAlert size={16} />
                    </Callout.Icon>
                    <Callout.Text>
                      The <strong>Test Credential</strong> button in the Resource editor verifies that the given credentials have at least <Code>repository:read</Code> permission.
                    </Callout.Text>
                  </Callout.Root>
                </Box>
              </Flex>
            </Card>
          </Flex>
        );
      case 'catalog':
        return (
          <Flex direction="column" gap="4">
            <Card size="3">
              <Flex gap="4" align="start">
                <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                  <Layers3 size={22} />
                </Box>
                <Box>
                  <Heading size="4" mb="2">Catalog Resource Type</Heading>
                  <Text as="p" size="3" color="gray" mb="3">
                    Catalogs allow you to define collections of items that can be referenced in other templates.
                  </Text>
                  <ul className="list-disc pl-6 text-[var(--gray-11)] mb-3">
                    <li><strong>Item Type</strong>: Defines the data type of catalog entries (String, Number, Object, etc.).</li>
                    <li><strong>Resource Class</strong>: When Item Type is <Code>RESOURCE_CLASS</Code>, you can map each entry to a specific Resource Class definition.</li>
                    <li><strong>Icon</strong>: Automatically set to <Code>Catalog.svg</Code>.</li>
                    <li><strong>Abbreviation</strong>: Automatically set to <Code>cat-RES_NAME</Code> and is read‑only.</li>
                  </ul>
                  <Text as="p" size="3" color="gray" mb="3">
                    Catalog entries are managed in a table-like interface. You can add entries with a unique name and a value corresponding to the selected Item Type.
                  </Text>
                  <Callout.Root size="1">
                    <Callout.Icon>
                      <Info size={16} />
                    </Callout.Icon>
                    <Callout.Text>
                      Use the inline editors for simple types or modal editors for complex types like Objects and Arrays.
                    </Callout.Text>
                  </Callout.Root>
                </Box>
              </Flex>
            </Card>
          </Flex>
        );
      case 'naming':
        return (
          <Flex direction="column" gap="4">
            <Card size="3">
              <Flex gap="4" align="start">
                <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                  <ClipboardList size={22} />
                </Box>
                <Box>
                  <Heading size="4" mb="2">Naming Rules</Heading>
                  <Text as="p" size="3" color="gray" mb="3">
                    Many Azure resources have naming constraints.
                  </Text>
                  <ul className="list-disc pl-6 text-[var(--gray-11)]">
                    <li>Keep names lowercase and alphanumeric unless allowed otherwise.</li>
                    <li>Respect length limits (e.g., Storage Accounts ≤ 24 chars).</li>
                  </ul>
                </Box>
              </Flex>
            </Card>
          </Flex>
        );
      default:
        return null;
    }
  };

  return (
    <Flex direction="column" gap="4" className={hideTitle ? "" : "max-w-6xl mx-auto pb-10"}>
      {!hideTitle && (
        <Box className="py-10">
          <Flex direction="row" gap="2">
            <Boxes size={32} color="var(--accent-11)"/>
            <Heading size="8" className="mb-4 bg-clip-text text-transparent bg-gradient-to-l from-[var(--gray-12)] to-[var(--accent-10)] inline-block">
              Resource Classes
            </Heading>
          </Flex>
          <Text size="4" color="gray" className="max-w-2xl block">
            Learn the core concepts behind Resource Classes in Strato.
          </Text>
        </Box>
      )}

      <Flex gap="6">
        {/* Sidebar */}
        <Box style={{ width: '250px', flexShrink: 0 }}>
          <Card size="2">
            <Flex direction="column" gap="1">
              {HELP_SECTIONS.map((section) => (
                <Box
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-2)',
                    cursor: 'pointer',
                    backgroundColor: activeSection === section.id ? 'var(--accent-3)' : 'transparent',
                    color: activeSection === section.id ? 'var(--accent-11)' : 'var(--gray-11)',
                    transition: 'all 0.2s',
                  }}
                  className="hover:bg-[var(--gray-3)]"
                >
                  <Flex align="center" gap="2">
                    {section.icon}
                    <Text size="2" weight={activeSection === section.id ? "bold" : "regular"}>
                      {section.label}
                    </Text>
                  </Flex>
                </Box>
              ))}
            </Flex>
          </Card>
        </Box>

        {/* Main Content */}
        <Box style={{ flex: 1 }}>
          {renderContent()}
        </Box>
      </Flex>
    </Flex>
  );
};

export default ResourcesHelp;
