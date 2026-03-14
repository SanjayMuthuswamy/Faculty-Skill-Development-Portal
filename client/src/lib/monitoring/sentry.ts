import * as Sentry from '@sentry/react';

function parseSampleRate(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) {
        return parsed;
    }
    return fallback;
}

export function setupSentry(): boolean {
    const dsn = import.meta.env.VITE_SENTRY_DSN;
    const enabled = (import.meta.env.VITE_SENTRY_ENABLED ?? 'false').toLowerCase() === 'true';

    if (!dsn || !enabled) {
        return false;
    }

    Sentry.init({
        dsn,
        environment: import.meta.env.MODE,
        tracesSampleRate: parseSampleRate(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE, 0.1),
        enabled,
    });

    return true;
}
