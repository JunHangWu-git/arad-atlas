import "server-only";

import type { ZodType } from "zod";

import { defaultLimiter, type Limiter } from "./limiter";
import { errorEnvelopeSchema } from "./schemas";

/**
 * Server-only fetch wrapper for the Neople DFO Global API.
 *
 * - Injects the server-only `apikey` from `process.env.DFO_API_KEY`.
 * - Rate-limited via a shared token-bucket limiter.
 * - Retries transient 5xx responses (up to 2 retries, small backoff).
 * - Throws a typed `NeopleError` on 4xx (parsing the DNF error envelope).
 * - When a Zod schema is supplied, parse failures are logged (console.warn)
 *   and the RAW data is returned instead of throwing — game patches drift and
 *   we must never lose data.
 */

const BASE_URL = "https://api.dfoneople.com";
const MAX_RETRIES = 2;
const BACKOFF_BASE_MS = 200;

export class NeopleError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly path: string;

  constructor(args: { status: number; code?: string; path: string; message: string }) {
    super(args.message);
    this.name = "NeopleError";
    this.status = args.status;
    this.code = args.code;
    this.path = args.path;
    // Restore prototype chain for instanceof across transpilation targets.
    Object.setPrototypeOf(this, NeopleError.prototype);
  }
}

type QueryParams = Record<string, string | number | undefined>;

function getApiKey(): string {
  const key = process.env.DFO_API_KEY;
  if (!key) {
    throw new Error(
      "DFO_API_KEY is not set. The Neople API key must be provided as a server-only environment variable.",
    );
  }
  return key;
}

function buildUrl(path: string, params: QueryParams, apiKey: string): string {
  const search = new URLSearchParams();
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined) {
      search.set(name, String(value));
    }
  }
  search.set("apikey", apiKey);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_URL}${normalizedPath}?${search.toString()}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseErrorEnvelope(
  response: Response,
): Promise<{ code?: string; message: string }> {
  try {
    const body: unknown = await response.json();
    const parsed = errorEnvelopeSchema.safeParse(body);
    if (parsed.success) {
      return { code: parsed.data.error.code, message: parsed.data.error.message };
    }
  } catch {
    // Body was not JSON or could not be read; fall through to status text.
  }
  return { message: response.statusText || `HTTP ${response.status}` };
}

export interface NeopleFetchOptions {
  readonly limiter?: Limiter;
  readonly fetchImpl?: typeof fetch;
}

export async function neopleFetch<T>(
  path: string,
  params: QueryParams = {},
  schema?: ZodType<T>,
  options?: NeopleFetchOptions,
): Promise<T> {
  const apiKey = getApiKey();
  const url = buildUrl(path, params, apiKey);
  const limiter = options?.limiter ?? defaultLimiter;
  const doFetch = options?.fetchImpl ?? fetch;

  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    await limiter.acquire();

    let response: Response;
    try {
      response = await doFetch(url);
    } catch (err) {
      // Network-level failure: retry like a transient error.
      lastError = err;
      if (attempt < MAX_RETRIES) {
        await delay(BACKOFF_BASE_MS * (attempt + 1));
        continue;
      }
      throw err;
    }

    if (response.status >= 500) {
      lastError = new NeopleError({
        status: response.status,
        path,
        message: `Neople API server error (${response.status}) for ${path}`,
      });
      if (attempt < MAX_RETRIES) {
        await delay(BACKOFF_BASE_MS * (attempt + 1));
        continue;
      }
      throw lastError;
    }

    if (response.status >= 400) {
      const { code, message } = await parseErrorEnvelope(response);
      throw new NeopleError({
        status: response.status,
        code,
        path,
        message: `Neople API error ${response.status}${code ? ` (${code})` : ""} for ${path}: ${message}`,
      });
    }

    const data: unknown = await response.json();

    if (!schema) {
      return data as T;
    }

    const result = schema.safeParse(data);
    if (result.success) {
      return result.data;
    }

    // Schema drift: log and return raw rather than losing data.
    console.warn(
      `[neople] schema validation failed for ${path}; returning raw data.`,
      result.error.issues,
    );
    return data as T;
  }

  // Exhausted retries without returning or throwing above.
  throw lastError instanceof Error
    ? lastError
    : new NeopleError({
        status: 0,
        path,
        message: `Neople API request failed for ${path}`,
      });
}
