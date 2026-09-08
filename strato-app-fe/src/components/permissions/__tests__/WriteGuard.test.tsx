import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button, Theme } from '@radix-ui/themes';
import { WriteGuard } from '../WriteGuard';
import { AuthContext } from '../../../context/AuthContext';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';

i18n.init({
  lng: 'en',
  resources: { en: { translation: { msg_requires_permission: 'Requires permission: {{permission}}' } } }
});

const renderWithAuth = (hasPermission: (p: string) => boolean, ui: React.ReactElement) =>
  render(
    <I18nextProvider i18n={i18n}>
      <Theme>
        <AuthContext.Provider value={{
          user: null, login: vi.fn(), loginWithMicrosoft: vi.fn(), logout: vi.fn(),
          refreshToken: vi.fn(), isAuthenticated: true, isLoading: false,
          hasAnyRole: () => false, hasPermission, hasAnyPermissions: () => false,
          tokenExpiration: null, tokenIssuedAt: null,
        } as any}>
          {ui}
        </AuthContext.Provider>
      </Theme>
    </I18nextProvider>
  );

describe('WriteGuard', () => {
  it('renders child enabled when permission granted', () => {
    renderWithAuth(() => true,
      <WriteGuard permission="PERM_FOO_WRITE"><Button>Save</Button></WriteGuard>
    );
    expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
  });

  it('renders child disabled when permission absent', () => {
    renderWithAuth(() => false,
      <WriteGuard permission="PERM_FOO_WRITE"><Button>Save</Button></WriteGuard>
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});
