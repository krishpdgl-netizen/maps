const jwt = require("jsonwebtoken");
const cookie = require("cookie");

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const APPS_SCRIPT_SECRET = process.env.APPS_SCRIPT_SECRET;

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

async function fetchCustomers() {
  const url = `${APPS_SCRIPT_URL}?action=customers&secret=${encodeURIComponent(APPS_SCRIPT_SECRET)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || "Apps Script request failed");
  return data.rows;
}

module.exports = async function handler(req, res) {
  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ success: false, message: "Not logged in." });
  }

  try {
    const rows = await fetchCustomers();

    const filtered = session.role === "admin"
      ? rows
      : rows.filter((r) => (r["Assigned Employee ID"] || "").trim().toUpperCase() === session.employeeId);

    const customers = filtered.map((r) => ({
      rowNumber: r._rowNumber,
      name: r["Customer Name"],
      address: r["Address"],
      lat: parseFloat(r["Lat"]),
      lng: parseFloat(r["Lng"]),
      status: (r["Status"] || "pending").toLowerCase(),
      assignedTo: r["Assigned Employee ID"],
    }));

    return res.status(200).json({ success: true, role: session.role, name: session.name, customers });
  } catch (err) {
    console.error("Customers fetch error:", err);
    return res.status(500).json({ success: false, message: "Could not load customers." });
  }
};
