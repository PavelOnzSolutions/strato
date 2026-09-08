import {Badge, Box, Callout, Card, Code, Flex, Heading, Separator, Text} from '@radix-ui/themes';
import {Clock, Cpu, ExternalLink, Grid3X3, Info, Key, MousePointerClick, TableConfig, Terminal, TrendingUp} from 'lucide-react';
import {usePageTitle} from '../../context/PageTitleContext';
import config from '../../config';

const GlobalVersionMatrixHelp = ({hideTitle = false}: { hideTitle?: boolean }) => {
    usePageTitle('Global Version Matrix – Help');

    return (
        <Flex direction="column" gap="6" className="max-w-4xl mx-auto pb-10">
            {!hideTitle && (
                <Box className="py-10">
                    <Flex direction="row" gap="2">
                        <TableConfig size={32} color="var(--accent-11)"/>
                        <Heading size="8"
                                 className="mb-4 bg-clip-text text-transparent bg-gradient-to-l from-[var(--gray-12)] to-[var(--accent-10)] inline-block">
                            Global Version Matrix Help
                        </Heading>
                    </Flex>
                    <Text size="4" color="gray" className="max-w-2xl block">
                        Monitor and manage component versions across all your environments in a single unified view.
                    </Text>
                </Box>
            )}

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Grid3X3 size={22}/>
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Overview</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            The Global Version Matrix provides a bird's-eye view of your entire infrastructure. It
                            displays a heatmap-style matrix of components and environments with color-coded version
                            status, interactive detail panels, and deployment timelines.
                        </Text>
                        <ul className="list-disc pl-6 text-[var(--gray-11)]">
                            <li><strong>Heatmap Matrix</strong>: Color-coded grid showing version status across all
                                environments at a glance.
                            </li>
                            <li><strong>Three-Tier Status</strong>: Green (latest), amber (1 behind), crimson (2+
                                behind) for instant drift detection.
                            </li>
                            <li><strong>Summary Stats</strong>: Quick counts of total components, environments, and
                                version drift items.
                            </li>
                        </ul>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <MousePointerClick size={22}/>
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Interactive Detail Panels</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            Click any component row to expand a detail panel showing deployment history and promotion
                            status.
                        </Text>
                        <ul className="list-disc pl-6 text-[var(--gray-11)]">
                            <li><strong>Click to Expand</strong>: Click a component row to open its detail panel. Click
                                again to collapse.
                            </li>
                            <li><strong>Promotion Cards</strong>: See the version, commit hash, author, and relative
                                time for each environment's deployment.
                            </li>
                            <li><strong>Hover Tooltips</strong>: Hover over version badges for quick deployment details.
                            </li>
                        </ul>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Clock size={22}/>
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Deployment Timeline</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            Each expanded detail panel includes a D3.js-powered timeline visualization showing deployment
                            history.
                        </Text>
                        <ul className="list-disc pl-6 text-[var(--gray-11)]">
                            <li><strong>Time Axis</strong>: Relative time scale showing when deployments occurred.</li>
                            <li><strong>Environment Rows</strong>: Each environment is shown as a row with deployment
                                markers.
                            </li>
                            <li><strong>Color Coding</strong>: Markers are colored by version staleness (green, amber,
                                crimson).
                            </li>
                            <li><strong>Hover Details</strong>: Hover over markers to see version, commit hash, author,
                                and exact timestamp.
                            </li>
                        </ul>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <TrendingUp size={22}/>
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Promotion Path</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            The timeline connects same-version deployments across environments with dashed lines,
                            visualizing the promotion flow (e.g., DEV to STG to PROD).
                        </Text>
                        <ul className="list-disc pl-6 text-[var(--gray-11)]">
                            <li><strong>Connected Markers</strong>: Dashed lines link deployments of the same version
                                across environments.
                            </li>
                            <li><strong>Flow Direction</strong>: Lines follow chronological order, showing the promotion
                                path.
                            </li>
                        </ul>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Key size={22}/>
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">CI/CD Integration & API Tokens</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            To automate version updates from your CI/CD pipelines, you should use API tokens.
                        </Text>
                        <ul className="list-disc pl-6 text-[var(--gray-11)] mb-3">
                            <li>Go to <strong>Administration &gt; API Tokens</strong> to create a new token.</li>
                            <li>Ensure the token has the <Code>PERM_VERSIONS_WRITE</Code> permission assigned to it to
                                allow writing metadata.
                            </li>
                            <li>Use this token in your pipeline's Authorization header as a Bearer token.</li>
                        </ul>
                        <Callout.Root color="amber">
                            <Callout.Icon>
                                <Info/>
                            </Callout.Icon>
                            <Callout.Text>
                                Never share your API tokens or commit them to version control. Use pipeline secrets to
                                store them securely.
                            </Callout.Text>
                        </Callout.Root>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Terminal size={22}/>
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">API & Integrations</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            The following POST endpoint is used for integrating with Strato and updating the version
                            matrix:
                        </Text>
                        <Flex direction="column" gap="2" mb="3">
                            <Text size="2" weight="bold">API Base URL:</Text>
                            <Code variant="ghost" size="3" className="p-2 rounded bg-[var(--gray-3)]">
                                {config.apiBaseUrl}/version-matrix
                            </Code>
                        </Flex>
                        <Text as="p" size="3" color="gray" mb="3">
                            The API accepts <Code>commitId</Code>, <Code>executor</Code>,
                            and <Code>author</Code> fields in addition to the core version data. These are displayed in
                            the detail panels and timeline tooltips.
                        </Text>
                    </Box>
                </Flex>
            </Card>

            <Card size="3">
                <Flex gap="4" align="start">
                    <Box className="p-3 bg-[var(--accent-3)] rounded-full text-[var(--accent-11)]">
                        <Cpu size={22}/>
                    </Box>
                    <Box>
                        <Heading size="4" mb="2">Azure DevOps Extension</Heading>
                        <Text as="p" size="3" color="gray" mb="3">
                            For users of Azure DevOps, there is a dedicated <strong>Extension and tasks for
                            Stratos</strong> available.
                        </Text>
                        <Text as="p" size="3" color="gray" mb="3">
                            This extension provides built-in tasks to:
                        </Text>
                        <ul className="list-disc pl-6 text-[var(--gray-11)] mb-4">
                            <li>Update component versions in the matrix automatically.</li>
                            <li>Trigger deployments from pipelines.</li>
                            <li>Validate environment configurations.</li>
                        </ul>
                        <Flex align="center" gap="2">
                            <ExternalLink size={14} className="text-[var(--accent-9)]"/>
                            <Text size="2" color="indigo" className="cursor-pointer hover:underline">
                                View Extension in Marketplace (Coming Soon)
                            </Text>
                        </Flex>
                    </Box>
                </Flex>
            </Card>

            <Separator size="4"/>

            <Box>
                <Heading size="5" mb="2">Legend</Heading>
                <Flex gap="4" wrap="wrap">
                    <Flex align="center" gap="2">
                        <Badge color="green" variant="soft">Latest</Badge>
                        <Text size="2" color="gray">Running the newest detected version.</Text>
                    </Flex>
                    <Flex align="center" gap="2">
                        <Badge color="amber" variant="soft">Drift</Badge>
                        <Text size="2" color="gray">1 version behind the latest.</Text>
                    </Flex>
                    <Flex align="center" gap="2">
                        <Badge color="crimson" variant="soft">Stale</Badge>
                        <Text size="2" color="gray">2 or more versions behind.</Text>
                    </Flex>
                    <Flex align="center" gap="2">
                        <Badge color="gray" variant="soft">No data</Badge>
                        <Text size="2" color="gray">Not deployed to this environment.</Text>
                    </Flex>
                </Flex>
            </Box>
        </Flex>
    );
};

export default GlobalVersionMatrixHelp;
