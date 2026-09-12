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
      // Fall through to legacy variables during key migration.
    }
  }
  return Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}

function eventDate(timestamp: unknown) {
  const seconds = Number(timestamp);
  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000).toISOString() : new Date().toISOString();
}

function inboundText(message: Record<string, any>) {
  if (message.type === "text") return String(message.text?.body ?? "");
  if (message.type === "button") return String(message.button?.text ?? message.button?.payload ?? "");
  if (message.type === "interactive") {
    return String(
      message.interactive?.button_reply?.title ??
      message.interactive?.button_reply?.id ??
      message.interactive?.list_reply?.title ??
      message.interactive?.list_reply?.id ??
      "",
    );
  }
  return `[${String(message.type ?? "mensagem")}]`;
}

async function hmacHex(secret: string, payload: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
  return Array.from(signature, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeHexEqual(expected: string, actual: string) {
  if (expected.length !== actual.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ actual.charCodeAt(index);
  }
  return difference === 0;
}

Deno.serve(async (request: Request) => {
  const verifyToken = Deno.env.get("CHRONA_META_WEBHOOK_VERIFY_TOKEN") ?? "";
  const appSecret = Deno.env.get("META_APP_SECRET") ?? "";

  if (request.method === "GET") {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge") ?? "";
    if (mode === "subscribe" && verifyToken && token === verifyToken) {
      return new Response(challenge, { status: 200, headers: { "content-type": "text/plain" } });
    }
    return new Response("Verificação recusada", { status: 403 });
  }

  if (request.method !== "POST") return json({ error: "Método não permitido" }, 405);
  if (!appSecret) return json({ error: "Webhook sem segredo da aplicação Meta" }, 503);
  if (Number(request.headers.get("content-length") ?? 0) > 1_000_000) {
    return json({ error: "Corpo muito grande" }, 413);
  }

  const rawBody = await request.text();
  const providedSignature = (request.headers.get("x-hub-signature-256") ?? "").replace(/^sha256=/, "");
  const expectedSignature = await hmacHex(appSecret, rawBody);
  if (!providedSignature || !constantTimeHexEqual(expectedSignature, providedSignature)) {
    return json({ error: "Assinatura Meta inválida" }, 401);
  }

  let payload: Record<string, any>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const secretKey = databaseSecretKey();
  if (!supabaseUrl || !secretKey) return json({ error: "Banco não configurado" }, 503);
  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const outcomes: unknown[] = [];
  for (const entry of Array.isArray(payload.entry) ? payload.entry : []) {
    for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
      const value = change?.value ?? {};
      const phoneNumberId = String(value?.metadata?.phone_number_id ?? "");
      if (!phoneNumberId) continue;

      for (const message of Array.isArray(value.messages) ? value.messages : []) {
        const messageId = String(message?.id ?? "");
        if (!messageId) continue;
        const compactPayload = {
          field: change?.field ?? "messages",
          type: message?.type ?? null,
          contactName: value?.contacts?.[0]?.profile?.name ?? null,
        };
        const { data, error } = await supabase.rpc("process_meta_whatsapp_event", {
          meta_phone_number_id: phoneNumberId,
          meta_event_type: "message",
          meta_external_id: `message:${messageId}`,
          meta_provider_message_id: messageId,
          meta_sender_phone: String(message?.from ?? ""),
          meta_message_status: null,
          meta_event_at: eventDate(message?.timestamp),
          meta_body_preview: inboundText(message).slice(0, 500),
          meta_payload: compactPayload,
        });
        outcomes.push(error ? { error: error.code, event: messageId } : data);
      }

      for (const status of Array.isArray(value.statuses) ? value.statuses : []) {
        const messageId = String(status?.id ?? "");
        const statusName = String(status?.status ?? "");
        if (!messageId || !statusName) continue;
        const timestamp = String(status?.timestamp ?? "0");
        const compactPayload = {
          field: change?.field ?? "messages",
          status: statusName,
          recipientId: status?.recipient_id ?? null,
        };
        const { data, error } = await supabase.rpc("process_meta_whatsapp_event", {
          meta_phone_number_id: phoneNumberId,
          meta_event_type: "status",
          meta_external_id: `status:${messageId}:${statusName}:${timestamp}`,
          meta_provider_message_id: messageId,
          meta_sender_phone: null,
          meta_message_status: statusName,
          meta_event_at: eventDate(status?.timestamp),
          meta_conversation_id: status?.conversation?.id ?? null,
          meta_origin_type: status?.conversation?.origin?.type ?? null,
          meta_pricing_category: status?.pricing?.category ?? null,
          meta_pricing_model: status?.pricing?.pricing_model ?? null,
          meta_billable: typeof status?.pricing?.billable === "boolean" ? status.pricing.billable : null,
          meta_error_code: status?.errors?.[0]?.code ? String(status.errors[0].code) : null,
          meta_payload: compactPayload,
        });
        outcomes.push(error ? { error: error.code, event: messageId, status: statusName } : data);
      }
    }
  }

  return json({ received: true, processed: outcomes.length, outcomes });
});
