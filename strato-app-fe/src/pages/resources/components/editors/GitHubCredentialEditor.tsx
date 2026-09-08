import {Box, Button, Flex, Select, Text, TextField} from '@radix-ui/themes';

interface GitHubCredentialEditorProps {
    credType: string;
    setCredType: (val: string) => void;
    username: string;
    setUsername: (val: string) => void;
    token: string;
    setToken: (val: string) => void;
    handleTestCredential: () => void;
    isTesting: boolean;
}

export const GitHubCredentialEditor = ({
    credType,
    setCredType,
    username,
    setUsername,
    token,
    setToken,
    handleTestCredential,
    isTesting
}: GitHubCredentialEditorProps) => {
    return (
        <Flex direction="column" gap="4">
            <Box style={{ maxWidth: '300px' }}>
                <Text as="div" size="2" mb="1" weight="bold">Credential Type *</Text>
                <Select.Root value={credType} onValueChange={setCredType}>
                    <Select.Trigger style={{ width: '100%' }} />
                    <Select.Content>
                        <Select.Item value="PAT">Personal Access Token</Select.Item>
                    </Select.Content>
                </Select.Root>
            </Box>
            <Flex gap="4" wrap="wrap">
                <Box style={{ flex: '1 1 300px' }}>
                    <Text as="div" size="2" mb="1" weight="bold">User Name *</Text>
                    <TextField.Root
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="someone@somewhere.org"
                    />
                </Box>
                <Box style={{ flex: '1 1 300px' }}>
                    <Text as="div" size="2" mb="1" weight="bold">Token *</Text>
                    <TextField.Root
                        type="password"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="ghp_..."
                    />
                </Box>
            </Flex>
            <Box>
                <Button
                    onClick={handleTestCredential}
                    loading={isTesting}
                    variant="soft"
                    disabled={!username || !token}
                >
                    Test Credential
                </Button>
            </Box>
        </Flex>
    );
};
