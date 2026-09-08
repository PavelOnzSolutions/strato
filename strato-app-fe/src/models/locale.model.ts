export interface ILocaleCompact {
    id: string;
    label: string;
    key: string;
    items: number;
}

export interface ILocale {
    id: string;
    label: string;
    key: string;
    translations: Record<string, string>;
}

export type NewLocale = Omit<ILocale, 'id'> & { id: null };