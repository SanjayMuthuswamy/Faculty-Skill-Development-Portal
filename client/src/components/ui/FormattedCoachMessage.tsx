import { Fragment, type ReactNode } from 'react';

function normalizeCoachText(text: string): string {
    return text
        .replace(/ðŸ‘‹/g, '')
        .replace(/Â·/g, '·')
        .replace(/â€¦/g, '...')
        .replace(/\r\n/g, '\n')
        .trim();
}

function renderInlineFormatting(text: string): ReactNode[] {
    const segments = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
    return segments.map((segment, index) => {
        if (segment.startsWith('**') && segment.endsWith('**')) {
            return (
                <strong key={index} className="font-bold">
                    {segment.slice(2, -2)}
                </strong>
            );
        }
        return <Fragment key={index}>{segment}</Fragment>;
    });
}

export function FormattedCoachMessage({ text }: { text: string }) {
    const normalized = normalizeCoachText(text);
    const blocks = normalized.split(/\n\s*\n/).filter(Boolean);

    return (
        <div className="space-y-3">
            {blocks.map((block, blockIndex) => {
                const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
                const numbered = lines.every((line) => /^\d+\.\s+/.test(line));
                const bulleted = lines.every((line) => /^[-*]\s+/.test(line));

                if (numbered) {
                    return (
                        <ol key={blockIndex} className="space-y-2 pl-5">
                            {lines.map((line, lineIndex) => (
                                <li key={lineIndex} className="list-decimal">
                                    {renderInlineFormatting(line.replace(/^\d+\.\s+/, ''))}
                                </li>
                            ))}
                        </ol>
                    );
                }

                if (bulleted) {
                    return (
                        <ul key={blockIndex} className="space-y-2 pl-5">
                            {lines.map((line, lineIndex) => (
                                <li key={lineIndex} className="list-disc">
                                    {renderInlineFormatting(line.replace(/^[-*]\s+/, ''))}
                                </li>
                            ))}
                        </ul>
                    );
                }

                return (
                    <div key={blockIndex} className="space-y-2">
                        {lines.map((line, lineIndex) => (
                            <p key={lineIndex}>{renderInlineFormatting(line)}</p>
                        ))}
                    </div>
                );
            })}
        </div>
    );
}
