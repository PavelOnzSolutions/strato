import {useState} from 'react';
import {Badge, Box, Callout, Card, Code, Flex, Heading, Text} from '@radix-ui/themes';
import {ArrowRight, Info, Key, Lock, Shield, ShieldCheck, ShieldUser, UserCheck, Users} from 'lucide-react';
import {usePageTitle} from '../../context/PageTitleContext';
import {PERMISSION_SCOPES, scopeToLabel, levelToLabel, toPermissionString, permissionToLabel} from "../../constants/permissions.ts";

const HELP_SECTIONS = [
  { id: 'overview', label: 'Overview', icon: <Info size={16} /> },
  { id: 'roles', label: 'Roles & Types', icon: <Users size={16} /> },
  { id: 'permissions', label: 'Permissions', icon: <Key size={16} /> },
  { id: 'security', label: 'Security Best Practices', icon: <Shield size={16} /> },
];

const RoleManagementHelp = ({ hideTitle }: { hideTitle?: boolean }) => {
  const [activeSection, setActiveSection] = useState('overview');

  if (!hideTitle) {
    usePageTitle('Role Management – Help');
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <Flex direction="column" gap="4">
            <Card size="3">
              <Flex gap="4" align="start">
                <Box className="p-3 bg-(--accent-3) rounded-full text-(--accent-11)">
                  <Shield size={22} />
                </Box>
                <Box>
                  <Heading size="4" mb="2">Role-Based Access Control (RBAC)</Heading>
                  <Text as="p" size="3" color="gray" mb="3">
                    Strato uses a granular RBAC system to control access to various parts of the platform. Access is determined by <strong>Authorities</strong> (Roles) assigned to users.
                  </Text>
                  <ul className="list-disc pl-6 text-(--gray-11)">
                    <li><strong>Authorities</strong>: Named collections of permissions (e.g., "Editor", "Viewer").</li>
                    <li><strong>Permissions</strong>: Specific capabilities within the system (prefixed with <Code>PERM_</Code>).</li>
                    <li><strong>Assignments</strong>: Roles are assigned to user accounts to grant them the combined permissions of those roles.</li>
                  </ul>
                </Box>
              </Flex>
            </Card>

            <Card size="3">
              <Flex gap="4" align="start">
                <Box className="p-3 bg-(--accent-3) rounded-full text-(--accent-11)">
                  <UserCheck size={22} />
                </Box>
                <Box>
                  <Heading size="4" mb="2">How it works</Heading>
                  <Text as="p" size="3" color="gray" mb="3">
                    When a user logs in, their permissions are evaluated. The UI dynamically adjusts to show only the features and data the user is authorized to access.
                  </Text>
                  <Callout.Root size="1">
                    <Callout.Icon>
                      <Info size={16} />
                    </Callout.Icon>
                    <Callout.Text>
                      Administrators have full access to all features regardless of specific role assignments if they have the <Code>ADMIN</Code> role.
                    </Callout.Text>
                  </Callout.Root>
                </Box>
              </Flex>
            </Card>
          </Flex>
        );
      case 'roles':
        return (
          <Flex direction="column" gap="4">
            <Card size="3">
              <Flex gap="4" align="start">
                <Box className="p-3 bg-(--accent-3) rounded-full text-[var(--accent-11)]">
                  <Users size={22} />
                </Box>
                <Box>
                  <Heading size="4" mb="2">Role Types</Heading>
                  <Text as="p" size="3" color="gray" mb="3">
                    There are two types of roles in Strato:
                  </Text>
                  <Flex direction="column" gap="3" mt="2">
                    <Box>
                      <Flex align="center" gap="2" mb="1">
                        <Badge color="amber">System Role</Badge>
                        <Text size="2" weight="bold">Immutable Infrastructure</Text>
                      </Flex>
                      <Text size="2" color="gray">
                        Core roles required for system operation. You can modify their permissions, but they cannot be renamed or deleted.
                      </Text>
                    </Box>
                    <Box>
                      <Flex align="center" gap="2" mb="1">
                        <Badge color="green">Custom Role</Badge>
                        <Text size="2" weight="bold">User Defined</Text>
                      </Flex>
                      <Text size="2" color="gray">
                        Roles created by administrators to meet specific organizational needs. These can be fully managed, including renaming and deletion.
                      </Text>
                    </Box>
                  </Flex>
                </Box>
              </Flex>
            </Card>
          </Flex>
        );
      case 'permissions':
        return (
          <Flex direction="column" gap="4">
            <Card size="3">
              <Flex gap="4" align="start">
                <Box className="p-3 bg-(--accent-3) rounded-full text-(--accent-11)">
                  <Key size={22} />
                </Box>
                <Box style={{ flex: 1 }}>
                  <Heading size="4" mb="2">Hierarchical Permissions</Heading>
                  <Text as="p" size="3" color="gray" mb="3">
                    Permissions are organized by scope and follow a hierarchy. A higher-level permission automatically implies all lower-level permissions in the same scope.
                  </Text>
                  <Callout.Root size="1" mb="4">
                    <Callout.Icon>
                      <Info size={16} />
                    </Callout.Icon>
                    <Callout.Text>
                      For example, granting <Code>PERM_DEPLOYMENT_WRITE</Code> automatically grants <Code>PERM_DEPLOYMENT_EXECUTE</Code> and <Code>PERM_DEPLOYMENT_READ</Code>. You do not need to assign implied permissions separately.
                    </Callout.Text>
                  </Callout.Root>

                  {PERMISSION_SCOPES.map(({ scope, levels }) => (
                    <Box key={scope} mb="4">
                      <Flex align="center" gap="2" mb="2">
                        <Heading size="4" className="bg-linear-to-l from-(--gray-12) to-(--accent-11) bg-clip-text text-transparent">{scopeToLabel(scope)}</Heading>
                        {levels.length > 1 && (
                          <Flex align="center" gap="1">
                            {levels.map((level, i) => (
                              <Flex key={level} align="center" gap="1">
                                <Badge color={i === 0 ? 'red' : i === levels.length - 1 ? 'green' : 'amber'} variant="outline" size="1">
                                  {levelToLabel(level)}
                                </Badge>
                                {i < levels.length - 1 && <ArrowRight size={12} className="text-(--gray-9)" />}
                              </Flex>
                            ))}
                          </Flex>
                        )}
                      </Flex>
                      <Box className="overflow-hidden rounded-lg border border-(--gray-5)">
                        <table className="w-full text-left text-sm">
                          <tbody className="divide-y divide-(--gray-5)">
                            {levels.map((level) => {
                              const perm = toPermissionString(scope, level);
                              return (
                                <tr key={perm}>
                                  <td className="px-4 py-2" style={{ width: '40%' }}><Code>{perm}</Code></td>
                                  <td className="px-4 py-2 text-(--gray-11)">{permissionToLabel(perm)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Flex>
            </Card>
          </Flex>
        );
      case 'security':
        return (
          <Flex direction="column" gap="4">
            <Card size="3">
              <Flex gap="4" align="start">
                <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--violet-11)]">
                  <ShieldCheck size={22} />
                </Box>
                <Box>
                  <Heading size="4" mb="2">Principle of Least Privilege</Heading>
                  <Text as="p" size="3" color="gray" mb="3">
                    Always assign the minimum level of access required for a user to perform their job functions.
                  </Text>
                  <ul className="list-disc pl-6 text-[var(--gray-11)] mb-3">
                    <li>Create specific roles for specific tasks (e.g., "Auditor" with only <Code>_READ</Code> permissions).</li>
                    <li>Regularly review user role assignments.</li>
                    <li>Avoid assigning the <Code>ADMIN</Code> role unless absolutely necessary.</li>
                  </ul>
                  <Callout.Root color="amber" size="1">
                    <Callout.Icon>
                      <Lock size={16} />
                    </Callout.Icon>
                    <Callout.Text>
                      Modifying permissions of System Roles can affect platform stability if critical access is removed.
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
            <ShieldUser size={32} color="var(--accent-11)"/>
            <Heading size="8" className="mb-4 bg-clip-text text-transparent bg-linear-to-l from-(--gray-11) to-(--accent-11) inline-block">
              Role Management Help
            </Heading>
          </Flex>
          <Text size="4" color="gray" className="max-w-2xl block">
            Understand how to manage roles, permissions, and security within the Strato platform.
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
                  className="hover:bg-(--gray-3)"
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

export default RoleManagementHelp;
