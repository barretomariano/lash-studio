// Vercel Cron — weekly backup of Firebase RTDB to Firebase Storage
// Runs every Sunday at 03:00 UTC. Requires FIREBASE_SERVICE_ACCOUNT env var.
// Guard: if the snapshot is empty or has no clientas, the backup is skipped to prevent overwriting real data.

const crypto = require("crypto");
const FB = "https://lash-studio-c9cd7-default-rtdb.firebaseio.com";
const BUCKET = "lash-studio-c9cd7.appspot.com";

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
    scope: [
      "https://www.googleapis.com/auth/firebase",
      "https://www.googleapis.com/auth/cloud-platform",
      "https://www.googleapis.com/auth/devstorage.read_write",
    ].join(" "),
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
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).end();

  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!saJson) {
    console.error("backup: FIREBASE_SERVICE_ACCOUNT not set");
    return res.status(500).json({ error:"FIREBASE_SERVICE_ACCOUNT not configured" });
  }

  let token;
  try {
    const sa = JSON.parse(saJson);
    if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, "\n");
    token = await getGoogleAccessToken(sa);
  } catch (e) {
    console.error("backup: access token error:", e.message);
    return res.status(500).json({ error:"access token error: " + e.message });
  }

  // Fetch entire RTDB snapshot
  const snapshotRes = await fetch(`${FB}/.json`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!snapshotRes.ok) {
    const body = await snapshotRes.text();
    console.error("backup: RTDB fetch failed", snapshotRes.status, body);
    return res.status(500).json({ error:`RTDB fetch failed: ${snapshotRes.status}` });
  }

  const snapshot = await snapshotRes.json();

  // Guard: never overwrite with empty or missing clientas
  if (!snapshot || typeof snapshot !== "object") {
    console.warn("backup: snapshot is empty — skipping to avoid data loss");
    return res.json({ ok:true, skipped:true, reason:"empty snapshot" });
  }
  if (!snapshot.clientas || Object.keys(snapshot.clientas).length === 0) {
    console.warn("backup: snapshot has no clientas — skipping to avoid data loss");
    return res.json({ ok:true, skipped:true, reason:"no clientas in snapshot" });
  }

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const filename = `backups/rtdb-${dateStr}.json`;
  const body = JSON.stringify(snapshot, null, 2);

  // Upload to Firebase Storage via JSON API
  const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o?uploadType=media&name=${encodeURIComponent(filename)}`;
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    },
    body,
  });

  if (!uploadRes.ok) {
    const errBody = await uploadRes.text();
    console.error("backup: Storage upload failed", uploadRes.status, errBody);
    return res.status(500).json({ error:`Storage upload failed: ${uploadRes.status}` });
  }

  const uploadResult = await uploadRes.json();
  console.log("backup: success →", filename, `(${Buffer.byteLength(body)} bytes)`);

  res.json({
    ok: true,
    filename,
    size: Buffer.byteLength(body),
    mediaLink: uploadResult.mediaLink || null,
  });
};
