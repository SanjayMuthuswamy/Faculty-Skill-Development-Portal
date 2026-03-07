import http from './http';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface ChatResponse {
    reply: string;
}

export const aiCoachApi = {
    chat: async (message: string, history: ChatMessage[]): Promise<ChatResponse> => {
        const response = await http.post<ChatResponse>('/api/v1/ai-coach/chat', {
            message,
            history,
        });
        return response.data;
    },
};
