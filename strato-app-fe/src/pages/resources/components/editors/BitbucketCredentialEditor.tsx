import {Box, Button, Flex, Select, Text, TextField} from '@radix-ui/themes';

interface BitbucketCredentialEditorProps {
    credType: string;
    setCredType: (val: string) => void;
    username: string;
    setUsername: (val: string) => void;
    token: string;
    setToken: (val: string) => void;
    handleTestCredential: () => void;
    isTesting: boolean;
}

export const BitbucketCredentialEditor = ({
    credType,
    setCredType,
    username,
    setUsername,
    token,
    setToken,
    handleTestCredential,
    isTesting
}: BitbucketCredentialEditorProps) => {
    return (
        <Flex direction="column" gap="4">
            <Box style={{ maxWidth: '300px' }}>
                <Text as="div" size="2" mb="1" weight="bold">Credential Type *</Text>
                <Select.Root value={credType} onValueChange={setCredType}>
                    <Select.Trigger style={{ width: '100%' }} />
                    <Select.Content>
                        <Select.Item value="APP_PASSWORD">App Password</Select.Item>
                        <Select.Item value="ACCESS_TOKEN">Access Token</Select.Item>
                    </Select.Content>
                </Select.Root>
            </Box>
            <Flex gap="4" wrap="wrap">
                {credType === 'APP_PASSWORD' && (
                    <Box style={{ flex: '1 1 300px' }}>
                        <Text as="div" size="2" mb="1" weight="bold">User Name *</Text>
                        <TextField.Root
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="someone"
                        />
                    </Box>
                )}
                <Box style={{ flex: '1 1 300px' }}>
                    <Text as="div" size="2" mb="1" weight="bold">{credType === 'APP_PASSWORD' ? 'App Password *' : 'Token *'}</Text>
                    <TextField.Root
                        type="password"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder={credType === 'APP_PASSWORD' ? 'bitbucket-app-password' : 'ATCTT...'}
                    />
                </Box>
            </Flex>
            <Box>
                <Button
                    onClick={handleTestCredential}
                    loading={isTesting}
                    variant="soft"
                    disabled={(credType === 'APP_PASSWORD' && !username) || !token}
                >
                    Test Credential
                </Button>
            </Box>
        </Flex>
    );
};
