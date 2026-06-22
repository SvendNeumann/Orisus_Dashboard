import { NextRequest, NextResponse } from "next/server";

type AccessRole = "admin" | "info";

type AccessUserPayload = {
  email?: string;
  name?: string;
  role?: AccessRole;
  active?: boolean;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const adminFallbackEmails = new Set([
  "svend.neumann@orisus.de",
  "sven.neumann@orisus.de",
  "sven.neumann@resos.de",
  "svend.neumann@resos.de"
]);

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
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
    throw new Error(text || `Supabase request failed with ${response.status}`);
  }
  if (response.status === 204) return null as T;
  return (await response.json()) as T;
}

async function sendSupabaseInvite(email: string, name: string) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
  const body: Record<string, unknown> = {
    email,
    data: { name }
  };
  if (appUrl) body.redirect_to = appUrl;

  const response = await fetch(`${supabaseUrl}/auth/v1/invite`, {
    method: "POST",
    headers: serviceHeaders(),
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 422 || /already|registered|exists/i.test(text)) return;
    throw new Error(text || "Einladung konnte nicht versendet werden.");
  }
}

async function requesterEmail(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) return "";
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      Authorization: `Bearer ${token}`
    }
  });
  if (!response.ok) return "";
  const user = (await response.json()) as { email?: string };
  return normalizeEmail(user.email ?? "");
}

async function requesterIsAdmin(request: NextRequest) {
  const email = await requesterEmail(request);
  if (!email) return false;
  if (adminFallbackEmails.has(email)) return true;
  const rows = await supabaseServiceFetch<Array<{ role: AccessRole; active: boolean }>>(
    `/rest/v1/orisus_user_roles?select=role,active&email=eq.${encodeURIComponent(email)}&limit=1`
  );
  return rows.some((row) => row.active && row.role === "admin");
}

async function requireAdmin(request: NextRequest) {
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonError("Supabase Service Role Key fehlt in Vercel.", 503);
  }
  if (!(await requesterIsAdmin(request))) {
    return jsonError("Keine Admin-Berechtigung.", 403);
  }
  return null;
}

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const users = await supabaseServiceFetch(
    "/rest/v1/orisus_user_roles?select=email,name,role,active,created_at,updated_at&order=name.asc.nullslast,email.asc"
  );
  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = (await request.json().catch(() => ({}))) as AccessUserPayload;
  const email = normalizeEmail(body.email ?? "");
  const name = (body.name ?? "").trim();
  const role = body.role === "admin" ? "admin" : "info";

  if (!email || !email.includes("@")) return jsonError("Bitte eine gültige E-Mail-Adresse eingeben.");
  if (!name) return jsonError("Bitte einen Namen eingeben.");

  await supabaseServiceFetch("/rest/v1/orisus_user_roles?on_conflict=email", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      email,
      name,
      role,
      active: true,
      updated_at: new Date().toISOString()
    })
  });

  await sendSupabaseInvite(email, name);

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = (await request.json().catch(() => ({}))) as AccessUserPayload;
  const email = normalizeEmail(body.email ?? "");
  if (!email || !email.includes("@")) return jsonError("Bitte eine gültige E-Mail-Adresse eingeben.");

  const update: Record<string, string | boolean> = { updated_at: new Date().toISOString() };
  if (typeof body.name === "string") update.name = body.name.trim();
  if (body.role === "admin" || body.role === "info") update.role = body.role;
  if (typeof body.active === "boolean") update.active = body.active;

  await supabaseServiceFetch(`/rest/v1/orisus_user_roles?email=eq.${encodeURIComponent(email)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(update)
  });

  return NextResponse.json({ ok: true });
}
