import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface PageTitleContextType {
    title: string;
    setTitle: (title: string) => void;
}

const PageTitleContext = createContext<PageTitleContextType | undefined>(undefined);

export const usePageTitle = (title: string) => {
    const context = useContext(PageTitleContext);
    if (!context) {
        throw new Error('usePageTitle must be used within a PageTitleProvider');
    }

    useEffect(() => {
        context.setTitle(title);
        document.title = `${title} | Strato`;
        return () => {
            context.setTitle('');
            document.title = 'Strato';
        };
    }, [title, context]);
};

export const usePageTitleState = () => {
    const context = useContext(PageTitleContext);
    if (!context) {
        throw new Error('usePageTitleState must be used within a PageTitleProvider');
    }
    return context.title;
};

export const PageTitleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [title, setTitle] = useState('');

    return (
        <PageTitleContext.Provider value={{ title, setTitle }}>
            {children}
        </PageTitleContext.Provider>
    );
};
