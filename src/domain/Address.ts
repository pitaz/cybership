export interface Address {
  addressLine: string[];
  city: string;
  stateProvinceCode?: string;
  postalCode: string;
  countryCode: string;
  residential?: boolean;
}
