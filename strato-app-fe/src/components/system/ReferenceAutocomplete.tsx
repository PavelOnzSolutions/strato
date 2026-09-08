import React, { useState, useRef } from 'react';
import { TextField, Popover, Card, Flex, Text, Button } from '@radix-ui/themes';

interface ReferenceOutput {
    value: string;
    label: string;
}

interface ReferenceAutocompleteProps {
    value: string;
    onChange: (newValue: string) => void;
    availableOutputs: ReferenceOutput[];
    allNodes?: { id: string; label: string }[];
    placeholder?: string;
    type?: "number" | "text" | "search" | "time" | "hidden" | "tel" | "url" | "email" | "date" | "datetime-local" | "month" | "password" | "week" | undefined;
    children?: React.ReactNode; // In case we want to pass Slots
    disabled?: boolean;
    variant?: "classic" | "surface" | "soft";
    readOnly?: boolean;
}

const ReferenceAutocomplete: React.FC<ReferenceAutocompleteProps> = ({
    value,
    onChange,
    availableOutputs,
    allNodes = [],
    placeholder,
    type = "text",
    children,
    disabled = false,
    variant,
    readOnly = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [cursorPos, setCursorPos] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Map internal ID-based value to display Label-based value
    const getDisplayValue = (val: string) => {
        if (!val || !allNodes.length) return val;
        return val.replace(/\[\[\s*([\w.-]+):outputs:([\w.-]+)\s*\]\]/g, (match, id, output) => {
            const node = allNodes.find(n => n.id === id);
            return node ? `[[ ${node.label}:outputs:${output} ]]` : match;
        });
    };

    // Map display Label-based value back to internal ID-based value
    const getInternalValue = (displayVal: string) => {
        if (!displayVal || !allNodes.length) return displayVal;
        return displayVal.replace(/\[\[\s*([\w.-]+):outputs:([\w.-]+)\s*\]\]/g, (match, label, output) => {
            const node = allNodes.find(n => n.label === label);
            return node ? `[[ ${node.id}:outputs:${output} ]]` : match;
        });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const displayVal = e.target.value;
        const pos = e.target.selectionStart || 0;
        setCursorPos(pos);
        
        // Notify parent of the internal value
        onChange(getInternalValue(displayVal));

        // Check if the cursor is after "[["
        const beforeCursor = displayVal.substring(0, pos);
        const lastDoubleBracket = beforeCursor.lastIndexOf('[[');

        if (lastDoubleBracket !== -1 && lastDoubleBracket === beforeCursor.length - 2) {
            setIsOpen(true);
            setSearchTerm('');
        } else if (isOpen) {
            if (lastDoubleBracket !== -1 && lastDoubleBracket < pos) {
                setSearchTerm(beforeCursor.substring(lastDoubleBracket + 2));
            } else {
                setIsOpen(false);
            }
        }
    };

    const handleSelect = (output: ReferenceOutput) => {
        const displayValue = getDisplayValue(value);
        const beforeBracket = displayValue.substring(0, displayValue.lastIndexOf('[[', cursorPos - 1));
        const afterCursor = displayValue.substring(cursorPos);
        const insertion = `[[ ${output.label} ]]`;
        const newDisplayValue = `${beforeBracket}${insertion}${afterCursor}`;
        
        onChange(getInternalValue(newDisplayValue));
        setIsOpen(false);

        // Refocus and set the cursor
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
                const newPos = beforeBracket.length + insertion.length;
                inputRef.current.setSelectionRange(newPos, newPos);
            }
        }, 0);
    };

    const filteredOutputs = availableOutputs.filter(o =>
        o.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
        o.value.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Popover.Root open={isOpen && !disabled && !readOnly} onOpenChange={setIsOpen}>
            <Popover.Trigger>
                <div style={{ width: '100%' }}>
                    <TextField.Root
                        ref={inputRef}
                        type={type}
                        value={getDisplayValue(value)}
                        onChange={handleInputChange}
                        placeholder={placeholder}
                        disabled={disabled}
                        variant={variant}
                        readOnly={readOnly}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                setIsOpen(false);
                            }
                        }}
                    >
                        {children}
                    </TextField.Root>
                </div>
            </Popover.Trigger>
            <Popover.Content
                side="bottom"
                align="start"
                style={{ padding: 0.5, width: '320px', zIndex: 2000 }}
                onOpenAutoFocus={(e) => e.preventDefault()} // Don't steal focus from input
            >
                <Card variant="surface" className="p-1" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    <Flex direction="column" gap="1">
                        {filteredOutputs.length > 0 ? (
                            filteredOutputs.map(output => (
                                <Button
                                    key={output.value}
                                    variant="ghost"
                                    color="gray"
                                    style={{ justifyContent: 'start', textAlign: 'left', padding: '4px 8px', height: 'auto' }}
                                    onClick={() => handleSelect(output)}
                                >
                                    <Text size="1" style={{ fontFamily: 'monospace' }}>{output.label}</Text>
                                </Button>
                            ))
                        ) : (
                            <Text size="1" color="gray">No matching outputs</Text>
                        )}
                    </Flex>
                </Card>
            </Popover.Content>
        </Popover.Root>
    );
};

export default ReferenceAutocomplete;
