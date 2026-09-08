import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Button, Flex, Heading, Tabs, Text } from '@radix-ui/themes';
import { ArrowBigLeft, Settings2, Sliders } from 'lucide-react';
import { usePageTitle } from '../../../context/PageTitleContext';
import { GeneralSettingsTab } from './components/tabs/GeneralSettingsTab';

type TopTab = 'general';

const ConfigurationPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TopTab>('general');

  usePageTitle(t('cfg_page_title', 'Configuration'));

  return (
    <Box p="4">
      <Flex direction="column" gap="6" maxWidth="800px" mx="auto">
        <header>
          <Flex justify="between" align="center" mb="2">
            <Heading size="6">
              <Flex align="center" gap="2">
                <Settings2 size={32} color="var(--accent-9)" />
                <span
                  className="bg-gradient-to-l from-[var(--gray-12)] to-[var(--accent-10)] bg-clip-text text-transparent">
                  {t('head_configuration', 'Configuration')}
                </span>
              </Flex>
            </Heading>
            <Flex gap="2">
              <Button onClick={() => navigate(-1)} variant="soft" color="amber">
                <ArrowBigLeft size={16} /> {t('btn_back', 'Back')}
              </Button>
            </Flex>
          </Flex>
          <Text color="gray" size="2">
            {t('sub_configuration_desc', 'Manage global application behavior and integrations.')}
          </Text>
        </header>

        <Tabs.Root value={activeTab} onValueChange={(v) => setActiveTab(v as TopTab)}>
          <Tabs.List size="2" mb="4">
            <Tabs.Trigger value="general">
              <Flex gap="2" align="center"><Sliders size={14} />{t('cfg_tab_general', 'General Settings')}</Flex>
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="general">
            <GeneralSettingsTab />
          </Tabs.Content>
        </Tabs.Root>
      </Flex>
    </Box>
  );
};

export default ConfigurationPage;
