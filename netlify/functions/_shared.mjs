import { createClient } from "@supabase/supabase-js";

export const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff"
};

export const reply = (statusCode, body) => ({
  statusCode,
  headers,
  body: JSON.stringify(body)
});

export function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Database environment variables are not configured.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export function requireAdmin(event) {
  const expected = process.env.ADMIN_TOKEN;
  const supplied = event.headers?.["x-admin-token"] || "";
  return Boolean(expected && supplied && supplied.length === expected.length &&
    timingSafeEqual(supplied, expected));
}

function timingSafeEqual(a, b) {
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export function parseBody(event) {
  try { return JSON.parse(event.body || "{}"); }
  catch { return null; }
}
