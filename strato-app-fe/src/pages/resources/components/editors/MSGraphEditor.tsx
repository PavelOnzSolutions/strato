import {Box, Flex, Select, Text, TextField} from '@radix-ui/themes';

interface MSGraphEditorProps {
    graphMethod: string;
    setGraphMethod: (val: string) => void;
    graphApiVersion: string;
    setGraphApiVersion: (val: string) => void;
    graphEndpoint: string;
    setGraphEndpoint: (val: string) => void;
    graphContentType: string;
    setGraphContentType: (val: string) => void;
    graphQueryParameters: string;
    setGraphQueryParameters: (val: string) => void;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const GRAPH_API_VERSIONS = ['v1.0', 'beta'];
const GRAPH_ENDPOINTS = [
    { label: 'Users', value: '/users' },
    { label: 'Invitations', value: '/invitations' },
    { label: 'Groups', value: '/groups' },
    { label: 'Applications', value: '/applications' },
    { label: 'Schema Extensions', value: '/schemaExtensions' },
    { label: 'Domains', value: '/domains' }
];
const CONTENT_TYPES = [
    'application/json',
    'text/plain',
    'application/xml',
    'application/x-www-form-urlencoded'
];

export const MSGraphEditor = ({
    graphMethod,
    setGraphMethod,
    graphApiVersion,
    setGraphApiVersion,
    graphEndpoint,
    setGraphEndpoint,
    graphContentType,
    setGraphContentType,
    graphQueryParameters,
    setGraphQueryParameters
}: MSGraphEditorProps) => {
    return (
        <Flex gap="4" wrap="wrap">
            <Box style={{ flex: '1 1 100px' }}>
                <Text as="div" size="2" mb="1" weight="bold">Method</Text>
                <Select.Root value={graphMethod} onValueChange={setGraphMethod}>
                    <Select.Trigger style={{ width: '100%' }} />
                    <Select.Content>
                        {HTTP_METHODS.map(m => <Select.Item key={m} value={m}>{m}</Select.Item>)}
                    </Select.Content>
                </Select.Root>
            </Box>
            <Box style={{ flex: '1 1 100px' }}>
                <Text as="div" size="2" mb="1" weight="bold">API Version</Text>
                <Select.Root value={graphApiVersion} onValueChange={setGraphApiVersion}>
                    <Select.Trigger style={{ width: '100%' }} />
                    <Select.Content>
                        {GRAPH_API_VERSIONS.map(v => <Select.Item key={v} value={v}>{v}</Select.Item>)}
                    </Select.Content>
                </Select.Root>
            </Box>
            <Box style={{ flex: '1 1 200px' }}>
                <Text as="div" size="2" mb="1" weight="bold">API</Text>
                <Select.Root value={graphEndpoint} onValueChange={setGraphEndpoint}>
                    <Select.Trigger style={{ width: '100%' }} />
                    <Select.Content>
                        {GRAPH_ENDPOINTS.map(e => <Select.Item key={e.value} value={e.value}>{e.label}</Select.Item>)}
                    </Select.Content>
                </Select.Root>
            </Box>
            <Box style={{ flex: '1 1 200px' }}>
                <Text as="div" size="2" mb="1" weight="bold">Content Type</Text>
                <Select.Root value={graphContentType} onValueChange={setGraphContentType}>
                    <Select.Trigger style={{ width: '100%' }} />
                    <Select.Content>
                        {CONTENT_TYPES.map(c => <Select.Item key={c} value={c}>{c}</Select.Item>)}
                    </Select.Content>
                </Select.Root>
            </Box>
            <Box style={{ flex: '1 1 100%' }}>
                <Text as="div" size="2" mb="1" weight="bold">Query Parameters</Text>
                <TextField.Root
                    value={graphQueryParameters}
                    onChange={(e) => setGraphQueryParameters(e.target.value)}
                    placeholder="e.g. $expand=members&$select=id,displayName"
                />
            </Box>
        </Flex>
    );
};
