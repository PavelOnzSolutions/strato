import {Badge, Box, Card, Checkbox, Flex, Text} from '@radix-ui/themes';
import {
    PERMISSION_SCOPES,
    getImpliedPermissions,
    scopeToLabel,
    levelToLabel,
    toPermissionString,
    permissionToLabel
} from '../../constants/permissions';

interface PermissionSelectorProps {
    selected: string[];
    onChange: (perms: string[]) => void;
    maxHeight?: number;
    readOnly?: boolean;
}

const PermissionSelector = ({ selected, onChange, maxHeight = 400, readOnly = false }: PermissionSelectorProps) => {

    const handleToggle = (scope: string, level: string, checked: boolean) => {
        const affected = getImpliedPermissions(scope, level, checked);
        if (checked) {
            // add affected permissions that aren't already selected
            const merged = new Set(selected);
            affected.forEach(p => merged.add(p));
            onChange(Array.from(merged));
        } else {
            // remove affected permissions
            const toRemove = new Set(affected);
            onChange(selected.filter(p => !toRemove.has(p)));
        }
    };

    return (
        <Card variant="surface">
            <Flex direction="column" gap="3" style={{ maxHeight, overflowY: 'auto', padding: 4 }}>
                {PERMISSION_SCOPES.map(({ scope, levels }) => (
                    <Box key={scope}>
                        <Text size="2" weight="bold" color="gray" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {scopeToLabel(scope)}
                        </Text>
                        <Flex direction="column" gap="1" mt="1" ml="3">
                            {levels.map(level => {
                                const perm = toPermissionString(scope, level);
                                return (
                                    <label key={perm} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 8px', borderRadius: 4 }}>
                                        <Checkbox
                                            checked={selected.includes(perm)}
                                            onCheckedChange={(checked) => handleToggle(scope, level, checked === true)}
                                            disabled={readOnly}
                                        />
                                        <Badge color="gray" variant="outline" size="1">{levelToLabel(level)}</Badge>
                                        <Text size="2" color="gray">{permissionToLabel(perm)}</Text>
                                    </label>
                                );
                            })}
                        </Flex>
                    </Box>
                ))}
            </Flex>
        </Card>
    );
};

export default PermissionSelector;
