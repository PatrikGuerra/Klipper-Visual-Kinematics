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
      'ui-button',
      `ui-button-${variant()}`,
      `ui-button-${size()}`,
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
