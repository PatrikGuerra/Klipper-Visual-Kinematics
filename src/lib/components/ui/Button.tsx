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
  const variantClass = () => {
    switch (variant()) {
      case 'secondary':
        return 'btn-secondary';
      case 'outline':
        return 'btn-outline';
      case 'ghost':
        return 'btn-ghost';
      case 'success':
        return 'btn-success';
      case 'warning':
        return 'btn-warning';
      case 'destructive':
        return 'btn-error';
      default:
        return 'btn-primary';
    }
  };
  const sizeClass = () => {
    switch (size()) {
      case 'sm':
        return 'btn-xs';
      case 'icon':
        return 'btn-sm btn-square';
      default:
        return 'btn-sm';
    }
  };
  const classes = () =>
    cn(
      'btn',
      variantClass(),
      sizeClass(),
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
