import React from 'react';
import {Dialog, Button, Flex, Text, Box, Badge} from '@radix-ui/themes';
import {SchemaDiffSummary, SECTION_DIFF_PREFIX, sectionIdToName} from '../../merge/schemaDiff';
import {ISectionCatalogEntry} from '../../../../models/section-catalog.model';
import {ArrowLeft, RefreshCcw, User} from "lucide-react";

interface Props {
  open: boolean,
  user: string,
  schemaName: string,
  diff: SchemaDiffSummary,
  /** Catalog keyed by documentId, used to show section names instead of ids. */
  catalogByDocId?: Map<string, ISectionCatalogEntry>,
  onUseNew: () => void,
  onContinue: () => void,
}

const pluralize = (n: number, kind: string) => `${n} ${kind}${n === 1 ? '' : 's'}`;

function summaryLine(label: string, items: string[]): React.ReactNode {
  const head = items.slice(0, 5).join(', ');
  const ellipsis = items.length > 5 ? ', …' : '';
  return (
    <li>
      <Text size="2">
        {label}: {pluralize(items.length, 'field')}
        {items.length > 0 && ` (${head}${ellipsis})`}
      </Text>
    </li>
  );
}

export const SchemaCascadeModal: React.FC<Props> = ({
                                                      open,
                                                      user,
                                                      schemaName,
                                                      diff,
                                                      catalogByDocId,
                                                      onUseNew,
                                                      onContinue
                                                    }) => {
  // Section changes arrive as `section:<catalogEntryDocumentId>`; render the
  // catalog displayName instead of the raw id. Field entries pass through.
  const humanize = (label: string): string =>
    label.startsWith(SECTION_DIFF_PREFIX)
      ? `Section "${sectionIdToName(label.slice(SECTION_DIFF_PREFIX.length), catalogByDocId)}"`
      : label;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => {
      if (!o) onContinue();
    }}>
      <Dialog.Content maxWidth="520px">
        <Dialog.Title>Schema updated</Dialog.Title>
        <Dialog.Description size="2" mb="3">
          <Box mb="4">

            <Flex direction="column" gap="2" mb="2">
              <Flex direction="row" gap="1" align="center">
                <Badge><User size={16}/>{user}</Badge>
                <p> updated schema <Text weight="bold">{schemaName}</Text></p>
              </Flex>

              <p>You can continue editing with current one, but doing so might lead to data loss. It is recommended to
                load the new schema now.</p>
            </Flex>
          </Box>
        </Dialog.Description>

        <Box mb="4">
          <ul style={{paddingLeft: '1.25rem', margin: 0, listStyleType: 'disc'}}>
            {summaryLine('Added', diff.added.map(humanize))}
            {summaryLine('Removed', diff.removed.map(humanize))}
            {summaryLine('Type changes', diff.typeChanged.map(humanize))}
          </ul>
        </Box>

        <Flex gap="3" justify="end" wrap="wrap">
          <Button variant="soft" color="gray" onClick={onContinue}>
            <ArrowLeft size={16}/>
            Continue editing
          </Button>
          <Button variant="solid" onClick={onUseNew}>
            <RefreshCcw size={16} />
            Load new
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};
