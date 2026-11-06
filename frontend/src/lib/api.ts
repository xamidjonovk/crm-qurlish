type Tokens = { access_token: string; refresh_token: string };
const base = process.env.NEXT_PUBLIC_API_URL || "";
let tokens: Tokens | null = null;
let rotation: Promise<void> | null = null;
let epoch = 0;
export function restoreSession() {
  try {
    tokens = JSON.parse(sessionStorage.getItem("crm.session.v1") || "null");
  } catch {
    tokens = null;
  }
}
export function setTokens(value: Tokens | null) {
  tokens = value;
  epoch++;
  if (value) sessionStorage.setItem("crm.session.v1", JSON.stringify(value));
  else sessionStorage.removeItem("crm.session.v1");
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
  auth = true,
  retry = true,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (auth && tokens)
    headers.set("Authorization", `Bearer ${tokens.access_token}`);
  if (options.body && !(options.body instanceof URLSearchParams))
    headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(base + path, {
      ...options,
      headers,
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "Serverga ulanib bo‘lmadi. Internet va server holatini tekshiring.",
    );
  }
  if (response.status === 401 && auth && tokens && retry) {
    if (!rotation) {
      const current = epoch;
      rotation = api<Tokens>(
        "/api/v1/auth/refresh",
        {
          method: "POST",
          body: JSON.stringify({ refresh_token: tokens.refresh_token }),
        },
        false,
        false,
      )
        .then((value) => {
          if (current !== epoch) throw new Error("Sessiya almashgan");
          setTokens(value);
        })
        .catch((error) => {
          if (current === epoch) {
            setTokens(null);
            window.dispatchEvent(new Event("crm:logout"));
          }
          throw error;
        })
        .finally(() => (rotation = null));
    }
    await rotation;
    return api<T>(path, options, auth, false);
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : response.status === 422
          ? "Maydonlar noto‘g‘ri kiritilgan. Qiymatlarni tekshiring."
          : `So‘rov bajarilmadi (${response.status})`,
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
export const json = (method: string, data: unknown): RequestInit => ({
  method,
  body: JSON.stringify(data),
});
export const fetcher = <T>(path: string) => api<T>(path);
