import {Box, Callout, Card, Code, Flex, Heading, Text} from '@radix-ui/themes';
import {AlertTriangle, Eye, EyeOff, FileJson, Layers, ListChecks, Lock, ShieldCheck, Waypoints} from 'lucide-react';
import {usePageTitle} from '../../context/PageTitleContext';

interface ConfigurationSchemasHelpProps {
    hideTitle?: boolean;
}

const ConfigurationSchemasHelp = ({ hideTitle }: ConfigurationSchemasHelpProps) => {
    if (!hideTitle) {
        usePageTitle('Configuration Schemas – Help');
    }

    return (
        <Flex direction="column" gap="6" className={hideTitle ? "" : "max-w-4xl mx-auto pb-10"}>
            {!hideTitle && (
                <Box className="py-10">
                    <Heading size="8" className="mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent-9)] to-[var(--accent-10)] inline-block">
                        Configuration Schemas
                    </Heading>
                    <Text size="4" color="gray" className="max-w-2xl block">
                        Pick the sections your application needs from the Section Catalog and tune them per schema.
                    </Text>
                </Box>
            )}

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Waypoints size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">A Schema is a Curated List of Sections</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            A Configuration Schema is no longer a free-form JSON Schema document. It is a curated list of <strong>sections</strong> (for example "Azure Functions", "Event Grid Topics", "API Management", "Cosmos DB", "Storage Accounts") chosen for a given cloud <strong>flavor</strong>.
                        </Text>
                        <ul className="list-disc pl-6 text-[var(--gray-11)]">
                            <li>Every schema belongs to one flavor (currently <Code>AZURE</Code>; <Code>AWS</Code> is reserved for future content).</li>
                            <li>Sections come from the <strong>Section Catalog</strong> — see the dedicated help page for how catalog entries are seeded and extended.</li>
                            <li>Configurations bound to the schema inherit its flavor and use only the sections listed here.</li>
                        </ul>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Layers size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">The Editor Layout</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            The schema editor has three regions:
                        </Text>
                        <ul className="list-disc pl-6 text-[var(--gray-11)]">
                            <li><strong>Header bar</strong> — name, description, flavor selector, save button, and a <Code>Form</Code> / <Code>JSON preview</Code> view-mode toggle.</li>
                            <li><strong>Catalog panel</strong> on the left — all section catalog entries available for the chosen flavor. System entries carry a <strong>System</strong> badge; extension entries are admin-defined. Each entry has an "+ Add to schema" action.</li>
                            <li><strong>Schema canvas</strong> in the middle — the ordered list of sections you have added. Each section is a collapsible card with reorder arrows, a remove button, and the per-section overlay editor.</li>
                        </ul>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <ListChecks size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Per-Section Overlays</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            Each section added to a schema can be tailored without touching the catalog itself. The overlay editor has three foldable groups:
                        </Text>
                        <Box mb="3">
                            <Text as="div" size="3" weight="bold" mb="1"><EyeOff size={14} className="inline mr-1" /> Field visibility</Text>
                            <Text as="p" size="2" color="gray">
                                Walk the catalog's default item shape (recursive for objects and arrays of objects) and uncheck any leaves you don't need. Hidden paths are stored as <Code>disabledFieldPaths</Code> and are never offered in the configuration editor or returned by the provider endpoint.
                            </Text>
                        </Box>
                        <Box mb="3">
                            <Text as="div" size="3" weight="bold" mb="1">Field defaults</Text>
                            <Text as="p" size="2" color="gray">
                                Override the default value of any built-in field. New items added in any configuration bound to this schema start with these overrides applied.
                            </Text>
                        </Box>
                        <Box>
                            <Text as="div" size="3" weight="bold" mb="1">Custom fields</Text>
                            <Text as="p" size="2" color="gray">
                                Add fields that don't exist in the catalog default item shape — strings, numbers, booleans, objects, arrays of strings, arrays of objects. Each custom field has a display name, optional description, default value, and an optional <strong>secret</strong> toggle (encrypted at rest, decrypted in provider output).
                            </Text>
                        </Box>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--violet-11)]">
                        <Lock size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Catalog-Secret Fields are Authoritative</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            Fields marked as <strong>secret</strong> on the section catalog entry itself are locked in. Schema overlays cannot:
                        </Text>
                        <ul className="list-disc pl-6 text-[var(--gray-11)]">
                            <li>Hide them via the visibility toggles.</li>
                            <li>Override their defaults.</li>
                            <li>Downgrade them to non-secret.</li>
                        </ul>
                        <Callout.Root color="violet" mt="3">
                            <Callout.Icon>
                                <ShieldCheck size={16} />
                            </Callout.Icon>
                            <Callout.Text size="2">
                                This keeps the security posture stable across all schemas that reference a given catalog entry. Custom secret fields you add in the overlay still follow the same encrypt-at-rest, decrypt-in-output path.
                            </Callout.Text>
                        </Callout.Root>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Eye size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">JSON Preview Tab</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            The <strong>JSON preview</strong> view-mode renders the materialized schema document — the typed JSON the backend will store, including all overlays merged into the catalog's default item shape. It is read-only; edits happen only in the form view.
                        </Text>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <FileJson size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Save-time Validation</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            When you save the schema, the backend checks:
                        </Text>
                        <ul className="list-disc pl-6 text-[var(--gray-11)]">
                            <li>No duplicate section references (each catalog entry can be added at most once).</li>
                            <li>Every referenced catalog entry exists and matches the schema's flavor.</li>
                            <li>Custom field names don't collide with built-in field names in the same section.</li>
                            <li>No overlay touches a catalog-only secret field.</li>
                        </ul>
                        <Callout.Root color="orange" mt="3">
                            <Callout.Icon>
                                <AlertTriangle size={16} />
                            </Callout.Icon>
                            <Callout.Text size="2">
                                Changing a schema that is already in use re-validates the bound configurations. Removing a section or hiding a field that configurations actively populate will surface validation errors you must resolve before saving.
                            </Callout.Text>
                        </Callout.Root>
                    </Box>
                </Flex>
            </Card>
        </Flex>
    );
};

export default ConfigurationSchemasHelp;
