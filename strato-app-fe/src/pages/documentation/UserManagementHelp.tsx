import {useState} from 'react';
import {Box, Callout, Card, Flex, Heading, Text} from '@radix-ui/themes';
import {Info, Shield, UserCheck, UserPlus, Users} from 'lucide-react';
import {usePageTitle} from '../../context/PageTitleContext';

const HELP_SECTIONS = [
  { id: 'overview', label: 'Overview', icon: <Info size={16} /> },
  { id: 'user-accounts', label: 'User Accounts', icon: <Users size={16} /> },
  { id: 'roles-assignment', label: 'Roles Assignment', icon: <Shield size={16} /> },
];

const UserManagementHelp = ({ hideTitle }: { hideTitle?: boolean }) => {
  const [activeSection, setActiveSection] = useState('overview');

  if (!hideTitle) {
    usePageTitle('User Management – Help');
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <Flex direction="column" gap="4">
            <Card size="3">
              <Flex gap="4" align="start">
                <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                  <Users size={22} />
                </Box>
                <Box>
                  <Heading size="4" mb="2">User Management Overview</Heading>
                  <Text as="p" size="3" color="gray" mb="3">
                    User management allows administrators to control who has access to the Strato platform. You can create, edit, and deactivate user accounts, as well as manage their role assignments.
                  </Text>
                </Box>
              </Flex>
            </Card>
          </Flex>
        );
      case 'user-accounts':
        return (
          <Flex direction="column" gap="4">
            <Card size="3">
              <Flex gap="4" align="start">
                <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                  <UserPlus size={22} />
                </Box>
                <Box>
                  <Heading size="4" mb="2">Managing Accounts</Heading>
                  <Text as="p" size="3" color="gray" mb="3">
                    Users are identified by their unique username. Each account can be enabled or disabled.
                  </Text>
                  <ul className="list-disc pl-6 text-[var(--gray-11)]">
                    <li><strong>Enabled</strong>: The user can log in and access the platform.</li>
                    <li><strong>Disabled</strong>: The user's access is immediately revoked, but their data remains in the system.</li>
                  </ul>
                </Box>
              </Flex>
            </Card>
          </Flex>
        );
      case 'roles-assignment':
        return (
          <Flex direction="column" gap="4">
            <Card size="3">
              <Flex gap="4" align="start">
                <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                  <Shield size={22} />
                </Box>
                <Box>
                  <Heading size="4" mb="2">Assigning Roles</Heading>
                  <Text as="p" size="3" color="gray" mb="3">
                    Roles (Authorities) determine what a user is allowed to do. A user can have multiple roles assigned simultaneously.
                  </Text>
                  <Callout.Root size="1">
                    <Callout.Icon>
                      <UserCheck size={16} />
                    </Callout.Icon>
                    <Callout.Text>
                      The effective permissions of a user are the union of all permissions granted by their assigned roles.
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
            <Users size={32} color="var(--accent-11)"/>
            <Heading size="8" className="mb-4 bg-clip-text text-transparent bg-gradient-to-l from-[var(--gray-12)] to-[var(--accent-10)] inline-block">
              User Management Help
            </Heading>
          </Flex>
          <Text size="4" color="gray" className="max-w-2xl block">
            Learn how to manage user accounts and their access levels.
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

export default UserManagementHelp;
