import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const VERSION = "1.0.0";
const MAX_BODY_BYTES = 16_384;
const encoder = new TextEncoder();

const PROGRAMS_BY_ORIGIN: Readonly<Record<string, ReadonlySet<string>>> = {
  "https://frankx.ai": new Set([
    "frankx-newsletter",
    "frankx-creation-chronicles",
    "frankx-ai-architect",
    "frankx-founder-stack",
    "frankx-operator-scorecard",
    "frankx-inner-circle",
    "frankx-music-lab",
    "frankx-arcanea",
    "frankx-investor",
    "frankx-courses-waitlist",
    "frankx-ikigai-branding",
    "frankx-premium-packs",
    "frankx-mvu-tallinn-2026",
    "frankx-mvu-porto-2027",
    "frankx-all",
  ]),
  "https://www.frankx.ai": new Set([
    "frankx-newsletter",
    "frankx-creation-chronicles",
    "frankx-ai-architect",
    "frankx-founder-stack",
    "frankx-operator-scorecard",
    "frankx-inner-circle",
    "frankx-music-lab",
    "frankx-arcanea",
    "frankx-investor",
    "frankx-courses-waitlist",
    "frankx-ikigai-branding",
    "frankx-premium-packs",
    "frankx-mvu-tallinn-2026",
    "frankx-mvu-porto-2027",
    "frankx-all",
  ]),
  "https://arcanea.ai": new Set(["arcanea-newsletter", "arcanea-founding-circle"]),
  "https://www.arcanea.ai": new Set(["arcanea-newsletter", "arcanea-founding-circle"]),
  "https://gencreator.ai": new Set([
    "gencreator-starter-kit",
    "gencreator-creator-scan",
    "gencreator-install-waitlist",
    "gencreator-cohort-intake",
    "gencreator-research-replication",
    "gencreator-general-interest",
  ]),
  "https://www.gencreator.ai": new Set([
    "gencreator-starter-kit",
    "gencreator-creator-scan",
    "gencreator-install-waitlist",
    "gencreator-cohort-intake",
    "gencreator-research-replication",
    "gencreator-general-interest",
  ]),
};

const PREVIEW_PROGRAMS: ReadonlyArray<{
  project: string;
  programs: ReadonlySet<string>;
}> = [
  { project: "frankx-ai-vercel-website", programs: PROGRAMS_BY_ORIGIN["https://frankx.ai"] },
  { project: "arcanea-ai-app", programs: PROGRAMS_BY_ORIGIN["https://arcanea.ai"] },
  { project: "gencreator-ai", programs: PROGRAMS_BY_ORIGIN["https://gencreator.ai"] },
];

interface CaptureBody {
  email?: unknown;
  name?: unknown;
  program?: unknown;
  source?: unknown;
  intention?: unknown;
  referrer?: unknown;
  page_path?: unknown;
  utm_source?: unknown;
  utm_medium?: unknown;
  utm_campaign?: unknown;
  utm_content?: unknown;
  utm_term?: unknown;
  request_id?: unknown;
  consent_version?: unknown;
  metadata?: unknown;
  website?: unknown;
  company?: unknown;
}

function textValue(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, max) : null;
}

function normalizeOrigin(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function programsForOrigin(origin: string): ReadonlySet<string> | null {
  const exact = PROGRAMS_BY_ORIGIN[origin];
  if (exact) return exact;

  try {
    const host = new URL(origin).hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return new Set(Object.values(PROGRAMS_BY_ORIGIN).flatMap((programs) => [...programs]));
    }
    if (!host.endsWith(".vercel.app")) return null;
    return PREVIEW_PROGRAMS.find(({ project }) => host.includes(project))?.programs ?? null;
  } catch {
    return null;
  }
}

function responseHeaders(origin?: string | null): HeadersInit {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...(origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
  };
}

function json(body: Record<string, unknown>, status: number, origin?: string | null): Response {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders(origin) });
}

async function keyedHash(value: string, keyMaterial: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(keyMaterial),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request: Request) => {
  const origin = normalizeOrigin(request.headers.get("origin"));

  if (request.method === "GET") {
    return json({ ok: true, service: "starlight-growth-core", version: VERSION }, 200, "*");
  }

  const allowedPrograms = origin ? programsForOrigin(origin) : null;
  if (!origin || !allowedPrograms) {
    return json({ accepted: false, error: "origin_not_allowed" }, 403);
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...responseHeaders(origin),
        "Access-Control-Allow-Headers": "content-type, x-growth-client-ip",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  if (request.method !== "POST") {
    return json({ accepted: false, error: "method_not_allowed" }, 405, origin);
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return json({ accepted: false, error: "payload_too_large" }, 413, origin);
  }

  let body: CaptureBody;
  try {
    const rawBody = await request.text();
    if (encoder.encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return json({ accepted: false, error: "payload_too_large" }, 413, origin);
    }
    body = JSON.parse(rawBody) as CaptureBody;
  } catch {
    return json({ accepted: false, error: "invalid_json" }, 400, origin);
  }

  const honeypot = textValue(body.website, 120) ?? textValue(body.company, 120);
  if (honeypot) {
    return json({ accepted: true, screened: true }, 202, origin);
  }

  const email = textValue(body.email, 254)?.toLowerCase() ?? "";
  const program = textValue(body.program, 80) ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ accepted: false, error: "invalid_email" }, 400, origin);
  }
  if (!allowedPrograms.has(program)) {
    return json({ accepted: false, error: "program_not_allowed" }, 400, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[growth-capture] Supabase runtime credentials unavailable");
    return json({ accepted: false, error: "storage_unavailable" }, 503, origin);
  }

  const forwardedIp =
    textValue(request.headers.get("x-growth-client-ip"), 128) ??
    textValue(request.headers.get("x-forwarded-for")?.split(",")[0], 128) ??
    textValue(request.headers.get("x-real-ip"), 128);
  const userAgent = textValue(request.headers.get("user-agent"), 512);
  const requestId =
    typeof body.request_id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.request_id)
      ? body.request_id
      : crypto.randomUUID();
  const metadata =
    body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? body.metadata
      : {};

  const [ipHash, userAgentHash] = await Promise.all([
    forwardedIp ? keyedHash(forwardedIp, serviceRoleKey) : Promise.resolve(null),
    userAgent ? keyedHash(userAgent, serviceRoleKey) : Promise.resolve(null),
  ]);

  const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/capture_growth_lead`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      "X-Client-Info": `starlight-growth-core/${VERSION}`,
    },
    body: JSON.stringify({
      p_email: email,
      p_program_slug: program,
      p_request_id: requestId,
      p_name: textValue(body.name, 120),
      p_source: textValue(body.source, 120),
      p_intention: textValue(body.intention, 500),
      p_referrer: textValue(body.referrer, 2048),
      p_page_path: textValue(body.page_path, 2048),
      p_utm_source: textValue(body.utm_source, 120),
      p_utm_medium: textValue(body.utm_medium, 120),
      p_utm_campaign: textValue(body.utm_campaign, 120),
      p_utm_content: textValue(body.utm_content, 120),
      p_utm_term: textValue(body.utm_term, 120),
      p_origin: origin,
      p_ip_hash: ipHash,
      p_user_agent_hash: userAgentHash,
      p_metadata: metadata,
      p_consent_version: textValue(body.consent_version, 80) ?? "v1",
    }),
  });

  if (!rpcResponse.ok) {
    console.error("[growth-capture] RPC failed", { status: rpcResponse.status, requestId });
    return json({ accepted: false, error: "storage_unavailable" }, 503, origin);
  }

  const result = (await rpcResponse.json()) as {
    accepted?: boolean;
    reason?: string;
    retry_after?: number;
  };

  if (!result.accepted && result.reason === "rate_limited") {
    const retryAfter = Number(result.retry_after ?? 600);
    return new Response(JSON.stringify({ accepted: false, error: "rate_limited" }), {
      status: 429,
      headers: { ...responseHeaders(origin), "Retry-After": String(retryAfter) },
    });
  }
  if (!result.accepted) {
    return json({ accepted: false, error: result.reason ?? "capture_rejected" }, 400, origin);
  }

  return json({ accepted: true, requestId }, 201, origin);
});
