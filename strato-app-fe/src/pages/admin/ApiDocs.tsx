import {Box, Card, Flex, Tabs, Text} from '@radix-ui/themes';
import {Database, FileBracesCorner, Globe, RefreshCw} from 'lucide-react';
import {useToolbar} from '../../context/ToolbarContext';
import {usePageTitle} from '../../context/PageTitleContext';
import {useState} from 'react';
import config from '../../config';
import {useTranslation} from 'react-i18next';

const ApiDocs = () => {
  const {t} = useTranslation();
  const [iframeKey, setIframeKey] = useState(0);
  const [activeTab, setActiveTab] = useState('rest');
  const token = localStorage.getItem('token');

  usePageTitle(t('ptitle_api_docs', 'API Documentation'));

  const handleRefresh = () => {
    setIframeKey(prev => prev + 1);
  };

  useToolbar([
    {id: 'refresh', label: t('btn_refresh', 'Refresh'), icon: RefreshCw, onClick: handleRefresh, variant: 'soft'},
  ]);

  const restUrl = `${config.baseUrl}/swagger-ui.html${token ? `?token=${token}` : ''}`;
  const graphqlUrl = `${config.baseUrl}/graphiql${token ? `?token=${token}` : ''}`;

  return (
    <Flex direction="column" height="85vh">
      <Card size="4" className="w-full h-full shadow-lg">
        <Flex direction="column" gap="3">
          <Flex justify="between" align="center" flexShrink="0">
            <Flex direction="column">
              <Flex direction="row" gap="2">
                <FileBracesCorner size={32} color="var(--accent-11)"/>
                <Text size="5" weight="bold">
                  <span
                    className="bg-gradient-to-l from-[var(--gray-12)] to-[var(--accent-10)] bg-clip-text text-transparent">
                  {t('lbl_api_documentation', 'API Documentation')}
                  </span>
                </Text>
              </Flex>
              <Text size="2"
                    color="gray">{t('lbl_api_documentation_desc', 'Interactive API documentation and explorer')}</Text>
            </Flex>

            <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
              <Tabs.List size="2">
                <Tabs.Trigger value="rest">
                  <Flex gap="1" align="center">
                    <Globe size={14}/>
                    {t('lbl_rest_api', 'REST API (Swagger)')}
                  </Flex>
                </Tabs.Trigger>
                <Tabs.Trigger value="graphql">
                  <Flex gap="1" align="center">
                    <Database size={14}/>
                    {t('lbl_graphql', 'GraphQL')}
                  </Flex>
                </Tabs.Trigger>
              </Tabs.List>
            </Tabs.Root>
          </Flex>

          <Box style={{height: 'calc(100vh - 300px)', overflow: 'hidden', position: 'relative'}}>
            <Tabs.Root value={activeTab} className="h-full">
              <Tabs.Content value="rest" className="h-full">
                <iframe
                  key={`rest-${iframeKey}`}
                  src={restUrl}
                  className="w-full h-full border-0 rounded"
                  title="REST API Documentation"
                />
              </Tabs.Content>
              <Tabs.Content value="graphql" className="h-full">
                <iframe
                  key={`graphql-${iframeKey}`}
                  src={graphqlUrl}
                  className="w-full h-full border-0 rounded"
                  title="GraphQL Explorer"
                />
              </Tabs.Content>
            </Tabs.Root>
          </Box>
        </Flex>
      </Card>
    </Flex>
  );
};

export default ApiDocs;
