import type { Address } from "./Address";
import type { Parcel } from "./Parcel";

export type ServiceLevel =
  | "ground"
  | "next_day_air"
  | "second_day_air"
  | "three_day_select"
  | "worldwide_express"
  | "worldwide_expedited"
  | string;

export interface RateRequest {
  origin: Address;
  destination: Address;
  package: Parcel;
  serviceLevel?: ServiceLevel;
}

export interface RateQuote {
  carrier: "ups";
  serviceCode: string;
  serviceName: string;
  amount: number;
  currency: string;
  estimatedTransitDays?: number;
}

export interface RateQuoteResult {
  quotes: RateQuote[];
  requestId?: string;
}
