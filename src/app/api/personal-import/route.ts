import { NextRequest, NextResponse } from "next/server";

type AccessRole = "admin" | "info" | "praxismanagement";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "";
const personalSupabaseImportTableName = "orisus_personal_imports";
const allowedRoles = new Set<AccessRole>(["admin", "info", "praxismanagement"]);
const rateLimitWindowMs = 60_000;
const rateLimitMaxRequests = 45;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function clientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

function sameOriginRequest(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.nextUrl.host;
  } catch {
    return false;
  }
}

function requestGuard(request: NextRequest) {
  if (!sameOriginRequest(request)) {
    return jsonError("Anfrage wurde aus Sicherheitsgründen blockiert.", 403);
  }

  const key = `personal-import:read:${clientIp(request)}`;
  const now = Date.now();
  const current = rateLimitBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + rateLimitWindowMs });
    return null;
  }

  current.count += 1;
  if (current.count > rateLimitMaxRequests) {
    return jsonError("Zu viele Anfragen. Bitte kurz warten und erneut versuchen.", 429);
  }
  return null;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function serviceHeaders(extra?: HeadersInit) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    ...(extra ?? {})
  };
}

function readableSupabaseError(text: string, fallback: string) {
  try {
    const data = JSON.parse(text) as { msg?: string; message?: string; error?: string; error_description?: string };
    return data.msg || data.message || data.error_description || data.error || fallback;
  } catch {
    return text || fallback;
  }
}

async function supabaseServiceFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase Admin-Konfiguration fehlt.");
  }
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: serviceHeaders(init?.headers)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(readableSupabaseError(text, `Supabase request failed with ${response.status}`));
  }
  if (response.status === 204) return null as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

async function requesterEmail(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) return "";

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`
    }
  });
  if (!response.ok) return "";

  const user = (await response.json()) as { email?: string };
  return normalizeEmail(user.email ?? "");
}

async function requesterCanReadPersonalImport(request: NextRequest) {
  const email = await requesterEmail(request);
  if (!email) return false;

  const rows = await supabaseServiceFetch<Array<{ role: AccessRole; active: boolean }>>(
    `/rest/v1/orisus_user_roles?select=role,active&email=eq.${encodeURIComponent(email)}&limit=1`
  );
  return rows.some((row) => row.active && allowedRoles.has(row.role));
}

export async function GET(request: NextRequest) {
  try {
    const guarded = requestGuard(request);
    if (guarded) return guarded;
    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return jsonError("Supabase-Konfiguration fehlt in Vercel.", 503);
    }
    if (!(await requesterCanReadPersonalImport(request))) {
      return jsonError("Keine Berechtigung für Personal-Daten.", 403);
    }

    const rows = await supabaseServiceFetch<Array<{ payload: unknown }>>(
      `/rest/v1/${personalSupabaseImportTableName}?select=payload&active=eq.true&order=imported_at.desc&limit=1`
    );
    return NextResponse.json({ payload: rows[0]?.payload ?? null });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Personal-Daten konnten nicht geladen werden.", 500);
  }
}
