import * as Collapsible from '@radix-ui/react-collapsible';
import { Box, Button, Card, Code, Flex, IconButton, Text } from '@radix-ui/themes';
import { Check, ChevronRight, Copy, X } from 'lucide-react';
import { useState } from 'react';
import type { IAzureCredentialValidationResult } from '../../../../models/resource.model';

interface Props {
    result: IAzureCredentialValidationResult | null;
    onClear: () => void;
}

export function AzureCredentialTestResult({ result, onClear }: Props) {
    if (!result) return null;
    return (
        <Card mt="3" size="2">
            <Header result={result} onClear={onClear} />
            {result.valid ? <SuccessBody result={result} /> : <FailureBody result={result} />}
        </Card>
    );
}

function Header({ result, onClear }: { result: IAzureCredentialValidationResult; onClear: () => void }) {
    const duration = result.durationMs != null ? ` (${result.durationMs} ms)` : '';
    return (
        <Flex justify="between" align="center">
            {result.valid ? (
                <Flex align="center" gap="1">
                    <Text color="green" weight="medium" size="2">
                        <Check size={16} aria-hidden style={{ display: 'inline', verticalAlign: '-3px' }} /> Valid{duration}
                    </Text>
                </Flex>
            ) : (
                <Flex align="center" gap="1">
                    <Text color="red" weight="medium" size="2">
                        <X size={16} aria-hidden style={{ display: 'inline', verticalAlign: '-3px' }} /> Failed{duration}
                    </Text>
                </Flex>
            )}
            <Button type="button" onClick={onClear} variant="ghost" size="1" color="gray">
                Clear
            </Button>
        </Flex>
    );
}

function SuccessBody({ result }: { result: IAzureCredentialValidationResult }) {
    return (
        <Box mt="2">
            <Section title="Identity" defaultOpen>
                <KV label="Display name" value={result.identity?.displayName} />
                <KV label="Type" value={formatType(result.identity?.type)} />
                <KV label="App ID" value={result.identity?.appId} copyable />
                <KV label="Object ID" value={result.identity?.objectId} copyable />
                {result.identity?.userPrincipalName && (
                    <KV label="UPN" value={result.identity.userPrincipalName} copyable />
                )}
                <KV
                    label="Tenant"
                    value={
                        result.tenant?.displayName
                            ? `${result.tenant.displayName} (${result.tenant.id})`
                            : result.tenant?.id
                    }
                    copyable
                />
            </Section>

            <Section title="Token">
                <KV label="Audience" value={result.token?.audience} />
                <KV label="Issuer" value={result.token?.issuer} />
                <KV label="Issued" value={formatTime(result.token?.issuedAt)} />
                <KV label="Not before" value={formatTime(result.token?.notBefore)} />
                <KV label="Expires" value={formatTime(result.token?.expiresAt)} />
                {result.token?.authenticationMethods && result.token.authenticationMethods.length > 0 && (
                    <KV label="Auth methods" value={result.token.authenticationMethods.join(', ')} />
                )}
            </Section>

            <PermissionsSection permissions={result.permissions} />

            {result.rawClaims && (
                <Section title="Raw claims">
                    <CodeBlock text={JSON.stringify(result.rawClaims, null, 2)} />
                    <Box mt="1">
                        <CopyButton text={JSON.stringify(result.rawClaims, null, 2)} label="Copy JSON" />
                    </Box>
                </Section>
            )}

            {result.graphWarnings && result.graphWarnings.length > 0 && (
                <Section title={`Graph warnings (${result.graphWarnings.length})`}>
                    <Box pl="5" asChild>
                        <ul style={{ listStyle: 'disc' }}>
                            {result.graphWarnings.map((w, i) => (
                                <li key={i}>
                                    <Text color="amber" size="2">{w}</Text>
                                </li>
                            ))}
                        </ul>
                    </Box>
                </Section>
            )}
        </Box>
    );
}

function FailureBody({ result }: { result: IAzureCredentialValidationResult }) {
    const err = result.error;
    if (!err) {
        return (
            <Box mt="2">
                <Text color="red" size="2">Failed (no error detail available).</Text>
            </Box>
        );
    }
    return (
        <Box mt="2">
            <Text as="div" color="red" size="2">
                <Text weight="medium">{err.code ?? 'Error'}</Text>
                {err.message ? ` — ${err.message}` : ''}
            </Text>
            {err.correlationId && (
                <Flex align="center" gap="2" mt="1">
                    <Text size="1" color="gray">Correlation ID:</Text>
                    <Code size="1" variant="soft">{err.correlationId}</Code>
                    <CopyButton text={err.correlationId} label="" iconOnly />
                </Flex>
            )}
            {err.timestamp && (
                <Text as="div" size="1" color="gray" mt="1">
                    Timestamp: {err.timestamp}
                </Text>
            )}
            <Section title="Raw exception">
                <CodeBlock text={JSON.stringify(err, null, 2)} />
            </Section>
        </Box>
    );
}

function PermissionsSection({ permissions }: { permissions?: IAzureCredentialValidationResult['permissions'] }) {
    if (!permissions) return null;
    const hasAny =
        (permissions.scopes && permissions.scopes.length > 0) ||
        (permissions.appRoles && permissions.appRoles.length > 0) ||
        (permissions.directoryRoles && permissions.directoryRoles.length > 0);
    if (!hasAny) return null;
    return (
        <Section title="Permissions">
            {permissions.scopes && permissions.scopes.length > 0 && (
                <PermissionList title="Scopes" items={permissions.scopes.map((s) => ({ key: s, label: s }))} />
            )}
            {permissions.appRoles && permissions.appRoles.length > 0 && (
                <PermissionList title="App roles" items={permissions.appRoles.map((r) => ({ key: r, label: r }))} />
            )}
            {permissions.directoryRoles && permissions.directoryRoles.length > 0 && (
                <PermissionList
                    title="Directory roles"
                    items={permissions.directoryRoles.map((r) => ({ key: r.id, label: r.displayName ?? r.id }))}
                />
            )}
        </Section>
    );
}

function PermissionList({ title, items }: { title: string; items: { key: string; label: string }[] }) {
    return (
        <Box mb="1">
            <Text size="2" weight="medium">{title}</Text>
            <Box pl="5" asChild>
                <ul style={{ listStyle: 'disc' }}>
                    {items.map((item) => (
                        <li key={item.key}>
                            <Text size="2">{item.label}</Text>
                        </li>
                    ))}
                </ul>
            </Box>
        </Box>
    );
}

function Section({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
    const [open, setOpen] = useState(!!defaultOpen);
    return (
        <Collapsible.Root open={open} onOpenChange={setOpen}>
            <Collapsible.Trigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    color="gray"
                    size="2"
                    style={{ width: '100%', justifyContent: 'flex-start', fontWeight: 500 }}
                >
                    <ChevronRight
                        size={14}
                        style={{ transition: 'transform 0.15s', transform: open ? 'rotate(90deg)' : 'none' }}
                        aria-hidden
                    />
                    {title}
                </Button>
            </Collapsible.Trigger>
            <Collapsible.Content>
                <Box pl="5" pt="1">{children}</Box>
            </Collapsible.Content>
        </Collapsible.Root>
    );
}

function KV({ label, value, copyable }: { label: string; value?: string | null; copyable?: boolean }) {
    if (value == null || value === '') return null;
    return (
        <Flex align="center" gap="2" py="1">
            <Text size="2" color="gray" style={{ width: '8rem', flexShrink: 0 }}>{label}</Text>
            <Text size="2" style={{ wordBreak: 'break-all' }}>{value}</Text>
            {copyable && <CopyButton text={value} label="" iconOnly />}
        </Flex>
    );
}

function CopyButton({ text, label, iconOnly }: { text: string; label: string; iconOnly?: boolean }) {
    const [copied, setCopied] = useState(false);
    const handle = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };
    const ariaLabel = `Copy ${label || 'value'}`;
    if (iconOnly) {
        return (
            <IconButton type="button" onClick={handle} variant="ghost" size="1" color="gray" aria-label={ariaLabel}>
                {copied ? <Check size={12} /> : <Copy size={12} />}
            </IconButton>
        );
    }
    return (
        <Button type="button" onClick={handle} variant="ghost" size="1" color="gray" aria-label={ariaLabel}>
            {copied ? <Check size={12} /> : <Copy size={12} />}
            <Text size="1">{copied ? 'Copied' : label || 'Copy'}</Text>
        </Button>
    );
}

function CodeBlock({ text }: { text: string }) {
    return (
        <Box
            p="2"
            style={{
                background: 'var(--gray-2)',
                borderRadius: 'var(--radius-2)',
                overflow: 'auto',
                fontFamily: 'var(--code-font-family)',
                fontSize: 'var(--font-size-1)',
                color: 'var(--gray-12)',
                whiteSpace: 'pre',
            }}
        >
            {text}
        </Box>
    );
}

function formatType(t?: string): string | undefined {
    if (t === 'USER') return 'User';
    if (t === 'SERVICE_PRINCIPAL') return 'Service Principal';
    return t;
}

function formatTime(iso?: string): string | undefined {
    if (!iso) return undefined;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const now = Date.now();
    const diffMin = Math.round((d.getTime() - now) / 60_000);
    const rel =
        diffMin === 0 ? 'now'
        : diffMin > 0 ? `in ${diffMin} min`
        : `${Math.abs(diffMin)} min ago`;
    return `${d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, 'Z')} (${rel})`;
}
