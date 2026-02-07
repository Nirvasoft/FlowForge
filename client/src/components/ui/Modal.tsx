import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    children: React.ReactNode;
}

export function Modal({
    isOpen,
    onClose,
    title,
    description,
    size = 'md',
    children,
}: ModalProps) {
    const sizes = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
    };

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-surface-950/80 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className={cn(
                    'relative w-full mx-4 bg-surface-900 border border-surface-700/50',
                    'rounded-xl shadow-2xl animate-scale-in',
                    sizes[size]
                )}
            >
                {/* Header */}
                {(title || description) && (
                    <div className="px-6 py-4 border-b border-surface-700/50">
                        <div className="flex items-start justify-between">
                            <div>
                                {title && (
                                    <h2 className="text-lg font-semibold text-surface-100">{title}</h2>
                                )}
                                {description && (
                                    <p className="mt-1 text-sm text-surface-400">{description}</p>
                                )}
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="px-6 py-4">{children}</div>
            </div>
        </div>
    );
}

interface ModalFooterProps {
    children: React.ReactNode;
    className?: string;
}

export function ModalFooter({ children, className }: ModalFooterProps) {
    return (
        <div
            className={cn(
                'flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-700/50 -mx-6 -mb-4 mt-4',
                className
            )}
        >
            {children}
        </div>
    );
}
