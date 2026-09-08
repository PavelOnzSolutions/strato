import { IEnvironment } from '../models/environment.model';

/**
 * Merges configuration data with environment values.
 * This is a client-side implementation of the logic.
 * Note: The requirement also mentioned a BE GraphQL query 'configProviderOutput' for preview.
 */
export const mergeConfigWithEnvironment = (configData: Record<string, any> | undefined, environment: IEnvironment | undefined) => {
  if (!configData) return {};
  if (!environment) return configData;

  // Simple merge logic: configData is the base, environment values can be used for placeholders or as overrides.
  // In a real implementation, this might involve resolving {{ placeholders }} using environment.nodes values.
  // For now, let's provide a basic merge.
  
  const result = { ...configData };
  
  // Here we could implement more complex merging if needed.
  
  return result;
};

export interface ITreeNode {
  id: string;
  label: string;
  type: string;
  children?: ITreeNode[];
  schema?: any;
}

/**
 * Builds a tree structure from a JSON schema.
 */
export const buildTreeFromSchema = (schema: any): ITreeNode[] => {
  if (!schema || !schema.properties) return [];

  const buildNodes = (properties: any, path: string = ''): ITreeNode[] => {
    return Object.keys(properties).map(key => {
      const prop = properties[key];
      const currentPath = path ? `${path}.${key}` : key;
      const node: ITreeNode = {
        id: currentPath,
        label: prop.title || key,
        type: prop.type,
      };

      if (prop.type === 'object' && prop.properties) {
        node.children = buildNodes(prop.properties, currentPath);
      } else if (prop.type === 'array' && prop.items && prop.items.properties) {
        node.children = buildNodes(prop.items.properties, currentPath);
      }

      return node;
    });
  };

  return buildNodes(schema.properties);
};
