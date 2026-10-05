import { cn } from '@lib/utils';

export function Input({ className, ...props }) {
  return <input className={cn('flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground disabled:opacity-50', className)} {...props} />;
}
