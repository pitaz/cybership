import type { HttpClient, HttpResponse } from "../../http/HttpClient";

export interface StubCall {
  url: string;
  method: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export class StubHttpClient implements HttpClient {
  readonly calls: StubCall[] = [];

  rateResponse: HttpResponse<unknown> | (() => HttpResponse<unknown>) | null = null;
  tokenResponse: HttpResponse<unknown> | (() => HttpResponse<unknown>) | null = null;
  postError: Error | null = null;

  clear(): void {
    this.calls.length = 0;
    this.rateResponse = null;
    this.tokenResponse = null;
    this.postError = null;
  }

  async post<T>(
    url: string,
    body: unknown,
    options?: { headers?: Record<string, string>; timeoutMs?: number }
  ): Promise<HttpResponse<T>> {
    this.calls.push({ url, method: "POST", body, headers: options?.headers });
    if (this.postError) throw this.postError;
    if (this.rateResponse) {
      const res =
        typeof this.rateResponse === "function" ? this.rateResponse() : this.rateResponse;
      return res as HttpResponse<T>;
    }
    return { status: 200, headers: new Headers(), body: {} as T };
  }

  async postForm(
    url: string,
    body: URLSearchParams,
    options?: { headers?: Record<string, string>; timeoutMs?: number }
  ): Promise<HttpResponse<unknown>> {
    this.calls.push({
      url,
      method: "POST_FORM",
      body: Object.fromEntries(body),
      headers: options?.headers,
    });
    if (this.tokenResponse) {
      const res =
        typeof this.tokenResponse === "function" ? this.tokenResponse() : this.tokenResponse;
      return res;
    }
    return { status: 200, headers: new Headers(), body: {} };
  }
}
