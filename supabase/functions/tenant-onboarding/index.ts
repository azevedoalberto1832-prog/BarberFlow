import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const CHRONA_SITE_URL = (Deno.env.get("CHRONA_SITE_URL") ??
  "https://azevedoalberto1832-prog.github.io/Chrona/").replace(/\/+$/, "/");
const ALLOWED_ORIGINS = new Set([
  "https://azevedoalberto1832-prog.github.io",
  "http://127.0.0.1:5500",
  "http://localhost:5500",
]);

function responseHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  return {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": ALLOWED_ORIGINS.has(origin)
      ? origin
      : "https://azevedoalberto1832-prog.github.io",
    "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
    "access-control-allow-methods": "POST, OPTIONS",
    "vary": "Origin",
  };
}

function json(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders(request),
  });
}

function environmentKey(group: "SUPABASE_PUBLISHABLE_KEYS" | "SUPABASE_SECRET_KEYS", fallbacks: string[]) {
  const encodedKeys = Deno.env.get(group);
  if (encodedKeys) {
    try {
      const keys = JSON.parse(encodedKeys) as Record<string, string>;
      const key = keys.default ?? Object.values(keys)[0];
      if (key) return key;
    } catch {
      // Continue with legacy variables while the project finishes its key migration.
    }
  }
  return fallbacks.map((name) => Deno.env.get(name)).find(Boolean);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function inviteErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("not authorized") || normalized.includes("email address not authorized")) {
    return "O Supabase só envia para membros da equipe enquanto o e-mail profissional não estiver configurado.";
  }
  if (normalized.includes("already") || normalized.includes("registered")) {
    return "Este e-mail já possui uma conta. Use outro endereço para o responsável.";
  }
  if (normalized.includes("rate") || normalized.includes("limit")) {
    return "O limite temporário de convites foi atingido. Tente novamente em alguns minutos.";
  }
  return "Não foi possível enviar o convite agora.";
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: responseHeaders(request) });
  }
  if (request.method !== "POST") return json(request, { error: "Método não permitido" }, 405);
  if (Number(request.headers.get("content-length") ?? 0) > 24_000) {
    return json(request, { error: "Corpo da requisição muito grande" }, 413);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = environmentKey("SUPABASE_PUBLISHABLE_KEYS", [
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
  ]);
  const secretKey = environmentKey("SUPABASE_SECRET_KEYS", [
    "SUPABASE_SECRET_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]);
  const authorization = request.headers.get("authorization") ?? "";
  if (!supabaseUrl || !publishableKey || !secretKey) {
    return json(request, { error: "Servidor de cadastro não configurado" }, 503);
  }
  if (!authorization.startsWith("Bearer ")) return json(request, { error: "Sessão obrigatória" }, 401);

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json(request, { error: "Sessão inválida" }, 401);

  const { data: actorProfile, error: profileError } = await userClient
    .from("profiles")
    .select("role,active")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();
  if (profileError || !actorProfile?.active || actorProfile.role !== "platform_admin") {
    return json(request, { error: "Acesso exclusivo da administração Chrona" }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json(request, { error: "JSON inválido" }, 400);
  }

  const action = stringValue(body.action) || "create";
  const ownerEmail = stringValue(body.ownerEmail).toLowerCase();
  const ownerName = stringValue(body.ownerName);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail) || ownerEmail.length > 254) {
    return json(request, { error: "Informe um e-mail válido para o responsável" }, 400);
  }
  if (ownerName.length < 2 || ownerName.length > 120) {
    return json(request, { error: "Informe o nome do responsável" }, 400);
  }

  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let tenantSlug = stringValue(body.slug).toLowerCase();
  let targetBarbershopId = stringValue(body.barbershopId);
  if (action === "invite-owner") {
    if (!/^[0-9a-f-]{36}$/i.test(targetBarbershopId)) {
      return json(request, { error: "Empresa inválida" }, 400);
    }
    const { data: shop, error: shopError } = await adminClient
      .from("barbershops")
      .select("id,slug")
      .eq("id", targetBarbershopId)
      .maybeSingle();
    if (shopError || !shop) return json(request, { error: "Empresa não encontrada" }, 404);
    tenantSlug = shop.slug;
  } else if (action !== "create") {
    return json(request, { error: "Ação desconhecida" }, 400);
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tenantSlug)) {
    return json(request, { error: "Slug inválido" }, 400);
  }

  const redirectTo = `${CHRONA_SITE_URL}?tenant=${encodeURIComponent(tenantSlug)}`;
  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    ownerEmail,
    {
      redirectTo,
      data: {
        name: ownerName,
        tenant_slug: tenantSlug,
        invited_by: "chrona",
      },
    },
  );
  if (inviteError || !inviteData.user) {
    return json(request, {
      error: inviteErrorMessage(inviteError?.message ?? ""),
      detail: inviteError?.message ?? null,
    }, 400);
  }

  let provisionResult;
  if (action === "invite-owner") {
    provisionResult = await adminClient.rpc("attach_tenant_owner", {
      actor_auth_user_id: userData.user.id,
      owner_auth_user_id: inviteData.user.id,
      target_barbershop_id: targetBarbershopId,
      owner_name: ownerName,
    });
  } else {
    provisionResult = await adminClient.rpc("provision_tenant_with_owner", {
      actor_auth_user_id: userData.user.id,
      owner_auth_user_id: inviteData.user.id,
      tenant_name: stringValue(body.name),
      tenant_slug: tenantSlug,
      tenant_business_type: stringValue(body.businessType) || "services",
      tenant_phone: stringValue(body.phone),
      tenant_address: stringValue(body.address),
      tenant_instagram: stringValue(body.instagram),
      tenant_logo_url: stringValue(body.logoUrl),
      tenant_description: stringValue(body.description),
      tenant_primary_color: stringValue(body.primaryColor).toLowerCase(),
      tenant_secondary_color: stringValue(body.secondaryColor).toLowerCase(),
      tenant_plan: stringValue(body.plan),
      owner_name: ownerName,
    });
  }

  if (provisionResult.error) {
    const { error: cleanupError } = await adminClient.auth.admin.deleteUser(inviteData.user.id);
    return json(request, {
      error: provisionResult.error.message,
      code: provisionResult.error.code,
      cleanupPending: Boolean(cleanupError),
    }, provisionResult.error.code === "42501" ? 403 : 400);
  }

  return json(request, {
    tenant: provisionResult.data,
    owner: { email: ownerEmail, name: ownerName },
    inviteSent: true,
    redirectTo,
  }, 201);
});
