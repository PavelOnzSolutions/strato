import React, {useEffect} from 'react';
import {Box} from '@radix-ui/themes';
import Editor, {useMonaco} from '@monaco-editor/react';
import {useTheme} from '../../../context/ThemeContext';

/**
 * Monaco-backed JSON editor used on the Configuration Import page.
 *
 * When a `schema` is supplied it is registered with Monaco's JSON language service
 * scoped (via `fileMatch`) to this editor's dedicated model path, so its validation
 * and autocomplete apply only here and do not leak into other Monaco editors
 * (provider view, audit diff). Validation is advisory — the page's own
 * Validate/Import flow still governs whether an import proceeds.
 */
const MODEL_PATH = 'inmemory://strato/import-data.json';
const SCHEMA_URI = 'strato://import-data-schema.json';

interface JsonDataEditorProps {
    value: string;
    onChange: (value: string) => void;
    /** Sanitized JSON Schema to validate against; undefined = plain JSON (syntax only). */
    schema?: object;
    height?: number | string;
}

export const JsonDataEditor: React.FC<JsonDataEditorProps> = ({value, onChange, schema, height = 360}) => {
    const {appearance, codeFont} = useTheme();
    const monaco = useMonaco();

    useEffect(() => {
        if (!monaco) return;
        monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
            validate: true,
            schemas: schema
                ? [{uri: SCHEMA_URI, fileMatch: [MODEL_PATH], schema}]
                : [],
        });
    }, [monaco, schema]);

    return (
        <Box style={{border: '1px solid var(--gray-6)', borderRadius: 'var(--radius-2)', overflow: 'hidden'}}>
            <Editor
                height={height}
                defaultLanguage="json"
                path={MODEL_PATH}
                value={value}
                onChange={(val) => onChange(val ?? '')}
                theme={appearance === 'dark' ? 'vs-dark' : 'light'}
                options={{
                    minimap: {enabled: false},
                    formatOnPaste: true,
                    formatOnType: true,
                    fontFamily: codeFont,
                    fontLigatures: true,
                    scrollBeyondLastLine: false,
                }}
            />
        </Box>
    );
};

export default JsonDataEditor;
