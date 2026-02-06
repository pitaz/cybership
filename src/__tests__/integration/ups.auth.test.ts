import { describe, it, expect } from "vitest";
import { createShippingService } from "../../index";
import { loadConfig } from "../../config/env";
import type { RateRequest } from "../../domain/RateQuote";
import { StubHttpClient } from "./stub-http";
import {
  STUB_OAUTH_SUCCESS,
  STUB_RATE_SUCCESS,
  STUB_RATE_401,
} from "./ups-stub-responses";

const validRateRequest: RateRequest = {
  origin: {
    addressLine: ["123 Main St"],
    city: "Timonium",
    stateProvinceCode: "MD",
    postalCode: "21093",
    countryCode: "US",
  },
  destination: {
    addressLine: ["456 Oak Ave"],
    city: "Alpharetta",
    stateProvinceCode: "GA",
    postalCode: "30005",
    countryCode: "US",
  },
  package: {
    weightLbs: 5,
    dimensions: { lengthInches: 10, widthInches: 8, heightInches: 6 },
  },
};

function createServiceWithStub(stub: StubHttpClient) {
  const config = loadConfig(false);
  config.ups.clientId = "test_client";
  config.ups.clientSecret = "test_secret";
  config.ups.baseUrl = "https://wwwcie.ups.com";
  return createShippingService({ config, httpClient: stub });
}

describe("Auth token lifecycle", () => {
  it("acquires token once and reuses for rate call", async () => {
    const stub = new StubHttpClient();
    stub.tokenResponse = STUB_OAUTH_SUCCESS;
    stub.rateResponse = STUB_RATE_SUCCESS;

    const service = createServiceWithStub(stub);
    await service.getRates(validRateRequest);

    const oauthCalls = stub.calls.filter((c) => String(c.url).includes("oauth/token"));
    expect(oauthCalls.length).toBe(1);
  });

  it("refreshes token on 401 and retries rate request", async () => {
    const stub = new StubHttpClient();
    stub.tokenResponse = STUB_OAUTH_SUCCESS;
    let rateCallCount = 0;
    stub.rateResponse = () => {
      rateCallCount++;
      if (rateCallCount === 1) return STUB_RATE_401;
      return STUB_RATE_SUCCESS;
    };

    const service = createServiceWithStub(stub);
    const result = await service.getRates(validRateRequest);

    const oauthCalls = stub.calls.filter((c) => String(c.url).includes("oauth/token"));
    expect(oauthCalls.length).toBe(2);
    expect(result.quotes).toHaveLength(3);
  });
});
