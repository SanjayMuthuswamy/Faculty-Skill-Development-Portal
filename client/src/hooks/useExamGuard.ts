import { useEffect, useRef, useCallback, useState } from 'react';

interface ExamGuardConfig {
    maxViolations?: number;
    onAutoSubmit: () => void;
    enabled?: boolean;
}

interface ExamGuardState {
    violations: number;
    maxViolations: number;
    isFullscreen: boolean;
    warningMessage: string | null;
}

/**
 * useExamGuard — Secure exam environment hook
 * 
 * Features:
 * - Auto fullscreen on mount
 * - Tab switch / window blur detection
 * - Right-click, copy/paste, keyboard shortcut prevention
 * - Auto-submit after max violations exceeded
 * 
 * Only affects the component that uses it (TestPlayer).
 */
export function useExamGuard({ maxViolations = 3, onAutoSubmit, enabled = true }: ExamGuardConfig): ExamGuardState {
    const [violations, setViolations] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [warningMessage, setWarningMessage] = useState<string | null>(null);
    const violationRef = useRef(0);
    const submittedRef = useRef(false);
    const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showWarning = useCallback((message: string) => {
        setWarningMessage(message);
        if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
        warningTimeoutRef.current = setTimeout(() => setWarningMessage(null), 4000);
    }, []);

    const addViolation = useCallback((reason: string) => {
        if (submittedRef.current) return;

        violationRef.current += 1;
        const count = violationRef.current;
        setViolations(count);

        if (count >= maxViolations) {
            submittedRef.current = true;
            showWarning(`⛔ Maximum violations reached (${maxViolations}). Auto-submitting test...`);
            setTimeout(() => onAutoSubmit(), 1500);
        } else {
            const remaining = maxViolations - count;
            showWarning(`⚠️ Warning: ${reason}. ${remaining} violation${remaining !== 1 ? 's' : ''} remaining before auto-submit.`);
        }
    }, [maxViolations, onAutoSubmit, showWarning]);

    useEffect(() => {
        if (!enabled) return;

        // --- Fullscreen ---
        const enterFullscreen = async () => {
            try {
                await document.documentElement.requestFullscreen();
                setIsFullscreen(true);
            } catch {
                // Browser may block if not user-initiated; that's OK
                console.warn('Fullscreen request denied — may need user gesture');
            }
        };

        // Small delay to ensure the component has rendered
        const fsTimeout = setTimeout(enterFullscreen, 300);

        const handleFullscreenChange = () => {
            const fs = !!document.fullscreenElement;
            setIsFullscreen(fs);
            if (!fs && !submittedRef.current) {
                addViolation('Exited fullscreen');
                // Try to re-enter
                setTimeout(enterFullscreen, 500);
            }
        };

        // --- Tab visibility ---
        const handleVisibilityChange = () => {
            if (document.hidden && !submittedRef.current) {
                addViolation('Tab switched');
            }
        };

        // --- Window blur (covers alt-tab) ---
        const handleBlur = () => {
            if (!submittedRef.current) {
                addViolation('Window lost focus');
            }
        };

        // --- Context menu (right-click) ---
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };

        // --- Copy/paste/cut ---
        const handleCopyPaste = (e: ClipboardEvent) => {
            e.preventDefault();
        };

        // --- Keyboard shortcuts (Ctrl+C, Ctrl+V, F12, etc.) ---
        const handleKeyDown = (e: KeyboardEvent) => {
            // Block F12 (DevTools)
            if (e.key === 'F12') {
                e.preventDefault();
                return;
            }
            // Block Ctrl+Shift+I (DevTools), Ctrl+Shift+J (Console), Ctrl+U (View Source)
            if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j')) {
                e.preventDefault();
                return;
            }
            if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
                e.preventDefault();
                return;
            }
            // Block Ctrl+C, Ctrl+V, Ctrl+A
            if (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'a')) {
                e.preventDefault();
                return;
            }
        };

        // Attach listeners
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('copy', handleCopyPaste);
        document.addEventListener('paste', handleCopyPaste);
        document.addEventListener('cut', handleCopyPaste);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            clearTimeout(fsTimeout);
            if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('copy', handleCopyPaste);
            document.removeEventListener('paste', handleCopyPaste);
            document.removeEventListener('cut', handleCopyPaste);
            document.removeEventListener('keydown', handleKeyDown);

            // Exit fullscreen on cleanup
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => { });
            }
        };
    }, [enabled, addViolation]);

    return { violations, maxViolations, isFullscreen, warningMessage };
}
