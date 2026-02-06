import type { RateQuoteResult } from "../../domain/RateQuote";

export type CarrierId = "ups" | "fedex" | "usps" | "dhl";
export type OperationType = "rate";
export type RateOperationResult = RateQuoteResult;

export interface CarrierOperationContext {
  carrierId: CarrierId;
  operationType: OperationType;
}
