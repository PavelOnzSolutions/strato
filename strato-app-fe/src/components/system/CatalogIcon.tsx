import React from 'react';
import {DynamicIcon, IconName} from 'lucide-react/dynamic';

export interface CatalogIconProps {
    /**
     * Either a lucide-react icon name (e.g. "Database") or an SVG-asset path of the form
     * "{category}/{file.svg}" (e.g. "azure/Function-Apps.svg"). Empty/null falls back to "box".
     */
    icon?: string | null;
    /** Rendered size in px (applies to both SVG <img> and lucide icon). Default 16. */
    size?: number;
    className?: string;
    alt?: string;
}

/**
 * Unified renderer for catalog-style icons. Mirrors the behavior of the Resource Classes
 * editor: SVG-path icons live under `/assets/{path}`, plain names render as lucide icons.
 */
export const CatalogIcon: React.FC<CatalogIconProps> = ({icon, size = 16, className, alt}) => {
    const trimmed = (icon ?? '').trim();
    if (trimmed.length === 0) {
        return <DynamicIcon name={'box' as IconName} size={size} className={className}/>;
    }
    if (trimmed.includes('/')) {
        return (
            <img
                src={`/assets/${trimmed}`}
                alt={alt ?? trimmed}
                className={className}
                style={{width: size, height: size, objectFit: 'contain'}}
            />
        );
    }
    return <DynamicIcon name={trimmed as IconName} size={size} className={className}/>;
};

export default CatalogIcon;
