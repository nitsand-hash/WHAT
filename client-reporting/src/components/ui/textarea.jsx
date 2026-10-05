import { cn } from '@lib/utils';

export function Textarea({ className, ...props }) {
  return <textarea className={cn('flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground disabled:opacity-50', className)} {...props} />;
}
