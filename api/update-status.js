const jwt = require("jsonwebtoken");
const cookie = require("cookie");

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const APPS_SCRIPT_SECRET = process.env.APPS_SCRIPT_SECRET;
const ALLOWED_STATUSES = ["pending", "followup", "visited"];

function getSession(req) {
  const cookies = cookie.parse(req.headers.cookie || "");
  const token = cookies["session"];
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return null;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ success: false, message: "Not logged in." });
  }

  const { rowNumber, status } = req.body || {};
  if (!rowNumber || !ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid rowNumber or status." });
  }

  try {
    const appsScriptRes = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "updateStatus",
        secret: APPS_SCRIPT_SECRET,
        rowNumber,
        status,
      }),
    });
    const data = await appsScriptRes.json();
    if (!data.success) throw new Error(data.message || "Apps Script update failed");

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Status update error:", err);
    return res.status(500).json({ success: false, message: "Could not update status." });
  }
};
