// Vercel Serverless Function — save a Web Push subscription to Firebase RTDB
// Admin subscriptions require Authorization: Bearer <idToken> from the admin user.
const crypto = require("crypto");
const FB = "https://lash-studio-c9cd7-default-rtdb.firebaseio.com";
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

  const { role, uid, subscription } = req.body || {};
  if (!subscription?.endpoint) return res.status(400).json({ error: "Invalid subscription" });

  const authHeader = req.headers.authorization || "";
  const callerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  // Admin subscriptions: verify the caller is actually the admin
  if (role === "admin") {
    if (!callerToken) return res.status(401).json({ error:"Unauthorized" });
    const saJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (saJson) {
      try {
        const sa = JSON.parse(saJson);
        if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, "\n");
        const saToken = await getGoogleAccessToken(sa);
        const verifyRes = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/accounts:lookup`, {
          method: "POST",
          headers: { "Authorization":`Bearer ${saToken}`, "Content-Type":"application/json" },
          body: JSON.stringify({ idToken: callerToken }),
        });
        const verifyBody = await verifyRes.json();
        const callerEmail = verifyBody.users?.[0]?.email;
        if (callerEmail !== ADMIN_EMAIL) {
          console.warn("subscribe: unauthorized admin attempt from", callerEmail || "(unknown)");
          return res.status(403).json({ error:"Forbidden" });
        }
      } catch (e) {
        console.error("subscribe: admin token verification failed:", e.message);
        return res.status(500).json({ error:"token verification failed" });
      }
    }
  }

  // Clienta subscriptions: require a uid to avoid orphan records
  if (role !== "admin" && !uid) return res.status(400).json({ error:"uid required for clienta subscriptions" });

  const subId = Buffer.from(subscription.endpoint).toString("base64url").slice(-28);
  const path = role === "admin"
    ? `${FB}/pushSubs/admin/${subId}.json`
    : `${FB}/pushSubs/clientas/${uid}/${subId}.json`;

  await fetch(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      keys:     subscription.keys,
      updatedAt: new Date().toISOString(),
    }),
  });

  res.json({ ok: true });
};
