import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import ConfigurationService from '../services/ConfigurationService';
import i18n from '../i18n';

export type AccentColor = 'strato' | 'gray' | 'gold' | 'bronze' | 'brown' | 'yellow' | 'amber' | 'orange' | 'tomato' | 'red' | 'ruby' | 'crimson' | 'pink' | 'plum' | 'purple' | 'violet' | 'iris' | 'indigo' | 'blue' | 'cyan' | 'teal' | 'jade' | 'green' | 'grass' | 'lime' | 'mint' | 'sky';
export type BackgroundType = 'orbs' | 'mesh' | 'waves' | 'particles' | 'plasma' | 'starfield' | 'forest';
export type ElementEdgeRadius = 'none' | 'small' | 'medium' | 'large' | 'full';
export type DefaultFont = 'Federo' | 'Poppins' | 'Sansation' | 'Space Grotesk' | 'Titillium Web';
export type CodeFont = 'Fira Code' | 'Syne Mono' | 'Space Mono';

export const accentColors = [
    'strato',
    'gray',
    'gold',
    'bronze',
    'brown',
    'yellow',
    'amber',
    'orange',
    'tomato',
    'red',
    'ruby',
    'crimson',
    'pink',
    'plum',
    'purple',
    'violet',
    'iris',
    'indigo',
    'blue',
    'cyan',
    'teal',
    'jade',
    'green',
    'grass',
    'lime',
    'mint',
    'sky'
];

interface ThemeContextType {
    appearance: 'light' | 'dark' | 'auto';
    toggleTheme: () => void;
    setAppearance: (appearance: 'light' | 'dark' | 'auto') => void;
    accentColor: AccentColor;
    setAccentColor: (color: AccentColor) => void;
    backgroundType: BackgroundType;
    setBackgroundType: (type: BackgroundType) => void;
    radiusType: ElementEdgeRadius;
    setRadiusType: (type: ElementEdgeRadius) => void;
    useAccentColorForBackground: boolean;
    setUseAccentColorForBackground: (value: boolean) => void;
    defaultFont: DefaultFont;
    setDefaultFont: (font: DefaultFont) => void;
    codeFont: CodeFont;
    setCodeFont: (font: CodeFont) => void;
    loadUserConfiguration: (username: string) => Promise<void>;
    saveConfiguration: (username: string) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const [appearance, setAppearance] = useState<'light' | 'dark' | 'auto'>(() => {
        const saved = localStorage.getItem('theme');
        if (saved === 'light' || saved === 'dark' || saved === 'auto') return saved;
        return 'auto';
    });

    const [resolvedAppearance, setResolvedAppearance] = useState<'light' | 'dark'>(() => {
        if (appearance === 'auto') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return appearance === 'dark' ? 'dark' : 'light';
    });

    const [accentColor, setAccentColor] = useState<AccentColor>(() => {
        return (localStorage.getItem('accentColor') as AccentColor) || 'strato';
    });

    const [backgroundType, setBackgroundType] = useState<BackgroundType>(() => {
        return (localStorage.getItem('backgroundType') as BackgroundType) || 'forest';
    });

    const [radiusType, setRadiusType] = useState<ElementEdgeRadius>(() => {
        return (localStorage.getItem('radiusType') as ElementEdgeRadius) || 'large';
    });

    const [useAccentColorForBackground, setUseAccentColorForBackground] = useState<boolean>(() => {
        const saved = localStorage.getItem('useAccentColorForBackground');
        return saved === null ? false : saved === 'true';
    });

    const [defaultFont, setDefaultFont] = useState<DefaultFont>(() => {
        return (localStorage.getItem('defaultFont') as DefaultFont) || 'Sansation';
    });

    const [codeFont, setCodeFont] = useState<CodeFont>(() => {
        return (localStorage.getItem('codeFont') as CodeFont) || 'Fira Code';
    });

    const loadUserConfiguration = useCallback(async (username: string) => {
        try {
            const config = await ConfigurationService.getConfiguration(username);
            if (config.theme) setAppearance(config.theme as any);
            if (config.color) setAccentColor(config.color as any);
            if (config.defaultFont) setDefaultFont(config.defaultFont as any);
            if (config.codeFont) setCodeFont(config.codeFont as any);
            if (config.backgroundType) setBackgroundType(config.backgroundType as any);
            if (config.radiusType) setRadiusType(config.radiusType as any);
            if (config.language && config.language !== 'auto') {
                i18n.changeLanguage(config.language);
            }
        } catch (error) {
            console.error('Failed to load user configuration:', error);
        }
    }, []);

    const saveConfiguration = useCallback(async (username: string) => {
        try {
            await ConfigurationService.updateConfiguration(username, {
                theme: appearance,
                color: accentColor,
                defaultFont,
                codeFont,
                backgroundType,
                radiusType,
                language: i18n.language || 'auto'
            });
        } catch (error) {
            console.error('Failed to save user configuration:', error);
        }
    }, [appearance, accentColor, radiusType, defaultFont, codeFont, i18n.language]);

    useEffect(() => {
        if (appearance === 'auto') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = () => {
                setResolvedAppearance(mediaQuery.matches ? 'dark' : 'light');
            };
            mediaQuery.addEventListener('change', handleChange);
            setResolvedAppearance(mediaQuery.matches ? 'dark' : 'light');
            return () => mediaQuery.removeEventListener('change', handleChange);
        } else {
            setResolvedAppearance(appearance === 'dark' ? 'dark' : 'light');
        }
    }, [appearance]);

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(resolvedAppearance);
        localStorage.setItem('theme', appearance);
    }, [resolvedAppearance, appearance]);

    useEffect(() => {
        localStorage.setItem('accentColor', accentColor);
    }, [accentColor]);

    useEffect(() => {
        localStorage.setItem('backgroundType', backgroundType);
    }, [backgroundType]);

    useEffect(() => {
        const root = window.document.querySelector('.radix-themes');
        if (root) {
            root.setAttribute('data-radius', radiusType);
        }
        localStorage.setItem('radiusType', radiusType);
    }, [radiusType]);

    useEffect(() => {
        localStorage.setItem('useAccentColorForBackground', String(useAccentColorForBackground));
    }, [useAccentColorForBackground]);


    useEffect(() => {
        localStorage.setItem('defaultFont', defaultFont);
        document.documentElement.style.setProperty('--default-font', defaultFont);
    }, [defaultFont]);

    useEffect(() => {
        localStorage.setItem('codeFont', codeFont);
        document.documentElement.style.setProperty('--code-font', codeFont);
    }, [codeFont]);

    const toggleTheme = () => {
        setAppearance((prev) => (prev === 'light' ? 'dark' : 'light'));
    };

    const setAccentColorWithTransition = (color: AccentColor) => {
        const root = window.document.querySelector('.radix-themes');
        if (root) {
            root.classList.add('accent-transitioning');
            setAccentColor(color);
            setTimeout(() => {
                root.classList.remove('accent-transitioning');
            }, 1100); // Slightly more than transition duration
        } else {
            setAccentColor(color);
        }
    };

    return (
        <ThemeContext.Provider value={{
            appearance,
            toggleTheme,
            setAppearance,
            accentColor,
            setAccentColor: setAccentColorWithTransition,
            backgroundType,
            setBackgroundType,
            radiusType,
            setRadiusType,
            useAccentColorForBackground,
            setUseAccentColorForBackground,
            defaultFont,
            setDefaultFont,
            codeFont,
            setCodeFont,
            loadUserConfiguration,
            saveConfiguration
        }}>
            {children}
        </ThemeContext.Provider>
    );
};
