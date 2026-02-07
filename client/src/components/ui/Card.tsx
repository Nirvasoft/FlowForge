import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'glass';
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
    title?: string;
    description?: string;
    action?: ReactNode;
}

export function Card({ className, variant = 'default', children, ...props }: CardProps) {
    const variants = {
        default: 'bg-surface-800/40 border border-surface-700/50 rounded-xl backdrop-blur-sm',
        glass: 'bg-surface-900/60 backdrop-blur-md border border-surface-700/50 rounded-xl shadow-glass',
    };

    return (
        <div className={cn(variants[variant], className)} {...props}>
            {children}
        </div>
    );
}

export function CardHeader({
    className,
    title,
    description,
    action,
    children,
    ...props
}: CardHeaderProps) {
    return (
        <div className={cn('px-6 py-4 border-b border-surface-700/50', className)} {...props}>
            {(title || children) ? (
                <div className="flex items-center justify-between">
                    <div>
                        {title && (
                            <h3 className="text-lg font-semibold text-surface-100">{title}</h3>
                        )}
                        {description && (
                            <p className="mt-1 text-sm text-surface-400">{description}</p>
                        )}
                        {children}
                    </div>
                    {action && <div>{action}</div>}
                </div>
            ) : null}
        </div>
    );
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn('px-6 py-4', className)} {...props}>
            {children}
        </div>
    );
}

export function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn('px-6 py-4 border-t border-surface-700/50', className)} {...props}>
            {children}
        </div>
    );
}
