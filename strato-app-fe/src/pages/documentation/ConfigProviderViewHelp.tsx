import {Box, Callout, Card, Code, Flex, Heading, Text} from '@radix-ui/themes';
import {Eye, FileJson, GitCompare, Info, KeyRound, ListTree, Lock, Plus, Save, Settings, Trash2} from 'lucide-react';
import {usePageTitle} from '../../context/PageTitleContext';

interface ConfigProviderViewHelpProps {
    hideTitle?: boolean;
}

export const ConfigProviderViewHelp = ({ hideTitle }: ConfigProviderViewHelpProps) => {
    if (!hideTitle) {
        usePageTitle('Config Provider View – Help');
    }

    return (
        <Flex direction="column" gap="6" className={hideTitle ? "" : "max-w-4xl mx-auto pb-10"}>
            {!hideTitle && (
                <Box className="py-10">
                    <Heading size="8" className="mb-4 bg-clip-text text-transparent bg-linear-to-r from-(--accent-9) to-(--accent-11) inline-block">
                        Config Provider View
                    </Heading>
                    <Text size="4" color="gray" className="max-w-2xl block">
                        Populate the sections of a configuration with named items, edit their fields, and preview the exact JSON your pipelines will consume.
                    </Text>
                </Box>
            )}

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-(--accent-3) rounded-full text-(--accent-11)">
                        <Settings size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">The Editor at a Glance</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            The Provider View is where you fill in the contents of a configuration. It is bound to a single schema, inherits that schema's flavor, and surfaces only the sections the schema selected from the Section Catalog.
                        </Text>
                        <ul className="list-disc pl-6 text-(--gray-11)">
                            <li><strong>Header bar</strong> with the configuration name, version selector, environment badge, Birds Eye, Compare, Save, the lock toggle, and a view-mode switch (<Code>Form</Code> / <Code>JSON preview</Code>).</li>
                            <li><strong>Sidebar</strong> on the left listing every section the schema exposes, with its items underneath.</li>
                            <li><strong>Main panel</strong> on the right rendering the form for the currently selected item.</li>
                        </ul>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <ListTree size={22} />
                    </Box>
                    <Box className="flex-1">
                        <Heading size="4" mb="2">Section & Item Sidebar</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            The sidebar reflects the schema's section list in order. Each section header shows its display name, item count, and a "+ Add item" button. Expanding a section reveals its items by name (for example <Code>bw-contracts</Code>, <Code>bw-orders</Code>).
                        </Text>
                        <ul className="list-disc pl-6 text-[var(--gray-11)]">
                            <li>Click an item to load its form in the main panel.</li>
                            <li>The right-click context menu on an item exposes <strong>Delete</strong>.</li>
                            <li>Sections whose catalog entry declares a <Code>requiredReadPermission</Code> you lack are hidden from you entirely.</li>
                            <li>If the catalog entry declares a <Code>requiredWritePermission</Code> you lack, you can still browse the section but the "+ Add item" button is disabled.</li>
                        </ul>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Plus size={22} />
                    </Box>
                    <Box className="flex-1">
                        <Heading size="4" mb="2">Adding an Item</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            Click <strong>"+ Add item"</strong> inside a section header to open the new-item dialog. You provide one piece of information: the item name.
                        </Text>
                        <ul className="list-disc pl-6 text-[var(--gray-11)] mb-3">
                            <li>Non-empty.</li>
                            <li>Unique within the section.</li>
                            <li>Matches <Code>[a-z0-9][a-z0-9-_]*</Code> — URL-safe and JSONPath-safe.</li>
                        </ul>
                        <Text as="p" size="3" color="gray">
                            On confirm, the item is created with the section's effective defaults applied (catalog defaults plus any overrides from the schema overlay), and is automatically selected so you can start filling fields.
                        </Text>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Settings size={22} />
                    </Box>
                    <Box className="flex-1">
                        <Heading size="4" mb="2">The Per-Item Form</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            The form is generated automatically from the section's <em>effective</em> field list: the catalog's default item shape, minus paths the schema hides, plus the schema's custom fields, with default values applied as starting values.
                        </Text>
                        <ul className="list-disc pl-6 text-[var(--gray-11)]">
                            <li>Scalar fields (string, number, boolean) render as plain inputs and toggles.</li>
                            <li>Object fields render as a nested group of controls.</li>
                            <li>Arrays of strings render as a chip-style list with add and remove.</li>
                            <li>Arrays of objects render as a repeatable group — each entry can be added, removed, and reordered.</li>
                            <li>Secret fields render as masked password inputs with an eye-toggle to reveal.</li>
                        </ul>
                        <Callout.Root color="indigo" mt="3">
                            <Callout.Icon>
                                <KeyRound size={16} />
                            </Callout.Icon>
                            <Callout.Text size="2">
                                Secret values are encrypted at rest. The eye toggle decrypts them on demand so you can verify what's stored; the provider endpoint decrypts them in its response.
                            </Callout.Text>
                        </Callout.Root>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Trash2 size={22} />
                    </Box>
                    <Box className="flex-1">
                        <Heading size="4" mb="2">Deleting an Item</Heading>
                        <Text as="p" size="3" color="gray">
                            Right-click an item in the sidebar to open its context menu and pick <strong>Delete</strong>. A confirmation dialog protects against accidents. Deletion removes the item from <Code>data[sectionKey]</Code> and is recorded in the audit log as an <Code>ITEM_DELETE</Code> event when you save.
                        </Text>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <FileJson size={22} />
                    </Box>
                    <Box className="flex-1">
                        <Heading size="4" mb="2">JSON Preview Tab</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            Switch the header view-mode to <strong>JSON preview</strong> to see the exact materialized JSON the provider endpoint will return for the current draft — the same shape pipelines consume:
                        </Text>
                        <Box className="bg-[var(--gray-3)] p-4 rounded-md mb-3">
                            <pre className="text-xs font-mono text-[var(--gray-12)] overflow-auto">
{`{
  "functions": {
    "bw-contracts": { "appHealthCheck": { "deployToMonitor": false }, "...": "..." }
  },
  "eventGridTopics": { "order-placed": { "topicName": "..." } },
  "_environment": { "name": "prod-eus", "region": "...", "...": "..." }
}`}
                            </pre>
                        </Box>
                        <Text as="p" size="3" color="gray">
                            Environment metadata (<Code>_environment</Code>), <Code>{"{{ name }}"}</Code> and <Code>{"{{ environment }}"}</Code> substitution, and per-section read permissions are all applied in this preview.
                        </Text>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Lock size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Lock Behavior</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            The lock toggle in the header freezes a configuration. While locked:
                        </Text>
                        <ul className="list-disc pl-6 text-(--gray-11)">
                            <li>All fields in the per-item form are read-only.</li>
                            <li>"+ Add item" and delete actions are disabled.</li>
                            <li>Save is disabled.</li>
                        </ul>
                        <Callout.Root color="amber" mt="3">
                            <Callout.Icon>
                                <Info size={16} />
                            </Callout.Icon>
                            <Callout.Text size="2">
                                Toggling the lock requires the <Code>PERM_SET_CONFIG_LOCK</Code> permission. Lock state is shown as a badge in the header so you always know whether you're editing a draft.
                            </Callout.Text>
                        </Callout.Root>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <GitCompare size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Birds Eye & Compare</Heading>
                        <Text as="p" size="3" color="gray">
                            The Birds Eye view and Compare dialog still live in the header. They now render the section/item tree of the materialized output JSON, so adding an item under <Code>functions</Code> shows up as a new branch, and overrides surface as value diffs in Compare.
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
                        <Heading size="4" mb="2">Saving</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            <strong>Save</strong> is global and applies every edit since you opened or last saved the configuration. A new version is created; previous versions remain available via the version selector and the audit log.
                        </Text>
                        <Callout.Root color="indigo">
                            <Callout.Icon>
                                <Eye size={16} />
                            </Callout.Icon>
                            <Callout.Text>
                                Adding or deleting an item records an <Code>ITEM_ADD</Code> or <Code>ITEM_DELETE</Code> audit entry with the section key and item name, alongside the regular configuration version entry.
                            </Callout.Text>
                        </Callout.Root>
                    </Box>
                </Flex>
            </Card>
        </Flex>
    );
};

const ConfigProviderViewHelpPage = () => {
    usePageTitle('Config Provider View – Documentation');

    return (
        <Box className="max-w-4xl mx-auto py-10">
            <ConfigProviderViewHelp />
        </Box>
    );
};

export default ConfigProviderViewHelpPage;
