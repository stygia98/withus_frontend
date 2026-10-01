// 공통 fetch 래퍼. 모든 API 호출은 이 함수를 거친다 (CLAUDE.md 5장, API_SPEC 1장)
// - 상대 경로 /api/... 만 사용
// - 인증은 httpOnly 쿠키로만 (토큰을 JS 에 저장하지 않음)
// - 변경 요청에는 XSRF-TOKEN 쿠키 값을 X-XSRF-TOKEN 헤더로 보낸다
// - 401 이면 refresh 후 한 번만 재시도한다. Access 쿠키는 30분 뒤 브라우저가 지우므로
//   AUTH_TOKEN_EXPIRED 뿐 아니라 AUTH_UNAUTHORIZED 도 재발급 대상이다 (Refresh 는 7일)

export type ApiErrorBody = { code: string; message: string; details?: unknown };

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  error: ApiErrorBody | null;
};

export type Page<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  return document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

async function request(path: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  const method = (init.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    const xsrf = readCookie("XSRF-TOKEN");
    if (xsrf) headers.set("X-XSRF-TOKEN", decodeURIComponent(xsrf));
  }
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(path, { ...init, headers, credentials: "include" });
}

async function toError(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => null)) as ApiResponse<unknown> | null;
  return new ApiError(
    body?.error?.code ?? "UNKNOWN",
    body?.error?.message ?? res.statusText,
    res.status,
    body?.error?.details,
  );
}

// 동시에 여러 요청이 401 을 받아도 refresh 는 한 번만 보낸다.
// Refresh 토큰은 재발급할 때마다 교체되므로, 두 번 보내면 두 번째가 옛 토큰으로 실패해 로그아웃된다
let refreshing: Promise<boolean> | null = null;

const NO_REFRESH_PATHS = new Set([
  "/api/v1/auth/login",
  "/api/v1/auth/refresh",
  "/api/v1/auth/logout",
]);

function refreshOnce(): Promise<boolean> {
  refreshing ??= request("/api/v1/auth/refresh", { method: "POST" })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function api<T>(path: `/api/${string}`, init: RequestInit = {}): Promise<T> {
  let res = await request(path, init);

  // 로그인·재발급·로그아웃의 401 은 그대로 돌려준다 (재발급 반복 방지). /auth/me 는 재발급 대상
  if (res.status === 401 && !NO_REFRESH_PATHS.has(path)) {
    const err = await toError(res.clone());
    if (
      (err.code === "AUTH_TOKEN_EXPIRED" || err.code === "AUTH_UNAUTHORIZED") &&
      (await refreshOnce())
    ) {
      res = await request(path, init);
    }
  }

  if (res.status === 204) return undefined as T;
  if (!res.ok) throw await toError(res);

  const body = (await res.json()) as ApiResponse<T>;
  if (!body.success)
    throw new ApiError(
      body.error?.code ?? "UNKNOWN",
      body.error?.message ?? "",
      res.status,
      body.error?.details,
    );
  return body.data;
}
