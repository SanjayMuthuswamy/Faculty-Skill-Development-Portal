import http from './http';

export interface Discussion {
    id: string;
    faculty_id: string;
    author_name: string;
    title: string;
    content: string;
    category: string;
    created_at: string;
    reply_count: number;
}

export interface DiscussionReply {
    id: string;
    discussion_id: string;
    faculty_id: string;
    author_name: string;
    content: string;
    created_at: string;
}

export interface DiscussionDetail extends Discussion {
    replies: DiscussionReply[];
}

export interface FacultyQuery {
    id: string;
    faculty_id: string;
    faculty_name: string;
    category: string;
    description: string;
    status: 'pending' | 'reviewed' | 'resolved';
    created_at: string;
    updated_at: string;
}

export const forumApi = {
    listDiscussions: (category?: string): Promise<Discussion[]> =>
        http.get('/api/v1/discussions', { params: category ? { category } : {} }).then(r => r.data),

    getDiscussion: (id: string): Promise<Discussion> =>
        http.get(`/api/v1/discussions/${id}`).then(r => r.data),

    createDiscussion: (data: Partial<Discussion>): Promise<Discussion> =>
        http.post('/api/v1/discussions', data).then(r => r.data),

    addReply: (discussionId: string, content: string): Promise<DiscussionReply> =>
        http.post(`/api/v1/discussions/${discussionId}/replies`, { content }).then(r => r.data),
};

export const queriesApi = {
    submitQuery: (data: { category: string; description: string }): Promise<FacultyQuery> =>
        http.post('/api/v1/queries', data).then(r => r.data),

    myQueries: (): Promise<FacultyQuery[]> =>
        http.get('/api/v1/queries/mine').then(r => r.data),

    listAll: (status?: string): Promise<FacultyQuery[]> =>
        http.get('/api/v1/queries', { params: status ? { status } : {} }).then(r => r.data),

    updateStatus: (id: string, status: string): Promise<FacultyQuery> =>
        http.patch(`/api/v1/queries/${id}`, { status }).then(r => r.data),
};
