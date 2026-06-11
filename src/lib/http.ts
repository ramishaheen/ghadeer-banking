import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError } from "@/lib/session";

type Handler = (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<NextResponse | Response>;

/** Wraps an API route handler with uniform error handling. */
export function withApi(handler: Handler): Handler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
      }
      if (err instanceof ZodError) {
        const detail = err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
        return NextResponse.json({ ok: false, error: `Validation failed — ${detail}` }, { status: 400 });
      }
      console.error("[api]", err);
      return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
    }
  };
}

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}
