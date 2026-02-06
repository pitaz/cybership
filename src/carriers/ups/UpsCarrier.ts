import type { RateRequest, RateQuoteResult } from "../../domain/RateQuote";
import type { CarrierAdapter } from "../base/Carrier";
import type { HttpClient } from "../../http/HttpClient";
import type { UpsConfig } from "../../config/env";
import { UpsAuthClient } from "./UpsAuthClient";
import { createUpsRatingClient } from "./ups.http";

export class UpsCarrier implements CarrierAdapter {
  readonly carrierId = "ups" as const;
  readonly supportedOperations = ["rate"] as const;

  private readonly auth: UpsAuthClient;
  private readonly rating: ReturnType<typeof createUpsRatingClient>;

  constructor(
    config: UpsConfig,
    http: HttpClient,
    transactionSrc: string,
    timeoutMs: number
  ) {
    this.auth = new UpsAuthClient(config, http, timeoutMs);
    this.rating = createUpsRatingClient(
      config,
      this.auth,
      http,
      transactionSrc,
      timeoutMs
    );
  }

  async executeRate(request: RateRequest): Promise<RateQuoteResult> {
    const result = await this.rating.getRates(request);
    return { quotes: result.quotes, requestId: result.requestId };
  }
}
