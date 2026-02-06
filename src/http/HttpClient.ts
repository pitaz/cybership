export interface HttpResponse<T = unknown> {
  status: number;
  headers: Headers;
  body: T;
}

export interface HttpClient {
  post<T>(
    url: string,
    body: unknown,
    options?: { headers?: Record<string, string>; timeoutMs?: number }
  ): Promise<HttpResponse<T>>;

  postForm(
    url: string,
    body: URLSearchParams,
    options?: { headers?: Record<string, string>; timeoutMs?: number }
  ): Promise<HttpResponse<unknown>>;
}

function parseJson<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

async function doFetch(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

export class DefaultHttpClient implements HttpClient {
  constructor(private defaultTimeoutMs = 30_000) {}

  async post<T>(
    url: string,
    body: unknown,
    options?: { headers?: Record<string, string>; timeoutMs?: number }
  ): Promise<HttpResponse<T>> {
    const timeoutMs = options?.timeoutMs ?? this.defaultTimeoutMs;
    const res = await doFetch(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
        body: JSON.stringify(body),
      },
      timeoutMs
    );

    const text = await res.text();
    let bodyParsed: T;
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json") && text) {
      bodyParsed = parseJson<T>(text);
    } else {
      bodyParsed = text as unknown as T;
    }

    return {
      status: res.status,
      headers: res.headers,
      body: bodyParsed,
    };
  }

  async postForm(
    url: string,
    body: URLSearchParams,
    options?: { headers?: Record<string, string>; timeoutMs?: number }
  ): Promise<HttpResponse<unknown>> {
    const timeoutMs = options?.timeoutMs ?? this.defaultTimeoutMs;
    const res = await doFetch(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          ...options?.headers,
        },
        body: body.toString(),
      },
      timeoutMs
    );

    const text = await res.text();
    let bodyParsed: unknown;
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json") && text) {
      bodyParsed = parseJson<unknown>(text);
    } else {
      bodyParsed = text;
    }

    return {
      status: res.status,
      headers: res.headers,
      body: bodyParsed,
    };
  }
}
