import {Badge, Box, Button, Card, Code, Flex, Heading, Separator, Text} from '@radix-ui/themes';
import {Braces, Eye, EyeOff, Key, ShieldCheck, Terminal, VectorSquare} from 'lucide-react';
import {usePageTitle} from '../../context/PageTitleContext';
import {useNavigate} from "react-router-dom";

import swaggerIcon from "/assets/generics/Swagger.svg"

const ApiTokensHelp = () => {
    const navigate = useNavigate();

    usePageTitle('API and API Tokens');

    return (
        <Flex direction="column" gap="6" className="max-w-4xl mx-auto pb-10">
            <Box className="py-10">
                <Flex direction="row" gap="2">
                    <Braces size={32} color="var(--accent-11)"/>
                    <Heading size="8" className="mb-4 bg-clip-text text-transparent bg-gradient-to-l from-[var(--gray-12)] to-[var(--accent-10)] inline-block">
                        APIs and API Tokens Help
                    </Heading>
                </Flex>
                <Text size="4" color="gray" className="max-w-2xl block">
                    Learn how to interact with the Strato API and manage your programmatic access using API tokens.
                </Text>
            </Box>

            <section>
                <Flex direction="column" gap="4">
                    <Flex gap="3" align="center">
                        <Box className="p-2 bg-[var(--accent-3)] rounded-lg text-[var(--accent-11)]">
                            <Key size={24} />
                        </Box>
                        <Heading size="5">Creating an API Token</Heading>
                    </Flex>
                    <Card size="2">
                        <Flex direction="column" gap="3">
                            <Text size="3">
                                To create a new API token, navigate to the <strong>Administration &gt; API Tokens</strong> page.
                            </Text>
                            <Flex direction="column" gap="2" className="ml-4">
                                <Text size="2" color="gray">1. Click the <strong>New</strong> button in the toolbar.</Text>
                                <Text size="2" color="gray">2. Provide a descriptive name for your token (e.g., "CI/CD Pipeline").</Text>
                                <Text size="2" color="gray">3. Select an expiration period (7 days to 1 year).</Text>
                                <Text size="2" color="gray">4. Click <strong>Create Token</strong>.</Text>
                            </Flex>
                            <Box className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded border border-amber-200 dark:border-amber-900">
                                <Flex gap="2">
                                    <ShieldCheck className="text-amber-600 shrink-0" size={20} />
                                    <Text size="2" color="amber">
                                        <strong>Security Note:</strong> Your API token is only displayed once. Copy it immediately and store it securely. If you lose it, you will need to revoke it and create a new one.
                                    </Text>
                                </Flex>
                            </Box>
                        </Flex>
                    </Card>
                </Flex>
            </section>

            <Separator size="4" />

            <section>
                <Flex direction="column" gap="4">
                    <Flex gap="3" align="center">
                        <Box className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                            <Terminal size={24} />
                        </Box>
                        <Heading size="5">Using Tokens in API Calls</Heading>
                    </Flex>
                    <Text size="3">
                        Strato uses <strong>Bearer Authentication</strong> for API requests. Include your token in the <Code>Authorization</Code> header of your HTTP requests.
                    </Text>
                    <Card size="2" variant="surface">
                        <Flex direction="column" gap="2">
                            <Flex justify="between" align="center">
                                <Text size="1" color="gray" weight="bold">CURL EXAMPLE</Text>
                                <Badge color="gray" variant="soft">bash</Badge>
                            </Flex>
                            <Box className="bg-black/5 dark:bg-black/40 p-3 rounded font-mono text-sm overflow-x-auto">
                                <code className="whitespace-pre">
                                    {`curl -X GET "https://strato.example.com/api/tokens" \\
  -H "Authorization: Bearer YOUR_API_TOKEN_HERE" \\
  -H "Accept: application/json"`}
                                </code>
                            </Box>
                        </Flex>
                    </Card>
                </Flex>
            </section>

            <Separator size="4" />

            <section>
                <Flex direction="column" gap="4">
                    <Flex gap="3" align="center">
                        <Box className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg text-pink-600 dark:text-pink-400">
                            <VectorSquare size={24} />
                        </Box>
                        <Heading size="5">GraphQL API</Heading>
                    </Flex>
                    <Text size="3">
                        Strato provides a powerful GraphQL API for complex data fetching and manipulation. The GraphQL endpoint is available at <Code>/graphql</Code>.
                    </Text>
                    <Card size="2">
                        <Flex direction="column" gap="3">
                            <Text size="2">
                                You can use the same <strong>API Tokens</strong> or <strong>User Sessions</strong> to authenticate GraphQL requests.
                            </Text>
                            <Box className="bg-black/5 dark:bg-black/40 p-3 rounded font-mono text-sm overflow-x-auto">
                                <code className="whitespace-pre">
                                    {`POST /graphql
Authorization: Bearer YOUR_API_TOKEN_HERE
Content-Type: application/json

{
  "query": "{ environments { id name } }"
}`}
                                </code>
                            </Box>
                        </Flex>
                    </Card>
                </Flex>
            </section>

            <Separator size="4" />

            <section>
                <Flex direction="column" gap="4">
                    <Flex gap="3" align="center">
                        <Box className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                            <Eye size={24} />
                        </Box>
                        <Heading size="5">Show/Hide User Sessions</Heading>
                    </Flex>
                    <Text size="3">
                        On the API Tokens management page, you can see both long-lived API tokens and active user sessions (temporary tokens used by the web interface).
                    </Text>
                    <Card size="2">
                        <Flex direction="column" gap="3">
                            <Flex gap="4" align="start">
                                <Box className="p-2 bg-[var(--gray-3)] rounded text-[var(--gray-11)]">
                                    <EyeOff size={20} />
                                </Box>
                                <Box>
                                    <Heading size="3" mb="1">Hide User Sessions</Heading>
                                    <Text size="2" color="gray">
                                        By default, <strong>Hide User Sessions</strong> is enabled. This filters the list to show only the API tokens you've manually created.
                                    </Text>
                                </Box>
                            </Flex>
                            <Flex gap="4" align="start">
                                <Box className="p-2 bg-[var(--accent-3)] rounded text-[var(--accent-11)]">
                                    <Eye size={20} />
                                </Box>
                                <Box>
                                    <Heading size="3" mb="1">Show User Sessions</Heading>
                                    <Text size="2" color="gray">
                                        Toggle the switch in the toolbar to see active sessions. User sessions are automatically created when you log in via the web interface (local or OAuth2) and have short expiration times.
                                    </Text>
                                </Box>
                            </Flex>
                        </Flex>
                    </Card>
                </Flex>
            </section>

            <Box className="mt-8 p-6 bg-(--gray-2) rounded-xl border border-(--gray-4)">
                <Heading size="4" mb="2">Looking for API Documentation?</Heading>
                <Text size="2" color="gray" mb="4">
                    Detailed Swagger/OpenAPI documentation is available in the Administration section. Swagger UI supports both <strong>API Tokens</strong> and <strong>OAuth2 (OpenID Connect)</strong> for authentication.
                </Text>
                <Flex direction="column" className="m-5">
                    <Button className="m-5" variant="outline" size="3" onClick={() => navigate('/admin/api-docs')} >
                        <img src={swaggerIcon} alt="Swagger" width={24} height={24} />
                        Open Swagger
                    </Button>
                </Flex>
            </Box>
        </Flex>
    );
};

export default ApiTokensHelp;
