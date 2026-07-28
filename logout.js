const cookie = require("cookie");

module.exports = async function handler(req, res) {
  const cleared = cookie.serialize("session", "", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  res.setHeader("Set-Cookie", cleared);
  return res.status(200).json({ success: true });
};
