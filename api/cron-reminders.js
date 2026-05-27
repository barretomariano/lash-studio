// Vercel Cron — runs daily at 12:00 UTC (09:00 Buenos Aires, UTC-3)
// Sends appointment reminders to clientas + daily summary to admin
const webpush = require("web-push");

const VAPID_PUBLIC  = "BBsJiZsDUVmNPVoNNvzhlKiJG25M27n7IEKJmf9gCO1CDiAM7D-8pFlxuRQP_CNN_p0utbKR1JOR90HoA78_Hxk";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "67JA73EIzffmKb19mNmMvXLUnnPTW827jC7DnNKOlTc";
const FB = "https://lash-studio-c9cd7-default-rtdb.firebaseio.com";

webpush.setVapidDetails("mailto:maleocampo3@gmail.com", VAPID_PUBLIC, VAPID_PRIVATE);

// Tomorrow's date in Buenos Aires (UTC-3, no DST)
function tomorrowBsAs() {
  const now = new Date();
  const bsas = new Date(now.getTime() - 3 * 60 * 60 * 1000); // shift to UTC-3
  bsas.setDate(bsas.getDate() + 1);
  return bsas.toISOString().slice(0, 10);
}

async function fbGet(path) {
  const r = await fetch(`${FB}/${path}.json`);
  const d = await r.json();
  if (!d || typeof d !== "object" || Array.isArray(d)) return [];
  return Object.entries(d).map(([k, v]) => ({ ...v, _id: k }));
}

async function fbGetVal(path) {
  const r = await fetch(`${FB}/${path}.json`);
  return r.json();
}

async function getSubs(path) {
  const obj = await fbGetVal(path);
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

async function sendPushToClienta(uid, title, body) {
  const subs = await getSubs(`pushSubs/clientas/${uid}`);
  for (const sub of subs) await safePush(sub, { title, body, url:"/" });
}

module.exports = async function handler(req, res) {
  // Vercel cron sends GET; also allow POST for manual triggers
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).end();

  const tomorrow = tomorrowBsAs();
  const now = new Date();
  const bsasNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const todayStr = bsasNow.toISOString().slice(0, 10);

  // Fetch citas, clientas, admin subs, and notification schedule in parallel
  const [citas, clientas, adminSubs, schedule] = await Promise.all([
    fbGet("citas"),
    fbGet("clientas"),
    getSubs("pushSubs/admin"),
    fbGetVal("config/notifSchedule").then(v => v || {}),
  ]);

  const citasManana = citas.filter(c =>
    c.fecha === tomorrow &&
    c.estado !== "completada" &&
    c.estado !== "cancelada"
  );

  const sends = [];

  // ── 1. Clienta reminders ─────────────────────────────────────────────────────
  for (const cita of citasManana) {
    // Find uid: first from cita.clientaUid, then from clientas list
    const clienta = clientas.find(c => c._id === cita.clientaId);
    const uid = cita.clientaUid || clienta?.uid;
    if (!uid) continue;

    const subs = await getSubs(`pushSubs/clientas/${uid}`);
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
          schedule.recallTexto  || "¿Reagendamos tu servicio?");
        recallSent++;
      }
    }
  }

  // ── 4. Service reminder: clients due for their service ──────────────────────
  let serviceSent = 0;
  if (schedule.service) {
    const dias = schedule.serviceDias || 14;
    const target = new Date(todayStr + "T12:00:00");
    target.setDate(target.getDate() - dias);
    const targetStr = target.toISOString().slice(0, 10);

    for (const c of clientas) {
      if (!c.uid) continue;
      const visitas = Object.values(c.historial || {}).filter(h => h.fecha <= todayStr);
      if (!visitas.length) continue;
      const ultima = visitas.sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
      if (ultima.fecha === targetStr) {
        await sendPushToClienta(c.uid,
          schedule.serviceTitulo || "¡Hora de tu service! 💅",
          schedule.serviceTexto  || "Ya pasaron los días recomendados. ¡Agendá tu turno! 🌿");
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
