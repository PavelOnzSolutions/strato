import {Button, Card, Flex, Grid, Heading, Text} from '@radix-ui/themes';
import {ArrowRight} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {ImportSource} from '../../../../models/import.model.ts';

import graphIcon from '/assets/azure/Graph-Explorer.svg';
import armIcon from '/assets/azure/Resource-Groups.svg';

type Props = {
  source?: ImportSource;
  onSelectSource: (src: ImportSource) => void;
  onNext: () => void;
};

const ImportStepSourceSelect = ({ source, onSelectSource, onNext }: Props) => {
  const { t } = useTranslation();
  return (
    <Flex direction="column" gap="4" align="center">
      <Text size="5" weight="bold">{t('lbl_import_source_selection', 'Choose your discovery source')}</Text>
      <Grid columns="2" gap="4" width="auto">
        <Card
          size="3"
          className={`cursor-pointer transition-all hover:scale-105 ${source === 'ARM' ? 'ring-2 ring-blue-500' : ''}`}
          style={source === 'ARM' ? { backgroundColor: 'var(--accent-3)' } : {}}
          onClick={() => onSelectSource('ARM')}
        >
          <Flex direction="column" align="center" gap="3" p="4" style={{ minWidth: '200px' }}>
            <img src={armIcon} alt="Graph API" width={48} height={48} />
            <Heading size="4">ARM</Heading>
            <Text align="center" size="2">Azure Resource Manager</Text>
          </Flex>
        </Card>
        <Card
          size="3"
          className={`cursor-pointer transition-all hover:scale-105 ${source === 'GRAPH' ? 'ring-2 ring-blue-500' : ''}`}
          style={source === 'GRAPH' ? { backgroundColor: 'var(--accent-3)' } : {}}
          onClick={() => onSelectSource('GRAPH')}
        >
          <Flex direction="column" align="center" gap="3" p="4" style={{ minWidth: '200px' }}>
            <img src={graphIcon} alt="Graph API" width={48} height={48} />
            <Heading size="4">Graph (preview)</Heading>
            <Text align="center" size="2">Microsoft Graph API</Text>
          </Flex>
        </Card>
      </Grid>
      <Button size="3" mt="4" disabled={!source} onClick={onNext}>
        {t('btn_next', 'Next')} <ArrowRight size={18} />
      </Button>
    </Flex>
  );
};

export default ImportStepSourceSelect;
