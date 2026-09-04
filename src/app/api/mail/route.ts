import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { type NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

import WelcomeTemplate from "~/emails";

export const dynamic = "force-dynamic";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body: Record<string, unknown>, status: number) {
	return NextResponse.json(body, {
		status,
		headers: { "Cache-Control": "no-store" },
	});
}

export async function POST(request: NextRequest) {
	const resendApiKey = process.env.RESEND_API_KEY;
	const resendFromEmail = process.env.RESEND_FROM_EMAIL;
	const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
	const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

	if (!resendApiKey || !resendFromEmail || !redisUrl || !redisToken) {
		return json(
			{
				error: "Waitlist email is temporarily unavailable",
				code: "WAITLIST_BINDING_MISSING",
			},
			503,
		);
	}

	let ip: string;
	const xForwardedForHeader = request.headers.get("x-forwarded-for");

	if (xForwardedForHeader) {
		ip = xForwardedForHeader.split(",")[0].trim();
	} else {
		ip = request.headers.get("x-real-ip")?.trim() ?? "127.0.0.1";
	}

	const redis = new Redis({ url: redisUrl, token: redisToken });
	const ratelimit = new Ratelimit({
		redis,
		limiter: Ratelimit.slidingWindow(2, "1 m"),
	});
	const result = await ratelimit.limit(ip);

	if (!result.success) {
		return json({ error: "Too many requests", code: "RATE_LIMITED" }, 429);
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: "Invalid JSON", code: "INVALID_REQUEST" }, 400);
	}

	if (!body || typeof body !== "object") {
		return json({ error: "Invalid request", code: "INVALID_REQUEST" }, 400);
	}

	const payload = body as Record<string, unknown>;
	const email = typeof payload.email === "string" ? payload.email.trim() : "";
	const name = typeof payload.name === "string" ? payload.name.trim() : "";
	if (!EMAIL_PATTERN.test(email) || !name || name.length > 120) {
		return json({ error: "A valid email and name are required", code: "INVALID_REQUEST" }, 400);
	}

	const resend = new Resend(resendApiKey);
	const { data, error } = await resend.emails.send({
		from: resendFromEmail,
		to: [email],
		subject: "Welcome to Next.js + Notion CMS Waitlist",
		react: WelcomeTemplate({ userFirstname: name }),
	});

	if (error) {
		return json({ error: "Failed to send email", code: "EMAIL_SEND_FAILED" }, 502);
	}

	if (!data) {
		return json({ error: "Failed to send email", code: "EMAIL_SEND_FAILED" }, 502);
	}

	return json({ message: "Email sent successfully" }, 200);
}
