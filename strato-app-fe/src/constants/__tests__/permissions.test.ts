import { describe, it, expect } from 'vitest';
import { getImpliedByPermission, AVAILABLE_PERMISSIONS } from '../permissions';

describe('permissions', () => {
  it('CONFIG_SECTIONS_WRITE implies READ', () => {
    const implied = getImpliedByPermission('PERM_CONFIG_SECTIONS_WRITE');
    expect(implied).toEqual(expect.arrayContaining([
      'PERM_CONFIG_SECTIONS_WRITE',
      'PERM_CONFIG_SECTIONS_READ',
    ]));
  });

  it('CONFIG_SECTIONS_READ implies only itself', () => {
    expect(getImpliedByPermission('PERM_CONFIG_SECTIONS_READ'))
      .toEqual(['PERM_CONFIG_SECTIONS_READ']);
  });

  it('AVAILABLE_PERMISSIONS includes the new perms', () => {
    expect(AVAILABLE_PERMISSIONS).toContain('PERM_CONFIG_SECTIONS_READ');
    expect(AVAILABLE_PERMISSIONS).toContain('PERM_CONFIG_SECTIONS_WRITE');
  });
});
