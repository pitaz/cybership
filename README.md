# Cybership Carrier Integration Service

TypeScript service for fetching shipping rates from the UPS Rating API.  
Designed as a production-ready, carrier-agnostic module that can be extended to support additional carriers (FedEx, USPS, DHL) and operations (labels, tracking, address validation) without changing the core.

---

## Design Overview

**Goal:** make new carriers and new operations easy to add.

- **Carrier interface**  
  A single `CarrierAdapter` interface defines what a carrier can do. The shipping service depends only on this interface.

- **Adapters, not conditionals**  
  UPS is implemented as one adapter. Adding another carrier means adding another adapter, not modifying existing logic.

- **Clear separation of concerns**
  - **Domain:** shared business models and validation (`Address`, `Parcel`, `RateRequest`, `RateQuote`)
  - **Transport:** a simple `HttpClient` abstraction
  - **Auth:** fully encapsulated inside each carrier adapter
  - **Normalization:** carrier-specific formats are mapped into shared domain types

Callers only see normalized `RateQuote[]`. Carrier-specific details never leak out.

---

## Authentication

UPS OAuth 2.0 is handled entirely inside the UPS adapter.

- Client-credentials flow
- In-memory token cache with expiry awareness
- Token reused when valid
- Automatic refresh on expiry or 401, with a single retry

The rest of the system does not know tokens or OAuth exist.

---

## Error Handling

All errors are normalized into a single `CarrierError` type.

Each error includes:

- A stable error code (for example `AUTH_FAILED`, `RATE_LIMITED`, `VALIDATION_ERROR`)
- A human-readable message
- Optional carrier metadata
- A `retryable` flag

Input validation runs before any external call using Zod. Invalid input never reaches a carrier API.

---

## Extending the System

### Add a New Carrier

1. Implement `CarrierAdapter` in a new folder
2. Handle auth, request mapping, and response normalization inside the adapter
3. Register it in the factory
4. Add environment config

No changes required elsewhere.

### Add a New Operation

- Extend the carrier interface
- Implement it for UPS first
- Other carriers can opt in later

---

## Testing

Integration tests stub HTTP at the boundary and verify:

- Domain input builds the correct UPS request payload
- UPS responses normalize into `RateQuote[]`
- OAuth token acquisition, reuse, and refresh
- Error conditions map to the correct `CarrierError` codes

No live API calls or credentials are required.

---

## How to Run

Node 18 or newer.

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
