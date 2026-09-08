import {useState} from 'react';
import {Box, Callout, Card, Code, Flex, Heading, Text} from '@radix-ui/themes';
import {Braces, Edit3, Globe, Info, Languages, PlusCircle} from 'lucide-react';
import {usePageTitle} from '../../context/PageTitleContext';

const HELP_SECTIONS = [
  { id: 'overview', label: 'Overview', icon: <Info size={16} /> },
  { id: 'locales', label: 'Locales', icon: <Globe size={16} /> },
  { id: 'translations', label: 'Translations', icon: <Languages size={16} /> },
];

const LocalizationHelp = ({ hideTitle }: { hideTitle?: boolean }) => {
  const [activeSection, setActiveSection] = useState('overview');

  if (!hideTitle) {
    usePageTitle('Localization – Help');
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <Flex direction="column" gap="4">
            <Card size="3">
              <Flex gap="4" align="start">
                <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                  <Languages size={22} />
                </Box>
                <Box>
                  <Heading size="4" mb="2">Localization Overview</Heading>
                  <Text as="p" size="3" color="gray" mb="3">
                    Strato supports multi-language interfaces. Localization management allows you to define new languages (locales) and manage the translation keys for each.
                  </Text>
                </Box>
              </Flex>
            </Card>
          </Flex>
        );
      case 'locales':
        return (
          <Flex direction="column" gap="4">
            <Card size="3">
              <Flex gap="4" align="start">
                <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                  <PlusCircle size={22} />
                </Box>
                <Box>
                  <Heading size="4" mb="2">Managing Locales</Heading>
                  <Text as="p" size="3" color="gray" mb="3">
                    A locale represents a specific language and region (e.g., <Code>en-US</Code>, <Code>de-DE</Code>).
                  </Text>
                  <ul className="list-disc pl-6 text-[var(--gray-11)]">
                    <li><strong>New Locale</strong>: Create a new language support by specifying its code and name.</li>
                    <li><strong>Default Locale</strong>: The fallback language if a translation is missing in the user's selected language.</li>
                  </ul>
                </Box>
              </Flex>
            </Card>
          </Flex>
        );
      case 'translations':
        return (
          <Flex direction="column" gap="4">
            <Card size="3">
              <Flex gap="4" align="start">
                <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                  <Edit3 size={22} />
                </Box>
                <Box>
                  <Heading size="4" mb="2">Editing Translations</Heading>
                  <Text as="p" size="3" color="gray" mb="3">
                    You can edit translations in two ways:
                  </Text>
                  <ul className="list-disc pl-6 text-[var(--gray-11)]">
                    <li><strong>Form View</strong>: A user-friendly table to edit each translation key individually.</li>
                    <li><strong>JSON View</strong>: Directly edit the raw JSON structure for advanced users or bulk updates.</li>
                  </ul>
                  <Callout.Root size="1" mt="3">
                    <Callout.Icon>
                      <Braces size={16} />
                    </Callout.Icon>
                    <Callout.Text>
                      The JSON view requires valid JSON syntax. Any errors will prevent saving.
                    </Callout.Text>
                  </Callout.Root>
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
            <Languages size={32} color="var(--accent-11)"/>
            <Heading size="8" className="mb-4 bg-clip-text text-transparent bg-gradient-to-l from-[var(--gray-12)] to-[var(--accent-10)] inline-block">
              Localization Help
            </Heading>
          </Flex>
          <Text size="4" color="gray" className="max-w-2xl block">
            Manage languages and translations for the Strato platform.
          </Text>
        </Box>
      )}

      <Flex gap="6">
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

        <Box style={{ flex: 1 }}>
          {renderContent()}
        </Box>
      </Flex>
    </Flex>
  );
};

export default LocalizationHelp;
