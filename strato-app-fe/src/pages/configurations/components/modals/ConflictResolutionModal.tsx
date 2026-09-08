import React, {useState} from 'react';
import {Dialog, Button, Flex, Text, Box} from '@radix-ui/themes';
import {DraggableDialogContent} from '../../../../components/system/DraggableDialogContent';
import {MergeConflict, Resolution, ResolutionMap, resolutionKey} from '../../merge/configMerge';

interface Props {
    open: boolean;
    conflicts: MergeConflict[];
    autoMergedCount: number;
    theirsUser: string;
    baseVersion: number;
    latestVersion: number;
    onCancel: () => void;
    onApply: (resolutions: ResolutionMap) => void;
}

function formatValue(v: unknown): string {
    if (v === undefined) return '— deleted —';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
}

export const ConflictResolutionModal: React.FC<Props> = ({
    open, conflicts, autoMergedCount, theirsUser, baseVersion, latestVersion, onCancel, onApply,
}) => {
    const [resolutions, setResolutions] = useState<ResolutionMap>({});

    const pick = (path: [string, string, string], r: Resolution) =>
        setResolutions((prev) => ({...prev, [resolutionKey(path)]: r}));

    return (
        <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
            <DraggableDialogContent
                maxWidth="900px"
                title={`Resolve ${conflicts.length} conflicts — ${theirsUser} also edited this configuration`}
            >
                <Box mb="3">
                    <Text size="2" color="gray">
                        Auto-merged {autoMergedCount} non-conflicting changes. {conflicts.length} fields need your decision.
                    </Text>
                </Box>

                <Box mb="4" style={{overflowX: 'auto'}}>
                    <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem'}}>
                        <thead>
                            <tr style={{borderBottom: '1px solid var(--gray-a5)'}}>
                                <th style={{textAlign: 'left', padding: '0.25rem 0.5rem'}}>Field</th>
                                <th style={{textAlign: 'left', padding: '0.25rem 0.5rem'}}>Base (v{baseVersion})</th>
                                <th style={{textAlign: 'left', padding: '0.25rem 0.5rem'}}>Yours</th>
                                <th style={{textAlign: 'left', padding: '0.25rem 0.5rem'}}>Theirs (v{latestVersion} — {theirsUser})</th>
                                <th style={{textAlign: 'left', padding: '0.25rem 0.5rem'}}>Choice</th>
                            </tr>
                        </thead>
                        <tbody>
                            {conflicts.map((c) => {
                                const key = resolutionKey(c.path);
                                const choice = resolutions[key]?.choice ?? 'ours';
                                return (
                                    <tr key={key} style={{borderBottom: '1px solid var(--gray-a4)', verticalAlign: 'top'}}>
                                        <td style={{padding: '0.5rem', fontFamily: 'var(--code-font-family)'}}>{c.path.join('.')}</td>
                                        <td style={{padding: '0.5rem', color: 'var(--gray-11)'}}>{formatValue(c.base)}</td>
                                        <td style={{padding: '0.5rem'}}>{formatValue(c.ours)}</td>
                                        <td style={{padding: '0.5rem'}}>{formatValue(c.theirs)}</td>
                                        <td style={{padding: '0.5rem', whiteSpace: 'nowrap'}}>
                                            <Flex direction="column" gap="1">
                                                <label>
                                                    <input type="radio" name={key} checked={choice === 'ours'}
                                                           aria-label="Keep yours"
                                                           onChange={() => pick(c.path, {choice: 'ours'})}/>
                                                    <Text size="2" ml="1">Keep yours</Text>
                                                </label>
                                                <label>
                                                    <input type="radio" name={key} checked={choice === 'theirs'}
                                                           aria-label="Take theirs"
                                                           onChange={() => pick(c.path, {choice: 'theirs'})}/>
                                                    <Text size="2" ml="1">Take theirs</Text>
                                                </label>
                                            </Flex>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </Box>

                <Flex gap="3" justify="end">
                    <Button variant="soft" color="gray" onClick={onCancel}>Cancel</Button>
                    <Button variant="solid" onClick={() => onApply(resolutions)}>Apply &amp; Save</Button>
                </Flex>
            </DraggableDialogContent>
        </Dialog.Root>
    );
};
