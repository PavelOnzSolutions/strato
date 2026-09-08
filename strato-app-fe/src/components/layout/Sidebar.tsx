import React, { useState } from 'react';
import {
    Home,
    LogOut,
    Boxes,
    Waypoints,
    ChevronDown,
    ChevronRight,
    Users,
    Key,
    Activity,
    PenTool,
    Globe,
    DatabaseZap,
    HelpingHand,
    HelpCircle,
    Box,
    LibraryBig,
    ArrowBigLeft,
    CloudUpload,
    LifeBuoy,
    BadgeInfo,
    DatabaseBackup,
    ShieldUser,
    Bot,
    Cpu,
    Brain,
    HandCoins,
    HeartPlus,
    Braces,
    Cog,
    Settings2,
    FolderTree,
    FileBracesCorner,
    TableConfig,
    Book
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { useAuth } from '../../context/AuthContext.tsx';
import { Button, Dialog, Flex } from '@radix-ui/themes';

interface SidebarProps {
    isOpen: boolean;
    closeSidebar: () => void;
}

type NavChild = { permission?: string; path?: string; [k: string]: any };
type NavItem = { permission?: string; children?: NavChild[]; label: string; path?: string; adminOnly?: boolean; [k: string]: any };

const Sidebar: React.FC<SidebarProps> = ({ isOpen, closeSidebar }) => {
    const { t } = useTranslation();
    const { logout, user, hasPermission, hasAnyRole } = useAuth();
    const [expandedItems, setExpandedItems] = React.useState<string[]>([]);
    const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

    const filterNavItems = (items: NavItem[]): NavItem[] =>
        items
            .map(item => {
                if (item.adminOnly && !hasAnyRole(['ADMIN'])) return null;
                if (!item.children) {
                    return (!item.permission || hasPermission(item.permission)) ? item : null;
                }
                const visibleChildren = item.children.filter(
                    c => !c.permission || hasPermission(c.permission)
                );
                return visibleChildren.length === 0 ? null : { ...item, children: visibleChildren };
            })
            .filter((i): i is NavItem => i !== null);

    const toggleExpand = (label: string) => {
        setExpandedItems(prev =>
            prev.includes(label) ? prev.filter(item => item !== label) : [...prev, label]
        );
    };

    const handleLogout = () => {
        setLogoutDialogOpen(true);
    };

    const confirmLogout = () => {
        closeSidebar();
        logout();
    };

    const navItems = [
        { icon: Home, label: t('mit_dashboard', 'Dashboard'), path: '/' },
        //{ icon: Waypoints, label: t('mit_blueprints', 'Blueprints'), path: '/blueprints' },
        {
            icon: Waypoints,
            label: t('mit_environments', 'Environments'),
            permission: 'PERM_ENVIRONMENT_READ',
            children: [
                { icon: PenTool, label: t('mit_definitions', 'Definitions'), path: '/environments/definitions', permission: 'PERM_ENVIRONMENT_READ' },
                { icon: Activity, label: t('mit_running_tasks', 'Running Tasks'), path: '/environments/running', permission: 'PERM_ENVIRONMENT_READ' },
            ]
        },
        {
            icon: CloudUpload,
            label: t('mit_deployments', 'Deployments'),
            children: [
                { icon: TableConfig, label: t('mit_version_matrix', 'Version matrix'), path: '/deployments/version-matrix', permission: 'PERM_VERSIONS_READ' },
            ]
        },
        {
            icon: FolderTree,
            label: t('mit_config_provider', 'Configurations'),
            children: [
                { icon: Settings2, label: t('mit_configurations', 'Configurations'), path: '/configurations/maps', permission: 'PERM_CONFIG_PROVIDER_READ' },
                { icon: Braces, label: t('mit_schemas', 'Schemas'), path: '/configurations/schemas', permission: 'PERM_CONFIG_SCHEMA_READ' },
                { icon: Book, label: t('mit_section_catalog', 'Section Catalog'), path: '/configurations/section-catalog', permission: 'PERM_CONFIG_SECTIONS_READ' }
            ]
        },
        {
            icon: Boxes,
            label: t('mit_resources', 'Resource Classes'),
            children: [
                { icon: Box, label: t('mit_class_definitions', 'Class Definitions'), path: '/resources/definitions', permission: 'PERM_RESOURCE_READ' },
                { icon: LibraryBig, label: t('mit_categories', 'Categories'), path: '/resources/categories', permission: 'PERM_RESOURCE_READ' },
            ]
        },
        {
            icon: Brain,
            label: t('mit_ops_intelligence', 'Ops Intelligence'),
            children: [
                { icon: HandCoins, label: t('mit_fin_insight', 'Financial Insights'), path: 'coming-soon', permission: 'PERM_PREVIEW_FEATS' },//'/ops-intelligence/financial-insights'},
                { icon: HeartPlus, label: t('mit_env_health', 'Environment Health'), path: 'coming-soon', permission: 'PERM_PREVIEW_FEATS' }  //'/ops-intelligence/environment-health'}
            ]
        },
        {
            icon: Cog,
            label: t('mit_administration', 'Administration'),
            adminOnly: true,
            children: [
                { icon: Users, label: t('mit_users', 'Users'), path: '/admin/users', permission: 'PERM_USER_READ' },
                { icon: ShieldUser, label: t('mit_roles', 'Roles'), path: '/admin/roles', permission: 'PERM_ROLE_READ' },
                { icon: Settings2, label: t('mit_configuration', 'Configuration'), path: '/admin/configuration', permission: 'PERM_USER_READ' },
                { icon: Key, label: t('mit_api_tokens', 'API Tokens'), path: '/admin/api-tokens' },
                { icon: FileBracesCorner, label: t('mit_api_docs', 'API Docs'), path: '/admin/api-docs' },
                { icon: Activity, label: t('mit_audit_log', 'Audit Log'), path: '/admin/audit-log', permission: 'PERM_AUDIT_READ' },
                { icon: Globe, label: t('mit_localization', 'Localization'), path: '/admin/localization' },
                { icon: DatabaseBackup, label: t('mit_backup_restore', 'Backup & Restore'), path: '/admin/backup', permission: 'PERM_BACKUP_READ' },
                { icon: DatabaseZap, label: t('mit_cache', 'Cache'), path: '/admin/cache' },
                { icon: Cpu, label: t('mit_diagnostics', 'Logs & Metrics'), path: '/admin/metrics' },
            ]
        },
        {
            icon: HelpCircle,
            label: t('mit_documentation', 'Documentation'),
            path: '/documentation',
            children: [
                { icon: HelpingHand, label: t('mit_core_concepts', 'Core Concepts'), path: '/documentation/core-concepts' },
                { icon: HelpingHand, label: t('mit_quick_start', 'Quick Start'), path: '/documentation/quick-start' },
                { icon: Bot, label: t('mit_assistant', 'DevOps Assistant'), path: '/documentation/assistant' },
                //   { icon: FileQuestionMark, label: t('mit_blueprints', 'Blueprints'), path: '/documentation/blueprints' },
                { icon: LifeBuoy, label: t('mit_environments', 'Environments'), path: '/documentation/environments', permission: 'PERM_ENVIRONMENT_READ' },
                { icon: PenTool, label: t('mit_env_editor', 'Environment Editor'), path: '/documentation/environment-editor', permission: 'PERM_ENVIRONMENT_READ' },
                { icon: FolderTree, label: t('mit_configurations', 'Configurations'), path: '/documentation/configurations', permission: 'PERM_CONFIG_PROVIDER_READ' },
                { icon: TableConfig, label: t('mit_version_matrix', 'Version Matrix'), path: '/documentation/version-matrix', permission: 'PERM_VERSIONS_READ' },
                { icon: Boxes, label: t('mit_resources', 'Resources'), path: '/documentation/resources', permission: 'PERM_RESOURCE_READ' },
                { icon: ShieldUser, label: t('mit_roles', 'Roles'), path: '/documentation/roles', permission: 'PERM_ROLES_READ' },
                { icon: Users, label: t('mit_users', 'Users'), path: '/documentation/users', permission: 'PERM_USER_READ' },
                { icon: Activity, label: t('mit_audit_log', 'Audit Log'), path: '/documentation/audit-log', permission: 'PERM_AUDIT_READ' },
                { icon: Globe, label: t('mit_localization', 'Localization'), path: '/documentation/localization' },
                { icon: DatabaseZap, label: t('mit_cache', 'Cache'), path: '/documentation/cache' },
                { icon: DatabaseBackup, label: t('mit_backup_restore', 'Backup & Restore'), path: '/documentation/backup-restore', permission: 'PERM_BACKUP_READ' },
                { icon: Braces, label: t('mit_api_and_api_tokens', 'API and API Tokens'), path: '/documentation/api-tokens' },
                { icon: BadgeInfo, label: t('mit_about', 'About'), path: '/documentation/about' }
            ]
        }
    ];

    return (
        <>
            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 xl:hidden"
                    onClick={closeSidebar}
                />
            )}

            <aside className={`
        fixed xl:static inset-y-0 left-0 z-30
        w-72 bg-(--sidebar-glass-bg) backdrop-blur-[50px] border-r border-[var(--glass-border)]
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'}
        flex flex-col shadow-xl
      `}>
                <div className="p-6 border-b border-[var(--glass-border)] xl:hidden">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-[var(--gray-12)] to-[var(--accent-11)] bg-clip-text text-transparent">{t('lbl_menu', 'Menu')}</h2>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {filterNavItems(navItems).map((item) => (
                        <div key={item.path || item.label}>
                            {item.children ? (
                                <>
                                    <button
                                        onClick={() => toggleExpand(item.label)}
                                        className={`flex items-center justify-between w-full px-4 py-3 rounded-lg transition-colors text-[var(--gray-12)] hover:bg-[var(--gray-3)]`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <item.icon className="w-5 h-5 transition-all duration-1000 ease-linear" />
                                            <span>{item.label}</span>
                                        </div>
                                        {expandedItems.includes(item.label) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    </button>
                                    {expandedItems.includes(item.label) && (
                                        <div className="ml-4 space-y-1 mt-1 border-l border-[var(--gray-5)] pl-2">
                                            {item.children.map(child => (
                                                <NavLink
                                                    key={child.path}
                                                    to={child.path ?? ''}
                                                    className={({ isActive }) => `
                                                            flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm
                                                            ${isActive
                                                            ? 'bg-[var(--accent-3)] text-[var(--accent-11)] font-medium'
                                                            : 'text-[var(--gray-12)] hover:bg-[var(--gray-3)]'
                                                        }
                                                        `}
                                                >
                                                    <child.icon className="w-4 h-4" />
                                                    <span>{child.label}</span>
                                                </NavLink>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <NavLink
                                    to={item.path ?? ''}
                                    className={({ isActive }) => `
                                        flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                                        ${isActive
                                            ? 'bg-[var(--accent-3)] text-[var(--accent-12)] font-medium'
                                            : 'text-[var(--gray-12)] hover:bg-[var(--gray-3)]'
                                        }
                                    `}
                                >
                                    <item.icon className="w-5 h-5" />
                                    <span>{item.label}</span>
                                </NavLink>
                            )}
                        </div>
                    ))}
                </nav>

                <div className="p-4 border-t border-[var(--gray-5)]">
                    <button
                        className="flex items-center gap-3 px-4 py-1 w-full rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                        onClick={handleLogout}
                    >
                        <LogOut className="w-5 h-5" />
                        <span>{t('btn_sign_out', 'Sign Out')}</span>
                    </button>
                </div>

                <Dialog.Root open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
                    <Dialog.Content style={{ maxWidth: 450 }}>
                        <Dialog.Title>{t('lbl_logging_out_user', 'Logging out user')} <span className="text-[var(--accent-10)]">{user?.username}</span></Dialog.Title>
                        <Dialog.Description size="2" mb="4">
                            {t('lbl_logout_confirmation', 'Are you sure you want to log out from this session?')}
                        </Dialog.Description>

                        <Flex gap="3" mt="4" justify="end">
                            <Dialog.Close>
                                <Button variant="soft" color="gray">
                                    <ArrowBigLeft className="w-5 h-5" />
                                    {t('btn_back', 'Back')}
                                </Button>
                            </Dialog.Close>
                            <Button variant="solid" color="red" onClick={confirmLogout}>
                                <LogOut className="w-5 h-5" />
                                {t('btn_logout', 'Logout')}
                            </Button>
                        </Flex>
                    </Dialog.Content>
                </Dialog.Root>

            </aside>
        </>
    );
};

export default Sidebar;
