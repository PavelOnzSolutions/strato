import {Card, Heading, Progress} from '@radix-ui/themes';
import {Save, X} from 'lucide-react';
import {useToolbar} from '../../../context/ToolbarContext';
import {useToast} from '../../../context/ToastContext';
import {useEffect, useRef, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {usePageTitle} from '../../../context/PageTitleContext';
import Editor from '@monaco-editor/react';
import {useTheme} from '../../../context/ThemeContext';
import {useTranslation} from 'react-i18next';
import {fetchWithAuth} from '../../../utils/api';
import {fetchLocale} from "./api.ts";

const LocalizationJsonEdit = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { appearance, codeFont } = useTheme();
    const [jsonContent, setJsonContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const editorRef = useRef<any>(null);
    const { t, i18n } = useTranslation();

    const { data: locale, isLoading } = useQuery({
        queryKey: ['locale', id],
        queryFn: () => fetchLocale(id!),
        enabled: !!id,
        refetchOnWindowFocus: false,
    });

    usePageTitle(`Edit JSON: ${locale?.key || 'Loading...'}`);

    useEffect(() => {
        if (locale) {
            setJsonContent(JSON.stringify(locale, null, 2));
        }
    }, [locale]);

    const handleEditorDidMount = (editor: any) => {
        editorRef.current = editor;
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const currentContent = editorRef.current ? editorRef.current.getValue() : jsonContent;
            const parsedTranslations = JSON.parse(currentContent);

            const payload = {
                ...parsedTranslations,

            };

            const response = await fetchWithAuth(`/locales/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error('Failed to save locale: ' + response.status.toString());
            }

            showToast('Locale updated successfully', 'success');
            navigate(`/admin/localization`);
            i18n.reloadResources();
        } catch (error) {
            console.error('Error saving locale:', error);
            if (error instanceof SyntaxError) {
                showToast('Invalid JSON format', 'error');
            } else {
                showToast('Failed to save locale', 'error');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        navigate(-1);
    };

    // Use refs for toolbar actions to avoid stale closures if dependencies change (though here they are stable)
    const handleSaveRef = useRef(handleSave);
    const handleCancelRef = useRef(handleCancel);

    useEffect(() => {
        handleSaveRef.current = handleSave;
        handleCancelRef.current = handleCancel;
    }, [handleSave, handleCancel]);

    useToolbar([
        { id: 'cancel', label: t('btn_cancel', 'Cancel'), icon: X, onClick: () => handleCancelRef.current(), variant: 'outline' },
        { id: 'save', label: t('btn_save', 'Save'), icon: Save, onClick: () => handleSaveRef.current(), variant: 'solid', isLoading: isSaving, color: 'green' },
    ]);

    return (
        <Card size="4" className="w-full shadow-lg" style={{ height: 'calc(100vh - 8rem)', display: 'flex', flexDirection: 'column' }}>
            {isLoading && (
                <div className="mb-4">
                    <Progress />
                </div>
            )}
            <Heading size="4" mb="4">Edit JSON: {locale?.label} ({locale?.key})</Heading>

            <div className="flex-1 border border-[var(--gray-6)] rounded overflow-hidden relative">
                <Editor
                    height="100%"
                    defaultLanguage="json"
                    value={jsonContent}
                    onMount={handleEditorDidMount}
                    onChange={(value) => setJsonContent(value || '')}
                    theme={appearance === 'dark' ? 'vs-dark' : 'light'}
                    options={{
                        minimap: { enabled: false },
                        formatOnPaste: true,
                        formatOnType: true,
                        fontFamily: codeFont,
                        fontLigatures: true,
                    }}
                />
            </div>
        </Card>
    );
};

export default LocalizationJsonEdit;
