export interface RoutePermission {
  /** React Router path pattern (matches the path passed to <Route>). */
  path: string;
  /** Required READ permission. Omit = no permission gating (still requires auth). */
  read?: string;
  /** Additionally requires ADMIN role. */
  adminOnly?: boolean;
}

export const ROUTE_PERMISSIONS: RoutePermission[] = [
  // Environments
  { path: '/environments/definitions',           read: 'PERM_ENVIRONMENT_READ' },
  { path: '/environments/definitions/new',       read: 'PERM_ENVIRONMENT_READ' },
  { path: '/environments/definitions/:id',       read: 'PERM_ENVIRONMENT_READ' },
  { path: '/environments/import',                read: 'PERM_ENVIRONMENT_READ' },
  { path: '/environments/deployed',              read: 'PERM_ENVIRONMENT_READ' },
  { path: '/environments/version-matrix/:envId', read: 'PERM_ENVIRONMENT_READ' },
  { path: '/environments/running',               read: 'PERM_ENVIRONMENT_READ' },

  // Deployments
  { path: '/deployments/version-matrix',         read: 'PERM_VERSIONS_READ' },

  // Configurations
  { path: '/configurations/maps',                       read: 'PERM_CONFIG_PROVIDER_READ' },
  { path: '/configurations/maps/new',                   read: 'PERM_CONFIG_PROVIDER_READ' },
  { path: '/configurations/maps/import',                read: 'PERM_CONFIG_PROVIDER_READ' },
  { path: '/configurations/maps/:id',                   read: 'PERM_CONFIG_PROVIDER_READ' },
  { path: '/configurations/maps/:id/provider-view',     read: 'PERM_CONFIG_PROVIDER_READ' },
  { path: '/configurations/maps/:id/tree-view',         read: 'PERM_CONFIG_PROVIDER_READ' },
  { path: '/configurations/schemas',                    read: 'PERM_CONFIG_SCHEMA_READ' },
  { path: '/configurations/schemas/new',                read: 'PERM_CONFIG_SCHEMA_READ' },
  { path: '/configurations/schemas/import',             read: 'PERM_CONFIG_SCHEMA_READ' },
  { path: '/configurations/schemas/:id',                read: 'PERM_CONFIG_SCHEMA_READ' },
  { path: '/configurations/section-catalog',            read: 'PERM_CONFIG_SECTIONS_READ' },

  // Resources
  { path: '/resources/definitions',          read: 'PERM_RESOURCE_READ' },
  { path: '/resources/definitions/new',      read: 'PERM_RESOURCE_READ' },
  { path: '/resources/definitions/:id',      read: 'PERM_RESOURCE_READ' },
  { path: '/resources/definitions/:id/json', read: 'PERM_RESOURCE_READ' },
  { path: '/resources/categories',           read: 'PERM_RESOURCE_READ' },

  // Admin
  { path: '/admin/users',          read: 'PERM_USER_READ',   adminOnly: true },
  { path: '/admin/configuration', read: 'PERM_USER_READ',   adminOnly: true },
  { path: '/admin/roles',         read: 'PERM_ROLE_READ',   adminOnly: true },
  { path: '/admin/audit-log',    read: 'PERM_AUDIT_READ',  adminOnly: true },
  { path: '/admin/backup',       read: 'PERM_BACKUP_READ', adminOnly: true },
  { path: '/admin/api-tokens',   adminOnly: true },
  { path: '/admin/api-docs',     adminOnly: true },
  { path: '/admin/cache',        adminOnly: true },
  { path: '/admin/metrics',      adminOnly: true },
  { path: '/admin/localization', adminOnly: true },
  { path: '/admin/security',     adminOnly: true },
];

export const getRoutePermission = (path: string): RoutePermission | undefined =>
  ROUTE_PERMISSIONS.find(rp => rp.path === path);
