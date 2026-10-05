import { cn } from '@lib/utils';

const variants = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  outline: 'border border-input bg-card hover:bg-secondary',
  ghost: 'hover:bg-secondary',
};
const sizes = { default: 'h-10 px-4 py-2', sm: 'h-8 px-3 text-xs' };

export function Button({ className, variant = 'default', size = 'default', ...props }) {
  return (
    <button
      className={cn('inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
        variants[variant], sizes[size], className)}
      {...props}
    />
  );
}
