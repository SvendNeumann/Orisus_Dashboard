import { NextRequest, NextResponse } from "next/server";

type AccessRole = "admin" | "info";

type AccessUserPayload = {
  email?: string;
  name?: string;
  role?: AccessRole;
  active?: boolean;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "";
const permanentAdminEmail = "svend.neumann@orisus.de";
const permanentAdminName = "Svend Neumann";
const adminFallbackEmails = new Set([
  permanentAdminEmail,
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

function readableSupabaseError(text: string, fallback: string) {
  try {
    const data = JSON.parse(text) as { msg?: string; message?: string; error?: string; error_description?: string };
    return data.msg || data.message || data.error_description || data.error || fallback;
  } catch {
    return text || fallback;
  }
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
    throw new Error(readableSupabaseError(text, "Einladung konnte nicht versendet werden."));
  }
}

async function ensurePermanentAdminRole() {
  await supabaseServiceFetch("/rest/v1/orisus_user_roles?on_conflict=email", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      email: permanentAdminEmail,
      name: permanentAdminName,
      role: "admin",
      active: true,
      updated_at: new Date().toISOString()
    })
  });
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
    return jsonError("Supabase Secret Key fehlt in Vercel.", 503);
  }
  if (!(await requesterIsAdmin(request))) {
    return jsonError("Keine Admin-Berechtigung.", 403);
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;

    await ensurePermanentAdminRole();

    const users = await supabaseServiceFetch(
      "/rest/v1/orisus_user_roles?select=email,name,role,active,created_at,updated_at&order=name.asc.nullslast,email.asc"
    );
    return NextResponse.json({ users });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Zugänge konnten nicht geladen werden.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;

    const body = (await request.json().catch(() => ({}))) as AccessUserPayload;
    const email = normalizeEmail(body.email ?? "");
    const name = (body.name ?? "").trim();
    const role = body.role === "admin" ? "admin" : "info";

    if (!email || !email.includes("@")) return jsonError("Bitte eine gültige E-Mail-Adresse eingeben.");
    if (!name) return jsonError("Bitte einen Namen eingeben.");

    const isPermanentAdmin = email === permanentAdminEmail;
    await supabaseServiceFetch("/rest/v1/orisus_user_roles?on_conflict=email", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        email,
        name: isPermanentAdmin ? permanentAdminName : name,
        role: isPermanentAdmin ? "admin" : role,
        active: true,
        updated_at: new Date().toISOString()
      })
    });

    await sendSupabaseInvite(email, isPermanentAdmin ? permanentAdminName : name);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Zugang konnte nicht angelegt werden.", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;

    const body = (await request.json().catch(() => ({}))) as AccessUserPayload;
    const email = normalizeEmail(body.email ?? "");
    if (!email || !email.includes("@")) return jsonError("Bitte eine gültige E-Mail-Adresse eingeben.");

    if (email === permanentAdminEmail) {
      await ensurePermanentAdminRole();
      return NextResponse.json({ ok: true, locked: true });
    }

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
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Zugang konnte nicht aktualisiert werden.", 500);
  }
}
