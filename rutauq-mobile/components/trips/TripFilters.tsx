import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Search, Calendar, X } from 'lucide-react-native';
import { format } from 'date-fns';
import { Colors } from '@/constants/colors';

export interface FilterValues {
  origin:      string;
  destination: string;
  date:        string;
  minSeats:    string;
}

interface TripFiltersProps {
  values:   FilterValues;
  onChange: (values: FilterValues) => void;
  onSearch: () => void;
}

export function TripFilters({ values, onChange, onSearch }: TripFiltersProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleDateChange = (_: unknown, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      onChange({ ...values, date: format(selectedDate, 'yyyy-MM-dd') });
    }
  };

  const clearDate = () => onChange({ ...values, date: '' });

  return (
    <View className="bg-white px-4 py-3 border-b border-neutral-100">
      {/* Origin */}
      <View className="flex-row items-center bg-neutral-100 rounded-xl px-3 py-2 mb-2">
        <Search size={16} color={Colors.neutral[500]} />
        <TextInput
          className="flex-1 ml-2 text-sm text-neutral-900"
          placeholder="Origen"
          placeholderTextColor={Colors.neutral[400]}
          value={values.origin}
          onChangeText={(t) => onChange({ ...values, origin: t })}
          returnKeyType="search"
          onSubmitEditing={onSearch}
          accessibilityLabel="Origen del viaje"
        />
        {values.origin.length > 0 && (
          <TouchableOpacity onPress={() => onChange({ ...values, origin: '' })}>
            <X size={14} color={Colors.neutral[500]} />
          </TouchableOpacity>
        )}
      </View>

      {/* Destination */}
      <View className="flex-row items-center bg-neutral-100 rounded-xl px-3 py-2 mb-2">
        <Search size={16} color={Colors.neutral[500]} />
        <TextInput
          className="flex-1 ml-2 text-sm text-neutral-900"
          placeholder="Destino"
          placeholderTextColor={Colors.neutral[400]}
          value={values.destination}
          onChangeText={(t) => onChange({ ...values, destination: t })}
          returnKeyType="search"
          onSubmitEditing={onSearch}
          accessibilityLabel="Destino del viaje"
        />
        {values.destination.length > 0 && (
          <TouchableOpacity onPress={() => onChange({ ...values, destination: '' })}>
            <X size={14} color={Colors.neutral[500]} />
          </TouchableOpacity>
        )}
      </View>

      {/* Date + Seats row */}
      <View className="flex-row gap-2">
        {/* Date picker */}
        <TouchableOpacity
          className="flex-1 flex-row items-center bg-neutral-100 rounded-xl px-3 py-2"
          onPress={() => setShowDatePicker(true)}
          accessibilityLabel="Fecha del viaje"
          accessibilityRole="button"
        >
          <Calendar size={16} color={Colors.neutral[500]} />
          <Text className={`flex-1 ml-2 text-sm ${values.date ? 'text-neutral-900' : 'text-neutral-400'}`}>
            {values.date || 'Fecha'}
          </Text>
          {values.date && (
            <TouchableOpacity onPress={clearDate}>
              <X size={14} color={Colors.neutral[500]} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Min seats */}
        <View className="w-24 flex-row items-center bg-neutral-100 rounded-xl px-3 py-2">
          <TextInput
            className="flex-1 text-sm text-neutral-900"
            placeholder="Puestos"
            placeholderTextColor={Colors.neutral[400]}
            value={values.minSeats}
            onChangeText={(t) => onChange({ ...values, minSeats: t.replace(/[^0-9]/g, '') })}
            keyboardType="numeric"
            maxLength={1}
            accessibilityLabel="Mínimo de puestos"
          />
        </View>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={values.date ? new Date(values.date + 'T00:00:00') : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}
    </View>
  );
}
