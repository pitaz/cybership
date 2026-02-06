// UPS Rating API request/response shapes. Only used inside the adapter.
export interface UpsRateRequestWrapper {
  RateRequest: UpsRateRequest;
}

export interface UpsRateRequest {
  Request: {
    RequestOption: "Rate" | "Shop";
    TransactionReference?: { CustomerContext?: string };
  };
  Shipment: UpsRateShipment;
}

export interface UpsAddress {
  AddressLine: string[];
  City: string;
  StateProvinceCode?: string;
  PostalCode: string;
  CountryCode: string;
  ResidentialAddressIndicator?: string;
}

export interface UpsRateShipment {
  Shipper: { Name: string; Address: UpsAddress; ShipperNumber?: string };
  ShipTo: { Name: string; Address: UpsAddress };
  ShipFrom: { Name: string; Address: UpsAddress };
  PaymentDetails: {
    ShipmentCharge: Array<{
      Type: string;
      BillShipper: { AccountNumber: string };
    }>;
  };
  Service?: { Code: string; Description: string };
  NumOfPieces: string;
  Package: UpsRatePackage | UpsRatePackage[];
}

export interface UpsRatePackage {
  PackagingType: { Code: string; Description?: string };
  Dimensions: {
    UnitOfMeasurement: { Code: string; Description?: string };
    Length: string;
    Width: string;
    Height: string;
  };
  PackageWeight: {
    UnitOfMeasurement: { Code: string; Description?: string };
    Weight: string;
  };
}

export interface UpsRateResponseWrapper {
  RateResponse?: UpsRateResponse;
}

export interface UpsRateResponse {
  Response?: { TransactionReference?: { CustomerContext?: string } };
  RatedShipment?: UpsRatedShipment[];
}

export interface UpsRatedShipment {
  Service?: { Code?: string; Description?: string };
  TotalCharge?: { CurrencyCode?: string; MonetaryValue?: string };
  NegotiatedRateCharges?: {
    ItemizedCharges?: unknown[];
    TotalCharge?: { CurrencyCode?: string; MonetaryValue?: string };
  };
  GuaranteedDelivery?: { BusinessDaysInTransit?: string };
}
