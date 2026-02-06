export type CarrierErrorCode =
  | "AUTH_FAILED"
  | "AUTH_TOKEN_EXPIRED"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "BAD_REQUEST"
  | "CARRIER_ERROR"
  | "VALIDATION_ERROR";

export interface CarrierErrorDetails {
  code: CarrierErrorCode;
  message: string;
  statusCode?: number;
  carrierCode?: string;
  retryable?: boolean;
}

export class CarrierError extends Error {
  readonly details: CarrierErrorDetails;

  constructor(details: CarrierErrorDetails, cause?: unknown) {
    super(details.message);
    this.name = "CarrierError";
    this.details = details;
    if (cause instanceof Error) {
      this.cause = cause;
    }
  }

  static authFailed(message: string, cause?: unknown): CarrierError {
    return new CarrierError({ code: "AUTH_FAILED", message, retryable: false }, cause);
  }

  static tokenExpired(message: string): CarrierError {
    return new CarrierError({ code: "AUTH_TOKEN_EXPIRED", message, retryable: true });
  }

  static network(message: string, cause?: unknown): CarrierError {
    return new CarrierError({ code: "NETWORK_ERROR", message, retryable: true }, cause);
  }

  static timeout(message: string): CarrierError {
    return new CarrierError({ code: "TIMEOUT", message, retryable: true });
  }

  static rateLimited(message: string, statusCode = 429): CarrierError {
    return new CarrierError({
      code: "RATE_LIMITED",
      message,
      statusCode,
      retryable: true,
    });
  }

  static badRequest(message: string, statusCode?: number, carrierCode?: string): CarrierError {
    return new CarrierError({
      code: "BAD_REQUEST",
      message,
      statusCode,
      carrierCode,
      retryable: false,
    });
  }

  static carrierError(
    message: string,
    statusCode?: number,
    carrierCode?: string,
    retryable = false
  ): CarrierError {
    return new CarrierError({
      code: "CARRIER_ERROR",
      message,
      statusCode,
      carrierCode,
      retryable,
    });
  }

  static validation(message: string): CarrierError {
    return new CarrierError({ code: "VALIDATION_ERROR", message, retryable: false });
  }

  toJSON(): CarrierErrorDetails {
    return this.details;
  }
}
