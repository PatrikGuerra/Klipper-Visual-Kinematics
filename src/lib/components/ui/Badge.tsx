import type { JSX } from 'solid-js';
import { cn } from '../../utils';

interface BadgeProps {
  variant?: 'default' | 'warning' | 'destructive' | 'muted';
  className?: string;
  children?: JSX.Element;
}

export default function Badge(props: BadgeProps): JSX.Element {
  const variant = () => props.variant ?? 'default';
  return (
    <span
      class={cn(
        'inline-flex min-h-6 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        variant() === 'default' && 'border-accent/40 bg-accent/15 text-accent',
        variant() === 'warning' && 'border-yellow-500/40 bg-yellow-500/10 text-yellow-700',
        variant() === 'destructive' && 'border-destructive/35 bg-destructive/10 text-red-700',
        variant() === 'muted' && 'border-border bg-muted text-muted-foreground',
        props.className
      )}
    >
      {props.children}
    </span>
  );
}
