import http from './http'

export interface NewsItem {
    id: string;
    title: string;
    summary: string;
    source: string;
    publishedAt: string | null;
    url: string;
    imageUrl: string | null;
}

export interface NewsResponse {
    topic: string;
    items: NewsItem[];
    cached: boolean;
    lastFetchedAt: string;
}

export interface NewsPreferences {
    faculty_id: string;
    topics: string[];
    updated_at: string;
}

export interface PersonalizedNewsTopic {
    topic: string;
    items: NewsItem[];
    cached: boolean;
    lastFetchedAt: string;
}

export interface PersonalizedNewsResponse {
    topics: PersonalizedNewsTopic[];
}

export const newsApi = {
    getNews: async (topic: string = 'AI'): Promise<NewsResponse> => {
        const response = await http.get<NewsResponse>('/api/v1/news/', {
            params: { topic }
        });
        return response.data;
    },

    getSuggestedTopics: async (): Promise<string[]> => {
        const response = await http.get<string[]>('/api/v1/news/topics');
        return response.data;
    },

    getMyNewsPreferences: async (): Promise<NewsPreferences> => {
        const response = await http.get<NewsPreferences>('/api/v1/faculty/me/news-preferences');
        return response.data;
    },

    updateMyNewsPreferences: async (topics: string[]): Promise<NewsPreferences> => {
        const response = await http.put<NewsPreferences>('/api/v1/faculty/me/news-preferences', { topics });
        return response.data;
    },

    getMyNews: async (): Promise<PersonalizedNewsResponse> => {
        const response = await http.get<PersonalizedNewsResponse>('/api/v1/faculty/me/news');
        return response.data;
    },
}
