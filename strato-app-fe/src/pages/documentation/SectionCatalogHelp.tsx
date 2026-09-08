import {Box, Callout, Card, Code, Flex, Heading, Text} from '@radix-ui/themes';
import {AlertTriangle, BookOpen, Cloud, Info, KeyRound, Lock, Package, Plus, ShieldCheck} from 'lucide-react';
import {usePageTitle} from '../../context/PageTitleContext';

interface SectionCatalogHelpProps {
    hideTitle?: boolean;
}

export const SectionCatalogHelp = ({ hideTitle }: SectionCatalogHelpProps) => {
    if (!hideTitle) {
        usePageTitle('Section Catalog – Help');
    }

    return (
        <Flex direction="column" gap="6" className={hideTitle ? "" : "max-w-4xl mx-auto pb-10"}>
            {!hideTitle && (
                <Box className="py-10">
                    <Heading size="8" className="mb-4 bg-clip-text text-transparent bg-linear-to-r from-(--accent-9) to-(--accent-11) inline-block">
                        Section Catalog
                    </Heading>
                    <Text size="4" color="gray" className="max-w-2xl block">
                        The catalog is the shared dictionary of section types every schema picks from. Admins curate it here.
                    </Text>
                </Box>
            )}

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-(--accent-3) rounded-full text-(--accent-11)">
                        <BookOpen size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">What is a Catalog Entry?</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            A catalog entry defines one <strong>section type</strong> for a cloud flavor — for example "Azure Functions", "Event Grid Topics", or "API Management". It carries the section's stable key (used in URLs and JSON output), its display name and icon, and the <strong>default item shape</strong>: the list of fields each item in that section will carry.
                        </Text>
                        <ul className="list-disc pl-6 text-(--gray-11)">
                            <li>Every schema that uses a section starts from this default item shape, then refines it through its overlay.</li>
                            <li>The section's stable key (for example <Code>functions</Code>, <Code>eventGridTopics</Code>) becomes the top-level key in the provider's JSON output.</li>
                            <li>Item fields can be scalars, objects, or arrays — including arrays of objects with arbitrarily nested fields.</li>
                        </ul>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-(--accent-3) rounded-full text-(--accent-11)">
                        <Cloud size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Flavor Scope</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            Each entry is bound to a single cloud flavor — currently <Code>AZURE</Code>; <Code>AWS</Code> exists in the model and will be populated in a future release. Schemas can only reference catalog entries that match their own flavor.
                        </Text>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-(--accent-3) rounded-full text-(--accent-11)">
                        <Package size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">System Entries vs Extension Entries</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            The catalog is hybrid: Strato ships with a curated set of <strong>system</strong> entries, and administrators can add additional <strong>extension</strong> entries on top.
                        </Text>
                        <Box mb="3">
                            <Text as="div" size="3" weight="bold" mb="1">System entries</Text>
                            <Text as="p" size="2" color="gray">
                                Code-seeded on first startup. The current Azure set covers <Code>Azure Functions</Code>, <Code>Event Grid Topics</Code>, <Code>API Management</Code>, <Code>Cosmos DB</Code>, and <Code>Storage Accounts</Code>. System entries carry a <strong>System</strong> badge in the catalog list. Their key, default item shape, and security posture cannot be edited or deleted from the UI; they evolve only through Strato releases.
                            </Text>
                        </Box>
                        <Box>
                            <Text as="div" size="3" weight="bold" mb="1">Extension entries</Text>
                            <Text as="p" size="2" color="gray">
                                Created in this admin page when your organization needs a section type Strato doesn't ship. Extension entries are fully editable and deletable (subject to references — see below).
                            </Text>
                        </Box>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-(--accent-3) rounded-full text-(--accent-11)">
                        <Plus size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Adding an Extension Entry</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            From the catalog admin page (<Code>/admin/section-catalog</Code>), click <strong>"+ Add section type"</strong>. The editor asks for:
                        </Text>
                        <ul className="list-disc pl-6 text-(--gray-11)">
                            <li><strong>Flavor</strong> — the cloud the section belongs to.</li>
                            <li><strong>Section key</strong> — a stable identifier matching <Code>[a-z][a-zA-Z0-9]*</Code>, unique within the flavor. Becomes the top-level JSON key.</li>
                            <li><strong>Display name</strong>, <strong>description</strong>, and <strong>icon</strong> — what schema authors see in the catalog panel.</li>
                            <li><strong>Required read / write permissions</strong> — optional permission keys (see below).</li>
                            <li><strong>Item fields</strong> — the default item shape. The field editor is the same one you use for custom fields in a schema overlay, including support for nested objects and arrays of objects.</li>
                        </ul>
                        <Callout.Root color="amber" mt="3">
                            <Callout.Icon>
                                <AlertTriangle size={16} />
                            </Callout.Icon>
                            <Callout.Text size="2">
                                Deleting an extension entry is blocked while any schema still references it. The error response lists the referencing schemas so you can clean them up first.
                            </Callout.Text>
                        </Callout.Root>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-(--accent-3) rounded-full text-(--violet-11)">
                        <ShieldCheck size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Per-Section RBAC</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            Two optional permission keys can be declared on every catalog entry:
                        </Text>
                        <Box mb="3">
                            <Text as="div" size="3" weight="bold" mb="1"><Lock size={14} className="inline mr-1" /> requiredReadPermission</Text>
                            <Text as="p" size="2" color="gray">
                                Gates the provider endpoint output. If the calling identity does not hold this permission, the entire section key is omitted from the response — both for pipelines hitting <Code>/api/configuration-provider/...</Code> and for users viewing the configuration in the UI. Leave blank to fall back to the global <Code>CONFIG_PROVIDER_READ</Code> permission.
                            </Text>
                        </Box>
                        <Box>
                            <Text as="div" size="3" weight="bold" mb="1"><Plus size={14} className="inline mr-1" /> requiredWritePermission</Text>
                            <Text as="p" size="2" color="gray">
                                Gates the "+ Add item" button (and item-delete) in the Provider View for this section. Users who can read the section but lack write permission see it but cannot modify it. Leave blank to fall back to the global <Code>CONFIG_PROVIDER_WRITE</Code> permission.
                            </Text>
                        </Box>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-(--accent-3) rounded-full text-(--accent-11)">
                        <KeyRound size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Catalog-Secret Fields</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            Any item field defined on a catalog entry can be marked <strong>secret</strong>. Catalog secrets are <em>authoritative</em>: every schema using the entry inherits the secret flag, and no overlay can hide the field, change its default, or downgrade it to non-secret.
                        </Text>
                        <Callout.Root color="violet">
                            <Callout.Icon>
                                <Info size={16} />
                            </Callout.Icon>
                            <Callout.Text size="2">
                                Catalog-secret values are encrypted at rest and decrypted only in provider responses to callers with the relevant read permission. This is what keeps the security posture stable across the many schemas that may reference one catalog entry.
                            </Callout.Text>
                        </Callout.Root>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-(--accent-3) rounded-full text-(--accent-11)">
                        <Lock size={22} />
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Who Can Edit the Catalog?</Heading>
                        <Text as="p" size="3" color="gray">
                            The Section Catalog admin page is gated by the <Code>PERM_CATALOG_ADMIN</Code> permission, seeded to the <Code>Admin</Code> role. Anyone with <Code>CONFIG_SCHEMA_READ</Code> can browse the catalog read-only from the schema editor; only catalog admins can create, edit, or delete extension entries.
                        </Text>
                    </Box>
                </Flex>
            </Card>
        </Flex>
    );
};

const SectionCatalogHelpPage = () => {
    usePageTitle('Section Catalog – Documentation');

    return (
        <Box className="max-w-4xl mx-auto py-10">
            <SectionCatalogHelp />
        </Box>
    );
};

export default SectionCatalogHelpPage;
