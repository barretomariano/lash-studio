// Vercel Cron — runs daily at 12:00 UTC (09:00 Buenos Aires, UTC-3)
// Sends appointment reminders to clientas + daily summary to admin
const crypto  = require("crypto");
const webpush = require("web-push");

const VAPID_PUBLIC  = "BBsJiZsDUVmNPVoNNvzhlKiJG25M27n7IEKJmf9gCO1CDiAM7D-8pFlxuRQP_CNN_p0utbKR1JOR90HoA78_Hxk";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
if (!VAPID_PRIVATE) throw new Error("VAPID_PRIVATE_KEY env var not set");
const FB = "https://lash-studio-c9cd7-default-rtdb.firebaseio.com";

webpush.setVapidDetails("mailto:maleocampo3@gmail.com", VAPID_PUBLIC, VAPID_PRIVATE);

// Today's date in Buenos Aires (UTC-3, no DST since 2008)
function todayBsAs() {
  const now = new Date();
  return new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function tomorrowBsAs() {
  const t = new Date(todayBsAs() + "T12:00:00");
  t.setDate(t.getDate() + 1);
  return t.toISOString().slice(0, 10);
}

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

async function fbGet(path, token) {
  const headers = token ? { Authorization:`Bearer ${token}` } : {};
  const r = await fetch(`${FB}/${path}.json`, { headers });
  if (!r.ok) throw new Error(`fbGet ${path} failed: HTTP ${r.status}`);
  const d = await r.json();
  if (!d || typeof d !== "object" || Array.isArray(d)) return [];
  return Object.entries(d).map(([k, v]) => ({ ...v, _id: k }));
}

async function fbGetVal(path, token) {
  const headers = token ? { Authorization:`Bearer ${token}` } : {};
  const r = await fetch(`${FB}/${path}.json`, { headers });
  if (!r.ok) throw new Error(`fbGetVal ${path} failed: HTTP ${r.status}`);
  return r.json();
}

async function getSubs(path, token) {
  const obj = await fbGetVal(path, token);
  if (!obj || typeof obj !== "object") return [];
  return Object.values(obj).filter(s => s?.endpoint);
}

async function safePush(sub, payload) {
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload));
  } catch (err) {
    if (err.statusCode !== 410 && err.statusCode !== 404) {
      console.error("Push error:", err.statusCode);
    }
  }
}

async function sendPushToClienta(uid, title, body, token) {
  const subs = await getSubs(`pushSubs/clientas/${uid}`, token);
  for (const sub of subs) await safePush(sub, { title, body, url:"/" });
}

module.exports = async function handler(req, res) {
  // Vercel cron sends GET; also allow POST for manual triggers
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).end();

  // Service account token is required — without it all RTDB reads return nothing
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!saJson) {
    console.error("cron-reminders: FIREBASE_SERVICE_ACCOUNT env var not set — aborting");
    return res.status(500).json({ error:"FIREBASE_SERVICE_ACCOUNT not configured" });
  }

  let token;
  try {
    const sa = JSON.parse(saJson);
    if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, "\n");
    token = await getGoogleAccessToken(sa);
  } catch (e) {
    console.error("cron-reminders: could not get access token:", e.message);
    return res.status(500).json({ error:"access token error: " + e.message });
  }

  const todayStr = todayBsAs();
  const tomorrow = tomorrowBsAs();

  // Fetch citas, clientas, admin subs, and notification schedule in parallel
  const [citas, clientas, adminSubs, schedule] = await Promise.all([
    fbGet("citas", token),
    fbGet("clientas", token),
    getSubs("pushSubs/admin", token),
    fbGetVal("config/notifSchedule", token).then(v => v || {}),
  ]);

  const citasManana = citas.filter(c =>
    c.fecha === tomorrow &&
    c.estado !== "completada" &&
    c.estado !== "cancelada"
  );

  const sends = [];

  // ── 1. Clienta reminders ─────────────────────────────────────────────────────
  for (const cita of citasManana) {
    const clienta = clientas.find(c => c._id === cita.clientaId);
    const uid = cita.clientaUid || clienta?.uid;
    if (!uid) continue;

    const subs = await getSubs(`pushSubs/clientas/${uid}`, token);
    for (const sub of subs) {
      sends.push(safePush(sub, {
        title: "Recordatorio de cita 💅",
        body:  `Mañana a las ${cita.hora} — ${cita.servicio}`,
        url:   "/",
      }));
    }
  }

  // ── 2. Admin daily summary ───────────────────────────────────────────────────
  if (adminSubs.length > 0) {
    let payload;
    if (citasManana.length === 0) {
      payload = {
        title: "📅 Mañana libre",
        body:  "No tenés citas agendadas para mañana. ¡Momento para recargar energías!",
        url:   "/",
      };
    } else {
      const lista = [...citasManana]
        .sort((a, b) => a.hora.localeCompare(b.hora))
        .slice(0, 4)
        .map(c => `${c.hora} ${c.clientaNombre?.split(" ")[0] || ""}`)
        .join(" · ");
      payload = {
        title: `📅 ${citasManana.length === 1 ? "1 cita" : `${citasManana.length} citas`} mañana`,
        body:  lista + (citasManana.length > 4 ? ` +${citasManana.length - 4} más` : ""),
        url:   "/",
      };
    }
    for (const sub of adminSubs) {
      sends.push(safePush(sub, payload));
    }
  }

  await Promise.all(sends);

  // ── 3. Recall: clients who haven't visited in N days ────────────────────────
  let recallSent = 0;
  const recallUids = new Set();
  if (schedule.recall) {
    const dias = schedule.recallDias || 30;
    const threshold = new Date(todayStr + "T12:00:00");
    threshold.setDate(threshold.getDate() - dias);
    const thresholdStr = threshold.toISOString().slice(0, 10);

    for (const c of clientas) {
      if (!c.uid) continue;
      const visitas = Object.values(c.historial || {}).filter(h => h.fecha <= todayStr);
      if (!visitas.length) continue;
      const ultima = visitas.sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
      if (ultima.fecha <= thresholdStr) {
        await sendPushToClienta(c.uid,
          schedule.recallTitulo || "¡Te extrañamos! 💚",
          schedule.recallTexto  || "¿Reagendamos tu servicio?",
          token);
        recallUids.add(c.uid);
        recallSent++;
      }
    }
  }

  // ── 4. Service reminder: clients due for their service ──────────────────────
  // Uses <= so clients are caught even if the cron was skipped a day.
  // Skips clients already sent a recall today to avoid double-notification.
  let serviceSent = 0;
  if (schedule.service) {
    const dias = schedule.serviceDias || 14;
    const target = new Date(todayStr + "T12:00:00");
    target.setDate(target.getDate() - dias);
    const targetStr = target.toISOString().slice(0, 10);

    for (const c of clientas) {
      if (!c.uid || recallUids.has(c.uid)) continue;
      const visitas = Object.values(c.historial || {}).filter(h => h.fecha <= todayStr);
      if (!visitas.length) continue;
      const ultima = visitas.sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
      if (ultima.fecha <= targetStr) {
        await sendPushToClienta(c.uid,
          schedule.serviceTitulo || "¡Hora de tu service! 💅",
          schedule.serviceTexto  || "Ya pasaron los días recomendados. ¡Agendá tu turno! 🌿",
          token);
        serviceSent++;
      }
    }
  }

  res.json({
    ok: true,
    tomorrow,
    citasManana:  citasManana.length,
    adminSubs:    adminSubs.length,
    sends:        sends.length,
    recallSent,
    serviceSent,
  });
};
