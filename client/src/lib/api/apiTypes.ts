export interface ApiError {
    message: string;
    status?: number;
    details?: any;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    skip: number;
    limit: number;
}

export interface PageParams {
    skip?: number;
    limit?: number;
}
