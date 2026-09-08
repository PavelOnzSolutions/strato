import {useState} from 'react';
import {Box, Card, Flex, Heading, Text} from '@radix-ui/themes';
import {BookOpen, Eye, FolderTree, GitCompare, Layout, Settings, Waypoints,} from 'lucide-react';
import {usePageTitle} from '../../context/PageTitleContext';
import ConfigurationsHelp from './ConfigurationsHelp';
import ConfigProviderHelp from './ConfigProviderHelp';
import {ConfigProviderViewHelp} from './ConfigProviderViewHelp';
import ConfigurationSchemasHelp from './ConfigurationSchemasHelp';
import ConfigComparatorHelp from './ConfigComparatorHelp';
import {SectionCatalogHelp} from './SectionCatalogHelp';

const HELP_SECTIONS = [
    { id: 'configurations', label: 'Configurations', icon: <Layout size={16} /> },
    { id: 'provider', label: 'Config Provider', icon: <Settings size={16} /> },
    { id: 'viewer', label: 'Config Viewer', icon: <Eye size={16} /> },
    { id: 'comparator', label: 'Comparator', icon: <GitCompare size={16} /> },
    { id: 'schemas', label: 'Configuration Schemas', icon: <Waypoints size={16} /> },
    { id: 'section-catalog', label: 'Section Catalog', icon: <BookOpen size={16} /> },
];

const ConfigurationsTocHelp = () => {
    const [activeSection, setActiveSection] = useState('configurations');

    usePageTitle('Configurations Documentation');

    const renderContent = () => {
        switch (activeSection) {
            case 'configurations':
                return <ConfigurationsHelp hideTitle />;
            case 'provider':
                return <ConfigProviderHelp hideTitle />;
            case 'viewer':
                return <ConfigProviderViewHelp hideTitle />;
            case 'comparator':
                return <ConfigComparatorHelp hideTitle />;
            case 'schemas':
                return <ConfigurationSchemasHelp hideTitle />;
            case 'section-catalog':
                return <SectionCatalogHelp hideTitle />;
            default:
                return null;
        }
    };

    return (
        <Flex direction="column" gap="4" className="max-w-6xl mx-auto pb-10">
            <Box className="py-10">
                <Flex direction="row" gap="2">
                    <FolderTree size={32} color="var(--accent-11)"/>
                    <Heading size="8" className="mb-4 bg-clip-text text-transparent bg-gradient-to-l from-[var(--gray-12)] to-[var(--accent-10)] inline-block">
                        Configuration Provisioning
                    </Heading>
                </Flex>
                <Text size="4" color="gray" className="max-w-2xl block">
                    Learn how to manage application configurations, schemas, and use the configuration provider.
                </Text>
            </Box>

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

export default ConfigurationsTocHelp;
