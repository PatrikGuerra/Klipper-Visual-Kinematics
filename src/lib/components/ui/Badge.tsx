import type { JSX } from 'solid-js';
import { cn } from '../../utils';

interface BadgeProps {
  variant?: 'default' | 'warning' | 'destructive' | 'muted';
  className?: string;
  children?: JSX.Element;
}

export default function Badge(props: BadgeProps): JSX.Element {
  const variant = () => props.variant ?? 'default';
  const variantClass = () => {
    switch (variant()) {
      case 'warning':
        return 'badge-warning';
      case 'destructive':
        return 'badge-error';
      case 'muted':
        return 'badge-neutral badge-outline';
      default:
        return 'badge-primary';
    }
  };
  return (
    <span
      class={cn(
        'badge badge-sm',
        variantClass(),
        props.className
      )}
    >
      {props.children}
    </span>
  );
}
