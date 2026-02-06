import type { HttpClient } from "../../http/HttpClient";
import { CarrierError } from "../base/errors";
import type { UpsConfig } from "../../config/env";
import type { ValidatedRateRequest } from "../../domain/schemas";
import type { RateQuote } from "../../domain/RateQuote";
import type { UpsRateResponseWrapper } from "./ups.schemas";
import {
  buildRateRequestBody,
  parseRatedShipment,
  parseRateResponse,
} from "./ups.mappers";
import type { UpsAuthClient } from "./UpsAuthClient";

const RATING_VERSION = "v2409";

export function createUpsRatingClient(
  config: UpsConfig,
  auth: UpsAuthClient,
  http: HttpClient,
  transactionSrc: string,
  timeoutMs: number
) {
  return {
    buildRequest(req: ValidatedRateRequest) {
      return buildRateRequestBody(req);
    },

    parseResponse(body: unknown): RateQuote[] {
      return parseRateResponse(body, parseRatedShipment);
    },

    async getRates(
      req: ValidatedRateRequest
    ): Promise<{ quotes: RateQuote[]; requestId?: string }> {
      const requestOption = req.serviceLevel ? "Rate" : "Shop";
      const base = config.baseUrl.replace(/\/$/, "");
      const url = `${base}/api/rating/${RATING_VERSION}/${requestOption}`;

      const payload = buildRateRequestBody(req);
      const requestId = `ups-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 9)}`;

      const doRequest = async (token: string) => {
        return http.post<UpsRateResponseWrapper>(url, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            transId: requestId.slice(0, 32),
            transactionSrc,
          },
          timeoutMs,
        });
      };

      let token: string;
      try {
        token = await auth.getAccessToken();
      } catch (err) {
        throw err;
      }

      let res;
      try {
        res = await doRequest(token);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          throw CarrierError.timeout("UPS Rating request timed out");
        }
        throw CarrierError.network(
          `UPS Rating request failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
          err
        );
      }

      if (res.status === 401) {
        try {
          token = await auth.refreshToken();
          res = await doRequest(token);
        } catch {
          throw CarrierError.tokenExpired(
            "UPS token expired and refresh failed"
          );
        }
      }

      if (res.status === 429) {
        throw CarrierError.rateLimited("UPS rate limit exceeded", res.status);
      }

      if (res.status === 400 || res.status === 403) {
        let msg = `UPS returned ${res.status}`;
        if (
          typeof res.body === "object" &&
          res.body !== null &&
          "response" in res.body
        ) {
          const r = (
            res.body as { response?: { errors?: Array<{ message?: string }> } }
          ).response;
          if (r?.errors?.[0]?.message) msg = String(r.errors[0].message);
        }
        throw CarrierError.badRequest(msg, res.status);
      }

      if (res.status !== 200) {
        throw CarrierError.carrierError(
          `UPS Rating returned ${res.status}`,
          res.status,
          undefined,
          res.status >= 500
        );
      }

      const quotes = parseRateResponse(res.body, parseRatedShipment);
      return { quotes, requestId };
    },
  };
}
