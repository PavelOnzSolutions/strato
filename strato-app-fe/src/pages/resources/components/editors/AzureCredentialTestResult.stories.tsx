import { Meta, StoryObj } from '@storybook/react';
import { AzureCredentialTestResult } from './AzureCredentialTestResult';
import type { IAzureCredentialValidationResult } from '../../../../models/resource.model';

const meta = {
    title: 'Resources/AzureCredentialTestResult',
    component: AzureCredentialTestResult,
    args: { onClear: () => console.log('cleared') },
} satisfies Meta<typeof AzureCredentialTestResult>;

export default meta;

type Story = StoryObj<typeof meta>;

const successSp: IAzureCredentialValidationResult = {
    valid: true,
    durationMs: 412,
    identity: {
        type: 'SERVICE_PRINCIPAL',
        objectId: '9b7c2e1a-aaaa-bbbb-cccc-dddddddddddd',
        appId: '1f2e3d4c-aaaa-bbbb-cccc-eeeeeeeeeeee',
        displayName: 'my-strato-sp',
    },
    tenant: { id: '54f9e2c1-1234-4abc-8888-aaaaaaaaaaaa', displayName: 'Contoso' },
    token: {
        audience: 'https://management.azure.com/',
        issuer: 'https://sts.windows.net/54f9e2c1-1234-4abc-8888-aaaaaaaaaaaa/',
        issuedAt: new Date(Date.now() - 60_000).toISOString(),
        notBefore: new Date(Date.now() - 60_000).toISOString(),
        expiresAt: new Date(Date.now() + 59 * 60_000).toISOString(),
        authenticationMethods: [],
    },
    permissions: {
        scopes: [],
        appRoles: ['Reader', 'Writer'],
        directoryRoles: [{ id: 'wid-1', displayName: 'Global Reader' }],
    },
    rawClaims: { tid: '54f9…', oid: '9b7c…', appid: '1f2e…', roles: ['Reader', 'Writer'] },
    graphWarnings: [],
};

const failure: IAzureCredentialValidationResult = {
    valid: false,
    durationMs: 380,
    error: {
        code: 'AADSTS7000215',
        message: 'Invalid client secret provided. Ensure the secret being sent in the request is the client secret value, not the client secret ID.',
        correlationId: '7f8e1b2c-aaaa-4d3e-bbbb-9c0d1e2f3a4b',
        timestamp: '2026-05-16T14:32:08Z',
        exceptionClass: 'com.azure.core.exception.ClientAuthenticationException',
    },
};

export const SuccessServicePrincipal: Story = { args: { result: successSp } };
export const FailureWrongSecret: Story = { args: { result: failure } };
export const Empty: Story = { args: { result: null } };
