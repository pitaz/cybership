# Cybership Carrier Integration Service

TypeScript service that talks to the UPS Rating API to get shipping rates. Built so we can plug in more carriers (FedEx, USPS, DHL) and more operations (labels, tracking, address validation) without reworking the core.

---

### 1. Why this architecture?

I wanted a **carrier-agnostic** design, not a one-off UPS integration.

There’s a single `CarrierAdapter` interface in `carriers/base/Carrier.ts`. The rate service only depends on that; no UPS imports, no OAuth. Adding FedEx would mean a new adapter class and one line in the factory; the rest of the code doesn’t change.

### 2. How would a new carrier be added?

Implement `CarrierAdapter` in e.g. `carriers/fedex/` (carrierId, supportedOperations, executeRate). Put FedEx-specific stuff there: whatever auth they use, a rate client that turns our domain request into their API call and their response into `RateQuote[]`, and any DTOs. No changes to domain, http, or service.

In the factory (`createShippingService()` in index.ts), instantiate the new adapter with config and the shared `HttpClient`, and add it to the adapters map under `'fedex'`. Add FedEx env vars to config. Done. The service already does `adapters.get(carrierId)` and `adapter.executeRate(parsed.data)`.

### 3. How is auth handled and cached?

Auth is entirely inside the UPS adapter. The rate service doesn’t know OAuth exists.

`UpsAuthClient` gets a token from the UPS OAuth endpoint (client credentials, Basic auth). We cache one token in memory with an expiry. Before each Rating call we ask for a token; if the cached one is still good (we refresh a bit before expiry, e.g. 60s buffer), we reuse it. If Rating returns 401, the rating client calls `auth.refreshToken()` and retries the rate request once. Callers never see 401 or token details. Domain types and the service have no reference to tokens or OAuth.

### 4. How I handled errors ?

We don’t throw raw carrier messages or random strings. Everything goes through **CarrierError** (see `errors.ts`): a `details` object with `code` (e.g. AUTH_FAILED, RATE_LIMITED, VALIDATION_ERROR), `message`, optional `statusCode` and `carrierCode`, and `retryable`.

Adapters turn HTTP failures into the right CarrierError (e.g. `CarrierError.rateLimited(...)`). The service doesn’t catch them; they bubble. Callers can check `err instanceof CarrierError` and use `err.details.code` and `err.details.retryable`. Validation runs before any HTTP (Zod); when it fails we throw `CarrierError.validation(...)`, so we never hit the API with bad input and the error shape stays consistent.

### 5. What would you build next with more time?

More carriers (FedEx, USPS, DHL) using the same adapter pattern. More operations on the interface (executeTrack, purchaseLabel, validateAddress) and implement them for UPS first. Move the token cache to something shared (e.g. Redis) for multi-instance. Retries with backoff for timeouts and 429/5xx. Structured logging and maybe metrics. A small CLI to run a rate request for demos.

---

## Features (summary)

- **Rate shopping:** origin, destination, package, optional service level → normalized `RateQuote[]`. UPS’s format stays internal.
- **UPS OAuth 2.0:** client credentials, token cache, refresh before expiry or on 401.
- **Extensible:** one Carrier interface, one adapter per carrier; new carriers/ops don’t require rewriting existing code.
- **Config:** everything from env (see `.env.example`), no hardcoded secrets.
- **Types & validation:** shared domain types, Zod before API calls, typed CarrierError.
- **Integration tests:** HTTP stubbed at the boundary; we assert request shape, normalized output, token reuse/refresh, and error mapping.

## How to run

Node ≥ 18.

```bash
npm install
npm run build
npm run test
```

Tests use a stub HTTP client and canned OAuth + Rating responses. **No credentials or live calls.**

With real credentials: copy `.env.example` to `.env`, set `UPS_CLIENT_ID` and `UPS_CLIENT_SECRET`, then call `createShippingService()` and `service.getRates(request)`.

**Scripts:** `npm run build` | `npm run test` | `npm run test:watch` | `npm run typecheck`

### Example usage

```ts
import { createShippingService } from "cybership-carrier-service";

const service = createShippingService();

const result = await service.getRates({
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
});

console.log(result.quotes);
```

## Project structure

```
src/
  carriers/
    base/
      Carrier.ts      # CarrierAdapter interface
      errors.ts       # CarrierError
      types.ts        # CarrierId, OperationType
    ups/
      UpsCarrier.ts   # implements CarrierAdapter
      UpsAuthClient.ts
      ups.schemas.ts  # UPS request/response DTOs
      ups.mappers.ts  # domain ↔ UPS mapping
      ups.http.ts     # Rating API client
  domain/
    Address.ts
    Parcel.ts
    RateQuote.ts
    Money.ts
    schemas.ts        # Zod validation
  config/
    env.ts
  http/
    HttpClient.ts
    errors.ts
  tests/
    integration/
      ups.rate.test.ts
      ups.auth.test.ts
      stub-http.ts
      ups-stub-responses.ts
  service.ts
  index.ts
```
