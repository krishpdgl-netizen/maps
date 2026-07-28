// Usage: node scripts/hash-password.js "the-password-you-want"
// Paste the printed hash into the "Password Hash" column of the Credentials tab.
const crypto = require("crypto");

const password = process.argv[2];
if (!password) {
  console.error("Usage: node scripts/hash-password.js <password>");
  process.exit(1);
}

console.log(crypto.createHash("sha256").update(password).digest("hex"));
