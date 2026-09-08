import { describe, it, expect } from 'vitest';
import { ROUTE_PERMISSIONS, getRoutePermission } from '../permissionMap';

describe('permissionMap', () => {
  it('has an entry for the new Section Catalog route', () => {
    const entry = getRoutePermission('/configurations/section-catalog');
    expect(entry?.read).toBe('PERM_CONFIG_SECTIONS_READ');
  });

  it('Resources routes require PERM_RESOURCE_READ', () => {
    expect(getRoutePermission('/resources/definitions')?.read).toBe('PERM_RESOURCE_READ');
    expect(getRoutePermission('/resources/categories')?.read).toBe('PERM_RESOURCE_READ');
  });

  it('Deployments uses PERM_VERSIONS_READ', () => {
    expect(getRoutePermission('/deployments/version-matrix')?.read).toBe('PERM_VERSIONS_READ');
  });

  it('Configurations split by scope', () => {
    expect(getRoutePermission('/configurations/maps')?.read).toBe('PERM_CONFIG_PROVIDER_READ');
    expect(getRoutePermission('/configurations/schemas')?.read).toBe('PERM_CONFIG_SCHEMA_READ');
    expect(getRoutePermission('/configurations/section-catalog')?.read).toBe('PERM_CONFIG_SECTIONS_READ');
  });

  it('Admin items carry adminOnly flag', () => {
    expect(getRoutePermission('/admin/users')?.adminOnly).toBe(true);
    expect(getRoutePermission('/admin/cache')?.adminOnly).toBe(true);
  });

  it('Documentation routes are not in the map (intentionally ungated)', () => {
    expect(getRoutePermission('/documentation/users')).toBeUndefined();
  });

  // additional confirms — array should be non-empty
  it('ROUTE_PERMISSIONS is non-empty', () => {
    expect(ROUTE_PERMISSIONS.length).toBeGreaterThan(0);
  });
});
