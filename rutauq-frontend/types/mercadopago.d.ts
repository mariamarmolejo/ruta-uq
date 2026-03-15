/**
 * Type declarations for the Mercado Pago JS SDK v2 loaded from CDN.
 * Only the subset of the API used by this app is typed here.
 */

interface MPFieldStyle {
  fontSize?: string;
  color?: string;
  placeholderColor?: string;
}

interface MPField {
  mount(containerId: string): void;
  unmount(): void;
  on(event: "binChange", callback: (data: { bin: string }) => void): void;
  on(event: string, callback: (data: unknown) => void): void;
}

interface MPCardTokenData {
  cardholderName: string;
  identificationType: string;
  identificationNumber: string;
}

interface MPCardToken {
  id: string;
}

interface MPPaymentMethod {
  id: string;
  payment_type_id: string;
  name: string;
  thumbnail: string;
  min_allowed_amount: number;
  max_allowed_amount: number;
}

interface MPInstance {
  fields: {
    create(
      type: "cardNumber" | "expirationDate" | "securityCode",
      options?: { placeholder?: string; style?: MPFieldStyle }
    ): MPField;
    createCardToken(data: MPCardTokenData): Promise<MPCardToken>;
  };
  getPaymentMethods(params: {
    bin: string;
  }): Promise<{ results: MPPaymentMethod[] }>;
  getInstallments(params: {
    amount: string;
    bin: string;
  }): Promise<
    Array<{
      payment_method_id: string;
      payer_costs: Array<{ installments: number; recommended_message: string }>;
    }>
  >;
}

interface Window {
  MercadoPago: new (
    publicKey: string,
    options?: { locale?: string }
  ) => MPInstance;
}
