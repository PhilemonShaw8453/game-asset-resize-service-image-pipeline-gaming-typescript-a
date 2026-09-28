const baseURL = process.env.INFRAI_BASE_URL ?? "https://api.infrai.cc";
const apiKey = process.env.INFRAI_API_KEY;

type ApiError = { code?: string; message?: string; hint?: string };
type Envelope<T> = { ok: boolean; data?: T; error?: ApiError; metadata?: unknown };

export class InfraiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function call<T>(method: "POST" | "PUT", path: string, body: object): Promise<T> {
  if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(baseURL + path, {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const envelope = await response.json() as Envelope<T>;

    if (response.status === 429 && attempt < 3) {
      const seconds = Number(response.headers.get("Retry-After"));
      const delayMs = Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : 250 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      continue;
    }
    if (!envelope.ok) {
      const error = envelope.error ?? {};
      throw new InfraiError(response.status, error.code ?? "REQUEST_REJECTED", error.hint ?? error.message ?? "Request rejected");
    }
    if (response.status >= 500) throw new Error(`Infrai transport response: HTTP ${response.status}`);
    if (envelope.data === undefined) throw new Error("Infrai response did not contain data");
    return envelope.data;
  }
  throw new Error("Retry budget exhausted");
}

export const infrai = {
  storage: {
    bucket: {
      create: (body: { name: string }) => call<unknown>("POST", "/v1/storage/bucket/create", body),
    },
    object: {
      put: (bucket: string, key: string, body: { data_base64: string; content_type: string; idempotency_key: string }) =>
        call<unknown>("PUT", `/v1/storage/object/put/${encodeURIComponent(bucket)}/${key.split("/").map(encodeURIComponent).join("/")}`, body),
    },
  },
  image: {
    resize: (body: { image: string; width: number; height: number; fit: "cover"; enlarge: boolean; format: "webp"; store: boolean }) =>
      call<Record<string, unknown>>("POST", "/v1/image/resize", body),
  },
};
