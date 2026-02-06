function env(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined || value === "") {
    throw new Error(
      `Missing required config: ${key}. Set it in .env or environment.`
    );
  }
  return value;
}

function envOptional(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

function envNumber(key: string, defaultValue: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return defaultValue;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Invalid config ${key}: must be a non-negative number.`);
  }
  return n;
}

export interface UpsConfig {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
}

export interface AppConfig {
  ups: UpsConfig;
  httpTimeoutMs: number;
  transactionSrc: string;
}

export function loadConfig(requireUps = true): AppConfig {
  const ups: UpsConfig = {
    clientId: requireUps
      ? env("UPS_CLIENT_ID")
      : envOptional("UPS_CLIENT_ID", ""),
    clientSecret: requireUps
      ? env("UPS_CLIENT_SECRET")
      : envOptional("UPS_CLIENT_SECRET", ""),
    baseUrl: envOptional("UPS_BASE_URL", "").replace(/\/$/, ""),
  };

  return {
    ups,
    httpTimeoutMs: envNumber("HTTP_TIMEOUT_MS", 30_000),
    transactionSrc: envOptional("TRANSACTION_SRC", "cybership"),
  };
}
