export function getApiErrorMessage(error: unknown, fallback: string): string {
    const detail = (error as any)?.response?.data?.detail;

    if (typeof detail === 'string' && detail.trim()) {
        return detail;
    }

    if (Array.isArray(detail)) {
        const normalized = detail
            .map((entry: any) => {
                if (typeof entry === 'string') return entry;
                if (entry?.msg && Array.isArray(entry?.loc)) return `${entry.loc.join('.')}: ${entry.msg}`;
                if (entry?.msg) return entry.msg;
                return '';
            })
            .filter(Boolean);
        if (normalized.length > 0) {
            return normalized.join(', ');
        }
    }

    const message = (error as any)?.message;
    if (typeof message === 'string' && message.trim()) {
        return message;
    }

    return fallback;
}
