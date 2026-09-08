import {LogEntry} from "../Metrics.tsx";
import {Badge, Box, Button, Dialog, Flex, Grid, ScrollArea, Table, Text} from "@radix-ui/themes";
import {useTranslation} from "react-i18next";
import React from "react";

interface SystemLogsProps {
    logs: LogEntry[];
    onLogClick: (log: LogEntry) => void;
}

export const SystemLogs: React.FC<SystemLogsProps> = ({ logs, onLogClick }) => {
    const { t } = useTranslation();

    return (
        <Table.Root variant="surface">
            <Table.Header>
                <Table.Row>
                    <Table.ColumnHeaderCell width="180px">{t('lbl_log_timestamp', 'Timestamp')}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell width="80px">{t('lbl_log_severity', 'Severity')}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell minWidth="280px">{t('lbl_log_class', 'Class')}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>{t('lbl_log_method', 'Method')}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>{t('lbl_log_message', 'Message')}</Table.ColumnHeaderCell>
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {logs.map((log, idx) => (
                    <Table.Row key={idx} className="hover:bg-[var(--accent-2)] cursor-pointer" onClick={() => onLogClick(log)}>
                        <Table.Cell>
                            <Text size="1" color="gray" style={{ fontFamily: 'monospace' }}>{log.timestamp}</Text>
                        </Table.Cell>
                        <Table.Cell>
                            <Badge color={
                                log.severity === 'ERROR' ? 'red' :
                                log.severity === 'WARN' ? 'orange' :
                                log.severity === 'INFO' ? 'blue' :
                                log.severity === 'DEBUG' ? 'gray' : 'cyan'
                            } variant="soft" size="1">
                                {log.severity}
                            </Badge>
                        </Table.Cell>
                        <Table.Cell>
                            <Text size="1" weight="bold" style={{ wordBreak: 'break-all' }}>{log.class}</Text>
                        </Table.Cell>
                        <Table.Cell>
                            <Text size="1" color="gray">{log.method}</Text>
                        </Table.Cell>
                        <Table.Cell>
                            <Box style={{ 
                                maxWidth: 'calc(100vw - 800px)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                <Text size="1" style={{ fontFamily: 'monospace' }}>{log.message}</Text>
                            </Box>
                        </Table.Cell>
                    </Table.Row>
                ))}
            </Table.Body>
        </Table.Root>
    );
};

interface LogDetailDialogProps {
    log: LogEntry | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const LogDetailDialog: React.FC<LogDetailDialogProps> = ({ log, open, onOpenChange }) => {
    const { t } = useTranslation();

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Content style={{ maxWidth: '80vw', maxHeight: '80vh' }}>
                <Dialog.Title>{t('lbl_log_detail', 'Log Entry Detail')}</Dialog.Title>
                {log && (
                    <Flex direction="column" gap="4" mt="3">
                        <Grid columns="2" gap="3">
                            <Box>
                                <Text size="1" color="gray" weight="bold">{t('lbl_log_timestamp', 'Timestamp')}</Text>
                                <Text as="div" size="2">{log.timestamp}</Text>
                            </Box>
                            <Box>
                                <Text size="1" color="gray" weight="bold">{t('lbl_log_severity', 'Severity')}</Text>
                                <Box>
                                    <Badge color={
                                        log.severity === 'ERROR' ? 'red' :
                                        log.severity === 'WARN' ? 'orange' :
                                        log.severity === 'INFO' ? 'blue' :
                                        log.severity === 'DEBUG' ? 'gray' : 'cyan'
                                    } variant="soft" size="1">
                                        {log.severity}
                                    </Badge>
                                </Box>
                            </Box>
                            <Box>
                                <Text size="1" color="gray" weight="bold">{t('lbl_log_class', 'Class')}</Text>
                                <Text as="div" size="2" style={{ wordBreak: 'break-all' }}>{log.class}</Text>
                            </Box>
                            <Box>
                                <Text size="1" color="gray" weight="bold">{t('lbl_log_method', 'Method')}</Text>
                                <Text as="div" size="2">{log.method}</Text>
                            </Box>
                            <Box>
                                <Text size="1" color="gray" weight="bold">{t('lbl_log_thread', 'Thread')}</Text>
                                <Text as="div" size="2">{log.thread}</Text>
                            </Box>
                            <Box>
                                <Text size="1" color="gray" weight="bold">{t('lbl_log_pid', 'PID')}</Text>
                                <Text as="div" size="2">{log.pid}</Text>
                            </Box>
                        </Grid>
                        <Box>
                            <Text size="1" color="gray" weight="bold" mb="1">{t('lbl_log_message', 'Message')}</Text>
                            <ScrollArea scrollbars="both" style={{ maxHeight: '40vh', border: '1px solid var(--gray-5)', borderRadius: 'var(--radius-2)', padding: '10px', backgroundColor: 'var(--gray-2)' }}>
                                <Text size="2" style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{log.message}</Text>
                            </ScrollArea>
                        </Box>
                    </Flex>
                )}
                <Flex justify="end" mt="4">
                    <Dialog.Close>
                        <Button variant="soft" color="gray">{t('btn_close', 'Close')}</Button>
                    </Dialog.Close>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
};
