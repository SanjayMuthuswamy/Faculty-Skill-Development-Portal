import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    className?: string;
}

export function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    className
}: PaginationProps) {
    if (totalPages <= 1) return null;

    const renderPageNumber = (page: number) => (
        <Button
            key={page}
            variant={currentPage === page ? 'default' : 'ghost'}
            size="sm"
            className={cn(
                "h-9 w-9 p-0",
                currentPage === page && "pointer-events-none"
            )}
            onClick={() => onPageChange(page)}
        >
            {page}
        </Button>
    );

    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
        for (let i = 1; i <= totalPages; i++) {
            pages.push(renderPageNumber(i));
        }
    } else {
        pages.push(renderPageNumber(1));

        if (currentPage > 3) {
            pages.push(<MoreHorizontal key="ellipsis-start" className="h-4 w-4 text-gray-400" />);
        }

        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);

        for (let i = start; i <= end; i++) {
            if (i === 1 || i === totalPages) continue;
            pages.push(renderPageNumber(i));
        }

        if (currentPage < totalPages - 2) {
            pages.push(<MoreHorizontal key="ellipsis-end" className="h-4 w-4 text-gray-400" />);
        }

        pages.push(renderPageNumber(totalPages));
    }

    return (
        <div className={cn("flex items-center justify-center space-x-2 py-4", className)}>
            <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1 pl-2.5"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
            >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
            </Button>

            <div className="flex items-center space-x-1">
                {pages}
            </div>

            <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1 pr-2.5"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
            >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    );
}
