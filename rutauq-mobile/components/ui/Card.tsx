import React from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from '@/lib/utils';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <View
      className={cn(
        'bg-white rounded-2xl p-4 shadow-sm border border-neutral-100',
        className
      )}
      {...props}
    >
      {children}
    </View>
  );
}
