import React, { useRef, useEffect, useState } from 'react';
import { Dialog, Button, Flex, Box } from '@radix-ui/themes';
import Editor from '@monaco-editor/react';
import { useTheme } from '../../context/ThemeContext.tsx';
import { useTranslation } from 'react-i18next';

interface JsonEditorModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    value: string; // stringified JSON
    onSave: (newValue: string) => void;
    availableOutputs?: { value: string; label: string }[];
}

const JsonEditorModal: React.FC<JsonEditorModalProps> = ({
    open,
    onOpenChange,
    title,
    value,
    onSave,
    availableOutputs = []
}) => {
    const { appearance, codeFont } = useTheme();
    const { t } = useTranslation();
    const editorRef = useRef<any>(null);
    const providerRef = useRef<any>(null);
    const [localValue, setLocalValue] = useState(value);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setLocalValue(value);
            setError(null);
        }
    }, [open, value]);

    useEffect(() => {
        return () => {
            if (providerRef.current) {
                providerRef.current.dispose();
                providerRef.current = null;
            }
        };
    }, []);

    const handleEditorDidMount = (editor: any, monaco: any) => {
        editorRef.current = editor;

        if (providerRef.current) {
            providerRef.current.dispose();
        }

        // Register completion provider for this model's language
        providerRef.current = monaco.languages.registerCompletionItemProvider('json', {
            triggerCharacters: ['['],
            provideCompletionItems: (model: any, position: any) => {
                const textUntilPosition = model.getValueInRange({
                    startLineNumber: position.lineNumber,
                    startColumn: 1,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column,
                });

                if (textUntilPosition.endsWith('[[')) {
                    // Check if we are already inside a string
                    const isInsideString = textUntilPosition.split('"').length % 2 === 0;

                    const suggestions = availableOutputs.map((output) => ({
                        label: output.label,
                        kind: monaco.languages.CompletionItemKind.Reference,
                        // Use value (ID) for insertion, but keep label for UI if possible.
                        // Monaco's label is what is shown in the list.
                        insertText: isInsideString ? ` ${output.value} ]] ` : `"[[ ${output.value} ]] "`,
                        range: {
                            startLineNumber: position.lineNumber,
                            endLineNumber: position.lineNumber,
                            // If we need to replace the [[ trigger for someone typing without quotes
                            startColumn: isInsideString ? position.column : position.column - 2,
                            endColumn: position.column,
                        },
                        detail: output.value !== output.label ? output.value : undefined
                    }));
                    return { suggestions };
                }
                return { suggestions: [] };
            },
        });

        // Store provider to dispose later if needed, though for modals it's tricky
        // monaco.languages is global, so registering multiple times can be an issue.
        // However, this is JSON specifically.
    };

    const handleSave = () => {
        const val = editorRef.current ? editorRef.current.getValue() : localValue;
        try {
            JSON.parse(val); // Validate JSON
            onSave(val);
            onOpenChange(false);
        } catch (e) {
            setError(t('msg_invalid_json', 'Invalid JSON format'));
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Content style={{ maxWidth: 800, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                <Dialog.Title>{title}</Dialog.Title>

                <Box style={{ flex: 1, minHeight: 400, border: '1px solid var(--gray-6)', borderRadius: 'var(--radius-2)', overflow: 'hidden' }} mb="4">
                    <Editor
                        height="400px"
                        defaultLanguage="json"
                        value={localValue}
                        onMount={handleEditorDidMount}
                        onChange={(val) => {
                            setLocalValue(val || '');
                            setError(null);
                        }}
                        theme={appearance === 'dark' ? 'vs-dark' : 'light'}
                        options={{
                            minimap: { enabled: false },
                            formatOnPaste: true,
                            formatOnType: true,
                            fontFamily: codeFont,
                            fontLigatures: true,
                        }}
                    />
                </Box>

                {error && (
                    <Box mb="4">
                        <span style={{ color: 'var(--red-9)' }}>{error}</span>
                    </Box>
                )}

                <Flex gap="3" justify="end">
                    <Dialog.Close>
                        <Button variant="soft" color="gray">
                            {t('btn_cancel', 'Cancel')}
                        </Button>
                    </Dialog.Close>
                    <Button onClick={handleSave}>
                        {t('btn_save', 'Save')}
                    </Button>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
};

export default JsonEditorModal;
