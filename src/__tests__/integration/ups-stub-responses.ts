export const STUB_OAUTH_SUCCESS = {
  status: 200,
  headers: new Headers({ "Content-Type": "application/json" }),
  body: {
    access_token: "stub_token_abc123",
    token_type: "Bearer",
    expires_in: 3600,
    issued_at: "2024-01-01T00:00:00Z",
  },
};

export const STUB_RATE_SUCCESS = {
  status: 200,
  headers: new Headers({ "Content-Type": "application/json" }),
  body: {
    RateResponse: {
      Response: { TransactionReference: { CustomerContext: "test-request-id" } },
      RatedShipment: [
        {
          Service: { Code: "03", Description: "UPS Ground" },
          TotalCharge: { CurrencyCode: "USD", MonetaryValue: "12.45" },
          GuaranteedDelivery: { BusinessDaysInTransit: "3" },
        },
        {
          Service: { Code: "02", Description: "2nd Day Air" },
          TotalCharge: { CurrencyCode: "USD", MonetaryValue: "24.99" },
          GuaranteedDelivery: { BusinessDaysInTransit: "2" },
        },
        {
          Service: { Code: "01", Description: "Next Day Air" },
          TotalCharge: { CurrencyCode: "USD", MonetaryValue: "48.00" },
          GuaranteedDelivery: { BusinessDaysInTransit: "1" },
        },
      ],
    },
  },
};

export const STUB_RATE_NEGOTIATED = {
  status: 200,
  headers: new Headers({ "Content-Type": "application/json" }),
  body: {
    RateResponse: {
      RatedShipment: [
        {
          Service: { Code: "03", Description: "UPS Ground" },
          TotalCharge: { CurrencyCode: "USD", MonetaryValue: "15.00" },
          NegotiatedRateCharges: {
            TotalCharge: { CurrencyCode: "USD", MonetaryValue: "11.25" },
          },
        },
      ],
    },
  },
};

export const STUB_RATE_400 = {
  status: 400,
  headers: new Headers({ "Content-Type": "application/json" }),
  body: {
    response: {
      errors: [{ code: "InvalidAddress", message: "The destination address is invalid." }],
    },
  },
};

export const STUB_RATE_401 = {
  status: 401,
  headers: new Headers({ "Content-Type": "application/json" }),
  body: { fault: { faultstring: "Invalid or expired token" } },
};

export const STUB_RATE_429 = {
  status: 429,
  headers: new Headers({ "Content-Type": "application/json" }),
  body: { message: "Rate limit exceeded" },
};

export const STUB_OAUTH_401 = {
  status: 401,
  headers: new Headers({ "Content-Type": "application/json" }),
  body: { error: "invalid_client", error_description: "Client authentication failed" },
};
