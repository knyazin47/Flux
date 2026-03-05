// api/sync.js — Vercel Serverless Function
// POST /api/sync { action: "save", data: {...} } → { code: "A3F7K2" }
// POST /api/sync { action: "load", code: "A3F7K2" } → { data: {...} }
//
// Requires env vars (Upstash Redis):
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN

const TTL = 30 * 24 * 3600; // 30 days in seconds
const ABC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars (0/O, 1/I)

function makeCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ABC[b % ABC.length]).join("");
}

async function redis(url, token, command) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`Upstash error ${res.status}`);
  return res.json();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return res.status(503).json({ error: "not_configured" });
  }

  const { action, data, code } = req.body || {};

  try {
    if (action === "save") {
      if (!data || typeof data !== "object") {
        return res.status(400).json({ error: "data is required" });
      }
      const newCode = makeCode();
      await redis(url, token, [
        "SET",
        `flux:${newCode}`,
        JSON.stringify(data),
        "EX",
        TTL,
      ]);
      return res.status(200).json({ code: newCode });
    }

    if (action === "load") {
      if (!code || typeof code !== "string") {
        return res.status(400).json({ error: "code is required" });
      }
      const { result } = await redis(url, token, [
        "GET",
        `flux:${code.toUpperCase().trim()}`,
      ]);
      if (!result) return res.status(404).json({ error: "not_found" });
      return res.status(200).json({ data: JSON.parse(result) });
    }
  } catch (err) {
    console.error("Sync handler error:", err);
    return res.status(500).json({ error: "internal" });
  }

  return res.status(400).json({ error: "invalid action" });
}
