import {useState} from 'react';
import {Box, Callout, Card, Flex, Heading, Text} from '@radix-ui/themes';
import {Activity, AlertTriangle, ClipboardList, Info, Search, Trash2} from 'lucide-react';
import {usePageTitle} from '../../context/PageTitleContext';

const HELP_SECTIONS = [
  { id: 'overview', label: 'Overview', icon: <Info size={16} /> },
  { id: 'tracking', label: 'Tracking Changes', icon: <ClipboardList size={16} /> },
  { id: 'management', label: 'Log Management', icon: <Trash2 size={16} /> },
];

const AuditLogHelp = ({ hideTitle }: { hideTitle?: boolean }) => {
  const [activeSection, setActiveSection] = useState('overview');

  if (!hideTitle) {
    usePageTitle('Audit Log – Help');
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <Flex direction="column" gap="4">
            <Card size="3">
              <Flex gap="4" align="start">
                <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                  <ClipboardList size={22} />
                </Box>
                <Box>
                  <Heading size="4" mb="2">Audit Log Overview</Heading>
                  <Text as="p" size="3" color="gray" mb="3">
                    The Audit Log provides a comprehensive record of all significant actions and changes within the system. It is essential for security auditing, troubleshooting, and compliance.
                  </Text>
                </Box>
              </Flex>
            </Card>
          </Flex>
        );
      case 'tracking':
        return (
          <Flex direction="column" gap="4">
            <Card size="3">
              <Flex gap="4" align="start">
                <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                  <Search size={22} />
                </Box>
                <Box>
                  <Heading size="4" mb="2">Tracking Changes</Heading>
                  <Text as="p" size="3" color="gray" mb="3">
                    Every entry in the audit log captures:
                  </Text>
                  <ul className="list-disc pl-6 text-[var(--gray-11)]">
                    <li><strong>Timestamp</strong>: When the action occurred.</li>
                    <li><strong>User</strong>: Who performed the action.</li>
                    <li><strong>Action Type</strong>: The nature of the event (e.g., Entity Change, Authorization, System Event).</li>
                    <li><strong>Operation</strong>: Specific operation (e.g., Create, Update, Delete, Execute).</li>
                    <li><strong>Details</strong>: A description of what changed, including diffs for entity updates.</li>
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
                  <Heading size="4" mb="2">Log Retention</Heading>
                  <Text as="p" size="3" color="gray" mb="3">
                    Administrators can manage the volume of audit logs by deleting old or unnecessary entries.
                  </Text>
                  <Callout.Root color="amber" size="1">
                    <Callout.Icon>
                      <AlertTriangle size={16} />
                    </Callout.Icon>
                    <Callout.Text>
                      Deleting audit logs is a permanent action. Ensure you have backups if these logs are required for compliance.
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
            <Activity size={32} color="var(--accent-11)"/>
            <Heading size="8" className="mb-4 bg-clip-text text-transparent bg-gradient-to-l from-[var(--gray-12)] to-[var(--accent-10)] inline-block">
              Audit Log Help
            </Heading>
          </Flex>
          <Text size="4" color="gray" className="max-w-2xl block">
            Understand how to track system changes and manage audit records.
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

export default AuditLogHelp;
