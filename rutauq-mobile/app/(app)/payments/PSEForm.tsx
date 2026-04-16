import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { Input, Button } from '@/components/ui';
import { Colors } from '@/constants/colors';
import type { PseBankOption } from '@/types';

interface PSEFormData {
  financialInstitution: string;
  docType:              string;
  docNumber:            string;
  entityType:           string;
}

interface PSEFormProps {
  banks:    PseBankOption[];
  onSubmit: (data: PSEFormData) => Promise<void>;
  loading?: boolean;
}

const DOC_TYPES = [
  { label: 'Cédula de ciudadanía (CC)', value: 'CC' },
  { label: 'NIT',                       value: 'NIT' },
  { label: 'Cédula extranjería (CE)',    value: 'CE' },
];

const ENTITY_TYPES = [
  { label: 'Persona natural',  value: 'N' },
  { label: 'Persona jurídica', value: 'J' },
];

export function PSEForm({ banks, onSubmit, loading }: PSEFormProps) {
  const [form, setForm] = useState<PSEFormData>({
    financialInstitution: '',
    docType:              'CC',
    docNumber:            '',
    entityType:           'N',
  });
  const [errors, setErrors] = useState<Partial<PSEFormData>>({});
  const [showBankPicker, setShowBankPicker]     = useState(false);
  const [showDocPicker, setShowDocPicker]       = useState(false);
  const [showEntityPicker, setShowEntityPicker] = useState(false);

  const validate = () => {
    const e: Partial<PSEFormData> = {};
    if (!form.financialInstitution) e.financialInstitution = 'Selecciona un banco';
    if (!form.docNumber.trim())     e.docNumber            = 'Ingresa el número de documento';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setErrors({});
    await onSubmit(form);
  };

  const selectedBank   = banks.find((b) => b.id === form.financialInstitution);
  const selectedDoc    = DOC_TYPES.find((d) => d.value === form.docType);
  const selectedEntity = ENTITY_TYPES.find((e) => e.value === form.entityType);

  const pickerButton = (
    label: string,
    value: string,
    error: string | undefined,
    onPress: () => void
  ) => (
    <View className="mb-4">
      <Text className="text-sm font-medium text-neutral-700 mb-1">{label}</Text>
      <TouchableOpacity
        className={`border rounded-xl px-4 py-3 flex-row items-center justify-between ${
          error ? 'border-red-500' : 'border-neutral-300'
        }`}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text className={value ? 'text-neutral-900' : 'text-neutral-400'}>
          {value || `Seleccionar ${label.toLowerCase()}`}
        </Text>
        <ChevronDown size={16} color={Colors.neutral[500]} />
      </TouchableOpacity>
      {error && <Text className="text-sm text-red-500 mt-1">{error}</Text>}
    </View>
  );

  const dropdownList = <T extends { label: string; value: string }>(
    items: T[],
    onSelect: (item: T) => void,
    onClose: () => void
  ) => (
    <View className="border border-neutral-200 rounded-xl bg-white mb-4">
      {items.map((item) => (
        <TouchableOpacity
          key={item.value}
          className="px-4 py-3 border-b border-neutral-100"
          onPress={() => {
            onSelect(item);
            onClose();
          }}
        >
          <Text className="text-neutral-900">{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View>
      <Text className="text-sm text-neutral-600 mb-4">
        Completa los datos para realizar el pago vía PSE.
      </Text>

      {/* Bank */}
      {pickerButton(
        'Banco',
        selectedBank?.description ?? '',
        errors.financialInstitution,
        () => setShowBankPicker((v) => !v)
      )}
      {showBankPicker &&
        dropdownList(
          banks.map((b) => ({ label: b.description, value: b.id })),
          (item) => setForm((f) => ({ ...f, financialInstitution: item.value })),
          () => setShowBankPicker(false)
        )}

      {/* Doc type */}
      {pickerButton(
        'Tipo de documento',
        selectedDoc?.label ?? '',
        undefined,
        () => setShowDocPicker((v) => !v)
      )}
      {showDocPicker &&
        dropdownList(
          DOC_TYPES,
          (item) => setForm((f) => ({ ...f, docType: item.value })),
          () => setShowDocPicker(false)
        )}

      {/* Doc number */}
      <Input
        label="Número de documento"
        placeholder="1234567890"
        value={form.docNumber}
        onChangeText={(t) => setForm((f) => ({ ...f, docNumber: t }))}
        keyboardType="numeric"
        error={errors.docNumber}
        accessibilityLabel="Número de documento"
      />

      {/* Entity type */}
      {pickerButton(
        'Tipo de persona',
        selectedEntity?.label ?? '',
        undefined,
        () => setShowEntityPicker((v) => !v)
      )}
      {showEntityPicker &&
        dropdownList(
          ENTITY_TYPES,
          (item) => setForm((f) => ({ ...f, entityType: item.value })),
          () => setShowEntityPicker(false)
        )}

      <Button onPress={handleSubmit} loading={loading} size="lg">
        Pagar con PSE
      </Button>
    </View>
  );
}
