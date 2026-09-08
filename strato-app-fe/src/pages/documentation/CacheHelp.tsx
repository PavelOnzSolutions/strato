import {useState} from 'react';
import {Box, Callout, Card, Flex, Heading, Text} from '@radix-ui/themes';
import {Activity, Database, DatabaseZap, Info, Trash2, Zap} from 'lucide-react';
import {usePageTitle} from '../../context/PageTitleContext';

const HELP_SECTIONS = [
  { id: 'overview', label: 'Overview', icon: <Info size={16} /> },
  { id: 'metrics', label: 'Metrics', icon: <Activity size={16} /> },
  { id: 'management', label: 'Cache Management', icon: <Trash2 size={16} /> },
];

const CacheHelp = ({ hideTitle }: { hideTitle?: boolean }) => {
  const [activeSection, setActiveSection] = useState('overview');

  if (!hideTitle) {
    usePageTitle('Cache – Help');
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <Flex direction="column" gap="4">
            <Card size="3">
              <Flex gap="4" align="start">
                <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                  <Database size={22} />
                </Box>
                <Box>
                  <Heading size="4" mb="2">Cache Overview</Heading>
                  <Text as="p" size="3" color="gray" mb="3">
                    Strato uses caching to improve performance and reduce database load. This page provides visibility into the state and performance of various system caches.
                  </Text>
                </Box>
              </Flex>
            </Card>
          </Flex>
        );
      case 'metrics':
        return (
          <Flex direction="column" gap="4">
            <Card size="3">
              <Flex gap="4" align="start">
                <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                  <Zap size={22} />
                </Box>
                <Box>
                  <Heading size="4" mb="2">Understanding Metrics</Heading>
                  <ul className="list-disc pl-6 text-[var(--gray-11)]">
                    <li><strong>Hits</strong>: Number of times a requested item was found in the cache.</li>
                    <li><strong>Misses</strong>: Number of times a requested item was NOT found in the cache.</li>
                    <li><strong>Puts</strong>: Number of times an item was added to the cache.</li>
                    <li><strong>Evictions</strong>: Number of items removed from the cache to make room for new items.</li>
                  </ul>
                </Box>
              </Flex>
            </Card>
          </Flex>
        );
      case 'management':
        return (
          <Flex direction="column" gap="4">
            <Card size="3">
              <Flex gap="4" align="start">
                <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                  <Trash2 size={22} />
                </Box>
                <Box>
                  <Heading size="4" mb="2">Clearing Caches</Heading>
                  <Text as="p" size="3" color="gray" mb="3">
                    If you suspect that the system is serving stale data, you can purge individual caches or clear all caches at once.
                  </Text>
                  <Callout.Root size="1">
                    <Callout.Icon>
                      <Info size={16} />
                    </Callout.Icon>
                    <Callout.Text>
                      Clearing caches is safe but may cause a temporary performance dip while the system repopulates the data.
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
            <DatabaseZap size={32} color="var(--accent-11)"/>
            <Heading size="8" className="mb-4 bg-clip-text text-transparent bg-gradient-to-l from-[var(--gray-12)] to-[var(--accent-10)] inline-block">
              Data Caching Help
            </Heading>
          </Flex>
          <Text size="4" color="gray" className="max-w-2xl block">
            Monitor and manage system caches to ensure optimal performance.
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

export default CacheHelp;
