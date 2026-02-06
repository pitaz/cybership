import { rateRequestSchema } from "./domain/schemas";
import type { RateRequest, RateQuoteResult } from "./domain/RateQuote";
import { CarrierError } from "./carriers/base/errors";
import type { CarrierAdapter } from "./carriers/base/Carrier";

export class ShippingCarrierService {
  constructor(private readonly adapters: Map<string, CarrierAdapter>) {}

  async getRates(
    request: RateRequest,
    carrierId: "ups" | string = "ups"
  ): Promise<RateQuoteResult> {
    const parsed = rateRequestSchema.safeParse(request);
    if (!parsed.success) {
      const msg = parsed.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");
      throw CarrierError.validation(msg);
    }

    const adapter = this.adapters.get(carrierId);
    if (!adapter) {
      throw CarrierError.validation(`Unsupported carrier: ${carrierId}`);
    }
    if (!adapter.supportedOperations.includes("rate")) {
      throw CarrierError.validation(
        `Carrier ${carrierId} does not support rate operation`
      );
    }

    return adapter.executeRate(parsed.data);
  }
}
