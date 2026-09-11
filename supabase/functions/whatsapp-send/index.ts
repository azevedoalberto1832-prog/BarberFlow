import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function databaseSecretKey() {
  const modernKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modernKeys) {
    try {
      const parsed = JSON.parse(modernKeys) as Record<string, string>;
      const key = parsed.default ?? Object.values(parsed)[0];
      if (key) return key;
    } catch {
      // Fall through to legacy variables during the API-key migration.
    }
  }
  return Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}

async function constantTimeEqual(expected: string, actual: string) {
  const encoder = new TextEncoder();
  const [expectedHash, actualHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
    crypto.subtle.digest("SHA-256", encoder.encode(actual)),
  ]);
  const expectedBytes = new Uint8Array(expectedHash);
  const actualBytes = new Uint8Array(actualHash);
  let difference = 0;
  for (let index = 0; index < expectedBytes.length; index += 1) difference |= expectedBytes[index] ^ actualBytes[index];
  return difference === 0;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (request: Request) => {
  const expectedKey = Deno.env.get("CHRONA_N8N_KEY") ?? "";
  const providedKey = request.headers.get("x-chrona-automation-key") ?? "";
  if (!expectedKey) return json({ error: "Endpoint sem credencial configurada" }, 503);
  if (!providedKey || !(await constantTimeEqual(expectedKey, providedKey))) return json({ error: "Não autorizado" }, 401);
  if (request.method !== "POST") return json({ error: "Método não permitido" }, 405);
  if (Number(request.headers.get("content-length") ?? 0) > 32_000) return json({ error: "Corpo muito grande" }, 413);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }
  if (!isUuid(body.runId) || !isUuid(body.leaseToken)) return json({ error: "runId ou leaseToken inválido" }, 400);
  const components = body.components ?? [];
  if (!Array.isArray(components) || JSON.stringify(components).length > 16_000) return json({ error: "Componentes de template inválidos" }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const secretKey = databaseSecretKey();
  if (!supabaseUrl || !secretKey) return json({ error: "Banco não configurado no servidor" }, 503);
  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: context, error: contextError } = await supabase.rpc("get_whatsapp_delivery_context", {
    target_run_id: body.runId,
    claimed_lease_token: body.leaseToken,
  });
  if (contextError || !context) return json({ error: "Execução não está pronta para envio", code: contextError?.code ?? null }, 409);

  const metaResponse = await fetch(
    `https://graph.facebook.com/${context.graphApiVersion}/${context.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${context.accessToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: context.recipient,
        type: "template",
        template: {
          name: context.templateName,
          language: { code: context.templateLanguage },
          ...(components.length ? { components } : {}),
        },
      }),
    },
  );
  const metaData = await metaResponse.json().catch(() => ({}));
  const providerMessageId = metaData?.messages?.[0]?.id ?? null;

  if (!metaResponse.ok || !providerMessageId) {
    const shouldRetry = metaResponse.status === 429 || metaResponse.status >= 500;
    const { data: completion, error: completionError } = await supabase.rpc("finish_automation_run", {
      target_run_id: body.runId,
      claimed_lease_token: body.leaseToken,
      outcome: shouldRetry ? "retry" : "failed",
      provider_message_id: null,
      failure_message: `Meta HTTP ${metaResponse.status}; código ${metaData?.error?.code ?? "desconhecido"}`,
      message_preview: context.messagePreview,
      retry_after_seconds: 300,
    });
    if (completionError) return json({ error: "Falha na Meta e ao atualizar a fila", code: completionError.code }, 500);
    return json({ error: "A Meta recusou o envio", retrying: shouldRetry, completion, metaCode: metaData?.error?.code ?? null }, shouldRetry ? 503 : 422);
  }

  const { data: completion, error: completionError } = await supabase.rpc("finish_automation_run", {
    target_run_id: body.runId,
    claimed_lease_token: body.leaseToken,
    outcome: "sent",
    provider_message_id: providerMessageId,
    failure_message: null,
    message_preview: context.messagePreview,
    retry_after_seconds: 300,
  });
  if (completionError) return json({ error: "Mensagem enviada, mas a fila não foi finalizada", providerMessageId, code: completionError.code }, 500);
  return json({ providerMessageId, completion });
});
