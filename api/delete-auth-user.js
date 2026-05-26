// Serverless function: delete a Firebase Auth user by email
// Uses only Node.js built-in crypto — no extra packages needed.
// Requires env var: FIREBASE_SERVICE_ACCOUNT (full service-account JSON from Firebase Console)
//
// To set up: Firebase Console → Project Settings → Service Accounts → Generate new private key
// Paste the downloaded JSON content as FIREBASE_SERVICE_ACCOUNT in Vercel env vars.

const crypto = require("crypto");
const FIREBASE_PROJECT_ID = "lash-studio-c9cd7";

function b64url(data) {
  return Buffer.from(data).toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function getGoogleAccessToken(sa) {
  const now     = Math.floor(Date.now() / 1000);
  const header  = b64url(JSON.stringify({ alg:"RS256", typ:"JWT" }));
  const payload = b64url(JSON.stringify({
    iss: sa.client_email, sub: sa.client_email,
    aud: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/firebase",
    iat: now, exp: now + 3600,
  }));
  const toSign = `${header}.${payload}`;
  const sign   = crypto.createSign("RSA-SHA256");
  sign.update(toSign);
  const sig = b64url(sign.sign(sa.private_key));
  const jwt = `${toSign}.${sig}`;

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type":"application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const j = await r.json();
  if (!j.access_token) throw new Error("OAuth error: " + JSON.stringify(j));
  return j.access_token;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error:"email required" });

  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!saJson) return res.json({ ok:false, reason:"service_account_not_configured" });

  try {
    const sa    = JSON.parse(saJson);
    const token = await getGoogleAccessToken(sa);
    const BASE  = `https://identitytoolkit.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}`;

    // Find uid by email
    const lookupRes = await fetch(`${BASE}/accounts:lookup`, {
      method: "POST",
      headers: { "Authorization":`Bearer ${token}`, "Content-Type":"application/json" },
      body: JSON.stringify({ email:[email] }),
    });
    const lookup = await lookupRes.json();
    const uid    = lookup.users?.[0]?.localId;
    if (!uid) return res.json({ ok:true, notFound:true });

    // Delete
    await fetch(`${BASE}/accounts:delete`, {
      method: "POST",
      headers: { "Authorization":`Bearer ${token}`, "Content-Type":"application/json" },
      body: JSON.stringify({ localId:uid }),
    });

    return res.json({ ok:true });
  } catch (e) {
    console.error("delete-auth-user:", e);
    return res.status(500).json({ error:e.message });
  }
};
