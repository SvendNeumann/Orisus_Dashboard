import { NextRequest, NextResponse } from "next/server";

type AccessRole = "admin" | "info" | "praxismanagement";

type AccessUserPayload = {
  email?: string;
  username?: string;
  name?: string;
  password?: string;
  role?: AccessRole;
  active?: boolean;
  action?: "complete-password-change";
};

type AuthAdminUser = {
  id: string;
  email?: string;
  last_sign_in_at?: string | null;
  app_metadata?: Record<string, unknown> | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "";
const permanentAdminEmail = "svend.neumann@orisus.de";
const permanentAdminName = "Svend Neumann";
const appLoginEmailDomain = "login.orisus.internal";
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

function normalizeUsername(username: string) {
  return username.trim().toLowerCase().replace(/\s+/g, ".");
}

function authEmailForIdentifier(identifier: string) {
  const value = normalizeUsername(identifier);
  if (value.includes("@")) return normalizeEmail(value);
  return `${value}@${appLoginEmailDomain}`;
}

function usernameFromAuthEmail(email: string) {
  const normalized = normalizeEmail(email);
  return normalized.endsWith(`@${appLoginEmailDomain}`) ? normalized.replace(`@${appLoginEmailDomain}`, "") : normalized;
}

function isValidLoginName(username: string) {
  return /^[a-z0-9._-]{3,64}$/.test(normalizeUsername(username));
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
    throw new Error(readableSupabaseError(text, `Supabase request failed with ${response.status}`));
  }
  if (response.status === 204) return null as T;
  const text = await response.text();
  if (!text) return null as T;
  return JSON.parse(text) as T;
}

function readableSupabaseError(text: string, fallback: string) {
  try {
    const data = JSON.parse(text) as { msg?: string; message?: string; error?: string; error_description?: string };
    return data.msg || data.message || data.error_description || data.error || fallback;
  } catch {
    return text || fallback;
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

async function listSupabaseAuthUsers() {
  const listedUsers = await supabaseServiceFetch<{ users?: AuthAdminUser[] }>("/auth/v1/admin/users?per_page=1000");
  return listedUsers.users ?? [];
}

async function findSupabaseAuthUsers(email: string) {
  const listedUsers = await listSupabaseAuthUsers();
  return listedUsers.filter((user) => normalizeEmail(user.email ?? "") === email);
}

async function deleteSupabaseAuthUser(email: string) {
  const matchingUsers = await findSupabaseAuthUsers(email);
  for (const user of matchingUsers) {
    await supabaseServiceFetch(`/auth/v1/admin/users/${encodeURIComponent(user.id)}`, {
      method: "DELETE"
    });
  }
  return matchingUsers.length;
}

async function createOrUpdateSupabaseAuthUser(email: string, name: string, password: string, mustChangePassword: boolean) {
  const matchingUsers = await findSupabaseAuthUsers(email);
  const existingUser = matchingUsers[0];
  const body = {
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
    app_metadata: {
      ...(existingUser?.app_metadata ?? {}),
      must_change_password: mustChangePassword
    }
  };
  if (existingUser) {
    await supabaseServiceFetch(`/auth/v1/admin/users/${encodeURIComponent(existingUser.id)}`, {
      method: "PUT",
      body: JSON.stringify(body)
    });
    return existingUser.id;
  }
  const created = await supabaseServiceFetch<AuthAdminUser>("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify(body)
  });
  return created.id;
}

async function markOwnPasswordChanged(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) return jsonError("Keine aktive Sitzung.", 401);
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      Authorization: `Bearer ${token}`
    }
  });
  if (!response.ok) return jsonError("Sitzung konnte nicht bestätigt werden.", 401);
  const user = (await response.json()) as { id?: string; app_metadata?: Record<string, unknown> };
  if (!user.id) return jsonError("Benutzer konnte nicht ermittelt werden.", 401);

  await supabaseServiceFetch(`/auth/v1/admin/users/${encodeURIComponent(user.id)}`, {
    method: "PUT",
    body: JSON.stringify({ app_metadata: { ...(user.app_metadata ?? {}), must_change_password: false } })
  });
  return NextResponse.json({ ok: true });
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

    const users = await supabaseServiceFetch<Array<Record<string, unknown>>>(
      "/rest/v1/orisus_user_roles?select=email,name,role,active,created_at,updated_at&order=name.asc.nullslast,email.asc"
    );
    const authUsers = await supabaseServiceFetch<{ users?: AuthAdminUser[] }>("/auth/v1/admin/users?per_page=1000");
    const lastSignInByEmail = new Map(
      (authUsers.users ?? [])
        .filter((user) => user.email)
        .map((user) => [normalizeEmail(user.email ?? ""), user.last_sign_in_at ?? null])
    );
    const mustChangeByEmail = new Map(
      (authUsers.users ?? [])
        .filter((user) => user.email)
        .map((user) => [normalizeEmail(user.email ?? ""), Boolean(user.app_metadata?.must_change_password)])
    );
    return NextResponse.json({
      users: users.map((user) => ({
        ...user,
        username: usernameFromAuthEmail(String(user.email ?? "")),
        last_sign_in_at: lastSignInByEmail.get(normalizeEmail(String(user.email ?? ""))) ?? null,
        must_change_password: mustChangeByEmail.get(normalizeEmail(String(user.email ?? ""))) ?? false
      }))
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Zugänge konnten nicht geladen werden.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;

    const body = (await request.json().catch(() => ({}))) as AccessUserPayload;
    const rawIdentifier = body.username || body.email || "";
    const email = authEmailForIdentifier(rawIdentifier);
    const username = normalizeUsername(body.username || usernameFromAuthEmail(email));
    const name = (body.name ?? "").trim();
    const password = (body.password ?? "").trim();
    const role = body.role === "admin" || body.role === "praxismanagement" ? body.role : "info";

    if (!rawIdentifier.trim()) return jsonError("Bitte einen Login-Namen eingeben.");
    if (!rawIdentifier.includes("@") && !isValidLoginName(username)) {
      return jsonError("Login-Name bitte mit 3-64 Zeichen aus Buchstaben, Zahlen, Punkt, Unterstrich oder Bindestrich eingeben.");
    }
    if (!name) return jsonError("Bitte einen Namen eingeben.");
    if (password.length < 8) return jsonError("Bitte ein Erstpasswort mit mindestens 8 Zeichen eingeben.");

    const isPermanentAdmin = email === permanentAdminEmail;
    await createOrUpdateSupabaseAuthUser(email, isPermanentAdmin ? permanentAdminName : name, password, true);
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

    return NextResponse.json({ ok: true, username: usernameFromAuthEmail(email) });
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

    const update: Record<string, string | boolean> = { updated_at: new Date().toISOString() };
    const isPermanentAdmin = email === permanentAdminEmail;
    if (typeof body.name === "string" && !isPermanentAdmin) update.name = body.name.trim();
    if ((body.role === "admin" || body.role === "info" || body.role === "praxismanagement") && !isPermanentAdmin) update.role = body.role;
    if (typeof body.active === "boolean" && !isPermanentAdmin) update.active = body.active;
    if (typeof body.password === "string" && body.password.trim()) {
      if (body.password.trim().length < 8) return jsonError("Bitte ein Passwort mit mindestens 8 Zeichen eingeben.");
      const rows = await supabaseServiceFetch<Array<{ name: string | null }>>(
        `/rest/v1/orisus_user_roles?select=name&email=eq.${encodeURIComponent(email)}&limit=1`
      );
      await createOrUpdateSupabaseAuthUser(
        email,
        isPermanentAdmin ? permanentAdminName : rows[0]?.name || usernameFromAuthEmail(email),
        body.password.trim(),
        true
      );
    }

    if (isPermanentAdmin) {
      await ensurePermanentAdminRole();
      return NextResponse.json({ ok: true, locked: true });
    }

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

export async function PUT(request: NextRequest) {
  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonError("Supabase Secret Key fehlt in Vercel.", 503);
    }
    const body = (await request.json().catch(() => ({}))) as AccessUserPayload;
    if (body.action !== "complete-password-change") return jsonError("Unbekannte Aktion.");
    return markOwnPasswordChanged(request);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Passwortstatus konnte nicht aktualisiert werden.", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;

    const body = (await request.json().catch(() => ({}))) as AccessUserPayload;
    const email = normalizeEmail(body.email ?? "");
    if (!email || !email.includes("@")) return jsonError("Bitte eine gültige E-Mail-Adresse eingeben.");
    if (email === permanentAdminEmail) return jsonError("Der feste Admin-Zugang kann nicht gelöscht werden.", 403);

    await supabaseServiceFetch(`/rest/v1/orisus_user_roles?email=eq.${encodeURIComponent(email)}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" }
    });

    let authDeleted = 0;
    let authWarning = "";
    try {
      authDeleted = await deleteSupabaseAuthUser(email);
    } catch (error) {
      authWarning = error instanceof Error ? error.message : "Supabase Auth-Benutzer konnte nicht automatisch entfernt werden.";
    }

    return NextResponse.json({ ok: true, authDeleted, authWarning });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Zugang konnte nicht gelöscht werden.", 500);
  }
}
