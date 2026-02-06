import type { HttpClient } from "../../http/HttpClient";
import { CarrierError } from "../base/errors";
import type { UpsConfig } from "../../config/env";

const GRANT_TYPE = "client_credentials";

export interface UpsTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in: number;
  issued_at?: string;
  status?: string;
}

interface CachedToken {
  accessToken: string;
  expiresAtMs: number;
}

const REFRESH_BUFFER_MS = 60_000;

export class UpsAuthClient {
  private cache: CachedToken | null = null;

  constructor(
    private readonly config: UpsConfig,
    private readonly http: HttpClient,
    private readonly timeoutMs: number
  ) {}

  get tokenUrl(): string {
    const base = this.config.baseUrl.replace(/\/api\/?$/, "");
    return `${base}/security/v1/oauth/token`;
  }

  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAtMs > now + REFRESH_BUFFER_MS) {
      return this.cache.accessToken;
    }
    return this.acquireToken();
  }

  async refreshToken(): Promise<string> {
    this.cache = null;
    return this.acquireToken();
  }

  clearCache(): void {
    this.cache = null;
  }

  private async acquireToken(): Promise<string> {
    const url = this.tokenUrl;
    const body = new URLSearchParams({ grant_type: GRANT_TYPE });
    const authHeader =
      "Basic " +
      Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`, "utf-8").toString(
        "base64"
      );

    let res;
    try {
      res = await this.http.postForm(url, body, {
        headers: { Authorization: authHeader },
        timeoutMs: this.timeoutMs,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw CarrierError.timeout("UPS OAuth token request timed out");
      }
      throw CarrierError.network(
        `UPS OAuth token request failed: ${err instanceof Error ? err.message : String(err)}`,
        err
      );
    }

    if (res.status === 401) {
      throw CarrierError.authFailed("Invalid UPS client ID or secret");
    }

    if (res.status !== 200) {
      const msg =
        typeof res.body === "object" &&
        res.body !== null &&
        "error_description" in res.body
          ? String((res.body as { error_description?: string }).error_description)
          : `UPS OAuth returned ${res.status}`;
      throw CarrierError.authFailed(msg);
    }

    const data = res.body as UpsTokenResponse;
    if (!data.access_token || typeof data.expires_in !== "number") {
      throw CarrierError.authFailed("Invalid UPS token response shape");
    }

    const expiresAtMs = Date.now() + data.expires_in * 1000;
    this.cache = { accessToken: data.access_token, expiresAtMs };
    return data.access_token;
  }
}
