// Serverless function: delete a Firebase Auth user by email
// Requires env var: FIREBASE_SERVICE_ACCOUNT (full service-account JSON from Firebase Console)
// Caller must include Authorization: Bearer <admin-idToken> header; request is rejected unless
// the token belongs to the configured ADMIN_EMAIL.

const crypto = require("crypto");
const FIREBASE_PROJECT_ID = "lash-studio-c9cd7";
const ADMIN_EMAIL = "maleocampo3@gmail.com";

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
    scope: "https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/identitytoolkit",
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

  // Verify caller is the admin
  const authHeader = req.headers.authorization || "";
  const callerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!callerToken) return res.status(401).json({ error:"Unauthorized" });

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error:"email required" });

  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!saJson) {
    console.error("delete-auth-user: FIREBASE_SERVICE_ACCOUNT env var not set");
    return res.status(500).json({ error:"service_account_not_configured" });
  }

  try {
    let sa;
    try {
      sa = JSON.parse(saJson);
    } catch (parseErr) {
      console.error("delete-auth-user: JSON.parse failed —", parseErr.message);
      return res.status(500).json({ error:"invalid FIREBASE_SERVICE_ACCOUNT JSON: " + parseErr.message });
    }
    if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, "\n");
    const token = await getGoogleAccessToken(sa);
    const BASE  = `https://identitytoolkit.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}`;

    // Verify caller's idToken and check they are the admin
    const verifyRes = await fetch(`${BASE}/accounts:lookup`, {
      method: "POST",
      headers: { "Authorization":`Bearer ${token}`, "Content-Type":"application/json" },
      body: JSON.stringify({ idToken: callerToken }),
    });
    const verifyBody = await verifyRes.json();
    const callerEmail = verifyBody.users?.[0]?.email;
    if (callerEmail !== ADMIN_EMAIL) {
      console.warn("delete-auth-user: unauthorized attempt from", callerEmail || "(unknown)");
      return res.status(403).json({ error:"Forbidden" });
    }

    // Find uid by email
    const lookupRes = await fetch(`${BASE}/accounts:lookup`, {
      method: "POST",
      headers: { "Authorization":`Bearer ${token}`, "Content-Type":"application/json" },
      body: JSON.stringify({ email:[email] }),
    });
    const lookupBody = await lookupRes.json();
    if (!lookupRes.ok) throw new Error(`Lookup failed ${lookupRes.status}: ${JSON.stringify(lookupBody)}`);
    const uid = lookupBody.users?.[0]?.localId;
    if (!uid) {
      console.log("delete-auth-user: user not found in Firebase Auth —", email);
      return res.json({ ok:true, notFound:true });
    }

    // Delete
    const deleteRes = await fetch(`${BASE}/accounts:delete`, {
      method: "POST",
      headers: { "Authorization":`Bearer ${token}`, "Content-Type":"application/json" },
      body: JSON.stringify({ localId:uid }),
    });
    if (!deleteRes.ok) {
      const errBody = await deleteRes.json().catch(() => ({}));
      throw new Error(`Firebase delete failed: ${deleteRes.status} ${JSON.stringify(errBody)}`);
    }

    return res.json({ ok:true });
  } catch (e) {
    console.error("delete-auth-user:", e);
    return res.status(500).json({ error:e.message });
  }
};
