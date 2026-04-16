import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  type TouchableOpacityProps,
} from 'react-native';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'outline' | 'ghost' | 'danger';
type Size    = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  variant?:  Variant;
  size?:     Size;
  loading?:  boolean;
  children:  React.ReactNode;
}

const variantBase: Record<Variant, string> = {
  primary: 'bg-primary-600 border border-primary-600',
  outline: 'bg-transparent border border-primary-600',
  ghost:   'bg-transparent border border-transparent',
  danger:  'bg-red-600 border border-red-600',
};

const variantText: Record<Variant, string> = {
  primary: 'text-white',
  outline: 'text-primary-600',
  ghost:   'text-neutral-700',
  danger:  'text-white',
};

const variantDisabled: Record<Variant, string> = {
  primary: 'bg-primary-300 border-primary-300',
  outline: 'border-neutral-300',
  ghost:   '',
  danger:  'bg-red-300 border-red-300',
};

const sizeContainer: Record<Size, string> = {
  sm: 'px-3 py-2 rounded-lg',
  md: 'px-4 py-3 rounded-xl',
  lg: 'px-6 py-4 rounded-xl',
};

const sizeText: Record<Size, string> = {
  sm: 'text-sm font-medium',
  md: 'text-base font-semibold',
  lg: 'text-lg font-semibold',
};

export function Button({
  variant  = 'primary',
  size     = 'md',
  loading  = false,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      className={cn(
        'flex-row items-center justify-center',
        sizeContainer[size],
        variantBase[variant],
        isDisabled && variantDisabled[variant],
        isDisabled && 'opacity-60',
        className
      )}
      {...props}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? '#ffffff' : '#2563eb'}
          className="mr-2"
        />
      )}
      <Text
        className={cn(
          sizeText[size],
          variantText[variant],
          isDisabled && 'opacity-70'
        )}
      >
        {children}
      </Text>
    </TouchableOpacity>
  );
}
