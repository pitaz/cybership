import type { Address } from "../../domain/Address";
import type { Parcel } from "../../domain/Parcel";
import type { RateQuote } from "../../domain/RateQuote";
import type { ValidatedRateRequest } from "../../domain/schemas";
import type {
  UpsAddress,
  UpsRatePackage,
  UpsRateRequestWrapper,
  UpsRatedShipment,
} from "./ups.schemas";

const PACKAGING_CODE = "02";
const DIMENSION_UOM = "IN";
const WEIGHT_UOM = "LBS";

const SERVICE_LEVEL_TO_UPS_CODE: Record<string, string> = {
  ground: "03",
  next_day_air: "01",
  second_day_air: "02",
  three_day_select: "12",
  worldwide_express: "07",
  worldwide_expedited: "08",
};

export function toUpsAddress(addr: Address): UpsAddress {
  const a: UpsAddress = {
    AddressLine: addr.addressLine.slice(0, 3),
    City: addr.city,
    PostalCode: addr.postalCode,
    CountryCode: addr.countryCode,
  };
  if (addr.stateProvinceCode) a.StateProvinceCode = addr.stateProvinceCode;
  if (addr.residential) a.ResidentialAddressIndicator = "Y";
  return a;
}

export function toUpsPackage(pkg: Parcel): UpsRatePackage {
  return {
    PackagingType: { Code: PACKAGING_CODE, Description: "Package" },
    Dimensions: {
      UnitOfMeasurement: { Code: DIMENSION_UOM, Description: "Inches" },
      Length: String(pkg.dimensions.lengthInches),
      Width: String(pkg.dimensions.widthInches),
      Height: String(pkg.dimensions.heightInches),
    },
    PackageWeight: {
      UnitOfMeasurement: { Code: WEIGHT_UOM, Description: "Pounds" },
      Weight: String(pkg.weightLbs),
    },
  };
}

export function buildRateRequestBody(
  req: ValidatedRateRequest
): UpsRateRequestWrapper {
  const requestOption = req.serviceLevel ? "Rate" : "Shop";
  const serviceCode = req.serviceLevel
    ? SERVICE_LEVEL_TO_UPS_CODE[req.serviceLevel] ?? req.serviceLevel
    : undefined;

  const shipment = {
    Shipper: {
      Name: "Shipper",
      Address: toUpsAddress(req.origin),
      ShipperNumber: "",
    },
    ShipTo: {
      Name: "ShipTo",
      Address: toUpsAddress(req.destination),
    },
    ShipFrom: {
      Name: "ShipFrom",
      Address: toUpsAddress(req.origin),
    },
    PaymentDetails: {
      ShipmentCharge: [{ Type: "01", BillShipper: { AccountNumber: "" } }],
    },
    NumOfPieces: "1",
    Package: toUpsPackage(req.package),
  };

  if (serviceCode) {
    (shipment as Record<string, unknown>).Service = {
      Code: serviceCode,
      Description: req.serviceLevel ?? serviceCode,
    };
  }

  return {
    RateRequest: {
      Request: { RequestOption: requestOption },
      Shipment: shipment as UpsRateRequestWrapper["RateRequest"]["Shipment"],
    },
  };
}

export function parseRatedShipment(rated: UpsRatedShipment): RateQuote | null {
  const serviceCode = rated.Service?.Code ?? "";
  const serviceName = rated.Service?.Description ?? (serviceCode || "Unknown");
  const totalCharge =
    rated.NegotiatedRateCharges?.TotalCharge ?? rated.TotalCharge;
  const monetaryValue = totalCharge?.MonetaryValue;
  const currency = totalCharge?.CurrencyCode ?? "USD";

  if (monetaryValue === undefined || monetaryValue === null) return null;
  const amount = Number(monetaryValue);
  if (!Number.isFinite(amount)) return null;

  let estimatedTransitDays: number | undefined;
  if (rated.GuaranteedDelivery?.BusinessDaysInTransit) {
    const days = Number(rated.GuaranteedDelivery.BusinessDaysInTransit);
    if (Number.isFinite(days)) estimatedTransitDays = days;
  }

  return {
    carrier: "ups",
    serviceCode,
    serviceName,
    amount,
    currency,
    estimatedTransitDays,
  };
}

export function parseRateResponse(
  body: unknown,
  parseRated: (rated: UpsRatedShipment) => RateQuote | null
): RateQuote[] {
  const wrapper = body as {
    RateResponse?: { RatedShipment?: UpsRatedShipment[] };
  };
  const ratedShipments = wrapper?.RateResponse?.RatedShipment;
  if (!Array.isArray(ratedShipments)) return [];
  const quotes: RateQuote[] = [];
  for (const rated of ratedShipments) {
    const quote = parseRated(rated);
    if (quote) quotes.push(quote);
  }
  return quotes;
}
