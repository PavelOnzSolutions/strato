import {useState} from 'react';
import {Box, Callout, Card, Flex, Heading, Text} from '@radix-ui/themes';
import {AlertTriangle, Database, DatabaseBackup, Download, History, Info, Upload} from 'lucide-react';
import {usePageTitle} from '../../context/PageTitleContext';

const HELP_SECTIONS = [
  { id: 'overview', label: 'Overview', icon: <Info size={16} /> },
  { id: 'backup', label: 'Backup', icon: <Download size={16} /> },
  { id: 'restore', label: 'Restore', icon: <Upload size={16} /> },
  { id: 'history', label: 'History', icon: <History size={16} /> },
];

const BackupRestoreHelp = ({ hideTitle }: { hideTitle?: boolean }) => {
  const [activeSection, setActiveSection] = useState('overview');

  if (!hideTitle) {
    usePageTitle('Backup & Restore – Help');
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
                  <Heading size="4" mb="2">Backup & Restore Overview</Heading>
                  <Text as="p" size="3" color="gray" mb="3">
                    Protect your data by creating regular backups. The Backup & Restore tool allows you to export the system state and restore it in case of data loss or when migrating to a new environment.
                  </Text>
                </Box>
              </Flex>
            </Card>
          </Flex>
        );
      case 'backup':
        return (
          <Flex direction="column" gap="4">
            <Card size="3">
              <Flex gap="4" align="start">
                <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                  <Download size={22} />
                </Box>
                <Box>
                  <Heading size="4" mb="2">Creating Backups</Heading>
                  <Text as="p" size="3" color="gray" mb="3">
                    You can select which collections (tables) to include in your backup.
                  </Text>
                  <ul className="list-disc pl-6 text-[var(--gray-11)]">
                    <li><strong>Full Backup</strong>: Select all collections to capture the entire system state.</li>
                    <li><strong>Partial Backup</strong>: Select only specific collections if you only need certain data.</li>
                  </ul>
                  <Text as="p" size="2" color="gray" mt="2">
                    Backups are downloaded as ZIP files containing the data in a portable format.
                  </Text>
                </Box>
              </Flex>
            </Card>
          </Flex>
        );
      case 'restore':
        return (
          <Flex direction="column" gap="4">
            <Card size="3">
              <Flex gap="4" align="start">
                <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                  <Upload size={22} />
                </Box>
                <Box>
                  <Heading size="4" mb="2">Restoring Data</Heading>
                  <Text as="p" size="3" color="gray" mb="3">
                    To restore data, upload a previously generated backup file. The system will analyze the file and provide a preview of what will be restored.
                  </Text>
                  <Callout.Root color="ruby" size="1">
                    <Callout.Icon>
                      <AlertTriangle size={16} />
                    </Callout.Icon>
                    <Callout.Text>
                      Restoring data will overwrite existing data in the selected collections. This action cannot be undone.
                    </Callout.Text>
                  </Callout.Root>
                </Box>
              </Flex>
            </Card>
          </Flex>
        );
      case 'history':
        return (
          <Flex direction="column" gap="4">
            <Card size="3">
              <Flex gap="4" align="start">
                <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                  <History size={22} />
                </Box>
                <Box>
                  <Heading size="4" mb="2">Action History</Heading>
                  <Text as="p" size="3" color="gray" mb="3">
                    The history section shows a log of all backup and restore operations performed on the system, including who performed them and whether they were successful.
                  </Text>
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
            <DatabaseBackup size={32} color="var(--accent-11)"/>
            <Heading size="8" className="mb-4 bg-clip-text text-transparent bg-gradient-to-l from-[var(--gray-12)] to-[var(--accent-10)] inline-block">
              Backup & Restore Help
            </Heading>
          </Flex>
          <Text size="4" color="gray" className="max-w-2xl block">
            Manage system backups and data restoration procedures.
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

export default BackupRestoreHelp;
