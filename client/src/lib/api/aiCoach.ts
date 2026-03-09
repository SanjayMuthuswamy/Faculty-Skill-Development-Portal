import http from './http';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    actions?: CoachAction[];
}

export interface CoachAction {
    kind: 'test' | 'course' | 'resource' | string;
    label: string;
    url: string;
    description?: string;
}

export interface ChatResponse {
    reply: string;
    actions?: CoachAction[];
}

export const aiCoachApi = {
    chat: async (message: string, history: ChatMessage[]): Promise<ChatResponse> => {
        const response = await http.post<ChatResponse>('/api/v1/ai-coach/chat', {
            message,
            history: history.map((m) => ({ role: m.role, content: m.content })),
        });
        return response.data;
    },
};
