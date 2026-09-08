export type Flavor = 'AZURE' | 'AWS';
export const FLAVORS: Flavor[] = ['AZURE', 'AWS'];
export const FLAVOR_LABELS: Record<Flavor, string> = {
    AZURE: 'Azure',
    AWS: 'AWS',
};
