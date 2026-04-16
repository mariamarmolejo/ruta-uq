import React from 'react';
import { View, Text } from 'react-native';
import type { TripStatus, ReservationStatus } from '@/types';
import {
  TRIP_STATUS_LABEL,
  TRIP_STATUS_COLOR,
  TRIP_STATUS_BG,
  RESERVATION_STATUS_LABEL,
  RESERVATION_STATUS_COLOR,
  RESERVATION_STATUS_BG,
} from '@/lib/utils';

interface TripStatusBadgeProps {
  status: TripStatus;
}

export function TripStatusBadge({ status }: TripStatusBadgeProps) {
  return (
    <View
      style={{ backgroundColor: TRIP_STATUS_BG[status] }}
      className="px-2 py-1 rounded-full self-start"
    >
      <Text
        style={{ color: TRIP_STATUS_COLOR[status] }}
        className="text-xs font-semibold"
      >
        {TRIP_STATUS_LABEL[status]}
      </Text>
    </View>
  );
}

interface ReservationStatusBadgeProps {
  status: ReservationStatus;
}

export function ReservationStatusBadge({ status }: ReservationStatusBadgeProps) {
  return (
    <View
      style={{ backgroundColor: RESERVATION_STATUS_BG[status] }}
      className="px-2 py-1 rounded-full self-start"
    >
      <Text
        style={{ color: RESERVATION_STATUS_COLOR[status] }}
        className="text-xs font-semibold"
      >
        {RESERVATION_STATUS_LABEL[status]}
      </Text>
    </View>
  );
}

type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'default';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  primary: { bg: '#dbeafe', text: '#1d4ed8' },
  success: { bg: '#dcfce7', text: '#15803d' },
  warning: { bg: '#fef3c7', text: '#b45309' },
  danger:  { bg: '#fee2e2', text: '#b91c1c' },
  default: { bg: '#f5f5f5', text: '#525252' },
};

export function Badge({ variant = 'default', children }: BadgeProps) {
  const styles = variantStyles[variant];
  return (
    <View
      style={{ backgroundColor: styles.bg }}
      className="px-2 py-1 rounded-full self-start"
    >
      <Text style={{ color: styles.text }} className="text-xs font-semibold">
        {children}
      </Text>
    </View>
  );
}
