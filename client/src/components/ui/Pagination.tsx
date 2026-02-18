import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PaginationProps {
    page: number;
    totalPages: number;
    total: number;
    limit: number;
    onPageChange: (page: number) => void;
    onLimitChange?: (limit: number) => void;
    className?: string;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function Pagination({
    page,
    totalPages,
    total,
    limit,
    onPageChange,
    onLimitChange,
    className,
}: PaginationProps) {
    if (total === 0) return null;

    const from = (page - 1) * limit + 1;
    const to = Math.min(page * limit, total);

    // Generate page numbers with ellipsis
    const getPageNumbers = (): (number | '...')[] => {
        const pages: (number | '...')[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible + 2) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (page > 3) pages.push('...');

            const start = Math.max(2, page - 1);
            const end = Math.min(totalPages - 1, page + 1);
            for (let i = start; i <= end; i++) pages.push(i);

            if (page < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    return (
        <div className={cn('flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4', className)}>
            {/* Left: showing count + page size */}
            <div className="flex items-center gap-4 text-sm text-surface-400">
                <span>
                    Showing <span className="font-medium text-surface-200">{from}</span>–
                    <span className="font-medium text-surface-200">{to}</span> of{' '}
                    <span className="font-medium text-surface-200">{total}</span>
                </span>
                {onLimitChange && (
                    <div className="flex items-center gap-2">
                        <span>Rows:</span>
                        <select
                            value={limit}
                            onChange={(e) => onLimitChange(Number(e.target.value))}
                            className="bg-surface-800/50 border border-surface-600 rounded-lg px-2 py-1 text-sm text-surface-200 focus:outline-none focus:border-primary-500 cursor-pointer"
                        >
                            {PAGE_SIZE_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Right: page buttons */}
            {totalPages > 1 && (
                <div className="flex items-center gap-1">
                    <PageButton
                        onClick={() => onPageChange(1)}
                        disabled={page === 1}
                        aria-label="First page"
                    >
                        <ChevronsLeft className="h-4 w-4" />
                    </PageButton>
                    <PageButton
                        onClick={() => onPageChange(page - 1)}
                        disabled={page === 1}
                        aria-label="Previous page"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </PageButton>

                    {getPageNumbers().map((p, i) =>
                        p === '...' ? (
                            <span key={`ellipsis-${i}`} className="px-2 text-surface-500">
                                …
                            </span>
                        ) : (
                            <PageButton
                                key={p}
                                onClick={() => onPageChange(p)}
                                active={p === page}
                            >
                                {p}
                            </PageButton>
                        )
                    )}

                    <PageButton
                        onClick={() => onPageChange(page + 1)}
                        disabled={page === totalPages}
                        aria-label="Next page"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </PageButton>
                    <PageButton
                        onClick={() => onPageChange(totalPages)}
                        disabled={page === totalPages}
                        aria-label="Last page"
                    >
                        <ChevronsRight className="h-4 w-4" />
                    </PageButton>
                </div>
            )}
        </div>
    );
}

function PageButton({
    children,
    active,
    disabled,
    onClick,
    ...props
}: {
    children: React.ReactNode;
    active?: boolean;
    disabled?: boolean;
    onClick?: () => void;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'min-w-[36px] h-9 px-2 flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200',
                active
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                    : disabled
                        ? 'text-surface-600 cursor-not-allowed'
                        : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/50'
            )}
            {...props}
        >
            {children}
        </button>
    );
}
