// Vercel Serverless Function — send Web Push notifications
// VAPID private key: move to Vercel env var VAPID_PRIVATE_KEY for production
const webpush = require("web-push");

const VAPID_PUBLIC  = "BBsJiZsDUVmNPVoNNvzhlKiJG25M27n7IEKJmf9gCO1CDiAM7D-8pFlxuRQP_CNN_p0utbKR1JOR90HoA78_Hxk";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "67JA73EIzffmKb19mNmMvXLUnnPTW827jC7DnNKOlTc";
const FB = "https://lash-studio-c9cd7-default-rtdb.firebaseio.com";

webpush.setVapidDetails("mailto:maleocampo3@gmail.com", VAPID_PUBLIC, VAPID_PRIVATE);

async function getSubscriptions(target) {
  let url;
  if (target === "admin") {
    url = `${FB}/pushSubs/admin.json`;
  } else if (target.startsWith("clienta:")) {
    const uid = target.slice(8);
    url = `${FB}/pushSubs/clientas/${uid}.json`;
  } else {
    return [];
  }
  const r = await fetch(url);
  const obj = await r.json();
  if (!obj || typeof obj !== "object") return [];
  return Object.values(obj).filter(s => s?.endpoint);
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { targets, title, body, url = "/" } = req.body || {};
  if (!targets?.length || !title) return res.status(400).json({ error: "Missing targets or title" });

  const payload = JSON.stringify({ title, body: body || "", url });

  // Collect all subscriptions for all targets in parallel
  const subArrays = await Promise.all(targets.map(getSubscriptions));
  const allSubs   = subArrays.flat();

  // Send all in parallel, ignoring individual failures
  let sent = 0;
  await Promise.all(allSubs.map(async (sub) => {
    try {
      await webpush.sendNotification(sub, payload);
      sent++;
    } catch (err) {
      // 410 = subscription gone / unsubscribed — could clean up here
      if (err.statusCode !== 410 && err.statusCode !== 404) {
        console.error("Push send error", err.statusCode, err.body);
      }
    }
  }));

  res.json({ ok: true, sent });
};
