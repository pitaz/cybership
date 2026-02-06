import { describe, it, expect } from "vitest";
import { createShippingService } from "../../index";
import { CarrierError } from "../../carriers/base/errors";
import { loadConfig } from "../../config/env";
import type { RateRequest } from "../../domain/RateQuote";
import { StubHttpClient } from "./stub-http";
import {
  STUB_OAUTH_SUCCESS,
  STUB_RATE_SUCCESS,
  STUB_RATE_NEGOTIATED,
  STUB_RATE_400,
  STUB_RATE_429,
  STUB_OAUTH_401,
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

describe("Request payload building", () => {
  it("builds correct UPS Rate request from domain model (Shop)", async () => {
    const stub = new StubHttpClient();
    stub.tokenResponse = STUB_OAUTH_SUCCESS;
    stub.rateResponse = STUB_RATE_SUCCESS;

    const service = createServiceWithStub(stub);
    await service.getRates(validRateRequest);

    const formCalls = stub.calls.filter((c) => c.method === "POST_FORM");
    const jsonCalls = stub.calls.filter((c) => c.method === "POST" && typeof c.body === "object");

    expect(formCalls.length).toBe(1);
    expect(formCalls[0]?.url).toContain("/security/v1/oauth/token");
    expect(formCalls[0]?.body).toMatchObject({ grant_type: "client_credentials" });

    expect(jsonCalls.length).toBe(1);
    const rateBody = jsonCalls[0]?.body as {
      RateRequest?: { Request?: { RequestOption?: string }; Shipment?: unknown };
    };
    expect(rateBody?.RateRequest?.Request?.RequestOption).toBe("Shop");
    const shipment = rateBody?.RateRequest?.Shipment as {
      Shipper?: { Address?: { City: string; PostalCode: string; CountryCode: string } };
      ShipTo?: { Address?: { City: string; PostalCode: string } };
      Package?: {
        Dimensions?: { Length: string; Width: string; Height: string };
        PackageWeight?: { Weight: string };
      };
    };
    expect(shipment?.Shipper?.Address?.City).toBe("Timonium");
    expect(shipment?.Shipper?.Address?.PostalCode).toBe("21093");
    expect(shipment?.ShipTo?.Address?.City).toBe("Alpharetta");
    expect(shipment?.Package?.Dimensions?.Length).toBe("10");
    expect(shipment?.Package?.Dimensions?.Width).toBe("8");
    expect(shipment?.Package?.Dimensions?.Height).toBe("6");
    expect(shipment?.Package?.PackageWeight?.Weight).toBe("5");
  });

  it("builds Rate request (single service) when serviceLevel is provided", async () => {
    const stub = new StubHttpClient();
    stub.tokenResponse = STUB_OAUTH_SUCCESS;
    stub.rateResponse = STUB_RATE_SUCCESS;

    const service = createServiceWithStub(stub);
    await service.getRates({ ...validRateRequest, serviceLevel: "ground" });

    const jsonCalls = stub.calls.filter((c) => c.method === "POST" && typeof c.body === "object");
    const rateBody = jsonCalls[0]?.body as {
      RateRequest?: {
        Request?: { RequestOption?: string };
        Shipment?: { Service?: { Code: string } };
      };
    };
    expect(rateBody?.RateRequest?.Request?.RequestOption).toBe("Rate");
    expect(rateBody?.RateRequest?.Shipment?.Service?.Code).toBe("03");
  });
});

describe("Response parsing and normalization", () => {
  it("parses and normalizes successful Shop response to RateQuote[]", async () => {
    const stub = new StubHttpClient();
    stub.tokenResponse = STUB_OAUTH_SUCCESS;
    stub.rateResponse = STUB_RATE_SUCCESS;

    const service = createServiceWithStub(stub);
    const result = await service.getRates(validRateRequest);

    expect(result.quotes).toHaveLength(3);
    expect(result.quotes[0]).toMatchObject({
      carrier: "ups",
      serviceCode: "03",
      serviceName: "UPS Ground",
      amount: 12.45,
      currency: "USD",
      estimatedTransitDays: 3,
    });
    expect(result.quotes[1]).toMatchObject({
      serviceCode: "02",
      serviceName: "2nd Day Air",
      amount: 24.99,
      estimatedTransitDays: 2,
    });
    expect(result.quotes[2]).toMatchObject({
      serviceCode: "01",
      amount: 48,
      estimatedTransitDays: 1,
    });
    expect(result.requestId).toBeDefined();
  });

  it("uses NegotiatedRateCharges.TotalCharge when present", async () => {
    const stub = new StubHttpClient();
    stub.tokenResponse = STUB_OAUTH_SUCCESS;
    stub.rateResponse = STUB_RATE_NEGOTIATED;

    const service = createServiceWithStub(stub);
    const result = await service.getRates(validRateRequest);

    expect(result.quotes).toHaveLength(1);
    expect(result.quotes[0]?.amount).toBe(11.25);
    expect(result.quotes[0]?.currency).toBe("USD");
  });
});

describe("Error handling", () => {
  it("returns structured error for 400 Bad Request", async () => {
    const stub = new StubHttpClient();
    stub.tokenResponse = STUB_OAUTH_SUCCESS;
    stub.rateResponse = STUB_RATE_400;

    const service = createServiceWithStub(stub);
    await expect(service.getRates(validRateRequest)).rejects.toThrow(CarrierError);

    try {
      await service.getRates(validRateRequest);
    } catch (err) {
      expect(err).toBeInstanceOf(CarrierError);
      const e = err as CarrierError;
      expect(e.details.code).toBe("BAD_REQUEST");
      expect(e.details.statusCode).toBe(400);
    }
  });

  it("returns structured error for 429 Rate Limit", async () => {
    const stub = new StubHttpClient();
    stub.tokenResponse = STUB_OAUTH_SUCCESS;
    stub.rateResponse = STUB_RATE_429;

    const service = createServiceWithStub(stub);
    await expect(service.getRates(validRateRequest)).rejects.toThrow(CarrierError);

    try {
      await service.getRates(validRateRequest);
    } catch (err) {
      const e = err as CarrierError;
      expect(e.details.code).toBe("RATE_LIMITED");
      expect(e.details.statusCode).toBe(429);
      expect(e.details.retryable).toBe(true);
    }
  });

  it("returns structured error for auth failure (OAuth 401)", async () => {
    const stub = new StubHttpClient();
    stub.tokenResponse = STUB_OAUTH_401;

    const service = createServiceWithStub(stub);
    await expect(service.getRates(validRateRequest)).rejects.toThrow(CarrierError);

    try {
      await service.getRates(validRateRequest);
    } catch (err) {
      const e = err as CarrierError;
      expect(e.details.code).toBe("AUTH_FAILED");
      expect(e.details.retryable).toBe(false);
    }
  });

  it("returns validation error for invalid rate request", async () => {
    const stub = new StubHttpClient();
    const service = createServiceWithStub(stub);

    await expect(
      service.getRates({
        ...validRateRequest,
        origin: { ...validRateRequest.origin, addressLine: [] },
      })
    ).rejects.toThrow(CarrierError);

    try {
      await service.getRates({
        ...validRateRequest,
        package: { ...validRateRequest.package, weightLbs: -1 },
      });
    } catch (err) {
      const e = err as CarrierError;
      expect(e.details.code).toBe("VALIDATION_ERROR");
    }
  });

  it("returns validation error for unsupported carrier", async () => {
    const stub = new StubHttpClient();
    const service = createServiceWithStub(stub);

    await expect(service.getRates(validRateRequest, "fedex")).rejects.toThrow(CarrierError);

    try {
      await service.getRates(validRateRequest, "fedex");
    } catch (err) {
      const e = err as CarrierError;
      expect(e.details.code).toBe("VALIDATION_ERROR");
      expect(e.message).toContain("Unsupported carrier");
    }
  });
});
