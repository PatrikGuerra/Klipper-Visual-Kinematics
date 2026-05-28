import type { JSX } from 'solid-js';
import { cn } from '../../utils';

interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'success' | 'warning' | 'destructive';
  size?: 'sm' | 'md' | 'icon';
  className?: string;
  ariaLabel?: string;
}

export default function Button(props: ButtonProps): JSX.Element {
  const variant = () => props.variant ?? 'default';
  const size = () => props.size ?? 'md';
  const classes = () =>
    cn(
      'inline-flex items-center justify-center gap-2 rounded-md border font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45',
      variant() === 'default' && 'border-blue-700 bg-blue-600 text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700',
      variant() === 'secondary' && 'border-border bg-white text-secondary-foreground hover:bg-slate-50',
      variant() === 'outline' && 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
      variant() === 'ghost' && 'border-transparent bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground',
      variant() === 'success' && 'border-emerald-700 bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700',
      variant() === 'warning' && 'border-amber-700 bg-amber-500 text-white shadow-sm shadow-amber-500/20 hover:bg-amber-600',
      variant() === 'destructive' && 'border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90',
      size() === 'sm' && 'h-8 px-2.5 text-xs',
      size() === 'md' && 'h-9 px-3 text-sm',
      size() === 'icon' && 'h-8 w-8 p-0',
      props.className,
      props.class
    );

  return (
    <button
      type={props.type ?? 'button'}
      class={classes()}
      disabled={props.disabled}
      aria-label={props.ariaLabel}
      onClick={props.onClick}
      onMouseDown={props.onMouseDown}
    >
      {props.children}
    </button>
  );
}
