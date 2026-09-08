import React from 'react';
import {Badge, Flex, IconButton, Table, Text} from '@radix-ui/themes';
import {ArrowUpRight, CheckCircle2, Clock2, PlayCircle, XCircle} from 'lucide-react';

interface IDeploymentActivity {
    id: string;
    timestamp: string;
    userLogin: string;
    data: {
        status: 'START' | 'SUCCESS' | 'FAILURE';
        environmentName: string;
        message?: string;
    };
    entityId: string;
}

interface DeploymentTableProps {
    deployments: IDeploymentActivity[] | undefined;
    onNavigate: (path: string) => void;
}

const DeploymentTable: React.FC<DeploymentTableProps> = ({ deployments, onNavigate }) => {
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'SUCCESS':
                return <Badge color="green" variant="soft"><CheckCircle2 size={12} className="mr-1" /> Success</Badge>;
            case 'FAILURE':
                return <Badge color="red" variant="soft"><XCircle size={12} className="mr-1" /> Failed</Badge>;
            case 'START':
                return <Badge color="blue" variant="soft"><PlayCircle size={12} className="mr-1" /> Initialized</Badge>;
            default:
                return <Badge color="gray">{status}</Badge>;
        }
    };

    return (
        <Table.Root variant="surface">
            <Table.Header>
                <Table.Row>
                    <Table.ColumnHeaderCell>Environment</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>User</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Time</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {deployments?.map((dep) => (
                    <Table.Row key={dep.id}>
                        <Table.RowHeaderCell>
                            <Text weight="bold" size="2">{dep.data.environmentName}</Text>
                        </Table.RowHeaderCell>
                        <Table.Cell>
                            <Text size="1" color="gray">{dep.userLogin}</Text>
                        </Table.Cell>
                        <Table.Cell>
                            {getStatusBadge(dep.data.status)}
                        </Table.Cell>
                        <Table.Cell>
                            <Flex align="center" gap="1">
                                <Clock2 size={12} color="gray" />
                                <Text size="1" color="gray">
                                    {new Date(dep.timestamp).toLocaleString()}
                                </Text>
                            </Flex>
                        </Table.Cell>
                        <Table.Cell>
                            <IconButton
                                variant="ghost"
                                size="1"
                                onClick={() => onNavigate(`/environments/definitions/${dep.entityId}`)}
                            >
                                <ArrowUpRight size={14} />
                            </IconButton>
                        </Table.Cell>
                    </Table.Row>
                ))}
                {(!deployments || deployments.length === 0) && (
                    <Table.Row>
                        <Table.Cell colSpan={5} align="center">
                            <Text color="gray" size="2">No recent deployment activity found.</Text>
                        </Table.Cell>
                    </Table.Row>
                )}
            </Table.Body>
        </Table.Root>
    );
};

export default DeploymentTable;
