const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const crypto = require("crypto");

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const APPS_SCRIPT_SECRET = process.env.APPS_SCRIPT_SECRET;

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function createSessionCookie(payload) {
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "12h" });
  return cookie.serialize("session", token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
}

async function fetchCredentials() {
  console.log("APPS_SCRIPT_URL is set:", !!APPS_SCRIPT_URL);
  console.log("APPS_SCRIPT_SECRET is set:", !!APPS_SCRIPT_SECRET);

  const url = `${APPS_SCRIPT_URL}?action=credentials&secret=${encodeURIComponent(APPS_SCRIPT_SECRET)}`;
  console.log("Fetching:", url.replace(APPS_SCRIPT_SECRET, "***"));

  const res = await fetch(url);
  console.log("Apps Script responded with status:", res.status);

  const rawText = await res.text();
  console.log("Raw response (first 300 chars):", rawText.slice(0, 300));

  const data = JSON.parse(rawText);
  if (!data.success) throw new Error(data.message || "Apps Script request failed");
  return data.rows;
}

// Basic in-memory rate limiting per serverless instance. For real production
// scale, move this to Vercel KV or similar so it holds across instances.
const attempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCK_MS = 20 * 1000;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { employeeId, password } = req.body || {};
  if (!employeeId || !password) {
    return res.status(400).json({ success: false, message: "Employee ID and password are required." });
  }

  const id = String(employeeId).trim().toUpperCase();
  const record = attempts.get(id);
  if (record && record.lockedUntil && Date.now() < record.lockedUntil) {
    const secondsLeft = Math.ceil((record.lockedUntil - Date.now()) / 1000);
    return res.status(429).json({ success: false, message: `Too many attempts. Try again in ${secondsLeft}s.` });
  }

  try {
    const credentials = await fetchCredentials();
    const match = credentials.find((c) => (c["Employee ID"] || "").trim().toUpperCase() === id);

    if (!match || match["Password Hash"] !== hashPassword(password)) {
      const current = attempts.get(id) || { count: 0 };
      current.count += 1;
      if (current.count >= MAX_ATTEMPTS) {
        current.lockedUntil = Date.now() + LOCK_MS;
        current.count = 0;
      }
      attempts.set(id, current);
      return res.status(401).json({ success: false, message: "Invalid ID or password." });
    }

    attempts.delete(id);

    const session = {
      employeeId: id,
      name: match["Name"],
      role: (match["Role"] || "rep").toLowerCase(),
    };

    res.setHeader("Set-Cookie", createSessionCookie(session));
    return res.status(200).json({ success: true, name: session.name, role: session.role });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, message: "Something went wrong. Try again." });
  }
};
