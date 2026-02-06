import type { RateRequest, RateQuoteResult } from "../../domain/RateQuote";
import type { CarrierId, OperationType } from "./types";

export interface CarrierAdapter {
  readonly carrierId: CarrierId;
  readonly supportedOperations: readonly OperationType[];

  executeRate(request: RateRequest): Promise<RateQuoteResult>;
}
