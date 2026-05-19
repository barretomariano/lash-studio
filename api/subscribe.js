// Vercel Serverless Function — save a Web Push subscription to Firebase RTDB
const FB = "https://lash-studio-c9cd7-default-rtdb.firebaseio.com";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { role, uid, subscription } = req.body || {};
  if (!subscription?.endpoint) return res.status(400).json({ error: "Invalid subscription" });

  // Stable ID derived from the endpoint (last 28 chars of base64)
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
