import {Box, Callout, Flex, Heading, Progress, Text} from '@radix-ui/themes';
import {Info} from 'lucide-react';
import {ImportSource} from '../../../../models/import.model.ts';

type Props = {
  source?: ImportSource;
  resourceGroup: string;
};

const ImportStepProgress = ({ source, resourceGroup }: Props) => {
  return (
    <Flex direction="column" gap="6" align="center" py="8">
      <Heading size="6">Discovering Resources...</Heading>
      <Box width="100%" style={{ maxWidth: '500px' }}>
        <Progress size="3" />
        <Flex justify="center" mt="2">
          <Text size="1" color="gray">Querying {source} for resources in {resourceGroup}...</Text>
        </Flex>
      </Box>
      <Callout.Root color="blue" size="1">
        <Callout.Icon>
          <Info size={16} />
        </Callout.Icon>
        <Callout.Text>
          Strato is scanning the Azure environment to identify resources and map them to Resource Templates.
        </Callout.Text>
      </Callout.Root>
    </Flex>
  );
};

export default ImportStepProgress;
