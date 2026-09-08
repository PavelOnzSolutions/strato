import {Card, Heading, Progress} from '@radix-ui/themes';
import {Save, X} from 'lucide-react';
import {useToolbar} from '../../context/ToolbarContext';
import {useToast} from '../../context/ToastContext';
import {useEffect, useRef, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {usePageTitle} from '../../context/PageTitleContext';
import {useTheme} from '../../context/ThemeContext';
import {fetchWithAuth} from '../../utils/api';
import {useTranslation} from 'react-i18next';
import Editor from '@monaco-editor/react';
import {fetchResource} from "./api.ts";

const ClassJsonEdit = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { appearance, codeFont } = useTheme();
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [jsonContent, setJsonContent] = useState('');
    const editorRef = useRef<any>(null);

    const { data: resource, isLoading } = useQuery({
        queryKey: ['resource', id],
        queryFn: () => fetchResource(id!),
        enabled: !!id,
        refetchOnWindowFocus: false,
    });

    usePageTitle(`${t('ptitle_edit_json', 'Edit JSON')}: ${resource?.name || 'Loading...'}`);

    useEffect(() => {
        if (resource) {
            setJsonContent(JSON.stringify(resource, null, 2));
        }
    }, [resource]);

    const handleEditorDidMount = (editor: any) => {
        editorRef.current = editor;
    };

    const handleSave = async () => {
        try {
            const currentContent = editorRef.current ? editorRef.current.getValue() : jsonContent;
            const parsedResource = JSON.parse(currentContent);

            // Remove read-only fields that shouldn't be sent
            const { id: resourceId, ...payload } = parsedResource;

            const response = await fetchWithAuth(`/resources/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error('Failed to save resource');
            }

            showToast('Resource updated successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['resources'] });
            navigate('/resources/definitions');
        } catch (error) {
            console.error('Error saving resource:', error);
            if (error instanceof SyntaxError) {
                showToast('Invalid JSON format', 'error');
            } else {
                showToast('Failed to save resource', 'error');
            }
        }
    };

    const handleCancel = () => {
        navigate(`/resources/definitions/${id}`);
    };

    // Refs for toolbar
    const handleSaveRef = useRef(handleSave);
    const handleCancelRef = useRef(handleCancel);
    useEffect(() => {
        handleSaveRef.current = handleSave;
        handleCancelRef.current = handleCancel;
    }, [handleSave, handleCancel]);

    useToolbar([
        { id: 'cancel', label: t('btn_cancel', 'Cancel'), icon: X, onClick: () => handleCancelRef.current(), variant: 'outline' },
        { id: 'save', label: t('btn_save', 'Save'), icon: Save, onClick: () => handleSaveRef.current(), variant: 'solid', color: 'green' },
    ]);

    return (
        <Card size="4" className="w-full shadow-lg" style={{ height: 'calc(100vh - 8rem)', display: 'flex', flexDirection: 'column' }}>
            {isLoading && (
                <div className="mb-4">
                    <Progress />
                </div>
            )}
            <Heading size="4" mb="4">{t('lbl_edit_json', 'Edit JSON')}: {resource?.name}</Heading>

            <div className="flex-1 border border-[var(--gray-6)] rounded overflow-hidden">
                <Editor
                    height="100%"
                    defaultLanguage="json"
                    value={jsonContent}
                    onMount={handleEditorDidMount}
                    onChange={(value) => setJsonContent(value || '')}
                    theme={appearance === 'dark' ? 'vs-dark' : 'light'}
                    options={{
                        minimap: { enabled: true },
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

export default ClassJsonEdit;
