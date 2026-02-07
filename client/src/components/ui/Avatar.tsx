import { cn } from '../../lib/utils';
import { getInitials } from '../../lib/utils';

interface AvatarProps {
    src?: string | null;
    name: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
    const sizes = {
        sm: 'h-8 w-8 text-xs',
        md: 'h-10 w-10 text-sm',
        lg: 'h-12 w-12 text-base',
        xl: 'h-16 w-16 text-lg',
    };

    const initials = getInitials(name);

    if (src) {
        return (
            <img
                src={src}
                alt={name}
                className={cn(
                    'rounded-full object-cover',
                    sizes[size],
                    className
                )}
            />
        );
    }

    return (
        <div
            className={cn(
                'rounded-full bg-gradient-to-br from-primary-500 to-accent-500',
                'flex items-center justify-center font-medium text-white',
                sizes[size],
                className
            )}
        >
            {initials}
        </div>
    );
}
