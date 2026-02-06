import { loadConfig } from "./config/env";
import type { HttpClient } from "./http/HttpClient";
import { DefaultHttpClient } from "./http/HttpClient";
import { UpsCarrier } from "./carriers/ups/UpsCarrier";
import { ShippingCarrierService } from "./service";

export type { Address } from "./domain/Address";
export type { Parcel, Package } from "./domain/Parcel";
export type { Money } from "./domain/Money";
export type {
  RateRequest,
  RateQuote,
  RateQuoteResult,
  ServiceLevel,
} from "./domain/RateQuote";
export type { CarrierErrorDetails, CarrierErrorCode } from "./carriers/base/errors";
export { CarrierError } from "./carriers/base/errors";
export type { AppConfig } from "./config/env";

export interface CreateShippingServiceOptions {
  config?: ReturnType<typeof loadConfig>;
  httpClient?: HttpClient;
}

export function createShippingService(
  options?: CreateShippingServiceOptions | ReturnType<typeof loadConfig>
): ShippingCarrierService {
  type ResolvedOpts = {
    config?: ReturnType<typeof loadConfig>;
    httpClient?: HttpClient;
  };
  const opts: ResolvedOpts =
    options != null && "httpClient" in options
      ? options
      : { config: options as ReturnType<typeof loadConfig> | undefined };
  const cfg = opts.config ?? loadConfig(false);
  const http = opts.httpClient ?? new DefaultHttpClient(cfg.httpTimeoutMs);
  const adapters = new Map<string, import("./carriers/base/Carrier").CarrierAdapter>();

  if (cfg.ups.clientId && cfg.ups.clientSecret) {
    adapters.set(
      "ups",
      new UpsCarrier(cfg.ups, http, cfg.transactionSrc, cfg.httpTimeoutMs)
    );
  }

  return new ShippingCarrierService(adapters);
}

export { ShippingCarrierService, loadConfig };
