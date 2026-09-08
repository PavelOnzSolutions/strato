import React, {useState} from 'react';
import {ConfigurationData} from '../../../models/configuration.model';

interface Props {
    orphans: Array<[string, string, string]>;
    values: ConfigurationData;
    onDiscard: (path: [string, string, string]) => void;
}

function readLeaf(data: ConfigurationData, sec: string, item: string, field: string): unknown {
    return data?.[sec]?.[item]?.[field];
}

function formatValue(v: unknown): string {
    if (v === undefined) return '— deleted —';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
}

export const OutsideSchemaPanel: React.FC<Props> = ({orphans, values, onDiscard}) => {
    const [open, setOpen] = useState(false);

    if (orphans.length === 0) return null;

    return (
        <section className="border-t mt-4 pt-2">
            <button type="button" onClick={() => setOpen((o) => !o)}
                    className="text-sm font-medium">
                {open ? '▾' : '▸'} Outside current schema ({orphans.length})
            </button>
            {open && (
                <ul className="text-sm mt-2 space-y-1">
                    {orphans.map((path) => (
                        <li key={path.join('.')} className="flex items-center gap-2 py-1">
                            <span className="font-mono text-gray-700">{path.join('.')}</span>
                            <span className="text-gray-600 truncate max-w-md">
                                {formatValue(readLeaf(values, path[0], path[1], path[2]))}
                            </span>
                            <button type="button" onClick={() => onDiscard(path)}
                                    className="ml-auto text-red-600 underline text-xs">
                                Discard
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
};
