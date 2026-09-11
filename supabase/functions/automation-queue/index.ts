import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
      // Fall through to legacy environment variables during key migration.
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
  for (let index = 0; index < expectedBytes.length; index += 1) {
    difference |= expectedBytes[index] ^ actualBytes[index];
  }
  return difference === 0;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (request: Request) => {
  const expectedKey = Deno.env.get("CHRONA_N8N_KEY") ?? "";
  const providedKey = request.headers.get("x-chrona-automation-key") ?? "";

  if (!expectedKey) return json({ error: "Endpoint sem credencial configurada" }, 503);
  if (!providedKey || !(await constantTimeEqual(expectedKey, providedKey))) {
    return json({ error: "Não autorizado" }, 401);
  }

  if (request.method === "GET") {
    return json({ ok: true, service: "chrona-automation-queue" });
  }
  if (request.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 64_000) return json({ error: "Corpo da requisição muito grande" }, 413);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const secretKey = databaseSecretKey();
  if (!supabaseUrl || !secretKey) return json({ error: "Banco não configurado no servidor" }, 503);

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (body.action === "claim") {
    const workerId = typeof body.workerId === "string" ? body.workerId.trim() : "";
    const batchSize = Number(body.batchSize ?? 10);
    const leaseSeconds = Number(body.leaseSeconds ?? 300);
    if (!workerId || workerId.length > 100) return json({ error: "workerId inválido" }, 400);
    if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 50) return json({ error: "batchSize deve estar entre 1 e 50" }, 400);
    if (!Number.isInteger(leaseSeconds) || leaseSeconds < 60 || leaseSeconds > 1800) return json({ error: "leaseSeconds deve estar entre 60 e 1800" }, 400);

    const { data, error } = await supabase.rpc("claim_automation_runs", {
      requested_worker_id: workerId,
      requested_batch_size: batchSize,
      requested_lease_seconds: leaseSeconds,
    });
    if (error) return json({ error: "Não foi possível reservar a fila", code: error.code }, 500);

    const items = Array.isArray(data) ? data.map((row) => row.item) : [];
    return json({ items, count: items.length });
  }

  if (body.action === "complete") {
    if (!isUuid(body.runId) || !isUuid(body.leaseToken)) return json({ error: "runId ou leaseToken inválido" }, 400);
    if (!['sent', 'failed', 'retry'].includes(String(body.outcome))) return json({ error: "outcome inválido" }, 400);
    const retryAfterSeconds = Number(body.retryAfterSeconds ?? 300);
    if (!Number.isInteger(retryAfterSeconds) || retryAfterSeconds < 60 || retryAfterSeconds > 3600) {
      return json({ error: "retryAfterSeconds deve estar entre 60 e 3600" }, 400);
    }

    const { data, error } = await supabase.rpc("finish_automation_run", {
      target_run_id: body.runId,
      claimed_lease_token: body.leaseToken,
      outcome: body.outcome,
      provider_message_id: typeof body.providerMessageId === "string" ? body.providerMessageId : null,
      failure_message: typeof body.errorMessage === "string" ? body.errorMessage : null,
      message_preview: typeof body.messagePreview === "string" ? body.messagePreview : null,
      retry_after_seconds: retryAfterSeconds,
    });
    if (error) {
      const status = error.code === "42501" ? 409 : error.code === "P0002" ? 404 : 400;
      return json({ error: error.message, code: error.code }, status);
    }
    return json(data);
  }

  return json({ error: "Ação desconhecida" }, 400);
});
