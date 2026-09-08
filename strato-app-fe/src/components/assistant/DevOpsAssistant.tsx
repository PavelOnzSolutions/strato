import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Play, Loader2 } from 'lucide-react';
import { Button, Card, Flex, Text, TextField, IconButton, Box, ScrollArea, Separator, AlertDialog } from '@radix-ui/themes';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from "react-i18next";
import { PromptResponse, Message, ToolCall } from '../../models/llm.model.ts';
import { fetchWithAuth } from '../../utils/api.ts';

const DevOpsAssistant: React.FC = () => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [prompt, setPrompt] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [pendingActions, setPendingActions] = useState<ToolCall[] | null>(null);
    const [showActionConfirmation, setShowActionConfirmation] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to the bottom when messages change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSendMessage = async () => {
        if (!prompt.trim()) return;

        const userMessage: Message = { role: 'user', content: prompt };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setPrompt("");
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetchWithAuth('/llm/prompt', {
                method: 'POST',
                body: JSON.stringify({
                    prompt: prompt,
                    history: messages // Send conversation history
                })
            });
            if (!res.ok) throw new Error(t('err_failed_to_get_plan', 'Failed to get response from assistant'));
            const data: PromptResponse = await res.json();

            // Add assistant's response to messages
            const assistantMessage: Message = { role: 'assistant', content: data.answer };
            setMessages([...newMessages, assistantMessage]);

            // Check if there are actions and if they seem like write/execute actions
            if (data.actions && data.actions.length > 0) {
                const hasWriteActions = detectWriteActions(data.actions);
                if (hasWriteActions) {
                    // Show confirmation modal for write actions
                    setPendingActions(data.actions);
                    setShowActionConfirmation(true);
                }
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Detect if actions are write/execute actions (vs read-only)
    const detectWriteActions = (actions: ToolCall[]): boolean => {
        // Actions with these function names typically modify state
        const writeKeywords = ['create', 'update', 'delete', 'deploy', 'execute', 'start', 'stop', 'modify', 'set', 'post', 'put'];
        return actions.some(action =>
            writeKeywords.some(keyword =>
                action.functionName.toLowerCase().includes(keyword)
            )
        );
    };

    const handleExecuteActions = async () => {
        if (!pendingActions) return;
        setShowActionConfirmation(false);
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetchWithAuth('/llm/confirm', {
                method: 'POST',
                body: JSON.stringify({ actions: pendingActions })
            });
            if (!res.ok) throw new Error(t('err_failed_to_execute', 'Failed to execute actions'));
            const result = await res.text();

            // Add execution result to the conversation
            const resultMessage: Message = {
                role: 'assistant',
                content: `✅ **${t('lbl_execution_complete', 'Execution Complete')}**\n\n${result}`
            };
            setMessages(prev => [...prev, resultMessage]);
            setPendingActions(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelActions = () => {
        setShowActionConfirmation(false);
        setPendingActions(null);
    };

    const handleBack = () => {
        setIsOpen(false);
        // Optionally clear conversation on close
        // setMessages([]);
    };

    const toggleOpen = () => setIsOpen(!isOpen);

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Floating Button */}
            <IconButton
                size="4"
                radius="full"
                variant="solid"
                onClick={toggleOpen}
                className="shadow-2xl hover:scale-110 transition-transform duration-200"
                style={{ width: '60px', height: '60px', cursor: 'pointer' }}
            >
                {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
            </IconButton>

            {/* Assistant Window */}
            {isOpen && (
                <Card
                    size="3"
                    className="absolute bottom-20 right-0 w-[450px] max-h-[650px] shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300"
                    style={{ background: 'var(--color-panel-solid)', border: '1px solid var(--gray-5)' }}
                >
                    <Flex direction="column" gap="3" style={{ height: '100%' }}>
                        {/* Header */}
                        <Flex align="center" justify="between">
                            <Flex align="center" gap="2">
                                <Bot className="w-5 h-5 transition-all duration-1000 ease-linear" style={{ color: 'var(--accent-9)' }} />
                                <Text weight="bold" size="3">{t('lbl_devops_assistant', 'DevOps Assistant')}</Text>
                            </Flex>
                            <IconButton variant="ghost" color="gray" onClick={toggleOpen}>
                                <X className="w-4 h-4" />
                            </IconButton>
                        </Flex>

                        <Separator size="4" />

                        {/* Messages Area */}
                        <ScrollArea
                            scrollbars="vertical"
                            style={{ flex: 1, maxHeight: '450px', minHeight: '200px' }}
                        >
                            <Flex direction="column" gap="3" p="2">
                                {messages.length === 0 && (
                                    <Box>
                                        <Text size="2" color="gray">
                                            {t('lbl_assistant_intro', 'How can I help you today? I can help you manage environments, resources, and more.')}
                                        </Text>
                                    </Box>
                                )}

                                {messages.map((msg, idx) => (
                                    <Flex
                                        key={idx}
                                        direction="column"
                                        align={msg.role === 'user' ? 'end' : 'start'}
                                        gap="1"
                                    >
                                        <Box
                                            className={`px-3 py-2 rounded-md max-w-[80%] transition-all duration-1000 ease-linear ${msg.role === 'user'
                                                    ? 'bg-[var(--accent-3)] border border-[var(--accent-6)]'
                                                    : 'bg-[var(--gray-3)] border border-[var(--gray-5)]'
                                                }`}
                                        >
                                            {msg.role === 'assistant' ? (
                                                <div className="prose prose-sm dark:prose-invert max-w-none text-[13px] leading-relaxed">
                                                    <ReactMarkdown
                                                        components={{
                                                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                                            ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                                                            ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                                                            li: ({ children }) => <li className="mb-1">{children}</li>,
                                                            code: ({ children }) => <code className="bg-[var(--gray-4)] px-1 rounded text-[12px]">{children}</code>,
                                                            pre: ({ children }) => <pre className="bg-[var(--gray-4)] p-2 rounded my-2 overflow-x-auto text-[12px]">{children}</pre>,
                                                            a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--accent-9)] underline transition-all duration-1000 ease-linear">{children}</a>,
                                                            strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                                                        }}
                                                    >
                                                        {msg.content}
                                                    </ReactMarkdown>
                                                </div>
                                            ) : (
                                                <Text size="2">{msg.content}</Text>
                                            )}
                                        </Box>
                                    </Flex>
                                ))}

                                {isLoading && (
                                    <Flex direction="column" align="start" gap="1">
                                        <Box className="px-3 py-2 rounded-md bg-[var(--gray-3)] border border-[var(--gray-5)]">
                                            <Flex align="center" gap="2">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <Text size="2" color="gray">{t('lbl_thinking', 'Thinking...')}</Text>
                                            </Flex>
                                        </Box>
                                    </Flex>
                                )}

                                <div ref={scrollRef} />
                            </Flex>
                        </ScrollArea>

                        {/* Error Display */}
                        {error && (
                            <Box className="bg-red-50 dark:bg-red-900/20 p-2 rounded-md border border-red-200 dark:border-red-800">
                                <Text size="2" color="red">{error}</Text>
                            </Box>
                        )}

                        <Separator size="4" />

                        {/* Input Area */}
                        <div className="relative">
                            <TextField.Root
                                placeholder={t('placeholder_ask_assistant', 'Ask me anything...')}
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                size="3"
                                disabled={isLoading}
                            >
                                <TextField.Slot side="right">
                                    {isLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <IconButton
                                            variant="ghost"
                                            onClick={handleSendMessage}
                                            disabled={!prompt.trim() || isLoading}
                                        >
                                            <Send className="w-4 h-4" />
                                        </IconButton>
                                    )}
                                </TextField.Slot>
                            </TextField.Root>
                        </div>

                        {/* Back Button */}
                        <Button
                            variant="soft"
                            color="gray"
                            onClick={handleBack}
                            size="2"
                        >
                            {t('btn_close', 'Close')}
                        </Button>
                    </Flex>
                </Card>
            )}

            {/* Action Confirmation Modal */}
            <AlertDialog.Root open={showActionConfirmation} onOpenChange={setShowActionConfirmation}>
                <AlertDialog.Content maxWidth="500px">
                    <AlertDialog.Title>{t('lbl_confirm_execution', 'Confirm Execution')}</AlertDialog.Title>
                    <AlertDialog.Description size="2">
                        {t('msg_confirm_actions', 'The assistant has proposed the following actions. Do you want to execute them?')}
                    </AlertDialog.Description>

                    {pendingActions && (
                        <Box mt="3" className="bg-[var(--gray-2)] p-3 rounded-md border border-[var(--gray-5)]">
                            <Text size="2" weight="bold" className="block mb-2">
                                {t('lbl_proposed_actions', 'Proposed Actions')}:
                            </Text>
                            <ScrollArea scrollbars="vertical" style={{ maxHeight: '200px' }}>
                                <Flex direction="column" gap="2">
                                    {pendingActions.map((action, idx) => (
                                        <Box key={idx} className="bg-[var(--accent-2)] p-2 rounded border border-[var(--accent-4)] transition-all duration-1000 ease-linear">
                                            <Text size="1" weight="bold" className="block">
                                                {action.pluginName}.{action.functionName}
                                            </Text>
                                            <pre className="text-[10px] mt-1 overflow-x-auto">
                                                {JSON.stringify(action.arguments, null, 2)}
                                            </pre>
                                        </Box>
                                    ))}
                                </Flex>
                            </ScrollArea>
                        </Box>
                    )}

                    <Flex gap="3" mt="4" justify="end">
                        <AlertDialog.Cancel>
                            <Button
                                variant="soft"
                                color="gray"
                                onClick={handleCancelActions}
                            >
                                {t('btn_cancel', 'Cancel')}
                            </Button>
                        </AlertDialog.Cancel>
                        <AlertDialog.Action>
                            <Button
                                variant="solid"
                                onClick={handleExecuteActions}
                                disabled={isLoading}
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                                {t('btn_execute', 'Execute')}
                            </Button>
                        </AlertDialog.Action>
                    </Flex>
                </AlertDialog.Content>
            </AlertDialog.Root>
        </div>
    );
};

export default DevOpsAssistant;
