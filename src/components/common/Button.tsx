// Button Component

import { JSX, splitProps } from 'solid-js';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning';

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
}

export default function Button(props: ButtonProps) {
  const [local, others] = splitProps(props, ['variant', 'size', 'fullWidth', 'class', 'children']);

  const classes = () => {
    const base = 'btn';
    const variant = local.variant ? `btn-${local.variant}` : '';
    const size = local.size ? `btn-${local.size}` : '';
    const width = local.fullWidth ? 'btn-full' : '';
    const custom = local.class || '';
    return [base, variant, size, width, custom].filter(Boolean).join(' ');
  };

  return (
    <button class={classes()} {...others}>
      {local.children}
    </button>
  );
}
