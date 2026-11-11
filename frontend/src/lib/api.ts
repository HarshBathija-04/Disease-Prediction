const BASE_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:5120").replace(/\/+$/, "");
const TOKEN_KEY = "dp.tokens";
const SLOW_AFTER_MS = 3500;

export type Tokens = { access: string; refresh: string };

export class ApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** First message for a field from a DRF validation error, if any. */
  field(name: string): string | undefined {
    const value = this.details?.[name];
    if (Array.isArray(value)) return String(value[0]);
    return typeof value === "string" ? value : undefined;
  }
}

export const tokens = {
  get(): Tokens | null {
    try {
      const raw = localStorage.getItem(TOKEN_KEY);
      return raw ? (JSON.parse(raw) as Tokens) : null;
    } catch {
      return null;
    }
  },
  set(value: Tokens | null) {
    try {
      if (value) localStorage.setItem(TOKEN_KEY, JSON.stringify(value));
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable: session lasts until reload */
    }
  },
};

// --- "Waking up the server" signal: true while any request has been pending for a while (Render cold start).
const slowListeners = new Set<(slow: boolean) => void>();
let slowCount = 0;
function setSlow(delta: number) {
  slowCount += delta;
  slowListeners.forEach((listener) => listener(slowCount > 0));
}
export function onSlowRequests(listener: (slow: boolean) => void) {
  slowListeners.add(listener);
  return () => void slowListeners.delete(listener);
}

let authLostHandler: () => void = () => {};
export function onAuthLost(handler: () => void) {
  authLostHandler = handler;
}

type Options = { method?: string; body?: unknown; auth?: boolean };

async function request(path: string, { method = "GET", body, auth = true }: Options, access?: string) {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && access) headers.Authorization = `Bearer ${access}`;

  let flagged = false;
  const timer = setTimeout(() => {
    flagged = true;
    setSlow(1);
  }, SLOW_AFTER_MS);
  try {
    return await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(90_000),
    });
  } catch {
    throw new ApiError(0, "network", "We couldn't reach the server. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
    if (flagged) setSlow(-1);
  }
}

let refreshing: Promise<boolean> | null = null;
function refreshAccess(): Promise<boolean> {
  refreshing ??= (async () => {
    const current = tokens.get();
    if (!current) return false;
    try {
      const response = await request("/api/auth/refresh", {
        method: "POST",
        body: { refresh: current.refresh },
        auth: false,
      });
      if (!response.ok) return false;
      const data = (await response.json()) as { access: string; refresh?: string };
      tokens.set({ access: data.access, refresh: data.refresh ?? current.refresh });
      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const auth = options.auth ?? true;
  let response = await request(path, options, tokens.get()?.access);

  if (response.status === 401 && auth && tokens.get()) {
    if (await refreshAccess()) {
      response = await request(path, options, tokens.get()?.access);
    } else {
      tokens.set(null);
      authLostHandler();
    }
  }

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // non-JSON body (e.g. an HTML error page from a proxy)
  }
  if (!response.ok) {
    const error = (data as { error?: { code?: string; message?: string; details?: Record<string, unknown> } })
      ?.error;
    throw new ApiError(
      response.status,
      error?.code ?? "error",
      error?.message ?? `Request failed (${response.status}).`,
      error?.details,
    );
  }
  return data as T;
}
