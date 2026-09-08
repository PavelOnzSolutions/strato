import {Card, Flex, Heading, Text} from "@radix-ui/themes";
import TrueFocus from "../../ux-feats/TrueFocus";
import {useTranslation} from 'react-i18next';
import {useQuery} from "@tanstack/react-query";
import {fetchWithAuth} from "../../utils/api";
import {getRunningTasks} from '../deployments/deployments.ts';
import config from "../../config.ts";

interface VersionInfo {
    git?: {
        build?: {
            version: string;
        };
        commit?: {
            id?: {
                abbrev: string;
            };
            user?: {
                email: string;
            };
        };
    };
}

const fetchInfo = async (): Promise<VersionInfo> => {
    const response = await fetchWithAuth('/management/info');
    if (!response.ok) throw new Error('Failed to fetch info');
    return response.json();
};

export const About = () => {
    const { t } = useTranslation();

    const { data: info, status: infoStatus } = useQuery({
        queryKey: ['strato-info'],
        queryFn: fetchInfo,
    });

    const { data: runningTasks } = useQuery({
        queryKey: ['running-tasks'],
        queryFn: getRunningTasks,
        refetchInterval: 10000,
    });

    const platformVersion = info?.git?.build?.version || '---';
    const commitId = info?.git?.commit?.id?.abbrev || '---';
    const commitAuthor = info?.git?.commit?.user?.email || '---';
    const backendStatus = infoStatus === 'success' ? 'UP' : (infoStatus === 'loading' ? '...' : 'DOWN');
    const runningJobsCount = runningTasks?.length ?? 0;

    return (
        <div className="relative h-screen w-full overflow-hidden bg-[var(--color-background)]">

            {/* Content Layer */}
            <div className="relative z-10 h-full flex flex-col items-center justify-center p-4">

                <div className="max-w-2xl w-full text-center space-y-8">
                    <div className="space-y-2">
                        <h1 className="text-6xl font-bold bg-clip-text text-transparent static-plasma-text pb-2">
                            Strato
                        </h1>
                        <Text size="6" className="font-light">
                            <TrueFocus
                                sentence="Basswood Management"
                                manualMode={false}
                                blurAmount={5}
                                borderColor="var(--accent-11)"
                                animationDuration={2}
                                pauseBetweenAnimations={2}
                            />
                        </Text>
                    </div>

                    <Card className="p-8 backdrop-blur-xl shadow-2xl">
                        <Flex direction="column" gap="4">
                            <Text as="p" size="3" className="tleading-relaxed">
                                {t('lbl_strato_description', 'Strato is a powerful management tool designed to automate Basswoods deployments and to provide centralized configuration store.')}
                            </Text>

                            <div className="grid grid-cols-3 gap-4 mt-4">
                                <div className="p-4 rounded-lg border">
                                    <Heading size="6" className="text-blue-400 mb-1">{platformVersion}</Heading>
                                    <Text size="1" className="text-gray-400 uppercase tracking-wider">{t('lbl_platform_version', 'Platform Version')}</Text>
                                </div>
                                <div className="p-4 rounded-lg border">
                                    <Heading size="6" className="text-red-400 mb-1">{commitId}</Heading>
                                    <Text size="1" className="text-gray-400 uppercase tracking-wider">{t('lbl_commit', 'Commit ID')}</Text>
                                </div>
                                <div className="p-4 rounded-lg border">
                                    <Heading size="3" className="text-green-400 mb-1">{commitAuthor}</Heading>
                                    <Text size="1" className="text-gray-400 uppercase tracking-wider">{t('lbl_commit_author', 'Commit Author')}</Text>
                                </div>
                                <div className="p-4 rounded-lg border">
                                    <Heading size="6" className={`${backendStatus === 'UP' ? 'text-orange-400' : 'text-gray-400'} mb-1`}>{backendStatus}</Heading>
                                    <Text size="1" className="text-gray-400 uppercase tracking-wider">{t('lbl_backend_status', 'Backend status')}</Text>
                                </div>
                                <div className="p-4 rounded-lg border">
                                    <Heading size="6" className="text-teal-400 mb-1">{runningJobsCount}</Heading>
                                    <Text size="1" className="text-gray-400 uppercase tracking-wider">{t('lbl_running_jobs', 'Running Jobs')}</Text>
                                </div>
                            </div>
                        </Flex>
                    </Card>

                    <Text size="1" className="text-gray-500 mt-8 block">
                        {t('lbl_copyright', 'Strato WebUI v{{version}} | © {{year}} Pavel Onz. All rights reserved.', {year: new Date().getFullYear().toString(), version: config.version})}
                    </Text>
                </div>
            </div>
        </div>
    );
};

export default About;
