import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

export interface ToolbarAction {
    id: string;
    label: string;
    icon?: LucideIcon;
    onClick?: () => void;
    variant?: 'solid' | 'soft' | 'outline' | 'ghost' | 'classic';
    color?: 'gray' | 'gold' | 'bronze' | 'brown' | 'yellow' | 'amber' | 'orange' | 'tomato' | 'red' | 'ruby' | 'crimson' | 'pink' | 'plum' | 'purple' | 'violet' | 'iris' | 'indigo' | 'blue' | 'cyan' | 'teal' | 'jade' | 'green' | 'grass' | 'lime' | 'mint' | 'sky';
    popoverContent?: ReactNode;
    // Switch support
    isSwitch?: boolean;
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    customComponent?: ReactNode;
    disabled?: boolean;
    hidden?: boolean;
    isLoading?: boolean;
}

interface ToolbarContextType {
    actions: ToolbarAction[];
    setActions: (actions: ToolbarAction[]) => void;
}

const ToolbarContext = createContext<ToolbarContextType | undefined>(undefined);

export const useToolbar = (actions: ToolbarAction[] = []) => {
    const context = useContext(ToolbarContext);
    if (!context) {
        throw new Error('useToolbar must be used within a ToolbarProvider');
    }

    // Always-current ref so proxied handlers read the latest closures every call.
    // Without this, handlers captured at the initial render would see stale state
    // (e.g. an empty `name` even after the user has typed) because the effect below
    // only re-registers actions when serializable props change.
    const latestActionsRef = useRef(actions);
    latestActionsRef.current = actions;

    useEffect(() => {
        if (actions.length === 0) return;
        const proxied: ToolbarAction[] = actions.map((a, idx) => ({
            ...a,
            onClick: a.onClick ? () => latestActionsRef.current[idx]?.onClick?.() : undefined,
            onCheckedChange: a.onCheckedChange
                ? (c: boolean) => latestActionsRef.current[idx]?.onCheckedChange?.(c)
                : undefined,
        }));
        context.setActions(proxied);
        return () => {
            context.setActions([]);
        };
        // Dep key excludes functions (onClick/onCheckedChange) and React nodes
        // (popoverContent/customComponent/icon). Function staleness is handled by the ref above.
    }, [JSON.stringify(actions.map(({ popoverContent, customComponent, icon, onClick, onCheckedChange, ...rest }) => rest))]);

    return context;
};

// Hook for Navbar to just read actions
export const useToolbarState = () => {
    const context = useContext(ToolbarContext);
    if (!context) {
        throw new Error('useToolbarState must be used within a ToolbarProvider');
    }
    return context;
}

interface ToolbarProviderProps {
    children: ReactNode;
}

export const ToolbarProvider: React.FC<ToolbarProviderProps> = ({ children }) => {
    const [actions, setActions] = useState<ToolbarAction[]>([]);

    return (
        <ToolbarContext.Provider value={{ actions, setActions }}>
            {children}
        </ToolbarContext.Provider>
    );
};
