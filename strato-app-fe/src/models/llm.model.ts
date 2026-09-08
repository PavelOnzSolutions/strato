export interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export interface ToolCall {
    pluginName: string;
    functionName: string;
    arguments: Record<string, any>;
}

export interface PromptResponse {
    answer: string;
    actions: ToolCall[];
}

export interface PromptRequest {
    prompt: string;
    history?: Message[];  // Optional conversation history
}

export interface ConfirmationRequest {
    actions: ToolCall[];
}
