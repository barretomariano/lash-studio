import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";

const FB        = "https://lash-studio-c9cd7-default-rtdb.firebaseio.com";
const API_KEY   = "AIzaSyDq8japdXOWaAAOjBLhESJB1h2qITdnhvk";
const AUTH_URL  = "https://identitytoolkit.googleapis.com/v1/accounts";
const ADMIN_EMAIL = "maleocampo3@gmail.com";
const WA_NUM    = "541126509699";
const DEPLOY_URL = "https://lash-studio-gilt.vercel.app";
const VAPID_PUBLIC_KEY = "BBsJiZsDUVmNPVoNNvzhlKiJG25M27n7IEKJmf9gCO1CDiAM7D-8pFlxuRQP_CNN_p0utbKR1JOR90HoA78_Hxk";
const CLOUDINARY_CLOUD  = "dd178jnmm";
const CLOUDINARY_PRESET = "lash_studio";

async function subirFoto(fileOrDataUrl) {
  let dataUrl;
  if (typeof fileOrDataUrl === "string") {
    dataUrl = fileOrDataUrl; // canvas dataURL from cropper — use as-is
  } else {
    dataUrl = await new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const img = new Image();
      img.onload = () => {
        const MAX = 900;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) { if (w > h) { h = h*MAX/w; w=MAX; } else { w=w*MAX/h; h=MAX; } }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = URL.createObjectURL(fileOrDataUrl);
    });
  }
  if (!CLOUDINARY_CLOUD || !CLOUDINARY_PRESET) return dataUrl;
  const fd = new FormData();
  fd.append("file", dataUrl);
  fd.append("upload_preset", CLOUDINARY_PRESET);
  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method:"POST", body:fd });
  const j = await r.json();
  return j.secure_url || dataUrl;
}

let _fbAuthToken = null;
let _fbRefreshToken = null;
let _fbTokenTimer = null;

const db = {
  setAuth: (idToken, refreshToken) => {
    _fbAuthToken = idToken;
    if (refreshToken) _fbRefreshToken = refreshToken;
    if (_fbTokenTimer) clearTimeout(_fbTokenTimer);
    if (_fbRefreshToken) {
      _fbTokenTimer = setTimeout(async () => {
        const r = await fbAuth.refresh(_fbRefreshToken);
        if (r.idToken) db.setAuth(r.idToken, r.refreshToken);
      }, 55 * 60 * 1000);
    }
  },
  _q: () => _fbAuthToken ? `?auth=${_fbAuthToken}` : "",
  get: async (path) => {
    const r = await fetch(`${FB}/${path}.json${db._q()}`);
    const d = await r.json();
    if (!d || typeof d !== "object" || Array.isArray(d)) return [];
    return Object.entries(d).map(([k, v]) => ({ ...v, _id: k }));
  },
  getVal: async (path) => { const r = await fetch(`${FB}/${path}.json${db._q()}`); return r.json(); },
  set:    async (path, data) => { await fetch(`${FB}/${path}.json${db._q()}`, { method:"PUT",    body:JSON.stringify(data) }); },
  push:   async (path, data) => { const r = await fetch(`${FB}/${path}.json${db._q()}`, { method:"POST",   body:JSON.stringify(data) }); return (await r.json()).name; },
  update: async (path, data) => { await fetch(`${FB}/${path}.json${db._q()}`, { method:"PATCH",  body:JSON.stringify(data) }); },
  del:    async (path)       => { await fetch(`${FB}/${path}.json${db._q()}`, { method:"DELETE" }); },
};

const SECURETOKEN_URL = "https://securetoken.googleapis.com/v1/token";
const fbAuth = {
  signIn:  async (email, pass) => (await fetch(`${AUTH_URL}:signInWithPassword?key=${API_KEY}`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email, password:pass, returnSecureToken:true }) })).json(),
  create:  async (email, pass) => (await fetch(`${AUTH_URL}:signUp?key=${API_KEY}`,             { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email, password:pass, returnSecureToken:true }) })).json(),
  resetPw: async (email)       => (await fetch(`${AUTH_URL}:sendOobCode?key=${API_KEY}`,        { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ requestType:"PASSWORD_RESET", email }) })).json(),
  updatePass: async (idToken, newPass) => (await fetch(`${AUTH_URL}:update?key=${API_KEY}`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ idToken, password:newPass, returnSecureToken:true }) })).json(),
  deleteUser: async (idToken) => (await fetch(`${AUTH_URL}:delete?key=${API_KEY}`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ idToken }) })).json(),
  // Exchange a long-lived refresh token for a fresh idToken (tokens expire in 1h; refresh tokens survive password changes unless explicitly revoked)
  refresh: async (refreshToken) => {
    const r = await fetch(`${SECURETOKEN_URL}?key=${API_KEY}`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ grant_type:"refresh_token", refresh_token:refreshToken }) });
    const j = await r.json();
    return j.id_token ? { idToken:j.id_token, refreshToken:j.refresh_token } : { error:j.error };
  },
};

// helper: construir link WA con el teléfono de una clienta (o el de Male como fallback)
const openWAClienta = (clienta, msg = "") => {
  const raw = (clienta?.telefono || "").replace(/\D/g, "");
  const num  = raw.length >= 10 ? `54${raw.slice(-10)}` : WA_NUM;
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank");
};

// helper: generar link .ics para agregar al calendario nativo
const generarICS = (cita, estudio = {}) => {
  const [y, m, d] = cita.fecha.split("-");
  const [hh, mm]  = cita.hora.split(":");
  const pad = (n) => String(n).padStart(2, "0");
  const dtStart = `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00`;
  const endH    = parseInt(hh) + 1;
  const dtEnd   = `${y}${pad(m)}${pad(d)}T${pad(endH)}${pad(mm)}00`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LashStudio//App//ES",
    "BEGIN:VEVENT",
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${cita.servicio} — ${estudio.nombre || "Lash Studio"}`,
    `DESCRIPTION:Servicio: ${cita.servicio}\\nEstudio: ${estudio.nombre || "Lash Studio"}`,
    `LOCATION:${estudio.direccion || ""}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([ics], { type:"text/calendar" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `cita-lashstudio-${cita.fecha}.ics`;
  a.click();
  URL.revokeObjectURL(url);
};
const genPass  = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const hoyISO   = () => new Date().toISOString().slice(0, 10);
const mesISO   = () => new Date().toISOString().slice(0, 7);
const fmtPesos = (n) => `$${Number(n || 0).toLocaleString("es-AR")}`;
const fmtFecha = (iso) => { if (!iso) return ""; const [,m,d] = iso.split("-"); const M = ["","ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"]; return `${parseInt(d)} ${M[parseInt(m)]}`; };
const openWA   = (msg = "") => window.open(`https://wa.me/${WA_NUM}?text=${encodeURIComponent(msg)}`, "_blank");

const MESES  = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const DIAS_C = ["D","L","M","X","J","V","S"];
const DIAS_F = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];

const TIPOS_EVENTO = {
  personal:   { color:"#818cf8", bg:"rgba(129,140,248,0.18)", border:"rgba(129,140,248,0.45)", icon:"👤" },
  reunion:    { color:"#a78bfa", bg:"rgba(167,139,250,0.18)", border:"rgba(167,139,250,0.45)", icon:"🤝" },
  cumpleanos: { color:"#f472b6", bg:"rgba(244,114,182,0.18)", border:"rgba(244,114,182,0.45)", icon:"🎂" },
  descanso:   { color:"#94a3b8", bg:"rgba(148,163,184,0.14)", border:"rgba(148,163,184,0.38)", icon:"☕" },
};
const tipoEvColor = (tipo) => TIPOS_EVENTO[tipo] || TIPOS_EVENTO.personal;

const G_dark = {
  bg:"#111209", card:"rgba(255,255,255,0.055)", glass:"rgba(255,255,255,0.08)",
  border:"rgba(255,255,255,0.09)", borderHov:"rgba(255,255,255,0.18)",
  green:"#8aad60", greenD:"#5c8a30", greenL:"#a8c47c", greenM:"rgba(138,173,96,0.28)", greenRGB:"138,173,96",
  text:"#ede8df", muted:"rgba(237,232,223,0.42)", sub:"rgba(237,232,223,0.62)",
  white:"#ede8df", red:"#d97070", amber:"#d4a85a",
  navBg:"rgba(17,18,9,0.96)", topBarBg:"rgba(17,18,9,0.92)",
  shadow:"rgba(0,0,0,0.30)", shadowMd:"rgba(0,0,0,0.20)", shadowSm:"rgba(0,0,0,0.12)",
  appBgGradient:"radial-gradient(ellipse 90% 60% at 50% -8%, rgba(138,173,96,0.14) 0%, transparent 62%), radial-gradient(ellipse 45% 40% at 96% 88%, rgba(138,173,96,0.08) 0%, transparent 56%), radial-gradient(ellipse 55% 45% at 4% 100%, rgba(138,173,96,0.06) 0%, transparent 58%)",
  eyebrowOpacity: 0.62,
};
const G_light = {
  bg:"#f4efe8", card:"rgba(255,255,255,0.94)", glass:"rgba(0,0,0,0.03)",
  border:"rgba(0,0,0,0.12)", borderHov:"rgba(0,0,0,0.22)",
  green:"#5a9020", greenD:"#3d6e14", greenL:"#3a7010", greenM:"rgba(90,144,32,0.22)", greenRGB:"90,144,32",
  text:"#2a2a2a", muted:"rgba(20,20,20,0.58)", sub:"rgba(20,20,20,0.80)",
  white:"#1a1a1a", red:"#c04040", amber:"#9a6418",
  navBg:"rgba(242,237,230,0.97)", topBarBg:"rgba(242,237,230,0.94)",
  shadow:"rgba(0,0,0,0.13)", shadowMd:"rgba(0,0,0,0.09)", shadowSm:"rgba(0,0,0,0.05)",
  appBgGradient:"radial-gradient(ellipse 90% 60% at 50% -8%, rgba(90,144,32,0.1) 0%, transparent 55%), radial-gradient(ellipse 55% 45% at 4% 100%, rgba(90,144,32,0.06) 0%, transparent 52%)",
  eyebrowOpacity: 0.88,
};
const G = Object.assign({}, G_dark);
const F = { display:"'Bebas Neue',Impact,sans-serif", serif:"'Fraunces',Georgia,serif", sans:"'Outfit','Segoe UI',sans-serif" };

// Theme context — components use useTheme() to get toggleTheme and dark flag
const ThemeCtx = createContext({ dark:true, toggleTheme:() => {} });
const useTheme = () => useContext(ThemeCtx);

// ── Responsive breakpoint hook ────────────────────────────────────────────────
function useIsWide() {
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.innerWidth > 680);
  useEffect(() => {
    const fn = () => setWide(window.innerWidth > 680);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return wide;
}

// ── Time utilities for week calendar ─────────────────────────────────────────
const toMin     = (hhmm) => { const [h,m] = hhmm.split(":").map(Number); return h*60+m; };
const isoOfDate = (d)    => d.toISOString().slice(0,10);
const mondayOfWeek = (weekOffset) => {
  const d = new Date(); d.setHours(12,0,0,0);
  d.setDate(d.getDate() - ((d.getDay()+6)%7) + weekOffset*7);
  return d;
};

function layoutCitas(citas, getDurFn) {
  if (!citas.length) return [];
  const sorted = [...citas].sort((a, b) => toMin(a.hora) - toMin(b.hora));
  const cols = [], ends = [];
  for (let i = 0; i < sorted.length; i++) {
    const start = toMin(sorted[i].hora);
    const end   = start + getDurFn(sorted[i]);
    ends.push(end);
    const used = new Set();
    for (let j = 0; j < i; j++) {
      if (toMin(sorted[j].hora) < end && ends[j] > start) used.add(cols[j]);
    }
    let c = 0; while (used.has(c)) c++;
    cols.push(c);
  }
  const nCols = cols.map((_, i) => {
    let max = cols[i] + 1;
    for (let j = 0; j < sorted.length; j++) {
      if (i !== j && toMin(sorted[j].hora) < ends[i] && ends[j] > toMin(sorted[i].hora))
        max = Math.max(max, cols[j] + 1);
    }
    return max;
  });
  return sorted.map((c, i) => ({ ...c, _col: cols[i], _nCols: nCols[i] }));
}

// WA message templates — stored in /config/mensajes, editable by admin
const DEFAULT_MENSAJES = {
  service14d:  "Hola {nombre}! 🌿 ¿Cómo están tus pestañas? Ya es momento del service. ¡Te espero! 💚",
  recordatorio:"Hola {nombre}! 🌿 Te recuerdo tu turno mañana a las {hora}. ¡Te espero! 💚",
  bienvenida:  "Hola {nombre}! 🌿 Te creé tu acceso en {estudio}.\n\nEmail: {email}\nContraseña: {pass}\n\nEntrá desde: {url}\n\n¡Podés ver tus citas, historial y más! 💚",
};
const fillMsg = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] !== undefined ? vars[k] : `{${k}}`);

// Returns visits-discount status for a client, or null if feature disabled.
const calcVisitasDesc = (hist, promosConfig) => {
  const cfg = promosConfig?.visitasDesc || {};
  if (!cfg.habilitado || !cfg.cantidad || cfg.cantidad <= 0) return null;
  const total     = hist.length;
  const usados    = hist.filter(h => h.descuentoVisitas).length;
  const ganados   = Math.floor(total / cfg.cantidad);
  const disponible = ganados > usados;
  const enCiclo   = total % cfg.cantidad;
  const progreso  = disponible ? cfg.cantidad : enCiclo;
  const faltan    = disponible ? 0 : cfg.cantidad - enCiclo;
  return { disponible, progreso, faltan, total, cfg, ganados, usados };
};

// ── Push notifications ─────────────────────────────────────────────────────────
function urlBase64ToUint8Array(b64) {
  const pad = "=".repeat((4 - b64.length % 4) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// Fire-and-forget push send (called from React components)
// Also persists to Firebase for clienta targets so they don't lose messages
const sendPush = (targets, title, body, url = "/") => {
  fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targets, title, body, url }),
  }).catch(() => {});
  targets.forEach(t => {
    if (!t.startsWith("clienta:")) return;
    db.push(`notificaciones/${t.slice(8)}`, { titulo:title, cuerpo:body, url, fecha:new Date().toISOString().slice(0,10), ts:Date.now(), leida:false }).catch(() => {});
  });
};

// Save current push subscription to the server for a given role/uid
async function registerPushSubscription(role, uid = null) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, uid, subscription: sub }),
    });
    return true;
  } catch { return false; }
}

// Hook — manages push permission state for a given user
function usePushStatus(role, uid = null) {
  const supported = typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
  const [status, setStatus] = useState(() => {
    if (!supported) return "unsupported";
    return Notification.permission; // "default" | "granted" | "denied"
  });
  const [loading, setLoading] = useState(false);

  // On mount: if already granted, try to re-register (keeps subs fresh)
  useEffect(() => {
    if (!supported || Notification.permission !== "granted") return;
    setLoading(true);
    registerPushSubscription(role, uid).then(ok => { setStatus(ok ? "subscribed" : "granted"); setLoading(false); });
  }, []);

  const subscribe = async () => {
    if (!supported) return;
    setLoading(true);
    const perm = await Notification.requestPermission();
    if (perm !== "granted") { setStatus("denied"); setLoading(false); return; }
    const ok = await registerPushSubscription(role, uid);
    setStatus(ok ? "subscribed" : "granted");
    setLoading(false);
  };

  return { status, subscribe, supported, loading };
}

// ── Fondo app con gradiente sutil ──────────────────────────────────────────────
const AppBg = () => (
  <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, background:G.appBgGradient }}/>
);

// ── Íconos Lucide SVG — función switch, JSX válido ────────────────────────────
function Icon({ name, size = 20, color = "currentColor", strokeWidth = 1.7 }) {
  const p = { fill:"none", stroke:color, strokeWidth:strokeWidth, strokeLinecap:"round", strokeLinejoin:"round" };
  const inner = () => {
    switch (name) {
      case "home":         return <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" {...p}/><polyline points="9 22 9 12 15 12 15 22" {...p}/></>;
      case "calendar":     return <><rect width="18" height="18" x="3" y="4" rx="2" {...p}/><line x1="16" y1="2" x2="16" y2="6" {...p}/><line x1="8" y1="2" x2="8" y2="6" {...p}/><line x1="3" y1="10" x2="21" y2="10" {...p}/></>;
      case "calendarPlus": return <><path d="M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8" {...p}/><line x1="16" y1="2" x2="16" y2="6" {...p}/><line x1="8" y1="2" x2="8" y2="6" {...p}/><line x1="3" y1="10" x2="19" y2="10" {...p}/><line x1="19" y1="16" x2="19" y2="22" {...p}/><line x1="22" y1="19" x2="16" y2="19" {...p}/></>;
      case "users":        return <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" {...p}/><circle cx="9" cy="7" r="4" {...p}/><path d="M23 21v-2a4 4 0 0 0-3-3.87" {...p}/><path d="M16 3.13a4 4 0 0 1 0 7.75" {...p}/></>;
      case "user":         return <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" {...p}/><circle cx="12" cy="7" r="4" {...p}/></>;
      case "barChart":     return <><line x1="18" y1="20" x2="18" y2="10" {...p}/><line x1="12" y1="20" x2="12" y2="4" {...p}/><line x1="6" y1="20" x2="6" y2="14" {...p}/></>;
      case "settings":     return <><circle cx="12" cy="12" r="3" {...p}/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M5.93 4.93a10 10 0 0 0 0 14.14" {...p}/></>;
      case "history":      return <><polyline points="1 4 1 10 7 10" {...p}/><path d="M3.51 15a9 9 0 1 0 .49-4.5" {...p}/></>;
      case "phone":        return <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.92 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" {...p}/>;
      case "instagram":    return <><rect width="20" height="20" x="2" y="2" rx="5" {...p}/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" {...p}/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" {...p}/></>;
      case "mapPin":       return <><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" {...p}/><circle cx="12" cy="10" r="3" {...p}/></>;
      case "messageCircle":return <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" {...p}/>;
      case "clock":        return <><circle cx="12" cy="12" r="10" {...p}/><polyline points="12 6 12 12 16 14" {...p}/></>;
      case "check":        return <polyline points="20 6 9 17 4 12" {...p}/>;
      case "checkCircle":  return <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" {...p}/><polyline points="22 4 12 14.01 9 11.01" {...p}/></>;
      case "x":            return <><line x1="18" y1="6" x2="6" y2="18" {...p}/><line x1="6" y1="6" x2="18" y2="18" {...p}/></>;
      case "plus":         return <><line x1="12" y1="5" x2="12" y2="19" {...p}/><line x1="5" y1="12" x2="19" y2="12" {...p}/></>;
      case "edit":         return <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" {...p}/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" {...p}/></>;
      case "trash":        return <><polyline points="3 6 5 6 21 6" {...p}/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" {...p}/></>;
      case "arrowLeft":    return <><line x1="19" y1="12" x2="5" y2="12" {...p}/><polyline points="12 19 5 12 12 5" {...p}/></>;
      case "arrowRight":   return <><line x1="5" y1="12" x2="19" y2="12" {...p}/><polyline points="12 5 19 12 12 19" {...p}/></>;
      case "chevronDown":  return <polyline points="6 9 12 15 18 9" {...p}/>;
      case "chevronRight": return <polyline points="9 18 15 12 9 6" {...p}/>;
      case "key":          return <><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" {...p}/></>;
      case "lock":         return <><rect width="18" height="11" x="3" y="11" rx="2" {...p}/><path d="M7 11V7a5 5 0 0 1 10 0v4" {...p}/></>;
      case "unlock":       return <><rect width="18" height="11" x="3" y="11" rx="2" {...p}/><path d="M7 11V7a5 5 0 0 1 9.9-1" {...p}/></>;
      case "download":     return <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" {...p}/><polyline points="7 10 12 15 17 10" {...p}/><line x1="12" y1="15" x2="12" y2="3" {...p}/></>;
      case "send":         return <><line x1="22" y1="2" x2="11" y2="13" {...p}/><polygon points="22 2 15 22 11 13 2 9 22 2" {...p}/></>;
      case "bell":         return <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" {...p}/><path d="M13.73 21a2 2 0 0 1-3.46 0" {...p}/></>;
      case "star":         return <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" {...p}/>;
      case "award":        return <><circle cx="12" cy="8" r="6" {...p}/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" {...p}/></>;
      case "scissors":     return <><circle cx="6" cy="6" r="3" {...p}/><circle cx="6" cy="18" r="3" {...p}/><line x1="20" y1="4" x2="8.12" y2="15.88" {...p}/><line x1="14.47" y1="14.48" x2="20" y2="20" {...p}/><line x1="8.12" y1="8.12" x2="12" y2="12" {...p}/></>;
      case "banknote":     return <><rect width="20" height="12" x="2" y="6" rx="2" {...p}/><circle cx="12" cy="12" r="2" {...p}/><path d="M6 12h.01M18 12h.01" {...p}/></>;
      case "creditCard":   return <><rect width="20" height="14" x="2" y="5" rx="2" {...p}/><line x1="2" y1="10" x2="22" y2="10" {...p}/></>;
      case "wallet":       return <><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" {...p}/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" {...p}/><path d="M18 12a2 2 0 0 0 0 4h4v-4z" {...p}/></>;
      case "logOut":       return <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" {...p}/><polyline points="16 17 21 12 16 7" {...p}/><line x1="21" y1="12" x2="9" y2="12" {...p}/></>;
      case "refresh":      return <><polyline points="23 4 23 10 17 10" {...p}/><polyline points="1 20 1 14 7 14" {...p}/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" {...p}/></>;
      case "image":        return <><rect width="18" height="18" x="3" y="3" rx="2" {...p}/><circle cx="9" cy="9" r="2" {...p}/><polyline points="21 15 16 10 5 21" {...p}/></>;
      case "zap":          return <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" {...p}/>;
      case "heart":        return <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" {...p}/>;
      case "sparkles":     return <><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" {...p}/><path d="M5 3v4" {...p}/><path d="M19 17v4" {...p}/><path d="M3 5h4" {...p}/><path d="M17 19h4" {...p}/></>;
      case "alertTriangle":return <><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" {...p}/><line x1="12" y1="9" x2="12" y2="13" {...p}/><line x1="12" y1="17" x2="12.01" y2="17" {...p}/></>;
      case "shield":       return <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" {...p}/>;
      case "camera":       return <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" {...p}/><circle cx="12" cy="13" r="4" {...p}/></>;
      case "trendingUp":   return <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" {...p}/><polyline points="17 6 23 6 23 12" {...p}/></>;
      case "sun":          return <><circle cx="12" cy="12" r="4" {...p}/><line x1="12" y1="2" x2="12" y2="4" {...p}/><line x1="12" y1="20" x2="12" y2="22" {...p}/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" {...p}/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" {...p}/><line x1="2" y1="12" x2="4" y2="12" {...p}/><line x1="20" y1="12" x2="22" y2="12" {...p}/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" {...p}/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" {...p}/></>;
      case "moon":         return <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" {...p}/>;
      default:             return <circle cx="12" cy="12" r="10" {...p}/>;
    }
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      xmlns="http://www.w3.org/2000/svg" style={{ flexShrink:0, display:"block" }}>
      {inner()}
    </svg>
  );
}

const s = {
  get app()    { return { minHeight:"100vh", background:G.bg, color:G.text, fontFamily:F.sans, maxWidth:430, margin:"0 auto", position:"relative", overflowX:"hidden" }; },
  screen: { minHeight:"100vh", paddingBottom:110, position:"relative", zIndex:1 },
  get topBar() { return { padding:`calc(env(safe-area-inset-top, 0px) + 20px) 28px 14px`, background:G.topBarBg, backdropFilter:"blur(28px) saturate(180%)", position:"sticky", top:0, zIndex:10, boxShadow:`0 0.5px 0 ${G.border}, 0 4px 20px ${G.shadow}` }; },
  get h1()     { return { fontFamily:F.display, fontWeight:400, fontSize:30, letterSpacing:"1px", color:G.text, margin:0, lineHeight:1.1 }; },
  get sub()    { return { fontFamily:F.sans, fontSize:12, color:G.muted, margin:"4px 0 0", fontWeight:400 }; },
  get eyebrow(){ return { fontFamily:F.sans, fontSize:10, letterSpacing:"0.18em", textTransform:"uppercase", color:`rgba(${G.greenRGB},${G.eyebrowOpacity||0.65})`, margin:"0 0 3px", fontWeight:500 }; },
  // Cards con jerarquía
  get card()   { return { background:G.card, border:`0.5px solid ${G.border}`, borderRadius:16, padding:"15px 17px", marginBottom:10, backdropFilter:"blur(12px)", transition:"all 0.2s", boxShadow:`0 2px 16px ${G.shadowMd}` }; },
  get cardHero(){ return { background:`linear-gradient(135deg, rgba(${G.greenRGB},0.15) 0%, rgba(${G.greenRGB},0.04) 100%)`, border:`1px solid rgba(${G.greenRGB},0.28)`, borderRadius:20, padding:"18px 20px", marginBottom:12, backdropFilter:"blur(16px)", boxShadow:`0 8px 32px ${G.shadow}, 0 0 0 0.5px rgba(${G.greenRGB},0.12) inset` }; },
  get cardSub(){ return { background:G.glass, border:`0.5px solid ${G.border}`, borderRadius:14, padding:"12px 14px", marginBottom:8, boxShadow:`0 1px 8px ${G.shadowSm}` }; },
  get input()  { return { background:G.glass, border:`0.5px solid ${G.border}`, borderRadius:11, padding:"13px 15px", color:G.text, fontFamily:F.sans, fontSize:15, width:"100%", outline:"none", boxSizing:"border-box", transition:"border-color 0.2s" }; },
  get label()  { return { fontFamily:F.sans, fontSize:12, color:G.muted, display:"block", marginBottom:6, fontWeight:500 }; },
  btnG:   { background:"linear-gradient(135deg, #90b850 0%, #6a9230 100%)", border:"none", borderRadius:13, padding:"14px 20px", color:"#0e1209", fontFamily:F.sans, fontSize:14, fontWeight:700, cursor:"pointer", width:"100%", maxWidth:420, display:"block", transition:"opacity 0.15s, transform 0.1s", letterSpacing:"0.02em", boxShadow:"0 4px 18px rgba(106,146,48,0.38), 0 1px 3px rgba(0,0,0,0.3)" },
  get btnGl()  { return { background:G.glass, border:`0.5px solid ${G.borderHov}`, borderRadius:12, padding:"10px 16px", color:G.text, fontFamily:F.sans, fontSize:13, fontWeight:500, cursor:"pointer", backdropFilter:"blur(10px)", transition:"all 0.2s", boxShadow:`0 2px 8px ${G.shadowSm}` }; },
  get btnRed() { return { background:"rgba(224,112,112,0.1)", border:`0.5px solid rgba(224,112,112,0.35)`, borderRadius:12, padding:"10px 16px", color:G.red, fontFamily:F.sans, fontSize:13, cursor:"pointer" }; },
  get tag()    { return { background:G.greenM, border:`0.5px solid rgba(${G.greenRGB},0.35)`, borderRadius:20, padding:"3px 11px", fontSize:11, color:G.greenL, fontFamily:F.sans, display:"inline-block", marginRight:5, marginBottom:3, fontWeight:500 }; },
  get div()    { return { height:"0.5px", background:G.border, margin:"16px 0" }; },
  get nav() { return { position:"fixed", bottom:"max(20px, env(safe-area-inset-bottom, 0px))", left:"50%", transform:"translateX(-50%)", width:"calc(100% - 32px)", maxWidth:398, background:G.navBg, backdropFilter:"blur(32px) saturate(200%)", border:`0.5px solid ${G.border}`, borderRadius:28, display:"flex", zIndex:20, padding:"10px 6px 10px", boxShadow:`0 8px 40px ${G.shadow}, 0 1px 0 rgba(255,255,255,0.06) inset` }; },
  get fab() { return { position:"fixed", bottom:"calc(max(20px, env(safe-area-inset-bottom, 0px)) + 70px)", right:18, width:54, height:54, borderRadius:"50%", background:"linear-gradient(135deg, #90b850 0%, #6a9230 100%)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 6px 24px rgba(106,146,48,0.5), 0 2px 8px rgba(0,0,0,0.4)`, zIndex:30, transition:"transform 0.15s" }; },
};

const navItmSty     = (active) => ({ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"6px 0", cursor:"pointer", color:active ? G.green : G.muted, transition:"color 0.18s, background 0.18s, box-shadow 0.18s", borderRadius:22, background:active ? `rgba(${G.greenRGB},0.13)` : "transparent", boxShadow:active ? `inset 0 2px 0 rgba(${G.greenRGB},0.55)` : "none" });
const sideNavItmSty = (active) => ({ display:"flex", flexDirection:"row", alignItems:"center", gap:10, padding:"10px 14px", cursor:"pointer", borderRadius:12, color:active ? G.green : G.muted, background:active ? `rgba(${G.greenRGB},0.13)` : "transparent", transition:"color 0.18s, background 0.18s", fontFamily:F.sans, fontSize:13, fontWeight:active ? 600 : 400 });

const GlobalStyles = () => (
  <style>{`
    @keyframes logoPulse {
      0%,100% { box-shadow:0 0 0 0 rgba(${G.greenRGB},0.4),0 0 24px rgba(${G.greenRGB},0.12); }
      50%      { box-shadow:0 0 0 14px rgba(${G.greenRGB},0),0 0 36px rgba(${G.greenRGB},0.2); }
    }
    @keyframes shimmer {
      0%   { background-position:-200% center; }
      100% { background-position:200% center; }
    }
    @keyframes fadeInUp {
      from { opacity:0; transform:translateY(10px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes slideInRight {
      from { transform:translateX(100%); }
      to   { transform:translateX(0); }
    }
    @keyframes slideInUp {
      from { opacity:0; transform:translateY(20px); }
      to   { opacity:1; transform:translateY(0); }
    }
    * { -webkit-tap-highlight-color:transparent; }
    body { background:${G.bg}; transition:background 0.3s; }
    input { background:${G.glass}; color:${G.text}; }
    input:focus { border-color:${G.green}88 !important; outline:none !important; box-shadow:0 0 0 3px ${G.greenM} !important; }
    textarea { background:${G.glass}; color:${G.text}; border:0.5px solid ${G.border}; border-radius:11px; padding:13px 15px; font-family:${F.sans}; font-size:14px; width:100%; box-sizing:border-box; outline:none; resize:vertical; transition:border-color 0.2s; }
    textarea:focus { border-color:${G.green}88 !important; box-shadow:0 0 0 3px ${G.greenM} !important; }
    select { background:${G.glass}; color:${G.text}; }
    select option { background:${G.bg}; color:${G.text}; }
    button:active { transform:scale(0.97) !important; }
    ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-track { background:transparent; } ::-webkit-scrollbar-thumb { background:${G.border}; border-radius:4px; }
    @keyframes fadeInTab {
      from { opacity:0; transform:translateY(6px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes scaleIn {
      from { opacity:0; transform:scale(0.95); }
      to   { opacity:1; transform:scale(1); }
    }
    @keyframes slideInFromRight {
      from { transform:translateX(100%); opacity:0.6; }
      to   { transform:translateX(0); opacity:1; }
    }
    @media (min-width: 681px) {
      .ls-wide-content > * { animation: fadeInTab 0.18s ease; }
    }
  `}</style>
);

// ── useData ────────────────────────────────────────────────────────────────────
function useData() {
  const [servicios, setServicios]     = useState([]);
  const [clientas, setClientas]       = useState([]);
  const [citas, setCitas]             = useState([]);
  const [excepciones, setExcepciones] = useState([]);
  const [bloques, setBloques]         = useState([]);
  const [config, setConfig]           = useState({});
  const [gastos, setGastos]           = useState([]);
  const [insumos, setInsumos]         = useState([]);
  const [loading, setLoading]         = useState(true);

  const recargar = useCallback(async () => {
    setLoading(true);
    const [sv, cl, ct, ex, bl, cfg, gs, ins] = await Promise.all([db.get("servicios"), db.get("clientas"), db.get("citas"), db.get("excepciones"), db.get("bloques"), db.getVal("config"), db.get("gastos"), db.get("insumos")]);
    setServicios(sv); setClientas(cl); setCitas(ct); setExcepciones(ex); setBloques(bl); setConfig(cfg || {}); setGastos(Array.isArray(gs) ? gs : []); setInsumos(Array.isArray(ins) ? ins : []);
    setLoading(false);
  }, []);

  const recargarSilent = useCallback(async () => {
    try {
      const [sv, cl, ct, ex, bl, cfg, gs, ins] = await Promise.all([db.get("servicios"), db.get("clientas"), db.get("citas"), db.get("excepciones"), db.get("bloques"), db.getVal("config"), db.get("gastos"), db.get("insumos")]);
      setServicios(sv); setClientas(cl); setCitas(ct); setExcepciones(ex); setBloques(bl); setConfig(cfg || {}); setGastos(Array.isArray(gs) ? gs : []); setInsumos(Array.isArray(ins) ? ins : []);
    } catch {}
  }, []);

  useEffect(() => { recargar(); }, []);

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") recargarSilent(); };
    document.addEventListener("visibilitychange", onVisible);
    const t = setInterval(recargarSilent, 15_000);
    return () => { document.removeEventListener("visibilitychange", onVisible); clearInterval(t); };
  }, [recargarSilent]);

  const getConfig  = (key, def) => config?.[key] ?? def;
  const saveConfig = async (key, val) => { await db.update("config", { [key]: val }); setConfig(p => ({ ...p, [key]: val })); };

  const crearServicio  = async (d)     => { const id = await db.push("servicios", d); setServicios(p => [...p, { ...d, _id:id }]); };
  const editarServicio = async (id, d) => { await db.set(`servicios/${id}`, d); setServicios(p => p.map(x => x._id === id ? { ...d, _id:id } : x)); };
  const borrarServicio = async (id)    => { await db.del(`servicios/${id}`); setServicios(p => p.filter(x => x._id !== id)); };

  const crearClientas = async (datos) => {
    if (!datos.email) {
      const id = await db.push("clientas", { ...datos, creadaEn:hoyISO() });
      setClientas(p => [...p, { ...datos, creadaEn:hoyISO(), _id:id, historial:[] }]);
      return { ok:true, noAccount:true };
    }
    const pass = genPass();
    const res  = await fbAuth.create(datos.email, pass);
    if (res.error) {
      const code = res.error.message || "";
      if (code.includes("EMAIL_EXISTS")) {
        // Check if we already have a RTDB entry for this email — avoid orphan duplicates
        const yaExiste = clientas.find(c => c.email?.toLowerCase() === datos.email.toLowerCase());
        if (yaExiste) {
          return { error: `Ya existe una clienta con ese email: "${yaExiste.nombre}". Buscala en el listado.` };
        }
        // Firebase Auth account exists but not in our CRM.
        // Delete old Firebase Auth account via admin endpoint, then recreate with a known password.
        const resetPass = genPass();
        let authEntry = {};
        try {
          const delRes = await fetch("/api/delete-auth-user", {
            method:"POST", headers:{"Content-Type":"application/json"},
            body:JSON.stringify({ email:datos.email }),
          }).then(r => r.json()).catch(() => ({}));
          if (delRes.ok) {
            const rec = await fbAuth.create(datos.email, resetPass);
            if (rec.localId) authEntry = { uid:rec.localId, authRefreshToken:rec.refreshToken };
          }
        } catch { /* FIREBASE_SERVICE_ACCOUNT might not be configured */ }
        const entry = { ...datos, appPass:resetPass, ...authEntry, creadaEn:hoyISO() };
        const id = await db.push("clientas", entry);
        setClientas(p => [...p, { ...entry, _id:id, historial:[] }]);
        return { ok:true, emailExists:!authEntry.uid, nombre:datos.nombre, pass:resetPass, email:datos.email };
      }
      return { error: res.error.message };
    }
    const id = await db.push("clientas", { ...datos, uid:res.localId, appPass:pass, authRefreshToken:res.refreshToken, creadaEn:hoyISO() });
    setClientas(p => [...p, { ...datos, uid:res.localId, appPass:pass, authRefreshToken:res.refreshToken, creadaEn:hoyISO(), _id:id, historial:[] }]);
    return { ok:true, pass, email:datos.email };
  };
  const editarClientas        = async (id, d) => { await db.update(`clientas/${id}`, d); setClientas(p => p.map(x => x._id === id ? { ...x, ...d } : x)); };
  const borrarClientas = async (id) => {
    const c = clientas.find(x => x._id === id);
    if (c?.email) {
      try {
        let idToken = null;
        if (c.authRefreshToken) {
          const ref = await fbAuth.refresh(c.authRefreshToken);
          if (ref.idToken) idToken = ref.idToken;
        }
        if (!idToken && c.appPass) {
          const si = await fbAuth.signIn(c.email, c.appPass);
          if (si.idToken) idToken = si.idToken;
        }
        if (idToken) {
          await fbAuth.deleteUser(idToken);
        } else {
          // Fallback: server-side admin deletion (needs FIREBASE_SERVICE_ACCOUNT env var)
          await fetch("/api/delete-auth-user", {
            method:"POST", headers:{"Content-Type":"application/json"},
            body:JSON.stringify({ email:c.email }),
          }).catch(() => {});
        }
      } catch { /* ignore */ }
    }
    await db.del(`clientas/${id}`);
    setClientas(p => p.filter(x => x._id !== id));
  };
  const resetPasswordClientas = async (email)  => { await fbAuth.resetPw(email); };

  const crearCita  = async (d)     => { const id = await db.push("citas", { ...d, creadaEn:hoyISO() }); setCitas(p => [...p, { ...d, creadaEn:hoyISO(), _id:id }]); return id; };
  const editarCita = async (id, d) => { await db.update(`citas/${id}`, d); setCitas(p => p.map(x => x._id === id ? { ...x, ...d } : x)); };
  const borrarCita = async (id)    => { await db.del(`citas/${id}`); setCitas(p => p.filter(x => x._id !== id)); };

  const crearBloque  = async (d)  => { const id = await db.push("bloques", d); setBloques(p => [...p, { ...d, _id:id }]); return id; };
  const borrarBloque = async (id) => { await db.del(`bloques/${id}`); setBloques(p => p.filter(x => x._id !== id)); };

  const registrarPago = async (clientaId, citaId, reg) => {
    await db.push(`clientas/${clientaId}/historial`, reg);
    await editarCita(citaId, { estado:"completada" });
    setClientas(p => p.map(c => {
      if (c._id !== clientaId) return c;
      const h = Array.isArray(c.historial) ? c.historial : (c.historial ? Object.values(c.historial) : []);
      return { ...c, historial:[...h, reg] };
    }));
  };

  const crearGasto  = async (d)     => { const id = await db.push("gastos", d); setGastos(p => [...p, { ...d, _id:id }]); };
  const editarGasto = async (id, d) => { await db.set(`gastos/${id}`, d); setGastos(p => p.map(x => x._id === id ? { ...d, _id:id } : x)); };
  const borrarGasto = async (id)    => { await db.del(`gastos/${id}`); setGastos(p => p.filter(x => x._id !== id)); };

  const crearInsumo  = async (d)     => { const id = await db.push("insumos", { ...d, creadoEn:hoyISO() }); setInsumos(p => [...p, { ...d, creadoEn:hoyISO(), _id:id }]); };
  const editarInsumo = async (id, d) => { await db.update(`insumos/${id}`, d); setInsumos(p => p.map(x => x._id === id ? { ...x, ...d } : x)); };
  const borrarInsumo = async (id)    => { await db.del(`insumos/${id}`); setInsumos(p => p.filter(x => x._id !== id)); };

  return { servicios, clientas, citas, excepciones, bloques, config, gastos, insumos, loading, recargar, recargarSilent, getConfig, saveConfig, crearServicio, editarServicio, borrarServicio, crearClientas, editarClientas, borrarClientas, resetPasswordClientas, crearCita, editarCita, borrarCita, registrarPago, crearBloque, borrarBloque, crearGasto, editarGasto, borrarGasto, crearInsumo, editarInsumo, borrarInsumo };
}

// ── Componentes UI comunes ─────────────────────────────────────────────────────
function Loader({ msg = "Cargando..." }) {
  return (
    <div style={{ minHeight:"100vh", background:G.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:18, position:"relative" }}>
      <GlobalStyles />
      <AppBg />
      <div style={{ width:120, height:120, borderRadius:"50%", animation:"logoPulse 2.5s ease-in-out infinite", zIndex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <img src="/logo.svg" alt="Lash Studio" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
      </div>
      <p style={{ fontFamily:F.sans, fontSize:12, color:G.muted, zIndex:1, letterSpacing:"0.08em" }}>{msg}</p>
    </div>
  );
}

function Avatar({ nombre = "?", size = 40 }) {
  const ini = (nombre || "?").split(" ").slice(0, 2).map(n => n[0] || "").join("").toUpperCase();
  return <div style={{ width:size, height:size, borderRadius:"50%", background:G.greenM, border:`1px solid rgba(143,189,90,0.4)`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:F.serif, fontWeight:700, fontSize:size * 0.3, color:G.greenL, flexShrink:0 }}>{ini}</div>;
}

function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2400); return () => clearTimeout(t); }, []);
  return (
    <div style={{ position:"fixed", bottom:110, left:"50%", transform:"translateX(-50%)", background:G.green, color:"#0a0a0a", borderRadius:13, padding:"11px 20px", fontFamily:F.sans, fontWeight:600, fontSize:13, zIndex:99, boxShadow:"0 4px 24px rgba(0,0,0,0.5)", whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:8 }}>
      <Icon name="check" size={15} color="#0a0a0a" strokeWidth={2.5} />
      {msg}
    </div>
  );
}

function Modal({ titulo, msg, onOk, onCancel, okLabel = "Confirmar", danger = false }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.82)", backdropFilter:"blur(10px)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ background:G.bg, border:`0.5px solid ${G.border}`, borderRadius:20, padding:24, width:"100%", maxWidth:360, boxShadow:"0 24px 48px rgba(0,0,0,0.6)" }}>
        <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:19, color:G.text, margin:"0 0 10px" }}>{titulo}</p>
        <p style={{ fontFamily:F.sans, fontSize:13, color:G.sub, margin:"0 0 22px", lineHeight:1.65 }}>{msg}</p>
        <div style={{ display:"flex", gap:10 }}>
          {onCancel && <button style={{ ...s.btnGl, flex:1 }} onClick={onCancel}>Cancelar</button>}
          <button style={{ ...s.btnG, flex:1, background:danger ? G.red : G.green }} onClick={onOk}>{okLabel}</button>
        </div>
      </div>
    </div>
  );
}

function Sheet({ titulo, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.86)", backdropFilter:"blur(10px)", zIndex:100, display:"flex", alignItems:"flex-end", justifyContent:"center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:G.bg, border:`0.5px solid ${G.border}`, borderRadius:"20px 20px 0 0", width:"100%", maxWidth:430, maxHeight:"92vh", overflowY:"auto", WebkitOverflowScrolling:"touch", overscrollBehavior:"contain", padding:"18px 20px 120px", boxShadow:"0 -8px 32px rgba(0,0,0,0.5)", animation:"slideInUp 0.32s cubic-bezier(0.4,0,0.2,1)" }}>
        <div style={{ width:36, height:4, background:G.border, borderRadius:2, margin:"0 auto 18px" }} />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:21, color:G.text, margin:0 }}>{titulo}</p>
          <button style={{ ...s.btnGl, padding:"7px 11px", display:"flex", alignItems:"center" }} onClick={onClose}>
            <Icon name="x" size={16} color={G.sub} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom:13 }}>
      <label style={s.label}>{label}</label>
      {children}
      {hint && <p style={{ fontFamily:F.sans, fontSize:11, color:G.muted, margin:"5px 0 0", lineHeight:1.5 }}>{hint}</p>}
    </div>
  );
}

function Chips({ options = [], value, onChange }) {
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)}
          style={{ ...s.btnGl, padding:"8px 14px", fontSize:13, background:value === o ? G.greenM : "transparent", borderColor:value === o ? G.green : G.border, color:value === o ? G.greenL : G.muted, fontWeight:value === o ? 700 : 400 }}>
          {o}
        </button>
      ))}
    </div>
  );
}

function Back({ onClick, label = "Volver" }) {
  return (
    <button onClick={onClick} style={{ ...s.btnGl, marginBottom:14, fontSize:13, display:"flex", alignItems:"center", gap:7 }}>
      <Icon name="arrowLeft" size={15} color={G.sub} />
      {label}
    </button>
  );
}

function PushBanner({ role, uid = null }) {
  const { status, subscribe, supported, loading } = usePushStatus(role, uid);
  const [dismissed, setDismissed] = useState(false);
  if (!supported || status === "subscribed" || status === "granted" || dismissed) return null;
  const denied = status === "denied";
  return (
    <div style={{ ...s.card, display:"flex", alignItems:"flex-start", gap:12, marginBottom:14,
      background:`rgba(${G.greenRGB},0.05)`, borderColor:`rgba(${G.greenRGB},0.22)` }}>
      <Icon name="bell" size={20} color={denied ? G.muted : G.green} strokeWidth={1.5} style={{ flexShrink:0, marginTop:2 }} />
      <div style={{ flex:1 }}>
        <p style={{ margin:"0 0 3px", fontFamily:F.serif, fontWeight:700, fontSize:13, color:G.text }}>
          {denied ? "Notificaciones bloqueadas" : "Activar notificaciones"}
        </p>
        <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.sub, lineHeight:1.6 }}>
          {denied
            ? <>Chrome/Android: candado en barra → Notificaciones → Permitir.<br/>Safari/iOS: Ajustes → Safari → Notificaciones → Permitir.</>
            : "Recibí alertas aunque tengas la app cerrada"}
        </p>
      </div>
      <div style={{ display:"flex", gap:6, alignItems:"center", flexShrink:0 }}>
        {!denied && (
          <button style={{ ...s.btnG, width:"auto", padding:"8px 14px", fontSize:12, opacity:loading?0.6:1 }} onClick={subscribe} disabled={loading}>
            {loading ? "Activando..." : "Activar"}
          </button>
        )}
        <button style={{ background:"transparent", border:"none", cursor:"pointer", color:G.muted, padding:"4px 6px", fontSize:16, lineHeight:1 }} onClick={() => setDismissed(true)}>✕</button>
      </div>
    </div>
  );
}

// ── Login ──────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [modo, setModo]         = useState(null);
  const [email, setEmail]       = useState("");
  const [pass, setPass]         = useState("");
  const [err, setErr]           = useState("");
  const [loading, setLoading]   = useState(false);
  const [recordar, setRecordar] = useState(true);
  const { dark, toggleTheme }   = useTheme();

  useEffect(() => {
    const g = localStorage.getItem("ls_session");
    if (!g) return;
    try {
      const p = JSON.parse(g);
      if (p.expiry <= Date.now()) return;
      const rt = p.data?.refreshToken || p.data?.authRefreshToken;
      if (rt) {
        fbAuth.refresh(rt).then(r => {
          if (r.idToken) db.setAuth(r.idToken, r.refreshToken || rt);
          onLogin(p.tipo, p.data);
        }).catch(() => { localStorage.removeItem("ls_session"); });
      } else {
        localStorage.removeItem("ls_session");
      }
    } catch {}
  }, []);

  const guardar = (tipo, data = null) => {
    if (recordar) localStorage.setItem("ls_session", JSON.stringify({ tipo, data, expiry:Date.now() + 1000 * 60 * 60 * 24 * 30 }));
  };

  const entrar = async () => {
    if (!email || !pass) { setErr("Completá los campos"); return; }
    setLoading(true); setErr("");
    const r = await fbAuth.signIn(email, pass);
    if (r.error) { setErr("Email o contraseña incorrectos"); setLoading(false); return; }
    db.setAuth(r.idToken, r.refreshToken);
    if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      guardar("admin", { refreshToken: r.refreshToken }); onLogin("admin");
    } else {
      const todas = await db.get("clientas");
      const c = todas.find(x => x.email?.toLowerCase() === email.toLowerCase());
      if (!c) { setErr("Cuenta no encontrada"); setLoading(false); return; }
      const hist = c.historial ? Object.values(c.historial) : [];
      const d = { ...c, historial:hist };
      guardar("clienta", d); onLogin("clienta", d);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:G.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:28, position:"relative" }}>
      <GlobalStyles />
      <AppBg />
      <button onClick={toggleTheme} style={{ position:"absolute", top:20, right:20, background:"transparent", border:`0.5px solid ${G.border}`, borderRadius:10, padding:"7px 10px", cursor:"pointer", display:"flex", alignItems:"center", color:G.muted, zIndex:10 }}>
        <Icon name={dark ? "sun" : "moon"} size={16} color={G.muted} />
      </button>
      <div style={{ textAlign:"center", marginBottom:44, zIndex:1, animation:"fadeInUp 0.6s ease both" }}>
        <img src="/logo.svg" alt="Lash Studio" style={{ width:140, height:140, objectFit:"contain", display:"block", margin:"0 auto 16px" }} />
        <p style={{ fontFamily:F.sans, fontSize:11, color:G.green, margin:"0 0 8px", letterSpacing:"0.12em", textTransform:"uppercase", textAlign:"center" }}>by chulas</p>
        <p style={{ fontFamily:F.sans, fontSize:11, color:G.muted, letterSpacing:"0.14em", textTransform:"uppercase", textAlign:"center" }}>San Andrés · Buenos Aires</p>
      </div>
      {!modo ? (
        <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:11, zIndex:1, animation:"fadeInUp 0.6s 0.15s ease both", opacity:0 }}>
          <p style={{ fontFamily:F.sans, fontSize:11, color:G.muted, textAlign:"center", marginBottom:4, letterSpacing:"0.12em", textTransform:"uppercase" }}>Acceder como</p>
          {/* Clienta primero — cardHero para el "charm" de bienvenida */}
          <div style={{ ...s.cardHero, cursor:"pointer", display:"flex", alignItems:"center", gap:16, padding:"20px" }}
            onClick={() => setModo("clienta")}>
            <div style={{ width:48, height:48, borderRadius:14, background:`rgba(${G.greenRGB},0.18)`, border:`1px solid rgba(${G.greenRGB},0.35)`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:`0 4px 12px rgba(${G.greenRGB},0.2)` }}>
              <Icon name="heart" size={22} color={G.greenL} />
            </div>
            <div>
              <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:17, color:G.text, margin:"0 0 3px" }}>Soy Clienta</p>
              <p style={{ ...s.sub, fontSize:12 }}>Ver mis turnos y reservar</p>
            </div>
            <Icon name="chevronRight" size={16} color={G.greenD} style={{ marginLeft:"auto" }} />
          </div>
          {/* Lashista — card estándar */}
          <div style={{ ...s.card, cursor:"pointer", display:"flex", alignItems:"center", gap:16, padding:"18px" }}
            onClick={() => { setModo("admin"); setEmail(ADMIN_EMAIL); }}>
            <div style={{ width:48, height:48, borderRadius:14, background:G.glass, border:`0.5px solid ${G.border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Icon name="sparkles" size={22} color={G.sub} />
            </div>
            <div>
              <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:17, color:G.text, margin:"0 0 3px" }}>Lashista</p>
              <p style={{ ...s.sub, fontSize:12 }}>Panel de administración</p>
            </div>
            <Icon name="chevronRight" size={16} color={G.muted} style={{ marginLeft:"auto" }} />
          </div>
        </div>
      ) : (
        <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:11, zIndex:1 }}>
          <button onClick={() => { setModo(null); setErr(""); setEmail(""); setPass(""); }}
            style={{ ...s.btnGl, alignSelf:"flex-start", marginBottom:6, display:"flex", alignItems:"center", gap:7 }}>
            <Icon name="arrowLeft" size={14} color={G.sub} />
            Volver
          </button>
          <span style={{ ...s.tag, alignSelf:"center" }}>{modo === "admin" ? "Panel lashista" : "Mi espacio"}</span>
          <Field label="Email">
            <input style={s.input} value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" type="email" autoComplete="username" />
          </Field>
          <Field label="Contraseña">
            <input style={s.input} value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••" type="password" autoComplete="current-password" onKeyDown={e => e.key === "Enter" && entrar()} />
          </Field>
          <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }} onClick={() => setRecordar(r => !r)}>
            <div style={{ width:19, height:19, borderRadius:6, border:`1.5px solid ${recordar ? G.green : G.border}`, background:recordar ? G.greenM : "transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.2s" }}>
              {recordar && <Icon name="check" size={11} color={G.green} strokeWidth={3} />}
            </div>
            <p style={{ ...s.sub, margin:0, fontSize:12, color:G.sub }}>Mantener sesión iniciada</p>
          </div>
          {err && <p style={{ color:G.red, fontSize:13, textAlign:"center", fontFamily:F.sans }}>{err}</p>}
          <button style={{ ...s.btnG, opacity:loading ? 0.6 : 1 }} onClick={entrar} disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar →"}
          </button>
        </div>
      )}
      <div style={{ marginTop:36, display:"flex", flexDirection:"column", alignItems:"center", gap:9, zIndex:1 }}>
        <p style={{ ...s.sub, color:G.muted, fontSize:12 }}>
          Consultas →{" "}
          <span style={{ color:G.green, cursor:"pointer" }} onClick={() => openWA()}>WhatsApp</span>
        </p>
        <p style={{ ...s.sub, color:G.muted, fontSize:12 }}>
          ¿Primera vez? →{" "}
          <span style={{ color:G.green, cursor:"pointer" }} onClick={() => openWA("Hola! Quiero registrarme en Lash Studio")}>Registrate acá</span>
        </p>
      </div>
    </div>
  );
}

// ── App Root ───────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [dark, setDark] = useState(() => localStorage.getItem("ls_theme") === "dark");
  const data = useData();

  Object.assign(G, dark ? G_dark : G_light);

  const login  = (tipo, d = null) => { setSession({ tipo, data:d }); data.recargar(); };
  const logout = () => { localStorage.removeItem("ls_session"); _fbAuthToken = null; _fbRefreshToken = null; if (_fbTokenTimer) { clearTimeout(_fbTokenTimer); _fbTokenTimer = null; } setSession(null); };
  const toggleTheme = () => {
    const nd = !dark;
    Object.assign(G, nd ? G_dark : G_light);
    localStorage.setItem("ls_theme", nd ? "dark" : "light");
    setDark(nd);
  };

  const content = !session ? <Login onLogin={login} /> :
    session.tipo === "admin"   ? <AdminApp   data={data} onLogout={logout} /> :
    session.tipo === "clienta" ? <ClientaApp clienta={session.data} data={data} onLogout={logout} /> : null;

  return <ThemeCtx.Provider value={{ dark, toggleTheme }}>{content}</ThemeCtx.Provider>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN APP
// ═══════════════════════════════════════════════════════════════════════════════
function AdminApp({ data, onLogout }) {
  const [tab, setTab]     = useState("inicio");
  const [stack, setStack] = useState([]);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const wide = useIsWide();

  const push = (screen, props = {}) => {
    if (wide) setModal({ screen, props });
    else {
      history.pushState({ lashNav:true }, "");
      setStack(p => [...p, { screen, props }]);
    }
  };
  const pop = () => {
    if (wide) setModal(null);
    else setStack(p => p.slice(0, -1));
  };
  useEffect(() => {
    const handlePopState = () => setStack(p => p.length > 0 ? p.slice(0, -1) : p);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
  const shwToast = (msg) => setToast(msg);
  const cur      = stack[stack.length - 1];

  const renderModalContent = (screen, props) => {
    const p = { ...props, pop, push, data, toast:shwToast, onLogout };
    switch (screen) {
      case "cita-detalle":    return <CitaDetalle    {...p} />;
      case "nueva-cita":      return <NuevaCita      {...p} />;
      case "clienta-detalle": return <ClientaDetalle {...p} />;
      default: return null;
    }
  };

  const navItems = [
    { id:"inicio",   iconName:"home",     label:"Inicio"    },
    { id:"agenda",   iconName:"calendar", label:"Agenda"    },
    { id:"clientas", iconName:"users",    label:"Clientas"  },
    { id:"finanzas", iconName:"barChart", label:"Finanzas"  },
    { id:"config",   iconName:"settings", label:"Config"    },
  ];

  const renderScreen = () => {
    if (cur) {
      const p = { ...cur.props, pop, push, data, toast:shwToast, onLogout };
      switch (cur.screen) {
        case "clienta-detalle": return <ClientaDetalle {...p} />;
        case "nueva-cita":      return <NuevaCita      {...p} />;
        case "cita-detalle":    return <CitaDetalle     {...p} />;
        default: return null;
      }
    }
    const p = { push, data, toast:shwToast, onLogout };
    switch (tab) {
      case "inicio":   return <AdminInicio   {...p} setTab={setTab} />;
      case "agenda":   return <AdminAgenda   {...p} />;
      case "clientas": return <AdminClientas {...p} />;
      case "finanzas": return <AdminFinanzas {...p} />;
      case "config":   return <AdminConfig   {...p} />;
      default:         return <AdminInicio   {...p} setTab={setTab} />;
    }
  };

  if (data.loading) return <Loader />;

  if (wide) {
    return (
      <div style={{ height:"100vh", background:G.bg, color:G.text, fontFamily:F.sans, display:"flex", flexDirection:"row", overflow:"hidden" }}>
        <GlobalStyles />
        <AppBg />
        {/* Sidebar nav */}
        <nav style={{ width:240, flexShrink:0, background:G.navBg, backdropFilter:"blur(32px)", borderRight:`0.5px solid ${G.border}`, display:"flex", flexDirection:"column", padding:"28px 14px 24px", gap:2, height:"100vh", overflowY:"auto", zIndex:20 }}>
          <img src="/logo.svg" alt="Lash Studio" style={{ width:110, height:110, objectFit:"contain", display:"block", marginBottom:16, flexShrink:0 }} />
          {navItems.map(n => (
            <div key={n.id} style={{ ...sideNavItmSty(tab === n.id && !cur), padding:"12px 16px", fontSize:14 }} onClick={() => { setStack([]); setTab(n.id); }}>
              <Icon name={n.iconName} size={18} color={tab===n.id && !cur ? G.green : G.muted} strokeWidth={tab===n.id && !cur ? 1.8 : 1.5} />
              <span>{n.label}</span>
            </div>
          ))}
          <div style={{ flex:1 }} />
          <button style={{ ...s.btnG, maxWidth:"100%", fontSize:13 }} onClick={() => push("nueva-cita")}>+ Nuevo turno</button>
          <button style={{ ...s.btnRed, maxWidth:"100%", fontSize:12, marginTop:8, display:"flex", alignItems:"center", justifyContent:"center", gap:7 }} onClick={onLogout}>
            <Icon name="logOut" size={14} color={G.red} /> Cerrar sesión
          </button>
        </nav>
        {/* Content */}
        <div style={{ flex:1, overflowY:"auto", position:"relative", minWidth:0, paddingBottom:40 }} className="ls-wide-content">
          {renderScreen()}
        </div>
        {/* PC Drawer */}
        {modal && (
          <div style={{ position:"fixed", inset:0, zIndex:100 }}>
            <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.38)", backdropFilter:"blur(2px)" }} onClick={() => setModal(null)} />
            <div style={{ position:"absolute", top:0, right:0, width:520, height:"100%", background:G.bg, borderLeft:`0.5px solid ${G.border}`, overflowY:"auto", zIndex:1, boxShadow:"-8px 0 32px rgba(0,0,0,0.3)", animation:"slideInRight 0.22s ease" }}>
              {renderModalContent(modal.screen, modal.props)}
            </div>
          </div>
        )}
        {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
      </div>
    );
  }

  return (
    <div style={s.app}>
      <GlobalStyles />
      <AppBg />
      <div key={cur ? `${cur.screen}:${cur.props?.cita?._id || cur.props?.clienta?._id || ""}` : tab} style={{ ...s.screen, ...(cur ? { animation:"slideInFromRight 0.28s cubic-bezier(0.4,0,0.2,1)" } : { animation:"fadeInTab 0.18s ease" }) }}>{renderScreen()}</div>
      {!cur && (
        <button style={s.fab} onClick={() => setTab("agenda")} title="Ir a agenda">
          <Icon name="calendarPlus" size={22} color="#0a0a0a" strokeWidth={1.9} />
        </button>
      )}
      {!cur && (
        <nav style={s.nav}>
          {navItems.map(n => (
            <div key={n.id} style={{ ...navItmSty(tab === n.id), position:"relative" }} onClick={() => setTab(n.id)}>
              {tab === n.id && <div style={{ position:"absolute", top:6, width:16, height:3, borderRadius:2, background:G.green, opacity:0.8 }} />}
              <Icon name={n.iconName} size={20} color={tab === n.id ? G.green : G.muted} strokeWidth={tab === n.id ? 1.8 : 1.5} />
              <span style={{ fontFamily:F.sans, fontSize:9, letterSpacing:"0.06em", fontWeight:tab === n.id ? 600 : 400 }}>{n.label}</span>
            </div>
          ))}
        </nav>
      )}
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  );
}

// ── Admin Inicio ───────────────────────────────────────────────────────────────
function SolicitudCard({ cita, data, toast, push }) {
  const [loading, setLoading] = useState(false);
  const confirmar = async () => {
    setLoading(true);
    await data.editarCita(cita._id, { estado:"confirmada" });
    if (cita.clientaUid) sendPush([`clienta:${cita.clientaUid}`], "¡Tu turno está confirmado! 🌿", `${cita.servicio} · ${fmtFecha(cita.fecha)} a las ${cita.hora}`);
    toast("✓ turno confirmado"); setLoading(false);
  };
  const rechazar = async () => {
    setLoading(true);
    await data.borrarCita(cita._id);
    if (cita.clientaUid) sendPush([`clienta:${cita.clientaUid}`], "Tu solicitud no pudo confirmarse", "Ese horario no está disponible. Pedí otra fecha.");
    toast("solicitud rechazada"); setLoading(false);
  };
  return (
    <div style={{ ...s.card, borderColor:"rgba(224,184,112,0.35)", background:"rgba(224,184,112,0.05)", marginBottom:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ margin:"0 0 2px", fontFamily:F.serif, fontSize:14, color:G.white }}>{cita.clientaNombre}</p>
          <p style={{ margin:"0 0 2px", fontFamily:F.sans, fontSize:12, color:G.sub }}>{cita.servicio}</p>
          <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>{fmtFecha(cita.fecha)} · {cita.hora}{cita.notas ? ` · ${cita.notas}` : ""}</p>
        </div>
        <button style={{ ...s.btnGl, marginLeft:10, padding:"5px 9px", fontSize:11, flexShrink:0 }}
          onClick={() => push("cita-detalle", { cita })}>ver →</button>
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <button style={{ ...s.btnG, flex:1, padding:"8px 10px", fontSize:12, opacity:loading?0.6:1 }}
          onClick={confirmar} disabled={loading}>✓ confirmar</button>
        <button style={{ ...s.btnRed, flex:1, padding:"8px 10px", fontSize:12, opacity:loading?0.6:1 }}
          onClick={rechazar} disabled={loading}>✕ rechazar</button>
      </div>
    </div>
  );
}

function AdminInicio({ data, push, setTab, toast }) {
  const hoy = hoyISO();
  const mes = mesISO();
  const { dark, toggleTheme } = useTheme();
  const wide = useIsWide();
  const citasHoy    = data.citas.filter(c => c.fecha === hoy && c.estado !== "completada");
  const proximas    = data.citas.filter(c => c.fecha > hoy && c.estado !== "completada").sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora)).slice(0, 6);
  const todoHist    = data.clientas.flatMap(c => Array.isArray(c.historial) ? c.historial : (c.historial ? Object.values(c.historial) : []));
  const ingresosMes = todoHist.filter(h => h.fecha?.startsWith(mes)).reduce((a, h) => a + (h.monto || 0), 0);
  const estudio     = data.getConfig("estudio", {});

  const sinCita = data.clientas.filter(c => {
    if (c.estado === "pausada") return false;
    const h = Array.isArray(c.historial) ? c.historial : (c.historial ? Object.values(c.historial) : []);
    if (!h.length) return false;
    const ult = [...h].sort((a, b) => b.fecha?.localeCompare(a.fecha))[0];
    if (!ult?.fecha) return false;
    const dias = Math.floor((new Date() - new Date(ult.fecha)) / (1000 * 60 * 60 * 24));
    const tieneProx = data.citas.some(ci => ci.clientaId === c._id && ci.fecha >= hoy && ci.estado !== "completada");
    return dias >= 14 && !tieneProx;
  });

  const topSv = (() => {
    const cnt = {};
    todoHist.filter(h => h.fecha?.startsWith(mes)).forEach(h => { cnt[h.servicio] = (cnt[h.servicio] || 0) + 1; });
    return Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 3);
  })();

  return (
    <div>
      <div style={s.topBar}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <p style={s.eyebrow}>panel lashista</p>
            <h1 style={s.h1}>{estudio.nombre || "Lash Studio"}</h1>
            <p style={s.sub}>{new Date().toLocaleDateString("es-AR", { weekday:"long", day:"numeric", month:"long" })}</p>
          </div>
          <button onClick={toggleTheme} style={{ background:"transparent", border:`0.5px solid ${G.border}`, borderRadius:10, padding:"7px 10px", cursor:"pointer", display:"flex", alignItems:"center", color:G.muted, marginTop:4 }}>
            <Icon name={dark ? "sun" : "moon"} size={16} color={G.muted} />
          </button>
        </div>
      </div>
      <div style={{ padding:wide ? "24px 32px 0" : "18px 18px 0" }}>
        <PushBanner role="admin" />
        <div style={{ display:"grid", gridTemplateColumns:wide ? "2fr 1fr 1fr 1fr" : "1fr 1fr", gap:10, marginBottom:18 }}>
          <div onClick={() => setTab("finanzas")} style={{ ...s.cardHero, cursor:"pointer", margin:0, padding:"16px 14px", gridColumn:wide ? "1" : "1 / -1" }}>
            <p style={{ fontFamily:F.sans, fontSize:9, color:G.sub, margin:"0 0 4px", textTransform:"uppercase", letterSpacing:"0.14em" }}>ingresos del mes</p>
            <p style={{ fontFamily:F.display, fontWeight:400, fontSize:32, letterSpacing:"1px", color:G.greenL, margin:"0 0 2px", lineHeight:1.1 }}>{fmtPesos(ingresosMes)}</p>
            <p style={{ fontFamily:F.sans, fontSize:10, color:G.muted, margin:0 }}>{todoHist.filter(h => h.fecha?.startsWith(mes)).length} servicios este mes</p>
          </div>
          <div onClick={() => setTab("agenda")} style={{ ...s.card, cursor:"pointer", margin:0, padding:"14px 12px", textAlign:"center" }}>
            <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:"0 0 4px", textTransform:"uppercase", letterSpacing:"0.1em" }}>hoy</p>
            <p style={{ fontFamily:F.display, fontWeight:400, fontSize:28, letterSpacing:"1px", color:G.white, margin:"0 0 2px", lineHeight:1.1 }}>{citasHoy.length}</p>
            <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:0 }}>{data.citas.filter(c => c.fecha === hoy).length} citas</p>
          </div>
          <div onClick={() => setTab("clientas")} style={{ ...s.card, cursor:"pointer", margin:0, padding:"14px 12px", textAlign:"center" }}>
            <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:"0 0 4px", textTransform:"uppercase", letterSpacing:"0.1em" }}>clientas</p>
            <p style={{ fontFamily:F.display, fontWeight:400, fontSize:28, letterSpacing:"1px", color:G.white, margin:"0 0 2px", lineHeight:1.1 }}>{data.clientas.length}</p>
            <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:0 }}>registradas</p>
          </div>
          {wide && (
            <div onClick={() => setTab("agenda")} style={{ ...s.card, cursor:"pointer", margin:0, padding:"14px 12px", textAlign:"center" }}>
              <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:"0 0 4px", textTransform:"uppercase", letterSpacing:"0.1em" }}>próximas</p>
              <p style={{ fontFamily:F.display, fontWeight:400, fontSize:28, letterSpacing:"1px", color:G.green, margin:"0 0 2px", lineHeight:1.1 }}>{data.citas.filter(c => c.fecha > hoy && c.estado !== "completada").length}</p>
              <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:0 }}>confirmadas</p>
            </div>
          )}
        </div>

        {/* Solicitudes pendientes inbox */}
        {(() => {
          const solicitudes = data.citas.filter(c => c.estado === "solicitada").sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
          if (!solicitudes.length) return null;
          return (
            <>
              <p style={{ fontFamily:F.display, fontWeight:400, fontSize:19, letterSpacing:"0.5px", color:G.amber, margin:"0 0 10px" }}>
                {solicitudes.length} solicitud{solicitudes.length > 1 ? "es" : ""} pendiente{solicitudes.length > 1 ? "s" : ""}
              </p>
              {solicitudes.map(c => <SolicitudCard key={c._id} cita={c} data={data} toast={toast} push={push} />)}
              <div style={s.div} />
            </>
          );
        })()}
        {/* Upcoming birthdays widget */}
        {(() => {
          const cumplesSemana = data.clientas.filter(c => {
            if (!c.fechaNacimiento) return false;
            const hoyStr = hoyISO();
            const [, mm, dd] = c.fechaNacimiento.split("-");
            const anio = parseInt(hoyStr.slice(0,4));
            let bd = `${anio}-${mm}-${dd}`;
            if (bd < hoyStr) bd = `${anio+1}-${mm}-${dd}`;
            const d = Math.ceil((new Date(bd+"T12:00:00") - new Date(hoyStr+"T12:00:00")) / (1000*60*60*24));
            return d <= 7;
          }).sort((a, b) => {
            const hoyStr = hoyISO();
            const toD = fnac => { const [,mm,dd]=fnac.split("-"); const an=parseInt(hoyStr.slice(0,4)); let bd=`${an}-${mm}-${dd}`; if(bd<hoyStr)bd=`${an+1}-${mm}-${dd}`; return Math.ceil((new Date(bd+"T12:00:00")-new Date(hoyStr+"T12:00:00"))/(1000*60*60*24)); };
            return toD(a.fechaNacimiento) - toD(b.fechaNacimiento);
          });
          if (!cumplesSemana.length) return null;
          return (
            <div style={{ ...s.card, marginBottom:14, borderColor:"rgba(245,200,66,0.35)", background:"rgba(245,200,66,0.06)" }}>
              <p style={{ ...s.eyebrow, color:"#f5c842", marginBottom:8 }}>🎂 cumpleaños próximos</p>
              {cumplesSemana.map(c => {
                const hoyStr = hoyISO();
                const [, mm, dd] = c.fechaNacimiento.split("-");
                const anio = parseInt(hoyStr.slice(0,4));
                let bd = `${anio}-${mm}-${dd}`;
                if (bd < hoyStr) bd = `${anio+1}-${mm}-${dd}`;
                const d = Math.ceil((new Date(bd+"T12:00:00") - new Date(hoyStr+"T12:00:00")) / (1000*60*60*24));
                return (
                  <div key={c._id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingBottom:6, marginBottom:6, borderBottom:`0.5px solid ${G.border}` }}>
                    <p style={{ margin:0, fontFamily:F.sans, fontSize:13, color:G.text }}>{c.nombre}</p>
                    <span style={{ fontFamily:F.sans, fontSize:11, color:"#f5c842" }}>{d===0?"¡hoy! 🎂":`en ${d} día${d!==1?"s":""}`}</span>
                  </div>
                );
              })}
            </div>
          );
        })()}
        {/* Pipeline row */}
        {(() => {
          const solicitadas  = data.citas.filter(c => c.fecha === hoy && c.estado === "solicitada").length;
          const confirmadas  = data.citas.filter(c => c.fecha === hoy && c.estado === "confirmada").length;
          const completadas  = data.citas.filter(c => c.fecha === hoy && c.estado === "completada").length;
          return (solicitadas + confirmadas + completadas) > 0 ? (
            <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
              {solicitadas > 0 && <span style={{ ...s.tag, background:"rgba(224,184,112,0.15)", borderColor:"rgba(224,184,112,0.4)", color:G.amber }}>{solicitadas} pendiente{solicitadas > 1 ? "s" : ""}</span>}
              {confirmadas > 0 && <span style={s.tag}>{confirmadas} confirmada{confirmadas > 1 ? "s" : ""}</span>}
              {completadas > 0 && <span style={{ ...s.tag, background:"rgba(240,240,240,0.06)", borderColor:G.border, color:G.muted }}>{completadas} completada{completadas > 1 ? "s" : ""}</span>}
            </div>
          ) : null;
        })()}
        <p style={{ fontFamily:F.display, fontWeight:400, fontSize:19, letterSpacing:"0.5px", color:G.white, margin:"0 0 10px" }}>citas de hoy</p>
        {citasHoy.length === 0
          ? <p style={{ color:G.muted, fontSize:13, marginBottom:14 }}>Sin citas para hoy</p>
          : citasHoy.map(c => (
            <div key={c._id} style={{ ...s.card, display:"flex", gap:12, alignItems:"center", cursor:"pointer" }} onClick={() => push("cita-detalle", { cita:c })}>
              <div style={{ background:G.greenM, border:`0.5px solid ${G.green}`, borderRadius:9, padding:"7px 10px", textAlign:"center", minWidth:48 }}>
                <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:14, color:G.greenL }}>{c.hora}</p>
              </div>
              <div style={{ flex:1 }}>
                <p style={{ margin:"0 0 2px", fontFamily:F.serif, fontSize:14 }}>{c.clientaNombre}</p>
                <p style={{ margin:0, ...s.sub, fontSize:11 }}>{c.servicio}</p>
              </div>
              <span style={s.tag}>{c.estado}</span>
            </div>
          ))
        }

        {!wide && <div style={s.div} />}
        {wide ? (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginTop:8 }}>
            <div>
              <p style={{ fontFamily:F.display, fontWeight:400, fontSize:17, letterSpacing:"0.5px", color:G.white, margin:"0 0 10px" }}>próximas</p>
              {proximas.length === 0
                ? <p style={{ color:G.muted, fontSize:13 }}>Sin citas agendadas</p>
                : proximas.slice(0, 3).map(c => (
                  <div key={c._id} style={{ ...s.card, display:"flex", gap:12, alignItems:"center", cursor:"pointer" }} onClick={() => push("cita-detalle", { cita:c })}>
                    <div style={{ textAlign:"center", minWidth:44 }}>
                      <p style={{ margin:0, fontFamily:F.sans, fontSize:10, color:G.muted }}>{c.fecha?.slice(5).replace("-", "/")}</p>
                      <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.green }}>{c.hora}</p>
                    </div>
                    <div style={{ flex:1 }}><p style={{ margin:"0 0 2px", fontFamily:F.serif, fontSize:13 }}>{c.clientaNombre}</p><p style={{ margin:0, ...s.sub, fontSize:11 }}>{c.servicio}</p></div>
                  </div>
                ))
              }
              <button style={{ ...s.btnG, marginTop:8 }} onClick={() => setTab("agenda")}>ver agenda →</button>
            </div>
            <div>
              <p style={{ fontFamily:F.display, fontWeight:400, fontSize:17, letterSpacing:"0.5px", color:G.white, margin:"0 0 10px" }}>hoy</p>
              {citasHoy.length === 0
                ? <p style={{ color:G.muted, fontSize:13 }}>Sin citas para hoy</p>
                : citasHoy.slice(0, 3).map(c => (
                  <div key={c._id} style={{ ...s.card, display:"flex", gap:12, alignItems:"center", cursor:"pointer" }} onClick={() => push("cita-detalle", { cita:c })}>
                    <div style={{ background:G.greenM, border:`0.5px solid ${G.green}`, borderRadius:9, padding:"6px 10px", textAlign:"center", minWidth:48 }}>
                      <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:14, color:G.greenL }}>{c.hora}</p>
                    </div>
                    <div style={{ flex:1 }}><p style={{ margin:"0 0 2px", fontFamily:F.serif, fontSize:13 }}>{c.clientaNombre}</p><p style={{ margin:0, ...s.sub, fontSize:11 }}>{c.servicio}</p></div>
                    <span style={s.tag}>{c.estado}</span>
                  </div>
                ))
              }
              <button style={{ ...s.btnG, marginTop:8 }} onClick={() => setTab("agenda")}>ver agenda completa →</button>
            </div>
          </div>
        ) : (
          <>
            <p style={{ fontFamily:F.display, fontWeight:400, fontSize:19, letterSpacing:"0.5px", color:G.white, margin:"0 0 3px" }}>próximas</p>
            <p style={{ ...s.sub, marginBottom:12 }}>turnos confirmados</p>
            {proximas.length === 0
              ? <p style={{ color:G.muted, fontSize:13 }}>Sin citas agendadas</p>
              : proximas.map(c => (
                <div key={c._id} style={{ ...s.card, display:"flex", gap:12, alignItems:"center", cursor:"pointer" }} onClick={() => push("cita-detalle", { cita:c })}>
                  <div style={{ textAlign:"center", minWidth:40 }}>
                    <p style={{ margin:0, fontFamily:F.sans, fontSize:10, color:G.muted }}>{c.fecha?.slice(5).replace("-", "/")}</p>
                    <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:14, color:G.green }}>{c.hora}</p>
                  </div>
                  <div style={{ flex:1 }}><p style={{ margin:"0 0 2px", fontFamily:F.serif, fontSize:13 }}>{c.clientaNombre}</p><p style={{ margin:0, ...s.sub, fontSize:11 }}>{c.servicio}</p></div>
                </div>
              ))
            }
            <button style={{ ...s.btnG, marginTop:10 }} onClick={() => setTab("agenda")}>ver agenda completa →</button>
          </>
        )}

        {sinCita.length > 0 && (
          <>
            <div style={s.div} />
            <p style={{ fontFamily:F.display, fontWeight:400, fontSize:19, letterSpacing:"0.5px", color:G.amber, margin:"0 0 3px" }}>pendientes de service</p>
            <p style={{ ...s.sub, marginBottom:12 }}>{sinCita.length} clienta{sinCita.length > 1 ? "s" : ""} sin cita hace +14 días</p>
            {sinCita.slice(0, 3).map(c => {
              const h = Array.isArray(c.historial) ? c.historial : (c.historial ? Object.values(c.historial) : []);
              const ult = [...h].sort((a, b) => b.fecha?.localeCompare(a.fecha))[0];
              const dias = ult?.fecha ? Math.floor((new Date() - new Date(ult.fecha)) / (1000 * 60 * 60 * 24)) : null;
              return (
                <div key={c._id} style={{ ...s.card, display:"flex", alignItems:"center", gap:11, borderColor:"rgba(224,184,112,0.2)" }}>
                  <Avatar nombre={c.nombre} size={36} />
                  <div style={{ flex:1 }}>
                    <p style={{ margin:"0 0 2px", fontFamily:F.serif, fontSize:13 }}>{c.nombre}</p>
                    <p style={{ margin:0, ...s.sub, fontSize:10 }}>{dias ? `hace ${dias}d` : ""}{ult?.servicio ? ` · ${ult.servicio}` : ""}</p>
                  </div>
                  <button style={{ ...s.btnGl, fontSize:11, padding:"5px 10px", borderColor:"rgba(37,211,102,0.3)", color:G.greenL }}
                    onClick={() => { const tpl = data.getConfig("mensajes", DEFAULT_MENSAJES); openWAClienta(c, fillMsg(tpl.service14d || DEFAULT_MENSAJES.service14d, { nombre:c.nombre?.split(" ")[0] })); }}><Icon name="messageCircle" size={13} color="rgba(37,211,102,0.8)" /></button>
                </div>
              );
            })}
          </>
        )}

        {topSv.length > 0 && (
          <>
            <div style={s.div} />
            <p style={{ fontFamily:F.display, fontWeight:400, fontSize:19, letterSpacing:"0.5px", color:G.white, margin:"0 0 3px" }}>top servicios del mes</p>
            <p style={{ ...s.sub, marginBottom:12 }}>los más solicitados</p>
            {topSv.map(([nom, cnt], i) => (
              <div key={nom} style={{ ...s.card, display:"flex", alignItems:"center", gap:12, padding:"11px 14px" }}>
                <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:18, color:i === 0 ? G.green : G.muted, minWidth:20, margin:0 }}>{i + 1}</p>
                <p style={{ flex:1, margin:0, fontFamily:F.sans, fontSize:13 }}>{nom}</p>
                <span style={s.tag}>{cnt}x</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ── Nuevo Bloque (non-client calendar block) ───────────────────────────────────
function NuevoEvento({ data, onClose, diaDefault, toast }) {
  const [form, setForm] = useState({ fecha:diaDefault || hoyISO(), horaInicio:"", duracion:60, titulo:"", tipo:"personal" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));
  const slots = (() => {
    const global = data.getConfig("slots", []);
    const porDia = data.getConfig("slotsPorDia", {});
    const dow    = form.fecha ? new Date(form.fecha + "T12:00:00").getDay() : null;
    return dow !== null && porDia[dow] !== undefined ? porDia[dow] : global;
  })();
  const guardar = async () => {
    if (!form.fecha || !form.titulo.trim()) { toast("completá título y fecha"); return; }
    setSaving(true);
    await data.crearBloque({ fecha:form.fecha, horaInicio:form.horaInicio || "00:00", duracion:Number(form.duracion), titulo:form.titulo.trim(), tipo:form.tipo });
    toast("✓ evento guardado");
    setSaving(false);
    onClose();
  };
  const TIPOS = [["personal","👤 personal"],["reunion","🤝 reunión"],["cumpleanos","🎂 cumpleaños"],["descanso","☕ descanso"]];
  return (
    <Sheet titulo="Nuevo evento" onClose={onClose}>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {TIPOS.map(([v, l]) => {
            const tc = tipoEvColor(v);
            return (
              <button key={v} onClick={() => set("tipo", v)}
                style={{ ...s.btnGl, padding:"7px 12px", fontSize:11,
                  background:form.tipo === v ? tc.bg : "transparent",
                  borderColor:form.tipo === v ? tc.border : G.border,
                  color:form.tipo === v ? tc.color : G.muted }}>
                {l}
              </button>
            );
          })}
        </div>
        <Field label="título"><input style={s.input} value={form.titulo} onChange={e => set("titulo", e.target.value)} placeholder="¿qué tenés?" /></Field>
        <Field label="fecha"><input style={s.input} type="date" value={form.fecha} onChange={e => set("fecha", e.target.value)} /></Field>
        <Field label="hora (opcional)">
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            <button onClick={() => set("horaInicio", "")} style={{ ...s.btnGl, padding:"7px 11px", fontSize:11, background:!form.horaInicio ? G.greenM : "transparent", borderColor:!form.horaInicio ? G.green : G.border, color:!form.horaInicio ? G.greenL : G.muted }}>todo el día</button>
            {slots.map(h => (
              <button key={h} onClick={() => set("horaInicio", h)}
                style={{ ...s.btnGl, padding:"7px 11px", fontSize:11,
                  background:form.horaInicio === h ? G.greenM : "transparent",
                  borderColor:form.horaInicio === h ? G.green : G.border,
                  color:form.horaInicio === h ? G.greenL : G.sub }}>{h}</button>
            ))}
          </div>
        </Field>
        {form.horaInicio && (
          <Field label="duración">
            <div style={{ display:"flex", gap:7 }}>
              {[[30,"30 min"],[60,"1 h"],[90,"1:30 h"],[120,"2 h"]].map(([v, l]) => (
                <button key={v} onClick={() => set("duracion", v)}
                  style={{ ...s.btnGl, flex:1, fontSize:12,
                    background:form.duracion === v ? G.greenM : "transparent",
                    borderColor:form.duracion === v ? G.green : G.border,
                    color:form.duracion === v ? G.greenL : G.sub }}>{l}</button>
              ))}
            </div>
          </Field>
        )}
        <button style={{ ...s.btnG, opacity:saving?0.6:1 }} onClick={guardar} disabled={saving}>{saving ? "guardando..." : "guardar evento →"}</button>
      </div>
    </Sheet>
  );
}

// ── Admin Agenda ───────────────────────────────────────────────────────────────
function AdminAgenda({ data, push, toast }) {
  const hoy    = hoyISO();
  const ahora  = new Date();
  const nowMin = ahora.getHours()*60 + ahora.getMinutes();
  const [offset, setOffset]       = useState(0);
  const [diaS,   setDiaS]         = useState(hoy);
  const [vista,  setVista]         = useState("semana");
  const [weekOffset, setWeekOffset] = useState(0);
  const [showEvento, setShowEvento] = useState(false);
  const [busqAgenda, setBusqAgenda] = useState("");
  const wide = useIsWide();

  const weekOffsetForDay = (iso) => {
    const d = new Date(iso + "T12:00:00");
    const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay()+6)%7));
    const base = mondayOfWeek(0);
    return Math.round((mon - base) / (7 * 24 * 60 * 60 * 1000));
  };

  const mesD   = new Date(ahora.getFullYear(), ahora.getMonth() + offset, 1);
  const anio   = mesD.getFullYear();
  const mes    = mesD.getMonth();
  const primDia = new Date(anio, mes, 1).getDay();
  const diasMes = new Date(anio, mes + 1, 0).getDate();
  const fmtKey  = (d) => `${anio}-${String(mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const citasPorFecha = {};
  data.citas.forEach(c => { if (!citasPorFecha[c.fecha]) citasPorFecha[c.fecha] = []; citasPorFecha[c.fecha].push(c); });

  const fechasBloq    = new Set(data.excepciones.map(e => e.fecha));
  const diasLaborales = data.getConfig("diasLaborales", [1,2,3,4,5,6]);
  const excepDia    = data.excepciones.find(e => e.fecha === diaS);
  const diaEsBloq   = fechasBloq.has(diaS) || !esDiaLaboral(diaS, diasLaborales);
  const citasDia    = citasPorFecha[diaS] || [];
  const slots = (() => {
    const global    = data.getConfig("slots", []);
    const porDia    = data.getConfig("slotsPorDia", {});
    const dow       = new Date(diaS + "T12:00:00").getDay();
    return porDia[dow] !== undefined ? porDia[dow] : global;
  })();

  const esDiaPasado = diaS < hoy;
  const dtManana = new Date(diaS + "T12:00:00"); dtManana.setDate(dtManana.getDate() + 1);
  const keyManana = dtManana.toISOString().slice(0, 10);
  const citasManana = citasPorFecha[keyManana] || [];

  // Mini-calendar shared render helper
  const miniCal = (onDayClick) => (
    <div style={{ ...s.card, padding:"12px 8px" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
        <button style={{ ...s.btnGl, padding:"5px 11px", fontSize:14 }} onClick={() => setOffset(o => o-1)}>‹</button>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <p style={{ fontFamily:F.display, fontWeight:400, fontSize:13, color:G.white, margin:0, textTransform:"capitalize" }}>{MESES[mes]} {anio}</p>
          {(offset !== 0 || diaS !== hoy) && <button style={{ ...s.btnGl, fontSize:9, padding:"2px 7px" }} onClick={() => { setOffset(0); setDiaS(hoy); }}>hoy</button>}
        </div>
        <button style={{ ...s.btnGl, padding:"5px 11px", fontSize:14 }} onClick={() => setOffset(o => o+1)}>›</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:3 }}>
        {DIAS_C.map(d => <div key={d} style={{ textAlign:"center", fontFamily:F.sans, fontSize:9, color:G.muted, padding:"1px 0" }}>{d}</div>)}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
        {Array(primDia).fill(null).map((_, i) => <div key={"e"+i} />)}
        {Array(diasMes).fill(null).map((_, i) => {
          const dia = i+1, key = fmtKey(dia);
          const tiene = !!(citasPorFecha[key]?.length);
          const bloqExcep = fechasBloq.has(key), bloqDia = !esDiaLaboral(key, diasLaborales);
          const bloq = bloqExcep || bloqDia;
          const esH = key === hoy, esSel = key === diaS;
          return (
            <div key={dia} onClick={() => onDayClick(key)}
              style={{ textAlign:"center", borderRadius:6, padding:"4px 1px", cursor:"pointer",
                background:esSel ? G.green : esH ? G.greenM : "transparent",
                border:esSel ? "none" : esH ? `0.5px solid ${G.green}` : "0.5px solid transparent" }}>
              <span style={{ fontFamily:F.sans, fontSize:11, color:esSel ? "#0a0a0a" : esH ? G.greenL : bloq ? "rgba(224,112,112,0.6)" : G.sub, fontWeight:esSel || esH ? 700 : 400, display:"block" }}>{dia}</span>
              {tiene && <div style={{ display:"flex", justifyContent:"center", gap:2, marginTop:1 }}>{Array(Math.min(citasPorFecha[key].length, 3)).fill(null).map((_, pi) => <div key={pi} style={{ width:3, height:3, borderRadius:"50%", background:esSel ? "rgba(10,10,10,0.5)" : G.green }} />)}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );

  const daySlots = (
    <div style={{ overflowY:"auto", height:"100%", padding:"16px 20px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6, flexWrap:"wrap" }}>
        <div style={{ width:5, height:5, borderRadius:"50%", background:diaS===hoy ? G.greenL : G.green, boxShadow:diaS===hoy ? `0 0 6px rgba(${G.greenRGB},0.7)` : "none" }} />
        <p style={{ margin:0, fontFamily:F.display, fontWeight:400, fontSize:18, letterSpacing:"0.5px", color:diaS===hoy ? G.greenL : G.white }}>{diaS===hoy ? "HOY · " : ""}{DIAS_F[new Date(diaS+"T12:00:00").getDay()]} {fmtFecha(diaS)}</p>
        {citasDia.length > 0 && <span style={s.tag}>{citasDia.length} turno{citasDia.length>1?"s":""}</span>}
        <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
          {diaS===hoy && <button style={{ ...s.btnGl, fontSize:11, padding:"7px 12px", borderColor:G.green, color:G.greenL }} onClick={() => setVista("día")}>vista día →</button>}
          {!esDiaPasado && <button style={{ ...s.btnG, width:"auto", padding:"7px 14px", fontSize:11 }} onClick={() => push("nueva-cita", { fechaDefault:diaS })}>+ agendar</button>}
        </div>
      </div>
      {diaS===hoy && <p style={{ fontFamily:F.sans, fontSize:10, color:G.muted, margin:"0 0 10px", paddingLeft:15 }}>{String(ahora.getHours()).padStart(2,"0")}:{String(ahora.getMinutes()).padStart(2,"0")} · turnos pasados ocultos</p>}
      {diaEsBloq && (
        <div style={{ ...s.card, background:"rgba(224,112,112,0.08)", borderColor:G.red, marginBottom:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <p style={{ margin:"0 0 2px", fontFamily:F.sans, fontSize:11, color:G.red }}>{fechasBloq.has(diaS) ? "día bloqueado manualmente" : "día no laborable"}</p>
            <p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:G.sub }}>{excepDia?.razon || ""}</p>
          </div>
          <span style={{ fontSize:18 }}>🔒</span>
        </div>
      )}
      {!diaEsBloq && slots.length === 0 && <div style={{ ...s.card, textAlign:"center", padding:20 }}><p style={{ fontFamily:F.sans, fontSize:13, color:G.muted, margin:0 }}>Sin horarios configurados</p></div>}
      {!diaEsBloq && slots.map(hora => {
        const esHoy = diaS === hoy, slotMin = toMin(hora);
        const esSlotPasado = esDiaPasado || (esHoy && slotMin + 60 <= nowMin);
        const cita = esSlotPasado ? citasDia.find(c => c.hora === hora) : citasDia.find(c => c.hora === hora && c.estado !== "completada");
        if (!cita && esSlotPasado) return null;
        const esEnCurso = esHoy && !esDiaPasado && slotMin <= nowMin && slotMin + 60 > nowMin;
        return (
          <div key={hora} onClick={() => cita && push("cita-detalle", { cita })}
            style={{ display:"flex", alignItems:"center", gap:10, background:cita ? G.card : "rgba(255,255,255,0.01)", border:`0.5px solid ${esEnCurso ? `rgba(${G.greenRGB},0.6)` : cita ? G.border : "rgba(255,255,255,0.03)"}`, borderRadius:11, padding:"9px 12px", marginBottom:7, opacity:cita ? 1 : 0.5, cursor:cita ? "pointer" : "default" }}>
            <div style={{ background:cita ? G.greenM : "transparent", border:`0.5px solid ${cita ? G.green : G.border}`, borderRadius:8, padding:"5px 8px", minWidth:46, textAlign:"center" }}>
              <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:13, color:cita ? G.greenL : G.muted }}>{hora}</p>
            </div>
            {!cita ? (
              <div style={{ flex:1, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:G.muted }}>disponible</p>
                <button style={{ ...s.btnGl, fontSize:10, padding:"4px 10px" }} onClick={e => { e.stopPropagation(); push("nueva-cita", { fechaDefault:diaS, horaDefault:hora }); }}>+ agendar</button>
              </div>
            ) : (
              <>
                <div style={{ flex:1 }}>
                  <p style={{ margin:"0 0 1px", fontFamily:F.serif, fontSize:13 }}>{cita.clientaNombre}</p>
                  <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>{cita.servicio}{cita.adicionales?.length ? ` + ${cita.adicionales.join(", ")}` : ""}</p>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  {esEnCurso && <span style={{ fontFamily:F.sans, fontSize:9, fontWeight:700, color:G.greenL, background:`rgba(${G.greenRGB},0.18)`, borderRadius:4, padding:"2px 7px" }}>EN CURSO</span>}
                  {!esSlotPasado && <button style={{ background:"rgba(37,211,102,0.12)", border:"0.5px solid rgba(37,211,102,0.3)", borderRadius:8, width:30, height:30, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}
                    onClick={e => { e.stopPropagation(); const tpl = data.getConfig("mensajes", DEFAULT_MENSAJES); const cl = data.clientas.find(c => c._id === cita.clientaId); openWAClienta(cl, fillMsg(tpl.recordatorio || DEFAULT_MENSAJES.recordatorio, { nombre:cita.clientaNombre?.split(" ")[0], hora:cita.hora })); }}><Icon name="messageCircle" size={13} color="rgba(37,211,102,0.8)" /></button>}
                  <button style={{ ...s.btnGl, padding:"5px 9px", fontSize:11 }} onClick={() => push("cita-detalle", { cita })}>→</button>
                </div>
                <span style={s.tag}>{cita.estado}</span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );

  const busqQ = busqAgenda.trim().toLowerCase();
  const busqResultados = busqQ ? (
    <div style={{ overflowY:"auto", flex:1, padding:"16px 20px" }}>
      <p style={{ fontFamily:F.sans, fontSize:12, color:G.muted, marginBottom:12 }}>{data.citas.filter(c => c.clientaNombre?.toLowerCase().includes(busqQ)).length} resultado{data.citas.filter(c => c.clientaNombre?.toLowerCase().includes(busqQ)).length !== 1 ? "s" : ""}</p>
      {[...data.citas].filter(c => c.clientaNombre?.toLowerCase().includes(busqQ)).sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora)).map(c => (
        <div key={c._id} style={{ ...s.card, display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, cursor:"pointer" }} onClick={() => push("cita-detalle", { cita:c })}>
          <div>
            <p style={{ margin:"0 0 2px", fontFamily:F.sans, fontSize:13, fontWeight:600, color:G.text }}>{c.clientaNombre}</p>
            <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>{c.fecha} · {c.hora} · {c.servicio}</p>
          </div>
          <span style={{ ...s.tag, margin:0 }}>{c.estado}</span>
        </div>
      ))}
      {data.citas.filter(c => c.clientaNombre?.toLowerCase().includes(busqQ)).length === 0 && <p style={{ color:G.muted, fontSize:13 }}>Sin resultados</p>}
    </div>
  ) : null;


  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 58px)" }}>
      {wide ? (
        <div style={{ display:"flex", flex:1, overflow:"hidden" }}>
          {/* LEFT PANEL — mini-calendar always visible */}
          <div style={{ width:248, flexShrink:0, overflowY:"auto", padding:"16px 12px 20px", borderRight:`0.5px solid ${G.border}`, display:"flex", flexDirection:"column", gap:10 }}>
            <div>
              <h1 style={{ ...s.h1, marginBottom:1 }}>Agenda</h1>
              <p style={{ ...s.sub, margin:0 }}>calendario</p>
            </div>
            <button style={{ ...s.btnG }} onClick={() => push("nueva-cita", { fechaDefault:diaS })}>+ nueva cita</button>
            <button style={{ ...s.btnGl, width:"100%", padding:"9px 0", fontSize:12 }} onClick={() => setShowEvento(true)}>+ evento personal</button>
            <div style={{ display:"flex", gap:4 }}>
              {["mes","semana","día"].map(v => (
                <button key={v} onClick={() => setVista(v)}
                  style={{ ...s.btnGl, flex:1, fontSize:11, padding:"7px 3px", textTransform:"capitalize",
                    background:vista===v ? G.greenM : "transparent",
                    borderColor:vista===v ? G.green : G.border,
                    color:vista===v ? G.greenL : G.muted,
                    fontWeight:vista===v ? 700 : 400 }}>{v}</button>
              ))}
            </div>
            <input style={{ ...s.input, margin:0, fontSize:13 }} placeholder="🔍 buscar clienta..." value={busqAgenda} onChange={e => setBusqAgenda(e.target.value)} />
            {miniCal((key) => {
              setDiaS(key);
              if (vista === "semana") setWeekOffset(weekOffsetForDay(key));
              if (vista === "semana" || vista === "día") {
                // keep view, just navigate
              } else {
                setVista("mes");
              }
            })}
            {diaS === hoy && citasManana.length > 0 && (
              <div style={{ ...s.card, background:"rgba(143,189,90,0.06)", borderColor:G.greenD }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <p style={{ margin:"0 0 2px", fontFamily:F.sans, fontSize:10, color:G.greenL }}>mañana</p>
                    <p style={{ margin:0, fontFamily:F.serif, fontSize:13 }}>{citasManana.length} cita{citasManana.length>1?"s":""}</p>
                  </div>
                  <button style={{ ...s.btnGl, fontSize:11, padding:"6px 10px", borderColor:G.green, color:G.greenL }}
                    onClick={() => { const tpl = data.getConfig("mensajes", DEFAULT_MENSAJES); citasManana.forEach(c => { const cl = data.clientas.find(x => x._id === c.clientaId); openWAClienta(cl, fillMsg(tpl.recordatorio || DEFAULT_MENSAJES.recordatorio, { nombre:c.clientaNombre?.split(" ")[0], hora:c.hora })); }); }}>
                    Avisar →
                  </button>
                </div>
              </div>
            )}
          </div>
          {/* RIGHT PANEL */}
          <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
            {busqResultados || (
              <>
                {vista === "semana" && <AgendaSemana data={data} push={push} toast={toast} weekOffset={weekOffset} setWeekOffset={setWeekOffset} />}
                {vista === "día" && <AgendaDia key={diaS} data={data} push={push} toast={toast} diaInicial={diaS} />}
                {vista === "mes" && daySlots}
              </>
            )}
          </div>
        </div>
      ) : (
        // MOBILE
        <>
          <div style={{ ...s.topBar }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <div><h1 style={s.h1}>Agenda</h1><p style={s.sub}>calendario</p></div>
              <div style={{ display:"flex", gap:5, alignItems:"center", flexWrap:"wrap" }}>
                {["mes","semana","día"].map(v => (
                  <button key={v} onClick={() => setVista(v)}
                    style={{ ...s.btnGl, padding:"7px 11px", fontSize:11, textTransform:"capitalize",
                      background:vista===v ? G.greenM : "transparent",
                      borderColor:vista===v ? G.green : G.border,
                      color:vista===v ? G.greenL : G.muted,
                      fontWeight:vista===v ? 700 : 400 }}>{v}</button>
                ))}
                <button style={{ ...s.btnGl, width:"auto", padding:"8px 11px", fontSize:11 }} onClick={() => setShowEvento(true)}>+ evento</button>
                <button style={{ ...s.btnG, width:"auto", padding:"8px 13px", fontSize:11 }} onClick={() => push("nueva-cita")}>+ cita</button>
              </div>
            </div>
            <input style={{ ...s.input, margin:"8px 0 0", fontSize:13 }} placeholder="🔍 buscar clienta..." value={busqAgenda} onChange={e => setBusqAgenda(e.target.value)} />
          </div>
          {busqResultados || (
            <>
              {vista === "semana" && <AgendaSemana data={data} push={push} toast={toast} weekOffset={weekOffset} setWeekOffset={setWeekOffset} />}
              {vista === "día" && <AgendaDia key={diaS} data={data} push={push} toast={toast} diaInicial={diaS} />}
              {vista === "mes" && (
                <div style={{ padding:"14px 14px 0", overflowY:"auto" }}>
                  {miniCal((key) => setDiaS(key))}
                  <div style={{ height:10 }} />
                  {daySlots}
                </div>
              )}
            </>
          )}
        </>
      )}
      {showEvento && <NuevoEvento data={data} onClose={() => setShowEvento(false)} diaDefault={diaS} toast={toast} />}
    </div>
  );
}

// ── Semana Calendar View ───────────────────────────────────────────────────────
function AgendaSemana({ data, push, toast, weekOffset, setWeekOffset }) {
  const hoy = hoyISO();
  const ROW_H = 56;
  const wide = useIsWide();
  const [nowMin, setNowMin] = useState(() => { const n = new Date(); return n.getHours()*60 + n.getMinutes(); });

  useEffect(() => {
    const t = setInterval(() => { const n = new Date(); setNowMin(n.getHours()*60 + n.getMinutes()); }, 60_000);
    return () => clearInterval(t);
  }, []);

  // Build 7-day array starting from Monday of current week + offset
  const lunes = mondayOfWeek(weekOffset);
  const weekDays = Array.from({ length:7 }, (_, i) => {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    return d;
  });
  const weekKeys = weekDays.map(isoOfDate);

  // Config
  const slotsGlobal   = data.getConfig("slots", []);
  const slotsPorDia   = data.getConfig("slotsPorDia", {});
  const diasLaborales = data.getConfig("diasLaborales", [1,2,3,4,5,6]);

  // Collect all slot times + cita times across the week to determine time axis range
  const allSlotMins = new Set();
  weekDays.forEach(d => {
    const dow = d.getDay();
    const slots = slotsPorDia[dow] !== undefined ? slotsPorDia[dow] : slotsGlobal;
    slots.forEach(t => allSlotMins.add(toMin(t)));
  });
  // Also include actual cita times so nothing is clipped off the grid
  data.citas.forEach(c => { if (weekKeys.includes(c.fecha)) allSlotMins.add(toMin(c.hora)); });
  const minsSorted = [...allSlotMins].sort((a, b) => a - b);
  const minMin = Math.max(0, (minsSorted.length ? minsSorted[0] : 8*60) - 3*60);
  const maxMin = (minsSorted.length ? minsSorted[minsSorted.length-1] : 17*60) + 3*60;
  const totalHours = Math.ceil((maxMin - minMin) / 60);

  // Hour labels for the time axis
  const hourLabels = Array.from({ length:totalHours }, (_, i) => {
    const m = minMin + i*60;
    return `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;
  });

  // Group citas by date
  const citasPorFecha = {};
  data.citas.forEach(c => {
    if (!citasPorFecha[c.fecha]) citasPorFecha[c.fecha] = [];
    citasPorFecha[c.fecha].push(c);
  });

  // Block appearance by estado
  const blkBg  = (e) => e==="confirmada" ? `rgba(${G.greenRGB},0.18)` : e==="solicitada" ? "rgba(224,184,112,0.18)" : "rgba(240,240,240,0.06)";
  const blkBdr = (e) => e==="confirmada" ? `rgba(${G.greenRGB},0.55)` : e==="solicitada" ? "rgba(224,184,112,0.55)"  : G.border;
  const blkTxt = (e) => e==="confirmada" ? G.greenL                   : e==="solicitada" ? G.amber                   : G.muted;

  const getDur = (cita) => data.servicios.find(s => s.nombre === cita.servicio)?.duracion || 60;

  const confirmarRapidoSem = async (cita) => {
    await data.editarCita(cita._id, { estado:"confirmada" });
    if (cita.clientaUid) sendPush([`clienta:${cita.clientaUid}`], "¡Tu turno está confirmado! 🌿", `${cita.servicio} · ${fmtFecha(cita.fecha)} a las ${cita.hora}`);
    toast("✓ turno confirmado");
  };

  const cancelarRapidoSem = async (cita) => {
    if (!window.confirm(`¿Cancelar el turno de ${cita.clientaNombre}?`)) return;
    await data.borrarCita(cita._id);
    if (cita.clientaUid) sendPush([`clienta:${cita.clientaUid}`], "Tu turno fue cancelado", `${cita.servicio} · ${cita.hora}`);
    toast("Turno cancelado");
  };

  // Week label: "19 may – 25 may"
  const weekLabel = `${fmtFecha(weekKeys[0])} – ${fmtFecha(weekKeys[6])}`;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 130px)" }}>
      {/* Week navigation */}
      <div style={{ padding:"10px 14px 8px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <button style={{ ...s.btnGl, padding:"6px 14px", fontSize:15 }} onClick={() => setWeekOffset(w => w-1)}>‹</button>
        <div style={{ textAlign:"center" }}>
          <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:14, color:G.white }}>{weekLabel}</p>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {weekOffset !== 0 && (
            <button style={{ ...s.btnGl, padding:"6px 10px", fontSize:11 }} onClick={() => setWeekOffset(0)}>Hoy</button>
          )}
          <button style={{ ...s.btnGl, padding:"6px 14px", fontSize:15 }} onClick={() => setWeekOffset(w => w+1)}>›</button>
        </div>
      </div>

      {!wide && (
        // ── MOBILE: schedule list view ──────────────────────────────────────
        <div style={{ flex:1, overflowY:"auto" }}>
          {weekDays.map((d, i) => {
            const key     = weekKeys[i];
            const esHoy   = key === hoy;
            const isPast  = key < hoy;
            const laboral = esDiaLaboral(key, diasLaborales);
            const dayCitas   = citasPorFecha[key] || [];
            const dayBloques = (data.bloques || []).filter(b => b.fecha === key && b.titulo);
            const hasCont    = dayCitas.length > 0 || dayBloques.length > 0;
            return (
              <div key={key} style={{ borderBottom:`0.5px solid ${G.border}`, padding:"12px 14px", opacity:isPast ? 0.5 : 1 }}>
                {/* Day header row */}
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom: hasCont ? 10 : 0 }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", flexShrink:0,
                    background:esHoy ? G.green : "transparent",
                    border:esHoy ? "none" : `0.5px solid ${G.border}`,
                    display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <span style={{ fontFamily:F.sans, fontSize:13, fontWeight:700, color:esHoy ? "#0a0a0a" : G.sub }}>{d.getDate()}</span>
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ margin:0, fontFamily:F.sans, fontSize:13, fontWeight:esHoy ? 700 : 400,
                      color:esHoy ? G.greenL : G.white, textTransform:"capitalize" }}>
                      {DIAS_F[d.getDay()]}{esHoy ? " · HOY" : ""}
                    </p>
                    {!laboral && <p style={{ margin:0, fontFamily:F.sans, fontSize:10, color:G.muted }}>no laborable</p>}
                  </div>
                  {dayCitas.length > 0
                    ? <span style={s.tag}>{dayCitas.length} turno{dayCitas.length>1?"s":""}</span>
                    : (!isPast && laboral && <button style={{ ...s.btnGl, fontSize:10, padding:"4px 9px" }}
                        onClick={() => push("nueva-cita", { fechaDefault:key })}>+ agendar</button>)
                  }
                </div>

                {/* Personal events */}
                {dayBloques.map(b => {
                  const tc = tipoEvColor(b.tipo);
                  return (
                    <div key={b._id}
                      style={{ background:tc.bg, border:`1px solid ${tc.border}`, borderRadius:10, padding:"7px 12px", marginBottom:6, cursor:"pointer" }}
                      onClick={() => { if (window.confirm(`Eliminar "${b.titulo}"?`)) data.borrarBloque(b._id); }}>
                      <span style={{ fontFamily:F.sans, fontSize:12, color:tc.color }}>{tc.icon} {b.titulo}{b.horaInicio && b.horaInicio !== "00:00" ? ` · ${b.horaInicio}` : ""}</span>
                    </div>
                  );
                })}

                {/* Appointment cards */}
                {[...dayCitas].sort((a, b) => a.hora.localeCompare(b.hora)).map(cita => {
                  const done = cita.estado === "completada";
                  return (
                    <div key={cita._id}
                      onClick={() => push("cita-detalle", { cita })}
                      style={{ background:G.card, border:`0.5px solid ${blkBdr(cita.estado)}`, borderRadius:12, padding:"11px 13px", marginBottom:7, cursor:"pointer" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                        <div style={{ background:blkBg(cita.estado), border:`0.5px solid ${blkBdr(cita.estado)}`, borderRadius:7, padding:"5px 9px", flexShrink:0 }}>
                          <span style={{ fontFamily:F.serif, fontWeight:700, fontSize:13, color:blkTxt(cita.estado) }}>{cita.hora}</span>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ margin:"0 0 2px", fontFamily:F.serif, fontSize:14, color:G.white, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{cita.clientaNombre}</p>
                          <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{cita.servicio}{cita.adicionales?.length ? ` + ${cita.adicionales.join(", ")}` : ""}</p>
                        </div>
                        <span style={{ ...s.tag, flexShrink:0 }}>{done ? "completada" : cita.estado}</span>
                      </div>
                      {!done && (
                        <div style={{ display:"flex", gap:7, marginTop:9 }} onClick={e => e.stopPropagation()}>
                          {cita.estado === "solicitada" && (<>
                            <button onClick={() => confirmarRapidoSem(cita)} style={{ flex:1, background:`rgba(${G.greenRGB},0.2)`, border:`1px solid rgba(${G.greenRGB},0.4)`, borderRadius:8, padding:"7px 0", fontFamily:F.sans, fontSize:11, color:G.greenL, cursor:"pointer" }}>✓ confirmar</button>
                            <button onClick={() => cancelarRapidoSem(cita)} style={{ flex:1, background:"rgba(220,70,70,0.15)", border:"1px solid rgba(220,70,70,0.35)", borderRadius:8, padding:"7px 0", fontFamily:F.sans, fontSize:11, color:"#e07070", cursor:"pointer" }}>✕ cancelar</button>
                          </>)}
                          {cita.estado === "confirmada" && (<>
                            <button onClick={e => { e.stopPropagation(); const tpl = data.getConfig("mensajes", DEFAULT_MENSAJES); const cl = data.clientas.find(c => c._id === cita.clientaId); openWAClienta(cl, fillMsg(tpl.recordatorio || DEFAULT_MENSAJES.recordatorio, { nombre:cita.clientaNombre?.split(" ")[0], hora:cita.hora })); }} style={{ flex:1, background:"rgba(37,211,102,0.1)", border:"1px solid rgba(37,211,102,0.3)", borderRadius:8, padding:"7px 0", fontFamily:F.sans, fontSize:11, color:"rgba(37,211,102,0.85)", cursor:"pointer" }}>💬 WA</button>
                            <button onClick={e => { e.stopPropagation(); push("cita-detalle", { cita }); }} style={{ flex:1, background:`rgba(${G.greenRGB},0.15)`, border:`1px solid rgba(${G.greenRGB},0.35)`, borderRadius:8, padding:"7px 0", fontFamily:F.sans, fontSize:11, color:G.greenL, cursor:"pointer" }}>$ cobrar</button>
                          </>)}
                        </div>
                      )}
                    </div>
                  );
                })}

                {!hasCont && laboral && !isPast && (
                  <p style={{ fontFamily:F.sans, fontSize:11, color:"rgba(255,255,255,0.2)", margin:0 }}>sin turnos</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {wide && (
      <div style={{ flex:1, overflowY:"auto", overflowX:"hidden" }}>
        {/* Day headers — sticky at top of scroll */}
        <div style={{ display:"flex", marginLeft:42, position:"sticky", top:0, zIndex:5, background:G.topBarBg, backdropFilter:"blur(12px)", borderBottom:`0.5px solid ${G.border}` }}>
          {weekDays.map((d, i) => {
            const key = weekKeys[i];
            const esHoy = key === hoy;
            const laboral = esDiaLaboral(key, diasLaborales);
            return (
              <div key={key} style={{ flex:1, textAlign:"center", padding:"6px 2px",
                background:esHoy ? `rgba(${G.greenRGB},0.12)` : "transparent",
                opacity:laboral ? 1 : 0.45 }}>
                <p style={{ margin:0, fontFamily:F.sans, fontSize:9, color:G.muted, letterSpacing:"0.07em", textTransform:"uppercase" }}>
                  {DIAS_C[d.getDay()]}
                </p>
                <p style={{ margin:"2px 0 0", fontFamily:F.serif, fontWeight:esHoy ? 700 : 400, fontSize:14,
                  color:esHoy ? G.greenL : G.sub }}>
                  {d.getDate()}
                </p>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div style={{ display:"flex", position:"relative" }}>
          {/* Hour axis */}
          <div style={{ width:42, flexShrink:0, borderRight:`0.5px solid ${G.border}` }}>
            {hourLabels.map(lbl => (
              <div key={lbl} style={{ height:ROW_H, display:"flex", alignItems:"flex-start",
                paddingTop:4, paddingRight:6, justifyContent:"flex-end",
                borderTop:`0.5px solid rgba(255,255,255,0.05)` }}>
                <span style={{ fontFamily:F.sans, fontSize:9, color:G.muted }}>{lbl}</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((d, i) => {
            const key = weekKeys[i];
            const dow = d.getDay();
            const laboral = esDiaLaboral(key, diasLaborales);
            const daySlots = slotsPorDia[dow] !== undefined ? slotsPorDia[dow] : slotsGlobal;
            const dayCitas  = citasPorFecha[key] || [];
            const dayBloques = (data.bloques || []).filter(b => b.fecha === key);

            return (
              <div key={key} style={{ flex:1, position:"relative", height:totalHours*ROW_H,
                borderLeft:`0.5px solid ${G.border}`,
                background:key===hoy ? `rgba(${G.greenRGB},0.03)` : "transparent",
                opacity:laboral ? 1 : 0.5 }}>

                {/* Hour-row click zones */}
                {hourLabels.map((_, hi) => {
                  const rowMin = minMin + hi*60;
                  const nearestSlot = daySlots.find(sl => { const sm = toMin(sl); return sm >= rowMin && sm < rowMin+60; });
                  return (
                    <div key={hi}
                      style={{ position:"absolute", top:hi*ROW_H, left:0, right:0, height:ROW_H,
                        borderTop:`0.5px solid rgba(255,255,255,0.04)`,
                        cursor:laboral && nearestSlot ? "pointer" : "default" }}
                      onClick={() => { if (laboral && nearestSlot) push("nueva-cita", { fechaDefault:key, horaDefault:nearestSlot }); }}
                    />
                  );
                })}

                {/* Appointment blocks */}
                {layoutCitas(dayCitas, getDur).map(cita => {
                  const startMin = toMin(cita.hora);
                  if (startMin < minMin || startMin >= maxMin) return null;
                  const duracion = getDur(cita);
                  const top = ((startMin - minMin) / 60) * ROW_H;
                  const height = Math.max(42, (duracion / 60) * ROW_H);
                  const done = cita.estado === "completada";
                  const bg  = done ? `rgba(${G.greenRGB},0.10)` : blkBg(cita.estado);
                  const bdr = done ? `rgba(${G.greenRGB},0.25)` : blkBdr(cita.estado);
                  const txt = done ? G.muted                    : blkTxt(cita.estado);
                  const colW = 100 / cita._nCols;
                  return (
                    <div key={cita._id}
                      onClick={e => { e.stopPropagation(); push("cita-detalle", { cita }); }}
                      style={{ position:"absolute", top,
                        left:`calc(${cita._col * colW}% + 1px)`, width:`calc(${colW}% - 2px)`, height,
                        background:bg, border:`1px solid ${bdr}`,
                        borderRadius:8, padding:"3px 5px", overflow:"hidden",
                        cursor:"pointer", zIndex:2, boxSizing:"border-box",
                        opacity:done ? 0.7 : 1 }}>
                      <p style={{ margin:0, fontFamily:F.sans, fontWeight:700, fontSize:10,
                        color:txt, lineHeight:1.3,
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {done ? "✓ " : ""}{cita.hora} · {cita.clientaNombre?.split(" ")[0]}
                      </p>
                      {height >= 54 && (
                        <p style={{ margin:0, fontFamily:F.sans, fontSize:9,
                          color:txt, opacity:0.75, lineHeight:1.3,
                          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {cita.servicio}
                        </p>
                      )}
                      {height >= 70 && !done && (
                        <div style={{ position:"absolute", bottom:3, left:3, right:3, display:"flex", gap:3 }}
                          onClick={e => e.stopPropagation()}>
                          {cita.estado === "solicitada" && (<>
                            <button onClick={() => confirmarRapidoSem(cita)} style={{ flex:1, background:`rgba(${G.greenRGB},0.2)`, border:`1px solid rgba(${G.greenRGB},0.4)`, borderRadius:4, padding:"2px 0", fontFamily:F.sans, fontSize:8, color:G.greenL, cursor:"pointer" }}>✓</button>
                            <button onClick={() => cancelarRapidoSem(cita)} style={{ flex:1, background:"rgba(220,70,70,0.15)", border:"1px solid rgba(220,70,70,0.35)", borderRadius:4, padding:"2px 0", fontFamily:F.sans, fontSize:8, color:"#e07070", cursor:"pointer" }}>✕</button>
                          </>)}
                          {cita.estado === "confirmada" && (<>
                            <button onClick={() => { const tpl = data.getConfig("mensajes", DEFAULT_MENSAJES); const cl = data.clientas.find(c => c._id === cita.clientaId); openWAClienta(cl, fillMsg(tpl.recordatorio || DEFAULT_MENSAJES.recordatorio, { nombre:cita.clientaNombre?.split(" ")[0], hora:cita.hora })); }} style={{ flex:1, background:"rgba(37,211,102,0.1)", border:"1px solid rgba(37,211,102,0.3)", borderRadius:4, padding:"2px 0", fontFamily:F.sans, fontSize:8, color:"rgba(37,211,102,0.85)", cursor:"pointer" }}>💬</button>
                            <button onClick={e => { e.stopPropagation(); push("cita-detalle", { cita }); }} style={{ flex:1, background:`rgba(${G.greenRGB},0.15)`, border:`1px solid rgba(${G.greenRGB},0.35)`, borderRadius:4, padding:"2px 0", fontFamily:F.sans, fontSize:8, color:G.greenL, cursor:"pointer" }}>$</button>
                          </>)}
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Event blocks */}
                {dayBloques.map(b => {
                  if (!b.horaInicio || b.horaInicio === "00:00") return null;
                  const startMin = toMin(b.horaInicio);
                  if (startMin < minMin || startMin >= maxMin) return null;
                  const top    = ((startMin - minMin) / 60) * ROW_H;
                  const height = Math.max(30, (b.duracion / 60) * ROW_H);
                  const tc = tipoEvColor(b.tipo);
                  return (
                    <div key={b._id}
                      onClick={e => { e.stopPropagation(); if (window.confirm(`Eliminar "${b.titulo}"?`)) data.borrarBloque(b._id); }}
                      style={{ position:"absolute", top, left:2, right:2, height,
                        background:tc.bg, borderLeft:`3px solid ${tc.color}`, border:`1px solid ${tc.border}`,
                        borderRadius:8, padding:"3px 5px", overflow:"hidden",
                        cursor:"pointer", zIndex:2 }}>
                      <p style={{ margin:0, fontFamily:F.sans, fontSize:10, color:tc.color,
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {tc.icon} {b.titulo}
                      </p>
                    </div>
                  );
                })}
                {/* Real-time now line */}
                {key === hoy && nowMin >= minMin && nowMin <= maxMin && (
                  <>
                    <div style={{ position:"absolute", left:-4, top:((nowMin-minMin)/60)*ROW_H - 5, width:10, height:10, borderRadius:"50%", background:"#e07070", zIndex:10 }} />
                    <div style={{ position:"absolute", left:0, right:0, top:((nowMin-minMin)/60)*ROW_H, height:1.5, background:"rgba(224,112,112,0.85)", zIndex:9 }} />
                    <div style={{ position:"absolute", left:2, top:((nowMin-minMin)/60)*ROW_H - 11, background:"#c85a5a", borderRadius:4, padding:"1px 5px", zIndex:11, pointerEvents:"none" }}>
                      <span style={{ fontFamily:F.sans, fontSize:8, color:"#fff", fontWeight:700, lineHeight:1.5 }}>{String(Math.floor(nowMin/60)).padStart(2,"0")}:{String(nowMin%60).padStart(2,"0")}</span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
}

// ── Día View ───────────────────────────────────────────────────────────────────
function AgendaDia({ data, push, toast, diaInicial }) {
  const hoy = hoyISO();
  const [dia, setDia] = useState(diaInicial || hoy);
  const esHoy = dia === hoy;
  const ROW_H = 56;
  const [nowMin, setNowMin] = useState(() => { const n = new Date(); return n.getHours()*60 + n.getMinutes(); });
  const [pagoTarget, setPagoTarget] = useState(null);
  const [quickPago, setQuickPago] = useState({ metodo:"efectivo", monto:"", montoEfectivo:"", montoTransf:"" });
  const [savingPago, setSavingPago] = useState(false);
  const [aplicarDescRapido, setAplicarDescRapido] = useState(false);

  useEffect(() => {
    const t = setInterval(() => { const n = new Date(); setNowMin(n.getHours()*60 + n.getMinutes()); }, 30_000);
    return () => clearInterval(t);
  }, []);

  const slotsGlobal   = data.getConfig("slots", []);
  const slotsPorDia   = data.getConfig("slotsPorDia", {});
  const dow           = new Date(dia + "T12:00:00").getDay();
  const daySlots      = slotsPorDia[dow] !== undefined ? slotsPorDia[dow] : slotsGlobal;

  const allMins = daySlots.map(toMin);
  const minMin  = Math.max(0, (allMins.length ? Math.min(...allMins) : 8*60) - 3*60);
  const maxMin  = (allMins.length ? Math.max(...allMins) : 17*60) + 3*60;
  const totalH  = Math.ceil((maxMin - minMin) / 60);

  const hourLabels = Array.from({ length:totalH }, (_, i) => {
    const m = minMin + i*60;
    return `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;
  });

  const allDayCitas = data.citas.filter(c => c.fecha === dia).sort((a,b) => a.hora.localeCompare(b.hora));
  const dayCitas    = allDayCitas.filter(c => c.estado !== "completada");

  const blkBg  = (e) => e==="confirmada" ? `rgba(${G.greenRGB},0.18)` : e==="solicitada" ? "rgba(224,184,112,0.18)" : "rgba(240,240,240,0.06)";
  const blkBdr = (e) => e==="confirmada" ? `rgba(${G.greenRGB},0.55)` : e==="solicitada" ? "rgba(224,184,112,0.55)"  : G.border;
  const blkTxt = (e) => e==="confirmada" ? G.greenL                   : e==="solicitada" ? G.amber                   : G.muted;

  const getDur = (cita) => data.servicios.find(s => s.nombre === cita.servicio)?.duracion || 60;

  const stepDia = (n) => {
    const d = new Date(dia + "T12:00:00");
    d.setDate(d.getDate() + n);
    setDia(d.toISOString().slice(0,10));
  };

  const abrirPago = (cita) => {
    const sv = data.servicios.find(s => s.nombre === cita.servicio);
    const precio = sv?.precio || 0;
    setQuickPago({ metodo:"efectivo", monto:String(precio), montoEfectivo:String(precio), montoTransf:"" });
    setPagoTarget(cita);
    setAplicarDescRapido(false);
  };

  const completarRapido = async () => {
    if (!pagoTarget) return;
    if (pagoTarget.fecha > hoyISO()) { toast("⚠️ La fecha del turno es futura"); return; }
    const metodo = quickPago.metodo;
    let montoBase = 0;
    if (metodo === "mixto") {
      montoBase = (parseFloat(quickPago.montoEfectivo)||0) + (parseFloat(quickPago.montoTransf)||0);
    } else {
      montoBase = parseFloat(quickPago.monto)||0;
    }
    if (!montoBase) { toast("ingresá el monto"); return; }

    const clientaRapida = data.clientas.find(c => c._id === pagoTarget.clientaId);
    const histRapido    = clientaRapida ? (Array.isArray(clientaRapida.historial) ? clientaRapida.historial : Object.values(clientaRapida.historial || {})) : [];
    const vInfoRapido   = calcVisitasDesc(histRapido, data.getConfig("promos", {}));
    const descRapido    = (aplicarDescRapido && vInfoRapido?.disponible)
      ? (vInfoRapido.cfg.tipo === "%" ? Math.round(montoBase * vInfoRapido.cfg.monto / 100) : Math.min(vInfoRapido.cfg.monto, montoBase))
      : 0;
    const monto = Math.max(0, montoBase - descRapido);

    setSavingPago(true);
    try {
      const registro = {
        fecha:dia, servicio:pagoTarget.servicio,
        monto, pago:metodo,
        ...(metodo === "mixto" ? { montoEfectivo:parseFloat(quickPago.montoEfectivo)||0, montoTransf:parseFloat(quickPago.montoTransf)||0 } : {}),
        ...(aplicarDescRapido && descRapido > 0 ? { descuentoVisitas:true, montoOriginal:montoBase, descuentoMonto:descRapido } : {}),
      };
      await data.registrarPago(pagoTarget.clientaId, pagoTarget._id, registro);
      const svObj = data.servicios.find(s => s.nombre === pagoTarget.servicio);
      if (svObj?.cuidados && pagoTarget.clientaUid) {
        sendPush([`clienta:${pagoTarget.clientaUid}`], "Cuidados de tu tratamiento 💚", svObj.cuidados);
      }
      toast("✓ turno completado");
      setPagoTarget(null);
    } catch { toast("Error al guardar"); }
    setSavingPago(false);
  };

  const cancelarRapido = async (cita) => {
    if (!window.confirm(`¿Cancelar el turno de ${cita.clientaNombre}?`)) return;
    await data.borrarCita(cita._id);
    if (cita.clientaUid) sendPush([`clienta:${cita.clientaUid}`], "Tu turno fue cancelado", `${cita.servicio} · ${cita.hora}`);
    toast("Turno cancelado");
  };

  const confirmarRapido = async (cita) => {
    await data.editarCita(cita._id, { estado:"confirmada" });
    if (cita.clientaUid) sendPush([`clienta:${cita.clientaUid}`], "¡Tu turno está confirmado! 🌿", `${cita.servicio} · ${fmtFecha(dia)} a las ${cita.hora}`);
    toast("✓ turno confirmado");
  };

  const totalPagoBase = quickPago.metodo === "mixto"
    ? (parseFloat(quickPago.montoEfectivo)||0) + (parseFloat(quickPago.montoTransf)||0)
    : parseFloat(quickPago.monto)||0;
  const vInfoDisp = pagoTarget ? (() => {
    const cliR = data.clientas.find(c => c._id === pagoTarget.clientaId);
    const hR   = cliR ? (Array.isArray(cliR.historial) ? cliR.historial : Object.values(cliR.historial || {})) : [];
    return calcVisitasDesc(hR, data.getConfig("promos", {}));
  })() : null;
  const descRapidoPreview = (aplicarDescRapido && vInfoDisp?.disponible && totalPagoBase > 0)
    ? (vInfoDisp.cfg.tipo === "%" ? Math.round(totalPagoBase * vInfoDisp.cfg.monto / 100) : Math.min(vInfoDisp.cfg.monto, totalPagoBase))
    : 0;
  const totalPago = Math.max(0, totalPagoBase - descRapidoPreview);

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 130px)" }}>
      {/* Header */}
      <div style={{ padding:"10px 14px 8px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <button style={{ ...s.btnGl, padding:"6px 14px", fontSize:15 }} onClick={() => stepDia(-1)}>‹</button>
        <div style={{ textAlign:"center" }}>
          {esHoy
            ? <p style={{ margin:0, fontFamily:F.display, fontSize:18, letterSpacing:"1px", color:G.greenL }}>HOY</p>
            : <p style={{ margin:0, fontFamily:F.display, fontWeight:400, fontSize:16, letterSpacing:"0.5px", color:G.white }}>{DIAS_F[dow]} {fmtFecha(dia)}</p>
          }
          {allDayCitas.length > 0 && <p style={{ margin:"2px 0 0", fontFamily:F.sans, fontSize:10, color:G.muted }}>{allDayCitas.length} turno{allDayCitas.length > 1 ? "s" : ""}</p>}
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {!esHoy && <button style={{ ...s.btnGl, padding:"6px 10px", fontSize:11 }} onClick={() => setDia(hoy)}>Hoy</button>}
          <button style={{ ...s.btnGl, padding:"6px 14px", fontSize:15 }} onClick={() => stepDia(1)}>›</button>
        </div>
      </div>

      {/* Live action cards for today */}
      {esHoy && allDayCitas.length > 0 && (
        <div style={{ flexShrink:0, padding:"0 12px 8px", display:"flex", flexDirection:"column", gap:8, maxHeight:"55vh", overflowY:"auto" }}>
          {allDayCitas.map(cita => {
            const citaMin   = toMin(cita.hora);
            const sv        = data.servicios.find(s => s.nombre === cita.servicio);
            const duracion  = sv?.duracion || 60;
            const enCurso   = cita.estado !== "completada" && citaMin <= nowMin && citaMin + duracion > nowMin;
            const esPasada  = cita.estado !== "completada" && citaMin + duracion <= nowMin;
            const completada = cita.estado === "completada";

            let cardBg = G.card;
            let cardBorder = G.border;
            if (completada)    { cardBg = `rgba(${G.greenRGB},0.07)`; cardBorder = `rgba(${G.greenRGB},0.25)`; }
            else if (enCurso)  { cardBg = `rgba(${G.greenRGB},0.14)`; cardBorder = `rgba(${G.greenRGB},0.7)`; }

            return (
              <div key={cita._id} style={{ border:`1.5px solid ${cardBorder}`, borderRadius:14, background:cardBg, overflow:"hidden", opacity:esPasada ? 0.6 : 1 }}>
                <div style={{ padding:"10px 14px 8px", cursor:"pointer", display:"flex", alignItems:"center", gap:10 }}
                  onClick={() => push("cita-detalle", { cita })}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:3 }}>
                      <p style={{ margin:0, fontFamily:F.sans, fontWeight:700, fontSize:13, color:G.white }}>{cita.hora}</p>
                      {enCurso && <span style={{ fontFamily:F.sans, fontSize:9, fontWeight:700, color:G.greenL, background:`rgba(${G.greenRGB},0.2)`, borderRadius:4, padding:"1px 6px" }}>EN CURSO</span>}
                      {completada && <span style={{ fontFamily:F.sans, fontSize:9, fontWeight:700, color:G.greenL, background:`rgba(${G.greenRGB},0.15)`, borderRadius:4, padding:"1px 6px" }}>✓ completada</span>}
                      {cita.estado === "solicitada" && <span style={{ fontFamily:F.sans, fontSize:9, fontWeight:700, color:G.amber, background:"rgba(224,184,112,0.15)", borderRadius:4, padding:"1px 6px" }}>pendiente</span>}
                    </div>
                    <p style={{ margin:0, fontFamily:F.sans, fontSize:13, color:G.sub }}>{cita.clientaNombre}</p>
                    <p style={{ margin:"2px 0 0", fontFamily:F.sans, fontSize:11, color:G.muted }}>{cita.servicio}{cita.adicionales?.length ? ` + ${cita.adicionales.join(", ")}` : ""}</p>
                  </div>
                  <Icon name="chevronRight" size={14} color={G.muted} />
                </div>
                {!completada && (
                  <div style={{ display:"flex", borderTop:`0.5px solid ${G.border}` }}>
                    {cita.estado === "solicitada" && (
                      <button style={{ flex:1, padding:"9px 0", background:"transparent", border:"none", cursor:"pointer", fontFamily:F.sans, fontSize:12, fontWeight:700, color:G.greenL, borderRight:`0.5px solid ${G.border}` }}
                        onClick={() => confirmarRapido(cita)}>✓ confirmar</button>
                    )}
                    {cita.estado === "confirmada" && (
                      <button style={{ flex:1, padding:"9px 0", background:"transparent", border:"none", cursor:"pointer", fontFamily:F.sans, fontSize:12, fontWeight:700, color:G.greenL, borderRight:`0.5px solid ${G.border}` }}
                        onClick={() => abrirPago(cita)}>✓ completar</button>
                    )}
                    <button style={{ flex:1, padding:"9px 0", background:"transparent", border:"none", cursor:"pointer", fontFamily:F.sans, fontSize:12, color:"rgba(220,100,100,0.8)" }}
                      onClick={() => cancelarRapido(cita)}>✕ cancelar</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {esHoy && allDayCitas.length === 0 && (
        <div style={{ padding:"16px 16px 8px", flexShrink:0 }}>
          <p style={{ fontFamily:F.sans, fontSize:13, color:G.muted, textAlign:"center", margin:0 }}>No hay turnos agendados para hoy</p>
        </div>
      )}

      {/* Time grid */}
      <div style={{ flex:1, overflowY:"auto", display:"flex" }}>
        <div style={{ width:42, flexShrink:0, borderRight:`0.5px solid ${G.border}` }}>
          {hourLabels.map(lbl => (
            <div key={lbl} style={{ height:ROW_H, display:"flex", alignItems:"flex-start", paddingTop:4, paddingRight:6, justifyContent:"flex-end", borderTop:`0.5px solid rgba(255,255,255,0.05)` }}>
              <span style={{ fontFamily:F.sans, fontSize:9, color:G.muted }}>{lbl}</span>
            </div>
          ))}
        </div>
        <div style={{ flex:1, position:"relative", height:totalH*ROW_H, background:esHoy ? `rgba(${G.greenRGB},0.02)` : "transparent" }}>
          {hourLabels.map((_, hi) => {
            const rowMin = minMin + hi*60;
            const nearestSlot = daySlots.find(sl => { const sm = toMin(sl); return sm >= rowMin && sm < rowMin+60; });
            const isPast = esHoy && (rowMin + 60) <= nowMin;
            return (
              <div key={hi} style={{ position:"absolute", top:hi*ROW_H, left:0, right:0, height:ROW_H, borderTop:`0.5px solid rgba(255,255,255,0.04)`, background:isPast ? "rgba(0,0,0,0.08)" : "transparent", cursor:nearestSlot && !isPast ? "pointer" : "default" }}
                onClick={() => nearestSlot && !isPast && push("nueva-cita", { fechaDefault:dia, horaDefault:nearestSlot })} />
            );
          })}
          {layoutCitas(allDayCitas, getDur).map(cita => {
            const startMin = toMin(cita.hora);
            if (startMin < minMin || startMin >= maxMin) return null;
            const duracion = getDur(cita);
            const top    = ((startMin - minMin) / 60) * ROW_H;
            const height = Math.max(40, (duracion / 60) * ROW_H);
            const done   = cita.estado === "completada";
            const colW   = 100 / cita._nCols;
            return (
              <div key={cita._id}
                onClick={e => { e.stopPropagation(); push("cita-detalle", { cita }); }}
                style={{ position:"absolute", top,
                  left:`calc(${cita._col * colW}% + 4px)`, width:`calc(${colW}% - 8px)`, height,
                  background:blkBg(cita.estado), border:`1px solid ${blkBdr(cita.estado)}`,
                  borderRadius:10, padding:"6px 9px", overflow:"hidden", cursor:"pointer", zIndex:2, boxSizing:"border-box" }}>
                <p style={{ margin:0, fontFamily:F.sans, fontWeight:700, fontSize:11, color:blkTxt(cita.estado) }}>{cita.hora} · {cita.clientaNombre}</p>
                <p style={{ margin:"2px 0 0", fontFamily:F.sans, fontSize:10, color:blkTxt(cita.estado), opacity:0.8 }}>{cita.servicio}</p>
                <span style={{ ...s.tag, position:"absolute", top:5, right:5, fontSize:8, padding:"2px 6px" }}>{done ? "completada" : cita.estado}</span>
                {height >= 80 && !done && (
                  <div style={{ position:"absolute", bottom:6, left:8, right:8, display:"flex", gap:6 }}
                    onClick={e => e.stopPropagation()}>
                    {cita.estado === "solicitada" && (<>
                      <button onClick={() => confirmarRapido(cita)} style={{ flex:1, background:`rgba(${G.greenRGB},0.2)`, border:`1px solid rgba(${G.greenRGB},0.4)`, borderRadius:6, padding:"4px 0", fontFamily:F.sans, fontSize:9, color:G.greenL, cursor:"pointer" }}>✓ confirmar</button>
                      <button onClick={() => cancelarRapido(cita)} style={{ flex:1, background:"rgba(220,70,70,0.15)", border:"1px solid rgba(220,70,70,0.35)", borderRadius:6, padding:"4px 0", fontFamily:F.sans, fontSize:9, color:"#e07070", cursor:"pointer" }}>✕ cancelar</button>
                    </>)}
                    {cita.estado === "confirmada" && (<>
                      <button onClick={() => { const tpl = data.getConfig("mensajes", DEFAULT_MENSAJES); const cl = data.clientas.find(c => c._id === cita.clientaId); openWAClienta(cl, fillMsg(tpl.recordatorio || DEFAULT_MENSAJES.recordatorio, { nombre:cita.clientaNombre?.split(" ")[0], hora:cita.hora })); }} style={{ flex:1, background:"rgba(37,211,102,0.1)", border:"1px solid rgba(37,211,102,0.3)", borderRadius:6, padding:"4px 0", fontFamily:F.sans, fontSize:9, color:"rgba(37,211,102,0.85)", cursor:"pointer" }}>💬 WA</button>
                      <button onClick={() => abrirPago(cita)} style={{ flex:1, background:`rgba(${G.greenRGB},0.15)`, border:`1px solid rgba(${G.greenRGB},0.35)`, borderRadius:6, padding:"4px 0", fontFamily:F.sans, fontSize:9, color:G.greenL, cursor:"pointer" }}>$ cobrar</button>
                    </>)}
                  </div>
                )}
              </div>
            );
          })}
          {/* Event blocks */}
          {(data.bloques || []).filter(b => b.fecha === dia && b.horaInicio && b.horaInicio !== "00:00").map(b => {
            const startMin = toMin(b.horaInicio);
            if (startMin < minMin || startMin >= maxMin) return null;
            const top    = ((startMin - minMin) / 60) * ROW_H;
            const height = Math.max(30, (b.duracion / 60) * ROW_H);
            const tc = tipoEvColor(b.tipo);
            return (
              <div key={b._id}
                onClick={e => { e.stopPropagation(); if (window.confirm(`Eliminar "${b.titulo}"?`)) data.borrarBloque(b._id); }}
                style={{ position:"absolute", top, left:4, right:4, height,
                  background:tc.bg, borderLeft:`3px solid ${tc.color}`, border:`1px solid ${tc.border}`,
                  borderRadius:10, padding:"6px 9px", overflow:"hidden", cursor:"pointer", zIndex:2 }}>
                <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:tc.color }}>{tc.icon} {b.titulo}</p>
              </div>
            );
          })}
          {esHoy && nowMin >= minMin && nowMin <= maxMin && (
            <>
              <div style={{ position:"absolute", left:-4, top:((nowMin-minMin)/60)*ROW_H - 5, width:10, height:10, borderRadius:"50%", background:"#e07070", zIndex:10 }} />
              <div style={{ position:"absolute", left:0, right:0, top:((nowMin-minMin)/60)*ROW_H, height:1.5, background:"rgba(224,112,112,0.85)", zIndex:9 }} />
              <div style={{ position:"absolute", left:2, top:((nowMin-minMin)/60)*ROW_H - 11, background:"#c85a5a", borderRadius:4, padding:"1px 5px", zIndex:11, pointerEvents:"none" }}>
                <span style={{ fontFamily:F.sans, fontSize:8, color:"#fff", fontWeight:700, lineHeight:1.5 }}>{String(Math.floor(nowMin/60)).padStart(2,"0")}:{String(nowMin%60).padStart(2,"0")}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Payment sheet */}
      {pagoTarget && (
        <div style={{ position:"fixed", inset:0, zIndex:200, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
          <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.55)" }} onClick={() => setPagoTarget(null)} />
          <div style={{ position:"relative", background:G.card, borderRadius:"18px 18px 0 0", padding:"20px 18px 32px", animation:"slideInUp 0.28s ease" }}>
            <div style={{ width:36, height:4, background:G.border, borderRadius:2, margin:"0 auto 16px" }} />
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:16, margin:"0 0 4px" }}>Registrar pago</p>
            <p style={{ fontFamily:F.sans, fontSize:12, color:G.muted, margin:"0 0 16px" }}>{pagoTarget.clientaNombre} · {pagoTarget.servicio}</p>
            <p style={{ ...s.eyebrow, marginBottom:8 }}>método de cobro</p>
            <div style={{ display:"flex", gap:8, marginBottom:16 }}>
              {["efectivo","transferencia","mixto"].map(m => (
                <button key={m} onClick={() => setQuickPago(p => ({ ...p, metodo:m }))}
                  style={{ flex:1, padding:"9px 0", borderRadius:10, border:`1.5px solid ${quickPago.metodo===m ? G.green : G.border}`, background:quickPago.metodo===m ? G.greenM : "transparent", fontFamily:F.sans, fontSize:11, fontWeight:quickPago.metodo===m ? 700 : 400, color:quickPago.metodo===m ? G.greenL : G.muted, cursor:"pointer" }}>
                  {m}
                </button>
              ))}
            </div>
            {quickPago.metodo === "mixto" ? (
              <div style={{ display:"flex", gap:9, marginBottom:16 }}>
                <div style={{ flex:1 }}>
                  <p style={{ ...s.label, marginBottom:4 }}>efectivo</p>
                  <input style={s.input} type="number" value={quickPago.montoEfectivo} onChange={e => setQuickPago(p => ({ ...p, montoEfectivo:e.target.value }))} placeholder="$0" />
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ ...s.label, marginBottom:4 }}>transferencia</p>
                  <input style={s.input} type="number" value={quickPago.montoTransf} onChange={e => setQuickPago(p => ({ ...p, montoTransf:e.target.value }))} placeholder="$0" />
                </div>
              </div>
            ) : (
              <div style={{ marginBottom:16 }}>
                <p style={{ ...s.label, marginBottom:4 }}>monto</p>
                <input style={s.input} type="number" value={quickPago.monto} onChange={e => setQuickPago(p => ({ ...p, monto:e.target.value }))} placeholder="$0" />
              </div>
            )}
            {vInfoDisp?.disponible && (
              <div onClick={() => setAplicarDescRapido(p => !p)} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, border:`1.5px solid ${aplicarDescRapido ? G.green : G.border}`, background:aplicarDescRapido ? G.greenM : "transparent", cursor:"pointer", marginBottom:12 }}>
                <div style={{ width:16, height:16, borderRadius:4, border:`1.5px solid ${aplicarDescRapido ? G.green : G.border}`, background:aplicarDescRapido ? G.green : "transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {aplicarDescRapido && <Icon name="check" size={10} color="#0a0a0a" strokeWidth={2.5} />}
                </div>
                <div>
                  <p style={{ margin:"0 0 1px", fontFamily:F.sans, fontSize:12, color:G.text, fontWeight:600 }}>🎯 Descuento por visitas</p>
                  <p style={{ margin:0, fontFamily:F.sans, fontSize:10, color:G.muted }}>
                    {vInfoDisp.cfg.tipo === "%" ? `−${vInfoDisp.cfg.monto}%` : `−$${vInfoDisp.cfg.monto}`}
                    {aplicarDescRapido && descRapidoPreview > 0 ? ` = −${fmtPesos(descRapidoPreview)}` : ""}
                  </p>
                </div>
              </div>
            )}
            {totalPago > 0 && (
              <div style={{ marginBottom:14, textAlign:"center" }}>
                {aplicarDescRapido && descRapidoPreview > 0 && (
                  <p style={{ fontFamily:F.sans, fontSize:11, color:G.muted, margin:"0 0 2px", textDecoration:"line-through" }}>{fmtPesos(totalPagoBase)}</p>
                )}
                <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:18, color:G.green, margin:0 }}>{fmtPesos(totalPago)}</p>
              </div>
            )}
            <button style={{ ...s.btnG, width:"100%", opacity:savingPago ? 0.6 : 1 }}
              disabled={savingPago} onClick={completarRapido}>
              {savingPago ? "guardando..." : "guardar y cerrar turno →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Nueva Cita ─────────────────────────────────────────────────────────────────
function NuevaCita({ data, pop, toast, fechaDefault = "", horaDefault = "", clientaIdDefault = "" }) {
  const [form, setForm] = useState({ clientaId:clientaIdDefault, fecha:fechaDefault, hora:horaDefault, servicio:"", notas:"", adicionales:[] });
  const [saving, setSaving]           = useState(false);
  const [customHora, setCustomHora]   = useState(false);
  const [recurrente, setRecurrente]   = useState(false);
  const [recurrInterval, setRecurrInterval] = useState(14);
  const [recurrReps, setRecurrReps]   = useState(3);
  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));
  const initNombre = clientaIdDefault ? (data.clientas.find(c => c._id === clientaIdDefault)?.nombre || "") : "";
  const [busq, setBusq]         = useState(initNombre);
  const [showDrop, setShowDrop] = useState(false);
  const clientasFiltradas = data.clientas
    .filter(c => !busq || c.nombre?.toLowerCase().includes(busq.toLowerCase()))
    .sort((a, b) => a.nombre?.localeCompare(b.nombre))
    .slice(0, 20);
  const slots = (() => {
    const global = data.getConfig("slots", []);
    const porDia = data.getConfig("slotsPorDia", {});
    const dow    = form.fecha ? new Date(form.fecha + "T12:00:00").getDay() : null;
    return dow !== null && porDia[dow] !== undefined ? porDia[dow] : global;
  })();
  const ocupadasBloques = (data.bloques || []).filter(b => b.fecha === form.fecha).map(b => b.horaInicio);
  const ocupadas = [
    ...data.citas.filter(c => c.fecha === form.fecha).map(c => c.hora),
    ...ocupadasBloques,
  ];

  const guardar = async () => {
    if (!form.clientaId || !form.fecha || !form.hora || !form.servicio) { toast("completá todos los campos"); return; }
    setSaving(true);
    const clienta = data.clientas.find(c => c._id === form.clientaId);
    const baseCita = { ...form, clientaNombre:clienta?.nombre || "", clientaUid:clienta?.uid || "", estado:"confirmada" };
    await data.crearCita(baseCita);
    if (recurrente && recurrInterval > 0 && recurrReps > 0) {
      const base = new Date(form.fecha + "T12:00:00");
      for (let i = 1; i <= Math.min(recurrReps, 12); i++) {
        const d = new Date(base);
        d.setDate(d.getDate() + recurrInterval * i);
        await data.crearCita({ ...baseCita, fecha: d.toISOString().slice(0, 10) });
      }
    }
    if (clienta?.uid) {
      sendPush([`clienta:${clienta.uid}`],
        "¡Tu turno está confirmado! 🌿",
        `${form.servicio} · ${form.fecha} a las ${form.hora}`);
    }
    toast(recurrente ? `✓ ${recurrReps + 1} turnos agendados` : "✓ turno agendado");
    pop();
  };

  return (
    <div>
      <div style={s.topBar}><Back onClick={pop} label="agenda" /><h1 style={s.h1}>Nuevo Turno</h1></div>
      <div style={{ padding:"18px" }}>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <Field label="clienta">
            <div style={{ position:"relative" }}>
              <input
                style={s.input}
                placeholder="Buscar clienta..."
                value={busq}
                autoComplete="off"
                onChange={e => { setBusq(e.target.value); set("clientaId", ""); setShowDrop(true); }}
                onFocus={() => setShowDrop(true)}
                onBlur={() => setTimeout(() => setShowDrop(false), 180)}
              />
              {showDrop && clientasFiltradas.length > 0 && (
                <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:60, background:G.card, border:`0.5px solid ${G.border}`, borderRadius:10, maxHeight:200, overflowY:"auto", boxShadow:`0 8px 24px ${G.shadow}` }}>
                  {clientasFiltradas.map(c => (
                    <div key={c._id}
                      onMouseDown={() => { set("clientaId", c._id); setBusq(c.nombre); setShowDrop(false); }}
                      style={{ padding:"10px 14px", cursor:"pointer", fontFamily:F.sans, fontSize:13, color:G.text, borderBottom:`0.5px solid ${G.border}` }}>
                      {c.nombre}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Field>
          <Field label="servicio">
            <select style={{ ...s.input, appearance:"none" }} value={form.servicio} onChange={e => set("servicio", e.target.value)}>
              <option value="">seleccionar servicio...</option>
              {data.servicios.map(sv => <option key={sv._id} value={sv.nombre}>{sv.nombre} · {fmtPesos(sv.precio)}</option>)}
            </select>
          </Field>
          {(() => {
            const adics = data.getConfig("adicionales", []);
            if (!adics.length) return null;
            return (
              <Field label="adicionales (opcional)">
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {adics.map(a => {
                    const sel = (form.adicionales||[]).includes(a.nombre);
                    return (
                      <div key={a.nombre}
                        onClick={() => set("adicionales", sel
                          ? (form.adicionales||[]).filter(x => x !== a.nombre)
                          : [...(form.adicionales||[]), a.nombre])}
                        style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:10, border:`0.5px solid ${sel ? G.green : G.border}`, background:sel ? G.greenM : "transparent", cursor:"pointer" }}>
                        <div style={{ width:16, height:16, borderRadius:4, border:`1.5px solid ${sel ? G.green : G.border}`, background:sel ? G.green : "transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          {sel && <Icon name="check" size={10} color="#0a0a0a" strokeWidth={2.5} />}
                        </div>
                        <div>
                          <p style={{ margin:"0 0 1px", fontFamily:F.sans, fontSize:13, color:G.text }}>{a.nombre}</p>
                          {(a.precio || a.duracion) && (
                            <p style={{ margin:0, fontFamily:F.sans, fontSize:10, color:G.muted }}>
                              {[a.duracion?`+${a.duracion}min`:"", a.precio?fmtPesos(a.precio):""].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Field>
            );
          })()}
          <Field label="fecha"><input style={s.input} type="date" value={form.fecha} min={hoyISO()} onChange={e => set("fecha", e.target.value)} /></Field>
          <Field label="hora">
            <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
              {slots.length === 0 && <p style={{ color:G.muted, fontSize:12 }}>Configurá los horarios en Config → Horarios</p>}
              {slots.map(h => { const oc = ocupadas.includes(h); return <button key={h} disabled={oc} onClick={() => set("hora", h)} style={{ ...s.btnGl, padding:"8px 12px", fontSize:12, opacity:oc ? 0.3 : 1, background:form.hora === h ? G.greenM : G.glass, borderColor:form.hora === h ? G.green : G.border, color:form.hora === h ? G.greenL : G.sub, cursor:oc ? "not-allowed" : "pointer" }}>{h}{oc ? " ✕" : ""}</button>; })}
            </div>
            <div style={{ marginTop:8 }}>
              <button style={{ ...s.btnGl, width:"100%", fontSize:11 }} onClick={() => setCustomHora(h => !h)}>
                {customHora ? "usar horarios configurados" : "ingresar horario personalizado"}
              </button>
              {customHora && (
                <div style={{ marginTop:8 }}>
                  <input style={s.input} type="time" value={form.hora} onChange={e => set("hora", e.target.value)} />
                </div>
              )}
            </div>
          </Field>
          <Field label="notas (opcional)"><textarea style={{ ...s.input, height:70, resize:"none" }} value={form.notas} onChange={e => set("notas", e.target.value)} placeholder="indicaciones especiales..." /></Field>

          {/* Recurrencia */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 0", borderTop:`0.5px solid ${G.border}` }}>
            <div>
              <p style={{ margin:"0 0 2px", fontFamily:F.sans, fontSize:13, color:G.text, fontWeight:600 }}>¿Clienta recurrente?</p>
              <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>Agendar turnos futuros automáticamente</p>
            </div>
            <button onClick={() => setRecurrente(r => !r)} style={{ flexShrink:0, padding:"7px 14px", borderRadius:20, border:`1.5px solid ${recurrente ? G.green : G.border}`, background:recurrente ? G.greenM : "transparent", fontFamily:F.sans, fontSize:12, fontWeight:700, color:recurrente ? G.greenL : G.muted, cursor:"pointer", transition:"all 0.15s", marginLeft:12 }}>
              {recurrente ? "Sí" : "No"}
            </button>
          </div>
          {recurrente && (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <Field label="cada cuántos días">
                  <input style={{ ...s.input, textAlign:"center" }} type="number" min="1" max="365" value={recurrInterval} onChange={e => setRecurrInterval(Math.max(1, Math.min(365, Number(e.target.value) || 1)))} />
                </Field>
                <Field label="repeticiones (máx. 12)">
                  <input style={{ ...s.input, textAlign:"center" }} type="number" min="1" max="12" value={recurrReps} onChange={e => setRecurrReps(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} />
                </Field>
              </div>
              <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted, background:G.glass, borderRadius:10, padding:"8px 12px", border:`0.5px solid ${G.border}` }}>
                Se crearán <strong style={{ color:G.greenL }}>{recurrReps}</strong> turnos adicionales, cada <strong style={{ color:G.greenL }}>{recurrInterval} días</strong>. Total: {recurrReps + 1} turnos.
              </p>
            </div>
          )}

          <button style={{ ...s.btnG, opacity:saving ? 0.6 : 1 }} onClick={guardar} disabled={saving}>
            {saving ? "guardando..." : recurrente ? `confirmar ${recurrReps + 1} turnos →` : "confirmar turno →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Detalle Cita ───────────────────────────────────────────────────────────────
function CitaDetalle({ data, pop, toast, cita:citaInit }) {
  const [cita, setCita]        = useState(citaInit);
  const [modalPago, setMP]     = useState(false);
  const [modalBorrar, setMB]   = useState(false);
  const [reagendando, setReag] = useState(false);
  const [reagForm, setReagForm] = useState({ fecha:"", hora:"" });
  const [pago, setPago] = useState({ metodo:"efectivo", montoEfectivo:"", montoTransf:"", montoTotal:"" });
  const [aplicarDescVisitas, setAplicarDescVisitas] = useState(false);

  const sv      = data.servicios.find(s => s.nombre === cita.servicio);
  const clienta = data.clientas.find(c => c._id === cita.clientaId);
  const estudio = data.getConfig("estudio", {});

  const clientaHist = clienta ? (Array.isArray(clienta.historial) ? clienta.historial : Object.values(clienta.historial || {})) : [];
  const promosConfig = data.getConfig("promos", {});
  const visitasDescInfo = calcVisitasDesc(clientaHist, promosConfig);

  // Calcular total según modo
  const modoMixto = pago.metodo === "mixto";
  const totalSinDesc = modoMixto
    ? (Number(pago.montoEfectivo)||0) + (Number(pago.montoTransf)||0)
    : Number(pago.montoTotal)||0;

  const calcDescMonto = (base) => {
    if (!visitasDescInfo?.disponible || !aplicarDescVisitas) return 0;
    const cfg = visitasDescInfo.cfg;
    return cfg.tipo === "%" ? Math.round(base * cfg.monto / 100) : Math.min(cfg.monto, base);
  };
  const descMonto = calcDescMonto(totalSinDesc);
  const totalCalculado = Math.max(0, totalSinDesc - descMonto);

  const completar = async () => {
    if (!cita.clientaId) { toast("sin clienta — no se puede cerrar"); return; }
    if (cita.fecha > hoyISO()) { toast("⚠️ La fecha del turno es futura — no se puede cerrar antes de que ocurra"); return; }
    if (modoMixto && !pago.montoEfectivo && !pago.montoTransf) { toast("ingresá al menos un monto"); return; }
    if (!modoMixto && !pago.montoTotal) { toast("ingresá el monto"); return; }

    const registro = {
      fecha:    cita.fecha,
      servicio: cita.servicio,
      curva:    clienta?.curva || "",
      notas:    cita.notas || "",
      pago:     pago.metodo,
      monto:    totalCalculado,
      ...(modoMixto ? { montoEfectivo:Number(pago.montoEfectivo)||0, montoTransf:Number(pago.montoTransf)||0 } : {}),
      ...(aplicarDescVisitas && descMonto > 0 ? { descuentoVisitas:true, montoOriginal:totalSinDesc, descuentoMonto:descMonto } : {}),
    };

    await data.registrarPago(cita.clientaId, cita._id, registro);
    const svObj = data.servicios.find(s => s.nombre === cita.servicio);
    if (svObj?.cuidados && cita.clientaUid) {
      sendPush([`clienta:${cita.clientaUid}`], "Cuidados de tu tratamiento 💚", svObj.cuidados);
    }
    toast("Cita completada y pago registrado");
    setMP(false);
    setCita(p => ({ ...p, estado:"completada" }));
  };

  const borrar = async () => {
    if (cita.estado === "completada" && cita.clientaId) {
      // Always query Firebase directly to get the push keys — local state may be an array without keys
      const rawHist = await db.getVal(`clientas/${cita.clientaId}/historial`);
      if (rawHist && typeof rawHist === "object" && !Array.isArray(rawHist)) {
        const match = Object.entries(rawHist).find(([, v]) => v.fecha === cita.fecha && v.servicio === cita.servicio);
        if (match) await db.del(`clientas/${cita.clientaId}/historial/${match[0]}`);
      }
    }
    await data.borrarCita(cita._id);
    toast("turno eliminado"); pop();
  };

  const confirmarSolicitud = async () => {
    await data.editarCita(cita._id, { estado:"confirmada" });
    setCita(c => ({ ...c, estado:"confirmada" }));
    if (cita.clientaUid) sendPush([`clienta:${cita.clientaUid}`], "¡Tu turno está confirmado! 🌿", `${cita.servicio} · ${fmtFecha(cita.fecha)} a las ${cita.hora}`);
    toast("✓ turno confirmado");
  };

  const rechazarSolicitud = async () => {
    await data.borrarCita(cita._id);
    if (cita.clientaUid) sendPush([`clienta:${cita.clientaUid}`], "Tu solicitud no pudo confirmarse", "Ese horario no está disponible. Pedí otra fecha.");
    toast("solicitud eliminada"); pop();
  };

  const slots = (() => {
    const global = data.getConfig("slots", []);
    const porDia = data.getConfig("slotsPorDia", {});
    const dow    = reagForm.fecha ? new Date(reagForm.fecha + "T12:00:00").getDay() : null;
    return dow !== null && porDia[dow] !== undefined ? porDia[dow] : global;
  })();
  const ocupadasReag = reagForm.fecha
    ? [...data.citas.filter(c => c.fecha === reagForm.fecha && c._id !== cita._id).map(c => c.hora),
       ...(data.bloques || []).filter(b => b.fecha === reagForm.fecha).map(b => b.horaInicio)]
    : [];

  const guardarReagenda = async () => {
    if (!reagForm.fecha || !reagForm.hora) { toast("elegí fecha y hora"); return; }
    await data.editarCita(cita._id, { fecha:reagForm.fecha, hora:reagForm.hora });
    setCita(c => ({ ...c, fecha:reagForm.fecha, hora:reagForm.hora }));
    if (cita.clientaUid) sendPush([`clienta:${cita.clientaUid}`], "Tu turno fue reagendado 📅", `${cita.servicio} · ${fmtFecha(reagForm.fecha)} a las ${reagForm.hora}`);
    toast("✓ turno reagendado"); setReag(false);
  };

  const msgRecordatorio = `Hola ${cita.clientaNombre?.split(" ")[0]}! 🌿 Te recuerdo tu turno el ${fmtFecha(cita.fecha)} a las ${cita.hora} en ${estudio.nombre || "el estudio"}. ¡Te espero! 💚`;

  return (
    <div>
      <div style={s.topBar}><Back onClick={pop} /><h1 style={s.h1}>Detalle de Turno</h1><p style={s.sub}>{cita.fecha} · {cita.hora}</p></div>
      <div style={{ padding:"18px" }}>
        {clienta && (
          <div style={{ ...s.card, display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
            <Avatar nombre={clienta.nombre} size={46} />
            <div style={{ flex:1 }}>
              <p style={{ margin:"0 0 2px", fontFamily:F.serif, fontWeight:700, fontSize:15 }}>{clienta.nombre}</p>
              {clienta.curva && <p style={{ margin:0, ...s.sub, fontSize:11 }}>curva {clienta.curva}{clienta.largo ? ` · ${clienta.largo}` : ""}</p>}
              {clienta.alergias && clienta.alergias !== "Ninguna" && <p style={{ margin:"3px 0 0", color:G.red, fontSize:10 }}>⚠ {clienta.alergias}</p>}
            </div>
            {/* WA con número de la clienta */}
            <button style={{ background:"rgba(37,211,102,0.12)", border:"0.5px solid rgba(37,211,102,0.3)", borderRadius:10, width:36, height:36, cursor:"pointer", fontSize:17, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}
              onClick={() => openWAClienta(clienta, msgRecordatorio)}><Icon name="messageCircle" size={17} color="rgba(37,211,102,0.8)" /></button>
          </div>
        )}
        <div style={{ ...s.card, marginBottom:12 }}>
          <p style={{ fontFamily:F.sans, fontSize:10, color:G.muted, margin:"0 0 6px", textTransform:"lowercase" }}>servicio</p>
          <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:17, color:G.white, margin:"0 0 6px" }}>{cita.servicio}</p>
          {sv?.descripcion && <p style={{ margin:"0 0 10px", fontFamily:F.sans, fontSize:12, color:G.sub }}>{sv.descripcion}</p>}
          <div style={{ display:"flex", gap:8 }}>
            <div style={{ flex:1, background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"10px" }}>
              <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:"0 0 3px", textTransform:"lowercase" }}>duración est.</p>
              <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:17, margin:0 }}>{sv?.duracion || "—"}min</p>
            </div>
            <div style={{ flex:1, background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"10px" }}>
              <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:"0 0 3px", textTransform:"lowercase" }}>precio</p>
              <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:17, color:G.green, margin:0 }}>{fmtPesos(sv?.precio)}</p>
            </div>
          </div>
        </div>
        {cita.notas && <div style={{ ...s.card, background:"rgba(143,189,90,0.05)", borderColor:G.greenD, marginBottom:12 }}><p style={{ fontFamily:F.sans, fontSize:10, color:G.muted, margin:"0 0 4px" }}>notas</p><p style={{ margin:0, fontFamily:F.sans, fontSize:13, color:G.sub }}>{cita.notas}</p></div>}
        <span style={{ ...s.tag, marginBottom:16, display:"inline-block" }}>{cita.estado}</span>

        {cita.estado === "solicitada" && (
          <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
            <div style={{ ...s.card, background:"rgba(224,184,112,0.07)", borderColor:"rgba(224,184,112,0.35)", padding:"10px 14px", marginBottom:4 }}>
              <p style={{ fontFamily:F.sans, fontSize:12, color:G.amber, margin:0, display:"flex", alignItems:"center", gap:6 }}><Icon name="clock" size={13} color={G.amber} /> Solicitud pendiente de confirmación</p>
            </div>
            <button style={s.btnG} onClick={confirmarSolicitud}>✓ confirmar turno</button>
            {reagendando ? (
              <div style={{ ...s.card }}>
                <p style={{ ...s.eyebrow, marginBottom:10 }}>reagendar y confirmar</p>
                <Field label="nueva fecha"><input style={s.input} type="date" value={reagForm.fecha} onChange={e => setReagForm(f => ({...f, fecha:e.target.value, hora:""}))} /></Field>
                {reagForm.fecha && (
                  <Field label="nuevo horario">
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:6 }}>
                      {slots.map(h => {
                        const oc = ocupadasReag.includes(h);
                        return (
                          <button key={h} disabled={oc} onClick={() => setReagForm(f => ({...f, hora:h}))}
                            style={{ ...s.btnGl, padding:"8px 12px", fontSize:12, opacity:oc?0.3:1, background:reagForm.hora===h?G.greenM:G.glass, borderColor:reagForm.hora===h?G.green:G.border, color:reagForm.hora===h?G.greenL:G.sub }}>
                            {h}{oc?" ✕":""}
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                )}
                <div style={{ display:"flex", gap:9, marginTop:12 }}>
                  <button style={{ ...s.btnGl, flex:1 }} onClick={() => setReag(false)}>cancelar</button>
                  <button style={{ ...s.btnG, flex:1 }} onClick={async () => {
                    if (!reagForm.fecha || !reagForm.hora) { toast("elegí fecha y hora"); return; }
                    await data.editarCita(cita._id, { fecha:reagForm.fecha, hora:reagForm.hora, estado:"confirmada" });
                    setCita(c => ({ ...c, fecha:reagForm.fecha, hora:reagForm.hora, estado:"confirmada" }));
                    if (cita.clientaUid) sendPush([`clienta:${cita.clientaUid}`], "¡Tu turno está confirmado! 🌿", `${cita.servicio} · ${fmtFecha(reagForm.fecha)} a las ${reagForm.hora}`);
                    toast("✓ turno reagendado y confirmado"); setReag(false);
                  }}>confirmar y guardar →</button>
                </div>
              </div>
            ) : (
              <button style={{ ...s.btnGl, width:"100%" }} onClick={() => setReag(true)}>Reagendar y confirmar</button>
            )}
            <button style={{ ...s.btnRed, width:"100%" }} onClick={rechazarSolicitud}>rechazar solicitud</button>
          </div>
        )}
        {cita.estado === "confirmada" && (
          <>
            {reagendando ? (
              <div style={{ ...s.card, marginBottom:14 }}>
                <p style={{ ...s.eyebrow, marginBottom:10 }}>reagendar turno</p>
                <Field label="nueva fecha"><input style={s.input} type="date" value={reagForm.fecha} onChange={e => setReagForm(f => ({...f, fecha:e.target.value, hora:""}))} /></Field>
                {reagForm.fecha && (
                  <Field label="nuevo horario">
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:6 }}>
                      {slots.length === 0 && <p style={{ color:G.muted, fontSize:12 }}>Configurá horarios en Config → Horarios</p>}
                      {slots.map(h => {
                        const oc = ocupadasReag.includes(h);
                        return (
                          <button key={h} disabled={oc} onClick={() => setReagForm(f => ({...f, hora:h}))}
                            style={{ ...s.btnGl, padding:"8px 12px", fontSize:12, opacity:oc?0.3:1,
                              background:reagForm.hora===h ? G.greenM : G.glass,
                              borderColor:reagForm.hora===h ? G.green : G.border,
                              color:reagForm.hora===h ? G.greenL : G.sub }}>
                            {h}{oc?" ✕":""}
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                )}
                <div style={{ display:"flex", gap:9, marginTop:12 }}>
                  <button style={{ ...s.btnGl, flex:1 }} onClick={() => setReag(false)}>cancelar</button>
                  <button style={{ ...s.btnG, flex:1 }} onClick={guardarReagenda}>guardar →</button>
                </div>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                <button style={s.btnG} onClick={() => setMP(true)}>✓ marcar como completada</button>
                <button style={{ ...s.btnGl, width:"100%" }} onClick={() => setReag(true)}>Reagendar</button>
                <button style={{ ...s.btnGl, width:"100%" }} onClick={() => openWAClienta(clienta, msgRecordatorio)}>Recordatorio a {clienta?.nombre?.split(" ")[0] || "clienta"}</button>
                <button style={{ ...s.btnRed, width:"100%" }} onClick={() => setMB(true)}>eliminar turno</button>
              </div>
            )}
          </>
        )}
        {!["solicitada","confirmada","completada"].includes(cita.estado) && (
          <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
            <button style={s.btnG} onClick={() => setMP(true)}>✓ marcar como completada</button>
            <button style={{ ...s.btnGl, width:"100%" }} onClick={() => openWAClienta(clienta, msgRecordatorio)}>Recordatorio a {clienta?.nombre?.split(" ")[0] || "clienta"}</button>
            <button style={{ ...s.btnRed, width:"100%" }} onClick={() => setMB(true)}>eliminar cita</button>
          </div>
        )}
        {cita.estado === "completada" && (
          <div style={{ display:"flex", flexDirection:"column", gap:9, alignItems:"center" }}>
            <p style={{ color:G.green, fontFamily:F.sans, fontSize:13, textAlign:"center", margin:0 }}>✓ Turno completado y pago registrado</p>
            <button style={{ ...s.btnRed, width:"100%" }} onClick={() => setMB(true)}>eliminar turno y revertir pago</button>
          </div>
        )}
      </div>

      {/* ── Modal Pago con opción mixta ── */}
      {modalPago && (
        <Sheet titulo="Registrar pago" onClose={() => setMP(false)}>
          <Field label="método de pago">
            <div style={{ display:"flex", gap:7 }}>
              {[["efectivo","Efectivo"],["transferencia","Transferencia"],["mixto","Mixto"]].map(([m, l]) => (
                <button key={m} onClick={() => setPago(p => ({ ...p, metodo:m }))}
                  style={{ ...s.btnGl, flex:1, fontSize:11, padding:"8px 4px", background:pago.metodo === m ? G.greenM : G.glass, borderColor:pago.metodo === m ? G.green : G.border, color:pago.metodo === m ? G.greenL : G.sub }}>
                  {l}
                </button>
              ))}
            </div>
          </Field>

          {pago.metodo === "mixto" ? (
            <>
              <Field label="monto en efectivo">
                <input style={s.input} type="number" value={pago.montoEfectivo} onChange={e => setPago(p => ({ ...p, montoEfectivo:e.target.value }))} placeholder="0" />
              </Field>
              <Field label="monto por transferencia">
                <input style={s.input} type="number" value={pago.montoTransf} onChange={e => setPago(p => ({ ...p, montoTransf:e.target.value }))} placeholder="0" />
              </Field>
              {totalSinDesc > 0 && (
                <div style={{ ...s.card, background:"rgba(143,189,90,0.06)", borderColor:G.greenD, padding:"10px 14px", marginBottom:4 }}>
                  <p style={{ fontFamily:F.sans, fontSize:11, color:G.muted, margin:"0 0 2px" }}>total a cobrar</p>
                  <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:20, color:G.green, margin:0 }}>{fmtPesos(totalCalculado)}</p>
                </div>
              )}
            </>
          ) : (
            <Field label="monto cobrado" hint={sv?.precio ? `precio sugerido: ${fmtPesos(sv.precio)}` : ""}>
              <input style={s.input} type="number" value={pago.montoTotal} onChange={e => setPago(p => ({ ...p, montoTotal:e.target.value }))} placeholder={String(sv?.precio || 0)} />
            </Field>
          )}

          {visitasDescInfo?.disponible && (
            <div onClick={() => setAplicarDescVisitas(p => !p)} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:12, border:`1.5px solid ${aplicarDescVisitas ? G.green : G.border}`, background:aplicarDescVisitas ? G.greenM : "transparent", cursor:"pointer", marginBottom:4 }}>
              <div style={{ width:18, height:18, borderRadius:4, border:`1.5px solid ${aplicarDescVisitas ? G.green : G.border}`, background:aplicarDescVisitas ? G.green : "transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                {aplicarDescVisitas && <Icon name="check" size={11} color="#0a0a0a" strokeWidth={2.5} />}
              </div>
              <div>
                <p style={{ margin:"0 0 1px", fontFamily:F.sans, fontSize:13, color:G.text, fontWeight:600 }}>🎯 Descuento por visitas</p>
                <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>
                  {visitasDescInfo.cfg.tipo === "%" ? `−${visitasDescInfo.cfg.monto}%` : `−$${visitasDescInfo.cfg.monto}`}
                  {aplicarDescVisitas && descMonto > 0 ? ` = −${fmtPesos(descMonto)}` : ""}
                </p>
              </div>
            </div>
          )}

          {aplicarDescVisitas && descMonto > 0 && totalSinDesc > 0 && (
            <div style={{ ...s.card, margin:"0 0 4px", background:"rgba(143,189,90,0.06)", borderColor:G.greenD, padding:"10px 14px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>precio original</p>
                <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>{fmtPesos(totalSinDesc)}</p>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.greenL }}>descuento</p>
                <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.greenL }}>−{fmtPesos(descMonto)}</p>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.green }}>total</p>
                <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.green }}>{fmtPesos(totalCalculado)}</p>
              </div>
            </div>
          )}

          <button style={s.btnG} onClick={completar}>guardar y cerrar cita →</button>
        </Sheet>
      )}
      {modalBorrar && <Modal titulo="Eliminar turno" msg={`¿Segura que querés eliminar el turno de ${cita.clientaNombre}?`} onOk={borrar} onCancel={() => setMB(false)} okLabel="eliminar" danger />}
    </div>
  );
}

// ── Admin Clientas ─────────────────────────────────────────────────────────────
function AdminClientas({ data, push, toast }) {
  const [search, setSearch]     = useState("");
  const [orden, setOrden]       = useState("az");
  const [sheet, setSheet]       = useState(false);
  const [creds, setCreds]       = useState(null);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({ nombre:"", email:"", telefono:"", fechaNacimiento:"", curva:"", grosor:"", largo:"", alergias:"", observaciones:"", emergencia:"" });
  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));
  const wide = useIsWide();

  const opcCurvas = data.getConfig("curvas",   []);
  const opcGrosor = data.getConfig("grosores", []);
  const opcLargo  = data.getConfig("largos",   []);

  const getUlt = (c) => {
    const h = Array.isArray(c.historial) ? c.historial : (c.historial ? Object.values(c.historial) : []);
    return h.length ? [...h].sort((a, b) => b.fecha?.localeCompare(a.fecha))[0] : null;
  };

  const hoyStr = hoyISO();
  const getProxCita = (c) => {
    const citasC = data.citas.filter(x => x.clientaId === c._id && x.fecha >= hoyStr && x.estado !== "cancelada" && x.estado !== "completada");
    return citasC.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora))[0] || null;
  };

  const filtradas = data.clientas
    .filter(c => {
      if (!c.nombre?.toLowerCase().includes(search.toLowerCase())) return false;
      if (orden === "inactivas") {
        const ult = getUlt(c);
        if (!ult) return false;
        const diasSinVisita = Math.floor((new Date(hoyStr) - new Date(ult.fecha)) / (1000*60*60*24));
        return diasSinVisita >= 30 && !getProxCita(c);
      }
      if (orden === "proximas") return !!getProxCita(c);
      return true;
    })
    .sort((a, b) => {
      if (orden === "az") return a.nombre?.localeCompare(b.nombre);
      if (orden === "inactivas") {
        const ua = getUlt(a)?.fecha || ""; const ub = getUlt(b)?.fecha || "";
        return ua.localeCompare(ub);
      }
      if (orden === "proximas") {
        const pa = getProxCita(a)?.fecha || ""; const pb = getProxCita(b)?.fecha || "";
        return pa.localeCompare(pb);
      }
      const ua = getUlt(a)?.fecha || ""; const ub = getUlt(b)?.fecha || "";
      return ub.localeCompare(ua);
    });

  const guardar = async () => {
    if (!form.nombre.trim()) { toast("el nombre es obligatorio"); return; }
    setSaving(true);
    try {
      const res = await data.crearClientas(form);
      if (res.error) { toast("error: " + res.error); return; }
      setSheet(false);
      setCreds(res.emailExists
        ? { emailExists:true, nombre:form.nombre, telefono:form.telefono, email:res.email, pass:res.pass }
        : res.noAccount
        ? { noAccount:true, nombre:form.nombre }
        : { email:res.email, pass:res.pass, nombre:form.nombre, telefono:form.telefono });
      setForm({ nombre:"", email:"", telefono:"", fechaNacimiento:"", curva:"", grosor:"", largo:"", alergias:"", observaciones:"", emergencia:"" });
    } catch(e) { toast("Error al crear: " + (e?.message || "intentá de nuevo")); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div style={{ ...s.topBar, ...(wide && { padding:"16px 28px 14px" }) }}><h1 style={s.h1}>Clientas</h1><p style={s.sub}>{data.clientas.length} registradas</p></div>
      <div style={{ padding: wide ? "20px 28px" : "18px" }}>
        <div style={{ display:"flex", gap:9, marginBottom:12 }}>
          <input style={{ ...s.input, flex:1, margin:0 }} placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
          <button style={{ ...s.btnG, width:"auto", padding:"9px 14px", fontSize:12 }} onClick={() => setSheet(true)}>+ nueva</button>
        </div>
        <div style={{ display:"flex", gap:7, marginBottom:14, flexWrap:"wrap" }}>
          {[["az", "A → Z"], ["reciente", "última visita"], ["inactivas", "+30d sin turno"], ["proximas", "turno próximo"]].map(([v, l]) => (
            <button key={v} onClick={() => setOrden(v)} style={{ ...s.btnGl, fontSize:11, background:orden === v ? G.greenM : "transparent", borderColor:orden === v ? G.green : G.border, color:orden === v ? G.greenL : G.muted, padding:"8px 12px", fontWeight:orden === v ? 700 : 400 }}>{l}</button>
          ))}
        </div>
        {filtradas.length === 0 && <p style={{ color:G.muted, fontSize:13 }}>Sin clientas aún</p>}
        <div style={wide ? { display:"grid", gridTemplateColumns:"1fr 1fr", gap:0 } : {}}>
        {filtradas.map(c => {
          const ult = getUlt(c);
          const hist = Array.isArray(c.historial) ? c.historial : (c.historial ? Object.values(c.historial) : []);
          const dias = ult?.fecha ? Math.floor((new Date() - new Date(ult.fecha)) / (1000 * 60 * 60 * 24)) : null;
          const fnac = c.fechaNacimiento;
          let diasCumple = null;
          if (fnac) {
            const hoyStr = hoyISO();
            const [, mm, dd] = fnac.split("-");
            const anio = parseInt(hoyStr.slice(0,4));
            let bd = `${anio}-${mm}-${dd}`;
            if (bd < hoyStr) bd = `${anio+1}-${mm}-${dd}`;
            diasCumple = Math.ceil((new Date(bd+"T12:00:00") - new Date(hoyStr+"T12:00:00")) / (1000*60*60*24));
          }
          const cumpleTag = diasCumple !== null && diasCumple <= 14;
          return (
            <div key={c._id} style={{ ...s.card, display:"flex", alignItems:"center", gap:11, cursor:"pointer", opacity:c.estado === "pausada" ? 0.5 : 1 }} onClick={() => push("clienta-detalle", { clienta:c })}>
              <Avatar nombre={c.nombre} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <p style={{ margin:"0 0 2px", fontFamily:F.serif, fontSize:14, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.nombre}</p>
                  {c.estado === "pausada" && <span style={{ ...s.tag, fontSize:9, background:"rgba(224,112,112,0.12)", borderColor:G.red, color:G.red }}>pausada</span>}
                  {cumpleTag && <span style={{ ...s.tag, fontSize:9, background:"rgba(245,200,66,0.15)", borderColor:"rgba(245,200,66,0.5)", color:"#f5c842" }}>{diasCumple===0?"🎂 hoy":`🎂 en ${diasCumple}d`}</span>}
                </div>
                <p style={{ margin:0, ...s.sub, fontSize:11 }}>{ult ? `última visita: ${fmtFecha(ult.fecha)}` : "Sin visitas aún"}{dias !== null ? ` · hace ${dias}d` : ""}</p>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <p style={{ margin:"0 0 2px", ...s.sub, fontSize:10 }}>{hist.length} vis.</p>
                <span style={{ fontSize:15, color:G.muted }}>→</span>
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {sheet && (
        <Sheet titulo="Nueva Clienta" onClose={() => setSheet(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Field label="nombre y apellido *"><input style={s.input} value={form.nombre} onChange={e => set("nombre", e.target.value)} placeholder="Nombre Apellido" /></Field>
            <Field label="email" hint="Opcional — sin email la clienta no tendrá acceso al panel"><input style={s.input} type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="email@ejemplo.com (opcional)" /></Field>
            <Field label="teléfono"><input style={s.input} type="tel" value={form.telefono} onChange={e => set("telefono", e.target.value)} placeholder="11 XXXX-XXXX" /></Field>
            <Field label="fecha de nacimiento"><input style={s.input} type="date" value={form.fechaNacimiento} onChange={e => set("fechaNacimiento", e.target.value)} /></Field>
            <div style={s.div} />
            {opcCurvas.length > 0 && <Field label="curva habitual"><Chips options={opcCurvas} value={form.curva} onChange={v => set("curva", v)} /></Field>}
            {opcGrosor.length > 0 && <Field label="grosor"><Chips options={opcGrosor} value={form.grosor} onChange={v => set("grosor", v)} /></Field>}
            {opcLargo.length  > 0 && <Field label="largo"><Chips  options={opcLargo}  value={form.largo}  onChange={v => set("largo",  v)} /></Field>}
            {(opcCurvas.length === 0 && opcGrosor.length === 0 && opcLargo.length === 0) && <p style={{ color:G.muted, fontSize:12 }}>Agregá opciones técnicas desde Config → Técnico</p>}
            <div style={s.div} />
            <Field label="alergias / condiciones"><input style={s.input} value={form.alergias} onChange={e => set("alergias", e.target.value)} placeholder="Ninguna, o especificar..." /></Field>
            <Field label="observaciones"><textarea style={{ ...s.input, height:60, resize:"none" }} value={form.observaciones} onChange={e => set("observaciones", e.target.value)} placeholder="preferencias, notas..." /></Field>
            <Field label="contacto de emergencia"><input style={s.input} value={form.emergencia} onChange={e => set("emergencia", e.target.value)} placeholder="nombre y teléfono..." /></Field>
            <button style={{ ...s.btnG, opacity:saving ? 0.6 : 1 }} onClick={guardar} disabled={saving}>{saving ? "guardando..." : "crear clienta →"}</button>
            <p style={{ fontFamily:F.sans, fontSize:11, color:G.muted, textAlign:"center" }}>Con email: se genera contraseña para enviar por WhatsApp. Sin email: contacto CRM sin acceso al panel.</p>
          </div>
        </Sheet>
      )}

      {creds && (
        <Sheet titulo={creds.emailExists ? "⚠ Email ya registrado" : creds.noAccount ? "✓ Contacto guardado" : "✓ Clienta creada"} onClose={() => setCreds(null)}>
          {creds.emailExists ? (
            <>
              <p style={{ fontFamily:F.sans, fontSize:12, color:G.amber, margin:"0 0 12px", lineHeight:1.6 }}>
                Este email ya tenía cuenta. Abrí la ficha de <b>{creds.nombre}</b> → "Nueva contraseña" para sincronizar el acceso, luego enviásela por WhatsApp.
              </p>
              <div style={{ ...s.card, background:"rgba(143,189,90,0.06)", borderColor:G.greenD, marginBottom:14 }}>
                <p style={{ fontFamily:F.sans, fontSize:12, color:G.muted, margin:"0 0 8px" }}>accesos para {creds.nombre}:</p>
                <p style={{ fontFamily:F.sans, fontSize:13, color:G.sub, margin:"0 0 4px" }}><b style={{ color:G.white }}>{creds.email}</b></p>
                <p style={{ fontFamily:F.sans, fontSize:13, color:G.sub, margin:0 }}>Contraseña: <b style={{ color:G.white, letterSpacing:"0.1em" }}>{creds.pass}</b></p>
              </div>
              <button style={s.btnG} onClick={() => { const tpl = data.getConfig("mensajes", DEFAULT_MENSAJES); const estudio = data.getConfig("estudio", {}); openWAClienta({ telefono:creds.telefono }, fillMsg(tpl.bienvenida || DEFAULT_MENSAJES.bienvenida, { nombre:creds.nombre?.split(" ")[0], estudio:estudio.nombre || "Lash Studio", email:creds.email, pass:creds.pass, url:DEPLOY_URL })); setCreds(null); }}>Enviar por WhatsApp →</button>
            </>
          ) : creds.noAccount ? (
            <div style={{ ...s.card, background:"rgba(143,189,90,0.06)", borderColor:G.greenD, marginBottom:14 }}>
              <p style={{ fontFamily:F.sans, fontSize:13, color:G.sub, margin:0 }}><b style={{ color:G.white }}>{creds.nombre}</b> fue guardada como contacto CRM sin acceso al panel.</p>
            </div>
          ) : (
            <div style={{ ...s.card, background:"rgba(143,189,90,0.06)", borderColor:G.greenD, marginBottom:14 }}>
              <p style={{ fontFamily:F.sans, fontSize:12, color:G.muted, margin:"0 0 8px" }}>accesos para {creds.nombre}:</p>
              <p style={{ fontFamily:F.sans, fontSize:13, color:G.sub, margin:"0 0 4px" }}><b style={{ color:G.white }}>{creds.email}</b></p>
              <p style={{ fontFamily:F.sans, fontSize:13, color:G.sub, margin:0 }}>Contraseña: <b style={{ color:G.white, letterSpacing:"0.1em" }}>{creds.pass}</b></p>
            </div>
          )}
          {!creds.emailExists && !creds.noAccount && <button style={s.btnG} onClick={() => { const tpl = data.getConfig("mensajes", DEFAULT_MENSAJES); const estudio = data.getConfig("estudio", {}); openWAClienta({ telefono:creds.telefono }, fillMsg(tpl.bienvenida || DEFAULT_MENSAJES.bienvenida, { nombre:creds.nombre?.split(" ")[0], estudio:estudio.nombre || "Lash Studio", email:creds.email, pass:creds.pass, url:DEPLOY_URL })); setCreds(null); }}>Enviar por WhatsApp →</button>}
          <button style={{ ...s.btnGl, marginTop:9, width:"100%" }} onClick={() => setCreds(null)}>cerrar</button>
        </Sheet>
      )}
    </div>
  );
}

// ── Detalle Clienta (Admin) ────────────────────────────────────────────────────
function ClientaDetalle({ clienta:cInit, data, pop, push, toast }) {
  const [c, setC]         = useState(cInit);
  const [tab, setTab]     = useState("info");
  const [form, setForm]   = useState({ nombre:cInit.nombre||"", telefono:cInit.telefono||"", fechaNacimiento:cInit.fechaNacimiento||"", curva:cInit.curva||"", grosor:cInit.grosor||"", largo:cInit.largo||"", alergias:cInit.alergias||"", observaciones:cInit.observaciones||"", estado:cInit.estado||"activa", mapaTecnico:cInit.mapaTecnico||"" });
  const [fichaTab, setFichaTab] = useState("pestañas");
  const [formLam, setFormLam] = useState({
    porosidad:       cInit.laminado?.porosidad       || "",
    estado:          cInit.laminado?.estado          || "",
    tipoOjo:         cInit.laminado?.tipoOjo         || "",
    formatoOseo:     cInit.laminado?.formatoOseo     || "",
    particularidades:cInit.laminado?.particularidades|| "",
    molde:           cInit.laminado?.molde           || "",
    tiempos:         cInit.laminado?.tiempos         || "",
    tecnica:         cInit.laminado?.tecnica         || "",
  });
  const setLam = (k, v) => setFormLam(f => ({ ...f, [k]:v }));
  const [savingLam, setSavingLam] = useState(false);
  const guardarLaminado = async () => {
    setSavingLam(true);
    await data.editarClientas(c._id, { laminado:formLam });
    setC(prev => ({ ...prev, laminado:formLam }));
    setSavingLam(false); toast("✓ guardado");
  };
  const [editing, setEditing] = useState(false);
  const [uploadingMapa, setUploadingMapa] = useState(false);
  const [showPass, setShowPass]     = useState(false);
  const [resetModal, setResetModal] = useState(false);
  const [resetting, setResetting]   = useState(false);
  const [newPassGen, setNewPassGen]  = useState("");
  const [resetErr, setResetErr]     = useState("");
  const [modalBorrar, setModalBorrar] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));

  const opcCurvas = data.getConfig("curvas",   []);
  const opcGrosor = data.getConfig("grosores", []);
  const opcLargo  = data.getConfig("largos",   []);

  const hist   = Array.isArray(c.historial) ? c.historial : (c.historial ? Object.values(c.historial) : []);
  const citasC = data.citas.filter(ci => ci.clientaId === c._id && ci.estado !== "completada").sort((a, b) => a.fecha.localeCompare(b.fecha));

  const mes         = mesISO();
  const visitasMes  = hist.filter(h => h.fecha?.startsWith(mes)).length;
  const gastoTotal  = hist.reduce((a, h) => a + (h.monto || 0), 0);
  const diasDesde   = hist.length ? Math.floor((new Date() - new Date([...hist].sort((a, b) => b.fecha?.localeCompare(a.fecha))[0]?.fecha)) / (1000 * 60 * 60 * 24)) : null;
  const curvaFav    = (() => { const cnt = {}; hist.forEach(h => { if (h.curva) cnt[h.curva] = (cnt[h.curva] || 0) + 1; }); return Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]?.[0] || c.curva || "—"; })();

  const guardar = async () => { await data.editarClientas(c._id, form); setC(p => ({ ...p, ...form })); setEditing(false); toast("✓ guardado"); };

  const resetearContraseña = async () => {
    setResetting(true);
    setResetErr("");
    try {
      const newPass = genPass();
      let firebaseUpdated = false;
      if (c.email) {
        let idToken = null;
        if (c.authRefreshToken) {
          const ref = await fbAuth.refresh(c.authRefreshToken).catch(() => ({}));
          if (ref.idToken) idToken = ref.idToken;
        }
        if (!idToken && c.appPass) {
          const si = await fbAuth.signIn(c.email, c.appPass);
          if (si.idToken) idToken = si.idToken;
        }
        if (idToken) {
          const upd = await fbAuth.updatePass(idToken, newPass);
          if (upd.refreshToken) {
            await data.editarClientas(c._id, { appPass:newPass, authRefreshToken:upd.refreshToken });
            setC(p => ({ ...p, appPass:newPass, authRefreshToken:upd.refreshToken }));
            firebaseUpdated = true;
          }
        }
        if (!firebaseUpdated) {
          // Delete old Firebase Auth account + recreate with new password
          try {
            const delRes = await fetch("/api/delete-auth-user", {
              method:"POST", headers:{"Content-Type":"application/json"},
              body:JSON.stringify({ email:c.email }),
            }).then(r => r.json()).catch(() => ({}));
            if (delRes.ok) {
              const rec = await fbAuth.create(c.email, newPass);
              if (rec.refreshToken) {
                await data.editarClientas(c._id, { appPass:newPass, authRefreshToken:rec.refreshToken, uid:rec.localId });
                setC(p => ({ ...p, appPass:newPass, authRefreshToken:rec.refreshToken, uid:rec.localId }));
                firebaseUpdated = true;
              }
            }
          } catch { /* ignore */ }
        }
      }
      if (!firebaseUpdated) {
        setResetErr("No se pudo actualizar la contraseña de Firebase. Verificá que FIREBASE_SERVICE_ACCOUNT esté configurado en Vercel y que el deploy esté actualizado.");
      } else {
        setNewPassGen(newPass);
        toast("✓ contraseña actualizada");
      }
    } catch { setResetErr("Error inesperado. Intentá de nuevo."); }
    setResetting(false);
  };

  return (
    <div>
      <div style={s.topBar}>
        <Back onClick={pop} label="clientas" />
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <Avatar nombre={c.nombre} size={42} />
          <div><h1 style={{ ...s.h1, fontSize:18 }}>{c.nombre}</h1><p style={s.sub}>{hist.length} visitas · {form.estado || "activa"}</p></div>
        </div>
      </div>
      <div style={{ padding:"18px" }}>
        <div style={{ display:"flex", gap:6, marginBottom:16 }}>
          {["info", "ficha", "historial", "turnos", "métricas"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ ...s.btnGl, flex:1, fontSize:9, padding:"8px 2px", background:tab === t ? G.greenM : "transparent", borderColor:tab === t ? G.green : G.border, color:tab === t ? G.greenL : G.muted, fontWeight:tab === t ? 700 : 400 }}>{t}</button>
          ))}
        </div>

        {tab === "info" && (
          <div>
            <div style={{ display:"flex", gap:9, marginBottom:14 }}>
              <button style={{ ...s.btnG, flex:1 }} onClick={() => openWAClienta(c, `Hola ${c.nombre?.split(" ")[0]}! 🌿`)}>WhatsApp</button>
              <button style={{ ...s.btnGl, flex:1 }} onClick={() => setEditing(e => !e)}>{editing ? "cancelar" : "Editar"}</button>
            </div>
            <div style={{ ...s.card, display:"flex", flexDirection:"column", gap:12 }}>
              {editing ? (
                <>
                  <Field label="nombre"><input style={s.input} value={form.nombre} onChange={e => set("nombre", e.target.value)} /></Field>
                  <Field label="teléfono"><input style={s.input} value={form.telefono} onChange={e => set("telefono", e.target.value)} /></Field>
                  <Field label="fecha de nacimiento"><input style={s.input} type="date" value={form.fechaNacimiento} onChange={e => set("fechaNacimiento", e.target.value)} /></Field>
                  <Field label="estado">
                    <div style={{ display:"flex", gap:8 }}>
                      {["activa", "pausada"].map(v => <button key={v} onClick={() => set("estado", v)} style={{ ...s.btnGl, flex:1, background:form.estado === v ? G.greenM : G.glass, borderColor:form.estado === v ? G.green : G.border, color:form.estado === v ? G.greenL : G.sub }}>{v}</button>)}
                    </div>
                  </Field>
                  <button style={s.btnG} onClick={guardar}>guardar →</button>
                </>
              ) : (
                <>
                  {[["teléfono", c.telefono || "—"], ["email", c.email || "—"], ["estado", c.estado || "activa"], ["clienta desde", fmtFecha(c.creadaEn)]].map(([k, v]) => (
                    <div key={k} style={{ display:"flex", justifyContent:"space-between" }}>
                      <span style={{ ...s.label, margin:0 }}>{k}</span>
                      <span style={{ fontFamily:F.sans, fontSize:13, color:G.sub }}>{v}</span>
                    </div>
                  ))}
                  {c.fechaNacimiento && (
                    <div style={{ display:"flex", justifyContent:"space-between" }}>
                      <span style={{ ...s.label, margin:0 }}>fecha de nacimiento</span>
                      <span style={{ fontFamily:F.sans, fontSize:13, color:G.sub }}>
                        {fmtFecha(c.fechaNacimiento)}{(() => { const [anio, mm, dd] = c.fechaNacimiento.split("-"); const edad = new Date().getFullYear() - parseInt(anio) - (new Date() < new Date(`${new Date().getFullYear()}-${mm}-${dd}`) ? 1 : 0); return ` · ${edad} años`; })()}
                      </span>
                    </div>
                  )}
                  {c.email && (
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ ...s.label, margin:0 }}>contraseña app</span>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        {c.appPass ? (
                          <>
                            <span style={{ fontFamily:"monospace", fontSize:13, color:G.sub, letterSpacing:"0.08em" }}>{showPass ? c.appPass : "••••••"}</span>
                            <button onClick={() => setShowPass(p => !p)} style={{ background:"transparent", border:"none", cursor:"pointer", padding:4, display:"flex", alignItems:"center" }}>
                              <Icon name={showPass ? "unlock" : "lock"} size={14} color={G.muted} />
                            </button>
                          </>
                        ) : (
                          <span style={{ fontFamily:F.sans, fontSize:12, color:G.muted, fontStyle:"italic" }}>no registrada</span>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            {c.email && (
              <button style={{ ...s.btnGl, width:"100%", marginTop:8, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }} onClick={() => setResetModal(true)}>
                <Icon name="key" size={13} color={G.sub} /> {c.appPass ? "Nueva contraseña" : "Generar contraseña"}
              </button>
            )}
            {!editing && (
              <button style={{ ...s.btnRed, width:"100%", marginTop:8, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }} onClick={() => setModalBorrar(true)}>
                <Icon name="trash" size={14} color={G.red} />
                Eliminar clienta
              </button>
            )}
          </div>
        )}
        {modalBorrar && (
          <Modal titulo="Eliminar clienta" msg={`¿Segura que querés eliminar a ${c.nombre}? Se perderán todos sus datos e historial.`} onOk={async () => { await data.borrarClientas(c._id); toast("Clienta eliminada"); pop(); }} onCancel={() => setModalBorrar(false)} okLabel="eliminar" danger />
        )}

        {tab === "ficha" && (
          <div>
            {/* Sub-tab toggle */}
            <div style={{ display:"flex", gap:6, marginBottom:14 }}>
              {["pestañas", "laminado"].map(st => (
                <button key={st} onClick={() => setFichaTab(st)} style={{ ...s.btnGl, flex:1, fontSize:11, padding:"8px 4px", background:fichaTab === st ? G.greenM : "transparent", borderColor:fichaTab === st ? G.green : G.border, color:fichaTab === st ? G.greenL : G.muted, fontWeight:fichaTab === st ? 700 : 400 }}>{st}</button>
              ))}
            </div>

            {fichaTab === "pestañas" && (
              <>
                <div style={s.card}>
                  {opcCurvas.length > 0 && <Field label="curva"><Chips options={opcCurvas} value={form.curva} onChange={v => { set("curva", v); data.editarClientas(c._id, { curva:v }); toast("✓"); }} /></Field>}
                  {opcGrosor.length > 0 && <Field label="grosor"><Chips options={opcGrosor} value={form.grosor} onChange={v => { set("grosor", v); data.editarClientas(c._id, { grosor:v }); toast("✓"); }} /></Field>}
                  {opcLargo.length  > 0 && <Field label="largo"><Chips  options={opcLargo}  value={form.largo}  onChange={v => { set("largo",  v); data.editarClientas(c._id, { largo:v  }); toast("✓"); }} /></Field>}
                  {(opcCurvas.length === 0 && opcGrosor.length === 0 && opcLargo.length === 0) && <p style={{ color:G.muted, fontSize:12 }}>Configurá opciones en Config → Técnico</p>}
                </div>
                <div style={s.card}>
                  <Field label="alergias"><input style={s.input} value={form.alergias} onChange={e => set("alergias", e.target.value)} onBlur={() => { data.editarClientas(c._id, { alergias:form.alergias }); toast("✓"); }} /></Field>
                  <Field label="observaciones"><textarea style={{ ...s.input, height:60, resize:"none" }} value={form.observaciones} onChange={e => set("observaciones", e.target.value)} onBlur={() => { data.editarClientas(c._id, { observaciones:form.observaciones }); toast("✓"); }} /></Field>
                </div>
                <div style={s.card}>
                  <p style={{ ...s.eyebrow, marginBottom:10 }}>mapa técnico</p>
                  {form.mapaTecnico ? (
                    <div style={{ position:"relative", marginBottom:10 }}>
                      <img src={form.mapaTecnico} alt="mapa técnico" loading="lazy" style={{ width:"100%", borderRadius:10, objectFit:"cover", maxHeight:280, display:"block" }} />
                      <button onClick={async () => { await data.editarClientas(c._id, { mapaTecnico:"" }); set("mapaTecnico", ""); toast("Foto eliminada"); }}
                        style={{ position:"absolute", top:8, right:8, background:"rgba(0,0,0,0.6)", border:"none", color:"#fff", borderRadius:8, padding:"5px 9px", cursor:"pointer", fontSize:12 }}>✕</button>
                    </div>
                  ) : (
                    <p style={{ fontFamily:F.sans, fontSize:12, color:G.muted, marginBottom:10 }}>Sin foto de mapa técnico aún</p>
                  )}
                  <label style={{ ...s.btnGl, display:"flex", alignItems:"center", gap:8, cursor:"pointer", opacity:uploadingMapa?0.6:1, justifyContent:"center" }}>
                    <Icon name="camera" size={14} color={G.sub} />
                    {uploadingMapa ? "Subiendo..." : form.mapaTecnico ? "Cambiar foto" : "Subir mapa técnico"}
                    <input type="file" accept="image/*" style={{ display:"none" }} disabled={uploadingMapa}
                      onChange={async (e) => {
                        const file = e.target.files[0]; if (!file) return;
                        setUploadingMapa(true);
                        try { const url = await subirFoto(file); await data.editarClientas(c._id, { mapaTecnico:url }); set("mapaTecnico", url); toast("Foto guardada"); }
                        catch { toast("Error al subir foto"); }
                        setUploadingMapa(false); e.target.value="";
                      }} />
                  </label>
                </div>
              </>
            )}

            {fichaTab === "laminado" && (
              <div style={s.card}>
                <Field label="porosidad">
                  <Chips options={["baja","media","alta"]} value={formLam.porosidad} onChange={v => setLam("porosidad", v)} />
                </Field>
                <Field label="estado / tricología">
                  <textarea style={{ ...s.input, height:60, resize:"none" }} value={formLam.estado} onChange={e => setLam("estado", e.target.value)} placeholder="Observaciones del estado del cabello..." />
                </Field>
                <Field label="tipo de ojo">
                  <Chips options={["pequeño","almendra","grande","prominente","caído"]} value={formLam.tipoOjo} onChange={v => setLam("tipoOjo", v)} />
                </Field>
                <Field label="formato óseo">
                  <input style={s.input} value={formLam.formatoOseo} onChange={e => setLam("formatoOseo", e.target.value)} placeholder="ej: frente angosta, pómulos pronunciados..." />
                </Field>
                <Field label="particularidades">
                  <textarea style={{ ...s.input, height:60, resize:"none" }} value={formLam.particularidades} onChange={e => setLam("particularidades", e.target.value)} placeholder="Notas especiales de la clienta..." />
                </Field>
                <Field label="molde">
                  <Chips options={["U","C","M","L"]} value={formLam.molde} onChange={v => setLam("molde", v)} />
                </Field>
                <Field label="tiempos de acción">
                  <input style={s.input} value={formLam.tiempos} onChange={e => setLam("tiempos", e.target.value)} placeholder="ej: P1: 8min · P2: 6min" />
                </Field>
                <Field label="técnica">
                  <input style={s.input} value={formLam.tecnica} onChange={e => setLam("tecnica", e.target.value)} placeholder="ej: lifting + tinte" />
                </Field>
                <button style={{ ...s.btnG, opacity:savingLam?0.6:1 }} onClick={guardarLaminado} disabled={savingLam}>
                  {savingLam ? "Guardando..." : "Guardar laminado →"}
                </button>
              </div>
            )}
          </div>
        )}

        {tab === "historial" && (
          <div>
            {hist.length === 0 && <p style={{ color:G.muted, fontSize:13 }}>Sin historial aún</p>}
            {[...hist].reverse().map((h, i) => (
              <div key={i} style={s.card}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <div><p style={{ margin:"0 0 2px", fontFamily:F.serif, fontSize:14 }}>{h.servicio}</p><p style={{ margin:0, ...s.sub, fontSize:11 }}>{fmtFecha(h.fecha)}{h.curva ? ` · curva ${h.curva}` : ""}</p></div>
                  <div style={{ textAlign:"right" }}>
                    <p style={{ margin:"0 0 2px", fontFamily:F.serif, fontWeight:700, color:G.green, fontSize:14 }}>{fmtPesos(h.monto)}</p>
                    {h.descuentoVisitas && <p style={{ margin:"0 0 2px", fontFamily:F.sans, fontSize:10, color:G.muted, textDecoration:"line-through" }}>{fmtPesos(h.montoOriginal)}</p>}
                    <span style={s.tag}>{h.pago}</span>
                    {h.descuentoVisitas && <span style={{ ...s.tag, marginLeft:4, background:`rgba(${G.greenRGB},0.18)`, color:G.greenL }}>🎯 desc.</span>}
                  </div>
                </div>
                {h.notas && <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>{h.notas}</p>}
                {h.descuentoVisitas && (
                  <p style={{ margin:"4px 0 0", fontFamily:F.sans, fontSize:10, color:G.greenL }}>descuento por visitas aplicado · −{fmtPesos(h.descuentoMonto)}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "turnos" && (
          <div>
            <button style={{ ...s.btnG, marginBottom:14 }} onClick={() => push("nueva-cita", { clientaIdDefault:c._id })}>+ nuevo turno para {c.nombre?.split(" ")[0]}</button>
            {citasC.length === 0 && <p style={{ color:G.muted, fontSize:13 }}>sin citas próximas ✦</p>}
            {citasC.map(ci => (
              <div key={ci._id} style={{ ...s.card, display:"flex", gap:12, alignItems:"center", cursor:"pointer" }} onClick={() => push("cita-detalle", { cita:ci })}>
                <div style={{ background:G.greenM, border:`0.5px solid ${G.green}`, borderRadius:9, padding:"7px 10px", textAlign:"center" }}>
                  <p style={{ margin:0, fontFamily:F.sans, fontSize:10, color:G.muted }}>{ci.fecha?.slice(5).replace("-", "/")}</p>
                  <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:14, color:G.greenL }}>{ci.hora}</p>
                </div>
                <div style={{ flex:1 }}><p style={{ margin:"0 0 2px", fontFamily:F.serif, fontSize:14 }}>{ci.servicio}</p><span style={s.tag}>{ci.estado}</span></div>
              </div>
            ))}
          </div>
        )}

        {tab === "métricas" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9, marginBottom:14 }}>
              {[["total visitas", hist.length], ["este mes", visitasMes], ["gasto histórico", fmtPesos(gastoTotal)], ["curva fav.", curvaFav], ["días desde últ. visita", diasDesde !== null ? `${diasDesde}d` : "—"], ["servicios únicos", [...new Set(hist.map(h => h.servicio))].length]].map(([l, v]) => (
                <div key={l} style={{ ...s.card, margin:0, textAlign:"center", padding:"12px 8px" }}>
                  <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:"0 0 4px", textTransform:"lowercase", lineHeight:1.4 }}>{l}</p>
                  <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:18, color:G.white, margin:0 }}>{v}</p>
                </div>
              ))}
            </div>
            {(() => {
              const vInfo = calcVisitasDesc(hist, data.getConfig("promos", {}));
              if (!vInfo) return null;
              return (
                <div style={{ ...s.card, marginBottom:14 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                    <p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:G.sub, fontWeight:600 }}>🎯 Descuento por visitas</p>
                    <span style={{ ...s.tag, ...(vInfo.disponible ? { background:`rgba(${G.greenRGB},0.18)`, color:G.greenL } : {}) }}>
                      {vInfo.disponible ? "¡disponible!" : `${vInfo.progreso}/${vInfo.cfg.cantidad}`}
                    </span>
                  </div>
                  <div style={{ height:6, borderRadius:3, background:`rgba(${G.greenRGB},0.12)`, overflow:"hidden", marginBottom:6 }}>
                    <div style={{ height:"100%", borderRadius:3, background:G.green, width:`${Math.round(vInfo.progreso / vInfo.cfg.cantidad * 100)}%` }} />
                  </div>
                  <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>
                    {vInfo.disponible ? "Clienta tiene un descuento listo para aplicar" : `Faltan ${vInfo.faltan} visita${vInfo.faltan !== 1 ? "s" : ""} para el próximo descuento`}
                    {" · "}{vInfo.cfg.tipo === "%" ? `${vInfo.cfg.monto}%` : `$${vInfo.cfg.monto}`}
                  </p>
                </div>
              );
            })()}
            {(() => {
              const cnt = {}; hist.forEach(h => { cnt[h.servicio] = (cnt[h.servicio] || 0) + 1; });
              const sorted = Object.entries(cnt).sort((a, b) => b[1] - a[1]);
              if (!sorted.length) return null;
              const max = sorted[0][1];
              return (<>
                <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.white, margin:"0 0 10px" }}>servicios realizados</p>
                {sorted.map(([nom, n]) => (
                  <div key={nom} style={{ ...s.card, padding:"10px 12px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}><p style={{ margin:0, fontFamily:F.sans, fontSize:12 }}>{nom}</p><span style={s.tag}>{n}x</span></div>
                    <div style={{ height:3, background:G.border, borderRadius:2 }}><div style={{ height:"100%", width:`${(n / max) * 100}%`, background:G.green, borderRadius:2 }} /></div>
                  </div>
                ))}
              </>);
            })()}
          </div>
        )}
      </div>
      {resetModal && (
        <Sheet titulo="Contraseña de acceso" onClose={() => { setResetModal(false); setNewPassGen(""); setResetErr(""); }}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {c.appPass && (
              <div style={{ ...s.card, background:"rgba(143,189,90,0.05)", borderColor:`rgba(${G.greenRGB},0.2)` }}>
                <p style={{ fontFamily:F.sans, fontSize:11, color:G.muted, margin:"0 0 6px" }}>contraseña actual de {c.nombre?.split(" ")[0]}</p>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <span style={{ fontFamily:"monospace", fontSize:16, color:G.sub, letterSpacing:"0.12em" }}>{showPass ? c.appPass : "••••••"}</span>
                  <button onClick={() => setShowPass(p => !p)} style={{ background:"transparent", border:"none", cursor:"pointer", padding:6, display:"flex", alignItems:"center" }}>
                    <Icon name={showPass ? "unlock" : "lock"} size={16} color={G.muted} />
                  </button>
                </div>
              </div>
            )}
            {resetErr && <p style={{ fontFamily:F.sans, fontSize:12, color:G.amber, margin:0, lineHeight:1.5, padding:"10px 12px", background:"rgba(224,184,112,0.08)", borderRadius:10, border:`0.5px solid rgba(224,184,112,0.25)` }}>{resetErr}</p>}
            {newPassGen ? (
              <>
                <div style={{ ...s.card, background:"rgba(143,189,90,0.08)", borderColor:`rgba(${G.greenRGB},0.35)` }}>
                  <p style={{ fontFamily:F.sans, fontSize:11, color:G.muted, margin:"0 0 6px" }}>nueva contraseña generada</p>
                  <p style={{ fontFamily:"monospace", fontSize:20, color:G.greenL, letterSpacing:"0.16em", margin:0, fontWeight:700 }}>{newPassGen}</p>
                </div>
                <button style={s.btnG} onClick={() => { const tpl = data.getConfig("mensajes", DEFAULT_MENSAJES); const estudio = data.getConfig("estudio", {}); openWAClienta(c, fillMsg(tpl.bienvenida || DEFAULT_MENSAJES.bienvenida, { nombre:c.nombre?.split(" ")[0], estudio:estudio.nombre || "Lash Studio", email:c.email, pass:newPassGen, url:DEPLOY_URL })); }}>Compartir por WhatsApp →</button>
                <button style={{ ...s.btnGl, width:"100%" }} onClick={() => { setResetModal(false); setNewPassGen(""); setResetErr(""); }}>cerrar</button>
              </>
            ) : (
              <>
                <p style={{ fontFamily:F.sans, fontSize:12, color:G.muted, margin:0, lineHeight:1.6 }}>{c.appPass ? "Generará una nueva contraseña aleatoria y actualizará el acceso de la clienta." : "Sin contraseña registrada. Se generará una nueva clave para esta clienta."}</p>
                <button style={{ ...s.btnG, opacity:resetting?0.6:1 }} onClick={resetearContraseña} disabled={resetting}>{resetting ? "actualizando..." : "Generar nueva contraseña →"}</button>
                <button style={{ ...s.btnGl, width:"100%" }} onClick={() => { setResetModal(false); setResetErr(""); }}>cancelar</button>
              </>
            )}
          </div>
        </Sheet>
      )}
    </div>
  );
}

// ── Admin Finanzas ─────────────────────────────────────────────────────────────
function AdminFinanzas({ data, toast }) {
  const [tab, setTab]         = useState("dashboard");
  const [periodo, setPeriodo] = useState("mes");
  const wide = useIsWide();
  const hoy  = hoyISO();
  const mes  = mesISO();
  const anio = hoy.slice(0, 4);

  const todoHist = data.clientas.flatMap(c => Array.isArray(c.historial) ? c.historial : (c.historial ? Object.values(c.historial) : []));

  const tabs = [["dashboard","resumen"],["gastos","gastos"],["insumos","insumos"]];

  return (
    <div>
      <div style={{ ...s.topBar, ...(wide && { padding:"16px 28px 14px" }) }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
          <div><h1 style={s.h1}>Finanzas</h1><p style={s.sub}>ingresos y gastos</p></div>
          <div style={{ display:"flex", gap:6 }}>
            {tabs.map(([v, l]) => (
              <button key={v} onClick={() => setTab(v)} style={{ ...s.btnGl, padding:"8px 14px", fontSize:11, background:tab===v ? G.greenM : "transparent", borderColor:tab===v ? G.green : G.border, color:tab===v ? G.greenL : G.muted, fontWeight:tab===v ? 700 : 400 }}>{l}</button>
            ))}
          </div>
        </div>
      </div>
      {tab === "dashboard" && (
        wide ? (
          // WIDE: stats on left + finance calendar on right — both always visible
          <div style={{ display:"flex", minHeight:"calc(100vh - 80px)", overflow:"hidden" }}>
            <div style={{ flex:1, overflowY:"auto", padding:"20px 28px" }}>
              <FinanzasResumen data={data} todoHist={todoHist} periodo={periodo} setPeriodo={setPeriodo} hoy={hoy} mes={mes} anio={anio} wide={false} />
            </div>
            <div style={{ width:360, flexShrink:0, overflowY:"auto", padding:"20px 20px", borderLeft:`0.5px solid ${G.border}` }}>
              <FinanzasCalendario data={data} todoHist={todoHist} toast={toast} />
            </div>
          </div>
        ) : (
          <div style={{ padding:"16px 14px" }}>
            <FinanzasResumen data={data} todoHist={todoHist} periodo={periodo} setPeriodo={setPeriodo} hoy={hoy} mes={mes} anio={anio} />
            <div style={s.div} />
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.white, margin:"0 0 12px" }}>Calendario de ingresos</p>
            <FinanzasCalendario data={data} todoHist={todoHist} toast={toast} />
          </div>
        )
      )}
      {tab === "gastos" && <div style={{ padding:"18px" }}><GastosTab data={data} toast={toast} /></div>}
      {tab === "insumos" && <div style={{ padding:"18px" }}><InsumosTab data={data} toast={toast} /></div>}
    </div>
  );
}

function FinanzasResumen({ data, todoHist, periodo, setPeriodo, hoy, mes, anio, wide }) {
  const filtrar = (h) => { if (periodo === "hoy") return h.fecha === hoy; if (periodo === "mes") return h.fecha?.startsWith(mes); if (periodo === "año") return h.fecha?.startsWith(anio); return true; };
  const ings   = todoHist.filter(filtrar);
  const total  = ings.reduce((a, h) => a + (h.monto || 0), 0);
  const prevMesStr = (() => { const [y, m] = mes.split("-").map(Number); return m === 1 ? `${y-1}-12` : `${y}-${String(m-1).padStart(2,"0")}`; })();
  const totalPrev  = todoHist.filter(h => h.fecha?.startsWith(prevMesStr)).reduce((a, h) => a + (h.monto || 0), 0);
  const varPct     = periodo === "mes" && totalPrev > 0 ? Math.round(((total - totalPrev) / totalPrev) * 100) : null;
  const prevMesNombre = new Date(prevMesStr + "-15").toLocaleDateString("es-AR", { month:"long" });
  const totalGastos = (data.gastos || []).filter(g => filtrar({ fecha:g.fecha })).reduce((a, g) => a + (g.monto || 0), 0);
  const ganancia = total - totalGastos;
  const transf = ings.filter(h => h.pago === "transferencia" || h.montoTransf > 0).reduce((a, h) => a + (h.montoTransf || (h.pago === "transferencia" ? h.monto : 0)), 0);
  const efect  = ings.filter(h => h.pago === "efectivo" || h.montoEfectivo > 0).reduce((a, h) => a + (h.montoEfectivo || (h.pago === "efectivo" ? h.monto : 0)), 0);
  const denom  = transf + efect || 1;
  const porSv  = {};
  ings.forEach(h => { porSv[h.servicio] = (porSv[h.servicio] || 0) + (h.monto || 0); });
  const maxSv  = Math.max(...Object.values(porSv), 1);
  const topC   = data.clientas.map(c => { const h = Array.isArray(c.historial) ? c.historial : (c.historial ? Object.values(c.historial) : []); const hF = h.filter(filtrar); return { ...c, total:hF.reduce((a, x) => a + (x.monto || 0), 0), vis:hF.length }; }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  return (
    <div>
      <div style={{ display:"flex", gap:7, marginBottom:18 }}>
        {[["hoy","hoy"],["mes","este mes"],["año","este año"],["todo","histórico"]].map(([v, l]) => (
          <button key={v} onClick={() => setPeriodo(v)} style={{ ...s.btnGl, flex:1, fontSize:10, background:periodo === v ? G.greenM : "transparent", borderColor:periodo === v ? G.green : G.border, color:periodo === v ? G.greenL : G.muted, padding:"8px 2px", fontWeight:periodo === v ? 700 : 400 }}>{l}</button>
        ))}
      </div>
      <div style={{ ...s.card, textAlign:"center", padding:"22px 16px", marginBottom:12 }}>
        <p style={{ fontFamily:F.sans, fontSize:10, color:G.muted, margin:"0 0 6px", textTransform:"lowercase", letterSpacing:"0.08em" }}>ingresos · {periodo === "mes" ? new Date().toLocaleDateString("es-AR", { month:"long", year:"numeric" }) : periodo === "año" ? anio : periodo === "hoy" ? "hoy" : "histórico"}</p>
        <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:36, color:G.green, margin:"0 0 4px" }}>{fmtPesos(total)}</p>
        <p style={{ fontFamily:F.sans, fontSize:12, color:G.sub, margin:0 }}>{ings.length} servicio{ings.length !== 1 ? "s" : ""}</p>
        {varPct !== null && <p style={{ fontFamily:F.sans, fontSize:11, color:varPct >= 0 ? G.green : G.red, margin:"5px 0 0", fontWeight:600 }}>{varPct >= 0 ? "↑" : "↓"}{Math.abs(varPct)}% vs {prevMesNombre}</p>}
      </div>
      {totalGastos > 0 && (
        <div style={{ display:"flex", gap:9, marginBottom:14 }}>
          <div style={{ ...s.card, flex:1, margin:0 }}>
            <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:"0 0 3px", textTransform:"lowercase" }}>gastos</p>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:18, color:G.red, margin:"0 0 2px" }}>{fmtPesos(totalGastos)}</p>
          </div>
          <div style={{ ...s.card, flex:1, margin:0 }}>
            <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:"0 0 3px", textTransform:"lowercase" }}>ganancia neta</p>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:18, color:ganancia >= 0 ? G.green : G.red, margin:"0 0 2px" }}>{fmtPesos(ganancia)}</p>
          </div>
        </div>
      )}
      {total > 0 && (
        <div style={{ display:"flex", gap:9, marginBottom:14 }}>
          {[["transferencia", transf], ["efectivo", efect]].map(([m, v]) => (
            <div key={m} style={{ ...s.card, flex:1, margin:0 }}>
              <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:"0 0 3px", textTransform:"lowercase" }}>{m}</p>
              <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:18, color:m === "transferencia" ? G.green : G.white, margin:"0 0 2px" }}>{fmtPesos(v)}</p>
              <p style={{ fontFamily:F.sans, fontSize:10, color:G.muted, margin:0 }}>{Math.round(v / denom * 100)}%</p>
            </div>
          ))}
        </div>
      )}
      <div style={s.div} />
      <div style={wide ? { display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 } : {}}>
        <div>
          <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.white, margin:"0 0 3px" }}>por servicio</p>
          <p style={{ ...s.sub, marginBottom:12 }}>ingresos del período</p>
          {Object.entries(porSv).length === 0 && <p style={{ color:G.muted, fontSize:13 }}>Sin registros</p>}
          {Object.entries(porSv).sort((a, b) => b[1] - a[1]).map(([nom, tot]) => (
            <div key={nom} style={{ ...s.card, padding:"11px 13px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}><p style={{ margin:0, fontFamily:F.sans, fontSize:13 }}>{nom}</p><p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:13, color:G.green }}>{fmtPesos(tot)}</p></div>
              <div style={{ height:3, background:G.border, borderRadius:2 }}><div style={{ height:"100%", width:`${(tot / maxSv) * 100}%`, background:G.green, borderRadius:2 }} /></div>
            </div>
          ))}
        </div>
        <div>
          {!wide && <div style={s.div} />}
          <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.white, margin:"0 0 3px" }}>top clientas</p>
          <p style={{ ...s.sub, marginBottom:12 }}>por gasto en el período</p>
          {topC.length === 0 && <p style={{ color:G.muted, fontSize:13 }}>Sin datos</p>}
          {topC.map((c, i) => (
            <div key={c._id} style={{ ...s.card, display:"flex", alignItems:"center", gap:11 }}>
              <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:19, color:i === 0 ? G.green : G.muted, minWidth:22, margin:0 }}>{i + 1}</p>
              <Avatar nombre={c.nombre} size={34} />
              <div style={{ flex:1 }}><p style={{ margin:"0 0 2px", fontFamily:F.serif, fontSize:13 }}>{c.nombre}</p><p style={{ margin:0, ...s.sub, fontSize:10 }}>{c.vis} visita{c.vis !== 1 ? "s" : ""}</p></div>
              <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, color:G.green, fontSize:14 }}>{fmtPesos(c.total)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FinanzasCalendario({ data, todoHist, toast }) {
  const ahora = new Date();
  const [offset, setOffset] = useState(0);
  const [diaS,   setDiaS]   = useState(hoyISO());
  const [showTurnoForm, setShowTurnoForm] = useState(false);
  const [turnoForm, setTurnoForm] = useState({ clientaId:"", servicio:"", hora:"", pago:"efectivo", monto:"", montoEfectivo:"", montoTransf:"" });
  const setTF = (k, v) => setTurnoForm(f => ({...f, [k]:v}));
  const [busqClienta, setBusqClienta] = useState("");
  const [showDropC, setShowDropC] = useState(false);
  const [saving, setSaving] = useState(false);

  const mesD    = new Date(ahora.getFullYear(), ahora.getMonth() + offset, 1);
  const anio    = mesD.getFullYear();
  const mes     = mesD.getMonth();
  const primDia = new Date(anio, mes, 1).getDay();
  const diasMes = new Date(anio, mes + 1, 0).getDate();
  const fmtKey  = (d) => `${anio}-${String(mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const hoy     = hoyISO();

  // Ingresos agrupados por fecha (historial de citas)
  const ingresosPorFecha = {};
  todoHist.forEach(h => {
    if (!h.fecha) return;
    if (!ingresosPorFecha[h.fecha]) ingresosPorFecha[h.fecha] = [];
    ingresosPorFecha[h.fecha].push(h);
  });

  const totalDia  = (fecha) => (ingresosPorFecha[fecha] || []).reduce((a, h) => a + (h.monto || 0), 0);
  const maxDelMes = Math.max(...Array(diasMes).fill(null).map((_, i) => totalDia(fmtKey(i + 1))), 1);
  const totalMes  = Array(diasMes).fill(null).reduce((a, _, i) => a + totalDia(fmtKey(i + 1)), 0);

  // Detalle del día seleccionado
  const registrosDia = ingresosPorFecha[diaS] || [];
  const totalDiaS    = registrosDia.reduce((a, h) => a + (h.monto || 0), 0);

  const clientasFiltradas = data.clientas
    .filter(c => !busqClienta || c.nombre?.toLowerCase().includes(busqClienta.toLowerCase()))
    .sort((a, b) => a.nombre?.localeCompare(b.nombre))
    .slice(0, 20);

  const modoMixto = turnoForm.pago === "mixto";
  const totalCalculado = modoMixto
    ? (Number(turnoForm.montoEfectivo) || 0) + (Number(turnoForm.montoTransf) || 0)
    : Number(turnoForm.monto) || 0;

  const guardarTurno = async () => {
    if (!turnoForm.clientaId || !turnoForm.servicio || !totalCalculado) {
      toast("completá clienta, servicio y monto"); return;
    }
    setSaving(true);
    try {
      const clienta = data.clientas.find(c => c._id === turnoForm.clientaId);
      const citaId = await data.crearCita({
        clientaId: turnoForm.clientaId,
        clientaNombre: clienta?.nombre || "",
        clientaUid: clienta?.uid || "",
        fecha: diaS,
        hora: turnoForm.hora || "00:00",
        servicio: turnoForm.servicio,
        notas: "",
        adicionales: [],
        estado: "confirmada",
      });
      const registro = {
        fecha: diaS,
        servicio: turnoForm.servicio,
        curva: clienta?.curva || "",
        notas: "",
        pago: turnoForm.pago,
        monto: totalCalculado,
        ...(modoMixto ? { montoEfectivo: Number(turnoForm.montoEfectivo)||0, montoTransf: Number(turnoForm.montoTransf)||0 } : {}),
      };
      await data.registrarPago(turnoForm.clientaId, citaId, registro);
      setTurnoForm({ clientaId:"", servicio:"", hora:"", pago:"efectivo", monto:"", montoEfectivo:"", montoTransf:"" });
      setBusqClienta("");
      setShowTurnoForm(false);
      toast("✓ turno registrado");
    } catch { toast("Error al registrar"); }
    setSaving(false);
  };

  // Buscar nombre de clienta por servicio + fecha
  const getNombreClienta = (registro) => {
    const c = data.clientas.find(cl => {
      const h = Array.isArray(cl.historial) ? cl.historial : Object.values(cl.historial || {});
      return h.some(x => x.fecha === registro.fecha && x.servicio === registro.servicio && x.monto === registro.monto);
    });
    return c?.nombre || "clienta";
  };

  return (
    <div>
      {/* Total del mes en vista */}
      <div style={{ ...s.card, textAlign:"center", padding:"14px", marginBottom:14, background:"rgba(143,189,90,0.06)", borderColor:G.greenD }}>
        <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:"0 0 4px", textTransform:"lowercase", letterSpacing:"0.08em" }}>{MESES[mes]} {anio}</p>
        <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:28, color:G.green, margin:0 }}>{fmtPesos(totalMes)}</p>
      </div>

      {/* Calendario */}
      <div style={{ ...s.card, padding:"14px 10px", marginBottom:18 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <button style={{ ...s.btnGl, padding:"6px 12px", fontSize:15 }} onClick={() => setOffset(o => o - 1)}>‹</button>
          <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.white, margin:0, textTransform:"capitalize" }}>{MESES[mes]} {anio}</p>
          <button style={{ ...s.btnGl, padding:"6px 12px", fontSize:15 }} onClick={() => setOffset(o => o + 1)}>›</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:4 }}>
          {DIAS_C.map(d => <div key={d} style={{ textAlign:"center", fontFamily:F.sans, fontSize:10, color:G.muted, padding:"2px 0" }}>{d}</div>)}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
          {Array(primDia).fill(null).map((_, i) => <div key={"e" + i} />)}
          {Array(diasMes).fill(null).map((_, i) => {
            const dia = i + 1, key = fmtKey(dia);
            const tot = totalDia(key);
            const tieneIngresos = tot > 0;
            const esH = key === hoy, esSel = key === diaS;
            const intensidad = tieneIngresos ? Math.max(0.15, (tot / maxDelMes) * 0.85) : 0;
            return (
              <div key={dia} onClick={() => setDiaS(key)} style={{ borderRadius:8, padding:"4px 2px", cursor:"pointer", background:esSel ? G.green : tieneIngresos ? `rgba(143,189,90,${intensidad})` : "transparent", border:esSel ? "none" : esH ? `0.5px solid ${G.green}` : "0.5px solid transparent", textAlign:"center" }}>
                <span style={{ fontFamily:F.sans, fontSize:11, color:esSel ? "#0a0a0a" : esH ? G.greenL : G.sub, fontWeight:esSel || esH ? 700 : 400, display:"block" }}>{dia}</span>
                {tieneIngresos && (
                  <p style={{ margin:0, fontFamily:F.sans, fontSize:8, color:esSel ? "rgba(10,10,10,0.7)" : G.greenL, lineHeight:1.2 }}>
                    {tot >= 1000 ? `${Math.round(tot/1000)}k` : tot}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <p style={{ ...s.sub, fontSize:10, textAlign:"center", marginTop:10, color:G.muted }}>el verde más intenso = más ingresos ese día</p>
      </div>

      {/* Detalle del día */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
        <div style={{ width:5, height:5, borderRadius:"50%", background:G.green }} />
        <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.white }}>{fmtFecha(diaS)}</p>
        {totalDiaS > 0 && <span style={{ ...s.tag, marginLeft:"auto" }}>{fmtPesos(totalDiaS)}</span>}
      </div>

      {registrosDia.length === 0 && !showTurnoForm && (
        <p style={{ color:G.muted, fontSize:13, marginBottom:12 }}>sin ingresos registrados para este día ✦</p>
      )}

      {registrosDia.map((h, i) => {
        const nombreC = getNombreClienta(h);
        return (
          <div key={i} style={s.card}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
              <div>
                <p style={{ margin:"0 0 2px", fontFamily:F.serif, fontSize:14 }}>{nombreC}</p>
                <p style={{ margin:0, ...s.sub, fontSize:11 }}>{h.servicio}</p>
                {h.curva && <p style={{ margin:"3px 0 0", fontFamily:F.sans, fontSize:10, color:G.muted }}>curva {h.curva}</p>}
              </div>
              <div style={{ textAlign:"right" }}>
                <p style={{ margin:"0 0 4px", fontFamily:F.serif, fontWeight:700, color:G.green, fontSize:16 }}>{fmtPesos(h.monto)}</p>
                {h.pago === "mixto" ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:2, alignItems:"flex-end" }}>
                    <span style={{ ...s.tag, fontSize:9, marginRight:0, background:"rgba(143,189,90,0.1)" }}>{fmtPesos(h.montoEfectivo)} ef.</span>
                    <span style={{ ...s.tag, fontSize:9, marginRight:0 }}>{fmtPesos(h.montoTransf)} transf.</span>
                  </div>
                ) : (
                  <span style={s.tag}>{h.pago === "transferencia" ? "🏦" : "💵"} {h.pago}</span>
                )}
              </div>
            </div>
            {h.notas && <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>{h.notas}</p>}
          </div>
        );
      })}

      {showTurnoForm ? (
        <div style={{ ...s.card, marginTop:10 }}>
          <p style={{ ...s.eyebrow, marginBottom:10 }}>registrar turno pasado</p>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

            {/* Clienta searchable */}
            <Field label="clienta *">
              <div style={{ position:"relative" }}>
                <input style={s.input} placeholder="Buscar clienta..." value={busqClienta} autoComplete="off"
                  onChange={e => { setBusqClienta(e.target.value); setTF("clientaId",""); setShowDropC(true); }}
                  onFocus={() => setShowDropC(true)}
                  onBlur={() => setTimeout(() => setShowDropC(false), 180)} />
                {turnoForm.clientaId && (
                  <span style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", fontSize:12, color:G.greenL }}>✓</span>
                )}
                {showDropC && clientasFiltradas.length > 0 && (
                  <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:60, background:G.card, border:`0.5px solid ${G.border}`, borderRadius:10, maxHeight:180, overflowY:"auto", boxShadow:`0 8px 24px ${G.shadow}` }}>
                    {clientasFiltradas.map(c => (
                      <div key={c._id} onMouseDown={() => { setTF("clientaId", c._id); setBusqClienta(c.nombre); setShowDropC(false); }}
                        style={{ padding:"10px 14px", cursor:"pointer", fontFamily:F.sans, fontSize:13, color:G.text, borderBottom:`0.5px solid ${G.border}` }}>
                        {c.nombre}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Field>

            {/* Servicio chips */}
            <Field label="servicio *">
              <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                {data.servicios.map(sv => (
                  <button key={sv._id} onClick={() => setTF("servicio", sv.nombre)}
                    style={{ ...s.btnGl, padding:"8px 13px", fontSize:12,
                      background:turnoForm.servicio === sv.nombre ? G.greenM : "transparent",
                      borderColor:turnoForm.servicio === sv.nombre ? G.green : G.border,
                      color:turnoForm.servicio === sv.nombre ? G.greenL : G.muted,
                      fontWeight:turnoForm.servicio === sv.nombre ? 700 : 400 }}>
                    {sv.nombre}
                  </button>
                ))}
              </div>
            </Field>

            {/* Hora opcional */}
            <Field label="hora (opcional)"><input style={s.input} type="time" value={turnoForm.hora} onChange={e => setTF("hora", e.target.value)} /></Field>

            {/* Forma de cobro */}
            <Field label="forma de cobro *">
              <div style={{ display:"flex", gap:7 }}>
                {["efectivo","transferencia","mixto"].map(p => (
                  <button key={p} onClick={() => setTF("pago", p)}
                    style={{ ...s.btnGl, flex:1, padding:"8px 6px", fontSize:11,
                      background:turnoForm.pago === p ? G.greenM : "transparent",
                      borderColor:turnoForm.pago === p ? G.green : G.border,
                      color:turnoForm.pago === p ? G.greenL : G.muted,
                      fontWeight:turnoForm.pago === p ? 700 : 400 }}>{p}</button>
                ))}
              </div>
            </Field>

            {/* Monto(s) */}
            {modoMixto ? (
              <div style={{ display:"flex", gap:10 }}>
                <Field label="efectivo"><input style={s.input} type="number" value={turnoForm.montoEfectivo} onChange={e => setTF("montoEfectivo", e.target.value)} placeholder="0" /></Field>
                <Field label="transferencia"><input style={s.input} type="number" value={turnoForm.montoTransf} onChange={e => setTF("montoTransf", e.target.value)} placeholder="0" /></Field>
              </div>
            ) : (
              <Field label="monto *"><input style={s.input} type="number" value={turnoForm.monto} onChange={e => setTF("monto", e.target.value)} placeholder="0" /></Field>
            )}
            {modoMixto && totalCalculado > 0 && (
              <p style={{ fontFamily:F.sans, fontSize:12, color:G.greenL, margin:"-6px 0 0", textAlign:"right" }}>Total: {fmtPesos(totalCalculado)}</p>
            )}

            <div style={{ display:"flex", gap:9 }}>
              <button style={{ ...s.btnGl, flex:1 }} onClick={() => { setShowTurnoForm(false); setTurnoForm({ clientaId:"", servicio:"", hora:"", pago:"efectivo", monto:"", montoEfectivo:"", montoTransf:"" }); setBusqClienta(""); }}>cancelar</button>
              <button style={{ ...s.btnG, flex:1, opacity:saving ? 0.6:1 }} onClick={guardarTurno} disabled={saving}>{saving ? "guardando..." : "registrar →"}</button>
            </div>
          </div>
        </div>
      ) : (
        <button style={{ ...s.btnGl, width:"100%", marginTop:8, fontSize:12 }} onClick={() => setShowTurnoForm(true)}>+ registrar turno pasado</button>
      )}
    </div>
  );
}

// ── Gastos Tab ─────────────────────────────────────────────────────────────────
function GastosTab({ data, toast }) {
  const [form, setForm] = useState({ fecha:hoyISO(), categoria:"insumos", descripcion:"", monto:"" });
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const set = (k, v) => setForm(f => ({...f, [k]:v}));
  const CATS = ["insumos","operativo","marketing","personal","otro"];

  const guardar = async () => {
    if (!form.descripcion || !form.monto) { toast("completá descripción y monto"); return; }
    const d = { ...form, monto:parseFloat(form.monto) || 0 };
    if (editId) { await data.editarGasto(editId, d); toast("✓ gasto actualizado"); setEditId(null); }
    else { await data.crearGasto(d); toast("✓ gasto guardado"); }
    setForm({ fecha:hoyISO(), categoria:"insumos", descripcion:"", monto:"" });
    setShowForm(false);
  };

  const sorted = [...(data.gastos || [])].sort((a,b) => b.fecha.localeCompare(a.fecha));

  return (
    <div style={{ padding:"18px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <p style={{ ...s.eyebrow, margin:0 }}>gastos del estudio</p>
        <button style={{ ...s.btnG, width:"auto", padding:"8px 14px", fontSize:12 }} onClick={() => { setShowForm(true); setEditId(null); setForm({ fecha:hoyISO(), categoria:"insumos", descripcion:"", monto:"" }); }}>+ agregar</button>
      </div>
      {showForm && (
        <div style={{ ...s.card, marginBottom:14 }}>
          <Field label="fecha"><input style={s.input} type="date" value={form.fecha} onChange={e => set("fecha", e.target.value)} /></Field>
          <Field label="categoría">
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {CATS.map(c => (
                <button key={c} onClick={() => set("categoria", c)} style={{ ...s.btnGl, padding:"6px 12px", fontSize:11, background:form.categoria===c ? G.greenM : G.glass, borderColor:form.categoria===c ? G.green : G.border, color:form.categoria===c ? G.greenL : G.sub }}>{c}</button>
              ))}
            </div>
          </Field>
          <Field label="descripción"><input style={s.input} value={form.descripcion} onChange={e => set("descripcion", e.target.value)} placeholder="ej: pegamento, limpiador…" /></Field>
          <Field label="monto ($)"><input style={s.input} type="number" value={form.monto} onChange={e => set("monto", e.target.value)} placeholder="0" /></Field>
          <div style={{ display:"flex", gap:9, marginTop:10 }}>
            <button style={{ ...s.btnGl, flex:1 }} onClick={() => { setShowForm(false); setEditId(null); }}>cancelar</button>
            <button style={{ ...s.btnG, flex:1 }} onClick={guardar}>guardar →</button>
          </div>
        </div>
      )}
      {sorted.length === 0 && <p style={{ color:G.muted, fontSize:13 }}>Sin gastos registrados</p>}
      {sorted.map(g => (
        <div key={g._id} style={{ ...s.card, marginBottom:8, display:"flex", gap:10, alignItems:"flex-start" }}>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:3 }}>
              <span style={{ ...s.tag, fontSize:9 }}>{g.categoria}</span>
              <span style={{ fontFamily:F.sans, fontSize:10, color:G.muted }}>{g.fecha}</span>
            </div>
            <p style={{ margin:0, fontFamily:F.sans, fontSize:13, color:G.sub }}>{g.descripcion}</p>
            <p style={{ margin:"3px 0 0", fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.red }}>{fmtPesos(g.monto)}</p>
          </div>
          <button style={{ background:"transparent", border:"none", cursor:"pointer", color:G.muted, fontSize:11, padding:"4px 8px" }} onClick={() => { setEditId(g._id); setForm({ fecha:g.fecha, categoria:g.categoria, descripcion:g.descripcion, monto:String(g.monto) }); setShowForm(true); }}>editar</button>
          <button style={{ background:"transparent", border:"none", cursor:"pointer", color:G.red, fontSize:11, padding:"4px 8px" }} onClick={async () => { if (window.confirm("¿Eliminar gasto?")) { await data.borrarGasto(g._id); toast("gasto eliminado"); }}}>✕</button>
        </div>
      ))}
    </div>
  );
}

// ── Insumos Tab ────────────────────────────────────────────────────────────────
function InsumosTab({ data, toast }) {
  const EMPTY = { nombre:"", precio:"", detalle:"", duracion:"" };
  const [form, setForm]     = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const set = (k, v) => setForm(f => ({...f, [k]:v}));

  const guardar = async () => {
    if (!form.nombre.trim()) { toast("el nombre es obligatorio"); return; }
    const d = { nombre:form.nombre.trim(), precio:parseFloat(form.precio)||0, detalle:form.detalle.trim(), duracion:form.duracion.trim() };
    if (editId) { await data.editarInsumo(editId, d); toast("✓ insumo actualizado"); setEditId(null); }
    else { await data.crearInsumo(d); toast("✓ insumo guardado"); }
    setForm(EMPTY); setShowForm(false);
  };

  const sorted = [...(data.insumos || [])].sort((a,b) => (a.nombre||"").localeCompare(b.nombre||""));
  const totalInvertido = sorted.reduce((acc, i) => acc + (i.precio||0), 0);

  return (
    <div style={{ padding:"18px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div>
          <p style={{ ...s.eyebrow, margin:"0 0 2px" }}>insumos del estudio</p>
          {sorted.length > 0 && <p style={{ fontFamily:F.sans, fontSize:11, color:G.muted, margin:0 }}>{sorted.length} productos · {fmtPesos(totalInvertido)} invertidos</p>}
        </div>
        <button style={{ ...s.btnG, width:"auto", padding:"8px 14px", fontSize:12 }} onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY); }}>+ agregar</button>
      </div>
      {showForm && (
        <div style={{ ...s.card, marginBottom:14 }}>
          <Field label="nombre del insumo"><input style={s.input} value={form.nombre} onChange={e => set("nombre", e.target.value)} placeholder="ej: Extensiones J curl 0.07mm" /></Field>
          <Field label="precio ($)"><input style={s.input} type="number" value={form.precio} onChange={e => set("precio", e.target.value)} placeholder="0" /></Field>
          <Field label="detalle"><textarea style={{ ...s.input, height:55, resize:"none" }} value={form.detalle} onChange={e => set("detalle", e.target.value)} placeholder="Bandeja 12 líneas, marca, referencia…" /></Field>
          <Field label="vida útil"><input style={s.input} value={form.duracion} onChange={e => set("duracion", e.target.value)} placeholder="ej: 3 meses, 50 aplicaciones" /></Field>
          <div style={{ display:"flex", gap:9, marginTop:10 }}>
            <button style={{ ...s.btnGl, flex:1 }} onClick={() => { setShowForm(false); setEditId(null); }}>cancelar</button>
            <button style={{ ...s.btnG, flex:1 }} onClick={guardar}>guardar →</button>
          </div>
        </div>
      )}
      {sorted.length === 0 && !showForm && <p style={{ color:G.muted, fontSize:13 }}>Sin insumos registrados</p>}
      {sorted.map(item => (
        <div key={item._id} style={{ ...s.card, marginBottom:8, display:"flex", gap:10, alignItems:"flex-start" }}>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:3 }}>
              <p style={{ margin:0, fontFamily:F.serif, fontSize:14 }}>{item.nombre}</p>
              {item.duracion && <span style={{ ...s.tag, fontSize:9 }}>{item.duracion}</span>}
            </div>
            {item.detalle && <p style={{ margin:"0 0 3px", fontFamily:F.sans, fontSize:11, color:G.muted }}>{item.detalle}</p>}
            <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.green }}>{fmtPesos(item.precio)}</p>
          </div>
          <button style={{ background:"transparent", border:"none", cursor:"pointer", color:G.muted, fontSize:11, padding:"4px 8px" }} onClick={() => { setEditId(item._id); setForm({ nombre:item.nombre||"", precio:String(item.precio||""), detalle:item.detalle||"", duracion:item.duracion||"" }); setShowForm(true); }}>✎</button>
          <button style={{ background:"transparent", border:"none", cursor:"pointer", color:G.red, fontSize:11, padding:"4px 8px" }} onClick={async () => { if (window.confirm(`¿Eliminar "${item.nombre}"?`)) { await data.borrarInsumo(item._id); toast("insumo eliminado"); }}}>✕</button>
        </div>
      ))}
    </div>
  );
}

// ── Config Promos ──────────────────────────────────────────────────────────────
function ConfigPromos({ data, toast }) {
  const saved = data.getConfig("promos", {});
  const [cumple, setCumple] = useState({
    habilitado: saved.cumpleanos?.habilitado ?? false,
    tipo: saved.cumpleanos?.tipo || "%",
    monto: saved.cumpleanos?.monto || 10,
  });
  const saveCumple = async (upd) => {
    const next = { ...cumple, ...upd };
    setCumple(next);
    await data.saveConfig("promos", { ...saved, cumpleanos: next });
    toast("✓ guardado");
  };
  return (
    <div>
      <div style={{ ...s.card, marginBottom:14, borderColor: cumple.habilitado ? "rgba(245,200,66,0.4)" : G.border }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: cumple.habilitado ? 14 : 0 }}>
          <div>
            <p style={{ margin:"0 0 2px", fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.white }}>🎂 Descuento de cumpleaños</p>
            <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>Se muestra 14 días antes en el panel de la clienta</p>
          </div>
          <button onClick={() => saveCumple({ habilitado: !cumple.habilitado })} style={{ background: cumple.habilitado ? G.greenM : "transparent", border:`1.5px solid ${cumple.habilitado ? G.green : G.border}`, borderRadius:50, width:48, height:26, cursor:"pointer", position:"relative", transition:"all 0.2s", flexShrink:0 }}>
            <div style={{ position:"absolute", top:3, left: cumple.habilitado ? 25 : 3, width:18, height:18, borderRadius:"50%", background: cumple.habilitado ? G.greenL : G.muted, transition:"left 0.2s" }} />
          </button>
        </div>
        {cumple.habilitado && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <Field label="tipo de descuento">
              <div style={{ display:"flex", gap:7 }}>
                {["%", "$"].map(t => (
                  <button key={t} onClick={() => saveCumple({ tipo: t })} style={{ ...s.btnGl, flex:1, fontSize:13, background: cumple.tipo===t ? G.greenM : "transparent", borderColor: cumple.tipo===t ? G.green : G.border, color: cumple.tipo===t ? G.greenL : G.muted, fontWeight: cumple.tipo===t ? 700 : 400 }}>{t === "%" ? "Porcentaje (%)" : "Monto fijo ($)"}</button>
                ))}
              </div>
            </Field>
            <Field label={cumple.tipo === "%" ? "porcentaje de descuento" : "monto de descuento ($)"}>
              <input style={s.input} type="number" min="1" max={cumple.tipo==="%"?100:99999} value={cumple.monto}
                onChange={e => setCumple(p => ({...p, monto: Number(e.target.value)}))}
                onBlur={() => saveCumple({})} />
            </Field>
            <div style={{ ...s.card, margin:0, background:"rgba(245,200,66,0.08)", borderColor:"rgba(245,200,66,0.3)" }}>
              <p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:"#f5c842", lineHeight:1.5 }}>
                La clienta verá este regalo en su panel los 14 días previos a su cumpleaños y el día mismo.
              </p>
            </div>
          </div>
        )}
      </div>
      <VisitasDescCard data={data} toast={toast} saved={saved} />
    </div>
  );
}

function VisitasDescCard({ data, toast, saved }) {
  const [vis, setVis] = useState({
    habilitado: saved.visitasDesc?.habilitado ?? false,
    tipo:       saved.visitasDesc?.tipo       || "%",
    monto:      saved.visitasDesc?.monto      || 10,
    cantidad:   saved.visitasDesc?.cantidad   || 5,
  });
  const saveVis = async (upd) => {
    const next = { ...vis, ...upd };
    setVis(next);
    await data.saveConfig("promos", { ...saved, visitasDesc: next });
    toast("✓ guardado");
  };
  return (
    <div style={{ ...s.card, borderColor: vis.habilitado ? "rgba(143,189,90,0.4)" : G.border }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: vis.habilitado ? 14 : 0 }}>
        <div>
          <p style={{ margin:"0 0 2px", fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.white }}>🎯 Descuento por visitas</p>
          <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>Se activa automáticamente al llegar a X visitas</p>
        </div>
        <button onClick={() => saveVis({ habilitado: !vis.habilitado })} style={{ background: vis.habilitado ? G.greenM : "transparent", border:`1.5px solid ${vis.habilitado ? G.green : G.border}`, borderRadius:50, width:48, height:26, cursor:"pointer", position:"relative", transition:"all 0.2s", flexShrink:0 }}>
          <div style={{ position:"absolute", top:3, left: vis.habilitado ? 25 : 3, width:18, height:18, borderRadius:"50%", background: vis.habilitado ? G.greenL : G.muted, transition:"left 0.2s" }} />
        </button>
      </div>
      {vis.habilitado && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <Field label="visitas necesarias para el descuento">
            <input style={s.input} type="number" min="1" max="50" value={vis.cantidad}
              onChange={e => setVis(p => ({ ...p, cantidad: Number(e.target.value) }))}
              onBlur={() => saveVis({})} />
          </Field>
          <Field label="tipo de descuento">
            <div style={{ display:"flex", gap:7 }}>
              {["%", "$"].map(t => (
                <button key={t} onClick={() => saveVis({ tipo: t })} style={{ ...s.btnGl, flex:1, fontSize:13, background: vis.tipo===t ? G.greenM : "transparent", borderColor: vis.tipo===t ? G.green : G.border, color: vis.tipo===t ? G.greenL : G.muted, fontWeight: vis.tipo===t ? 700 : 400 }}>{t === "%" ? "Porcentaje (%)" : "Monto fijo ($)"}</button>
              ))}
            </div>
          </Field>
          <Field label={vis.tipo === "%" ? "porcentaje de descuento" : "monto de descuento ($)"}>
            <input style={s.input} type="number" min="1" max={vis.tipo==="%"?100:99999} value={vis.monto}
              onChange={e => setVis(p => ({ ...p, monto: Number(e.target.value) }))}
              onBlur={() => saveVis({})} />
          </Field>
          <div style={{ ...s.card, margin:0, background:"rgba(143,189,90,0.06)", borderColor:"rgba(143,189,90,0.3)" }}>
            <p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:G.greenL, lineHeight:1.5 }}>
              Cada {vis.cantidad} visitas la clienta recibe {vis.tipo === "%" ? `${vis.monto}% de descuento` : `$${vis.monto} de descuento`} en su próximo turno.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin Config ───────────────────────────────────────────────────────────────
function AdminConfig({ data, toast, onLogout }) {
  const [tab, setTab] = useState("servicios");
  const wide = useIsWide();
  const configTabs = ["servicios","mensajes","técnico","adicionales","horarios","estudio","notificaciones","apariencia","promos"];
  const renderContent = () => {
    if (tab === "servicios")      return <ConfigServicios      data={data} toast={toast} />;
    if (tab === "mensajes")       return <ConfigMensajes       data={data} toast={toast} />;
    if (tab === "técnico")        return <ConfigTecnico        data={data} toast={toast} />;
    if (tab === "adicionales")    return <ConfigAdicionales    data={data} toast={toast} />;
    if (tab === "horarios")       return <ConfigHorarios       data={data} toast={toast} />;
    if (tab === "estudio")        return <ConfigEstudio        data={data} toast={toast} onLogout={onLogout} />;
    if (tab === "notificaciones") return <ConfigNotificaciones data={data} toast={toast} />;
    if (tab === "apariencia")     return <ConfigApariencia     data={data} toast={toast} />;
    if (tab === "promos")         return <ConfigPromos         data={data} toast={toast} />;
  };
  return (
    <div>
      <div style={{ ...s.topBar, ...(wide && { padding:"16px 28px 14px" }) }}><h1 style={s.h1}>Configuración</h1><p style={s.sub}>Parámetros del estudio</p></div>
      {wide ? (
        <div style={{ display:"flex", minHeight:"calc(100vh - 80px)" }}>
          <div style={{ width:180, flexShrink:0, padding:"20px 12px", borderRight:`0.5px solid ${G.border}`, display:"flex", flexDirection:"column", gap:4 }}>
            {configTabs.map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ ...s.btnGl, width:"100%", textAlign:"left", fontSize:13, background:tab === t ? G.greenM : "transparent", borderColor:tab === t ? G.green : G.border, color:tab === t ? G.greenL : G.muted, padding:"10px 14px", textTransform:"capitalize", fontWeight:tab === t ? 700 : 400 }}>{t}</button>
            ))}
          </div>
          <div style={{ flex:1, padding:"24px 32px", overflowY:"auto" }}>
            {renderContent()}
          </div>
        </div>
      ) : (
        <div style={{ padding:"18px" }}>
          <div style={{ display:"flex", gap:7, marginBottom:14, flexWrap:"wrap" }}>
            {configTabs.map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ ...s.btnGl, fontSize:11, background:tab === t ? G.greenM : "transparent", borderColor:tab === t ? G.green : G.border, color:tab === t ? G.greenL : G.muted, padding:"8px 14px", textTransform:"capitalize", fontWeight:tab === t ? 700 : 400 }}>{t}</button>
            ))}
          </div>
          <button style={{ ...s.btnRed, width:"100%", marginBottom:18, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }} onClick={onLogout}>
            <Icon name="logOut" size={14} color={G.red} /> Cerrar sesión
          </button>
          {renderContent()}
        </div>
      )}
    </div>
  );
}

// ── Config Apariencia ──────────────────────────────────────────────────────────
function ConfigApariencia({ data, toast }) {
  const { dark, toggleTheme } = useTheme();
  return (
    <div>
      <div style={{ ...s.cardHero, marginBottom:18 }}>
        <p style={s.eyebrow}>tema visual</p>
        <p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:G.sub, lineHeight:1.6 }}>
          Cambiá el tema de la app. Tu elección queda guardada en el dispositivo.
        </p>
      </div>
      <div style={{ ...s.card, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px" }}>
        <div>
          <p style={{ margin:"0 0 3px", fontFamily:F.display, fontWeight:400, fontSize:18, letterSpacing:"0.5px", color:G.white }}>{dark ? "Modo oscuro" : "Modo claro"}</p>
          <p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:G.muted }}>{dark ? "Fondo oscuro, ideal para ambiente de estudio" : "Fondo claro, ideal para uso en exteriores"}</p>
        </div>
        <button onClick={toggleTheme} style={{ background:dark ? G.greenM : G.glass, border:`1.5px solid ${dark ? G.green : G.border}`, borderRadius:50, width:56, height:30, cursor:"pointer", position:"relative", transition:"all 0.25s", flexShrink:0 }}>
          <div style={{ position:"absolute", top:3, left:dark ? 29 : 3, width:22, height:22, borderRadius:"50%", background:dark ? G.greenL : G.sub, transition:"left 0.25s", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Icon name={dark ? "moon" : "sun"} size={11} color={dark ? "#0a0a0a" : G.bg} />
          </div>
        </button>
      </div>
    </div>
  );
}

// ── Config Mensajes WA ─────────────────────────────────────────────────────────
function ConfigMensajes({ data, toast }) {
  const saved = data.getConfig("mensajes", DEFAULT_MENSAJES);
  const [form, setForm] = useState({ ...DEFAULT_MENSAJES, ...saved });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));

  const guardar = async () => {
    setSaving(true);
    await data.saveConfig("mensajes", form);
    setSaving(false);
    toast("✓ Mensajes guardados");
  };

  const VARS = {
    service14d:  ["{nombre}"],
    recordatorio:["{nombre}", "{hora}"],
    bienvenida:  ["{nombre}", "{estudio}", "{email}", "{pass}", "{url}"],
  };

  const LABELS = {
    service14d:  "Recordatorio de service (14 días sin turno)",
    recordatorio:"Recordatorio de turno (día anterior)",
    bienvenida:  "Bienvenida al registrar clienta nueva",
  };

  return (
    <div>
      <div style={{ ...s.cardHero, marginBottom:18 }}>
        <p style={s.eyebrow}>plantillas de whatsapp</p>
        <p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:G.sub, lineHeight:1.6 }}>
          Personalizá los mensajes que se envían automáticamente. Usá las variables entre llaves para insertar datos dinámicos.
        </p>
      </div>
      {Object.keys(DEFAULT_MENSAJES).map(key => (
        <div key={key} style={{ ...s.card, marginBottom:14 }}>
          <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:14, color:G.text, margin:"0 0 4px" }}>{LABELS[key]}</p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:10 }}>
            {VARS[key].map(v => <span key={v} style={{ ...s.tag, fontSize:10 }}>{v}</span>)}
          </div>
          <textarea rows={4} style={{ width:"100%", boxSizing:"border-box", resize:"vertical" }} value={form[key]} onChange={e => set(key, e.target.value)} />
          <p style={{ fontFamily:F.sans, fontSize:10, color:G.muted, margin:"6px 0 0" }}>
            Vista previa: {fillMsg(form[key], { nombre:"María", hora:"15:00", estudio:"Lash Studio", email:"m@mail.com", pass:"ABC123", url:DEPLOY_URL })}
          </p>
        </div>
      ))}
      <button style={{ ...s.btnG, opacity:saving ? 0.6 : 1 }} onClick={guardar} disabled={saving}>
        {saving ? "Guardando..." : "Guardar mensajes →"}
      </button>
      <button style={{ ...s.btnGl, marginTop:10 }} onClick={() => { setForm({ ...DEFAULT_MENSAJES }); }}>
        Restaurar por defecto
      </button>
    </div>
  );
}

// ── Image Cropper ─────────────────────────────────────────────────────────────
function ImageCropper({ src, onSave, onCancel }) {
  const ASPECT = 16 / 9;
  const PREV_W = Math.min(300, (typeof window !== "undefined" ? window.innerWidth : 400) - 40);
  const PREV_H = Math.round(PREV_W / ASPECT);
  const [scale, setScale]       = useState(1);
  const [rotate, setRotate]     = useState(0);
  const [pos, setPos]           = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [pinchStart, setPinchStart] = useState(null);
  const [natSize, setNatSize]   = useState({ w: 0, h: 0 });
  const imgRef = useRef(null);

  const fitScale = (r, nw, nh) => {
    if (!nw) return 1;
    const isRot = r % 180 !== 0;
    const fw = isRot ? nh : nw, fh = isRot ? nw : nh;
    return Math.max(PREV_W / fw, PREV_H / fh);
  };

  const onImgLoad = (e) => {
    const nw = e.target.naturalWidth, nh = e.target.naturalHeight;
    setNatSize({ w: nw, h: nh });
    setScale(fitScale(0, nw, nh));
    setPos({ x: 0, y: 0 });
  };

  const rotateDir = (dir) => {
    const r = (rotate + dir + 360) % 360;
    setRotate(r);
    setScale(fitScale(r, natSize.w, natSize.h));
    setPos({ x: 0, y: 0 });
  };

  const onMouseDown = (e) => { e.preventDefault(); setDragging(true); setDragStart({ x: e.clientX - pos.x, y: e.clientY - pos.y }); };
  const onMouseMove = (e) => { if (!dragging || !dragStart) return; setPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); };
  const onMouseUp   = () => { setDragging(false); setDragStart(null); };

  const onTouchStart = (e) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      setDragging(true);
      setDragStart({ x: e.touches[0].clientX - pos.x, y: e.touches[0].clientY - pos.y });
    } else if (e.touches.length === 2) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      setPinchStart({ dist: d, scale });
      setDragging(false);
    }
  };
  const onTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && dragging && dragStart) {
      setPos({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
    } else if (e.touches.length === 2 && pinchStart) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      setScale(Math.max(0.05, Math.min(12, pinchStart.scale * (d / pinchStart.dist))));
    }
  };
  const onTouchEnd = () => { setDragging(false); setDragStart(null); setPinchStart(null); };

  const apply = () => {
    const OUT_W = 800, OUT_H = Math.round(OUT_W / ASPECT);
    const canvas = document.createElement("canvas");
    canvas.width = OUT_W; canvas.height = OUT_H;
    const ctx = canvas.getContext("2d");
    const img = imgRef.current;
    if (!img) return;
    const outScale = OUT_W / PREV_W;
    ctx.save();
    ctx.translate(OUT_W / 2 + pos.x * outScale, OUT_H / 2 + pos.y * outScale);
    ctx.rotate(rotate * Math.PI / 180);
    ctx.scale(scale * outScale, scale * outScale);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2, img.naturalWidth, img.naturalHeight);
    ctx.restore();
    onSave(canvas.toDataURL("image/jpeg", 0.88));
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14 }}>
      <p style={{ fontFamily:F.sans, fontSize:11, color:G.muted, textAlign:"center", margin:0 }}>
        Arrastrá para posicionar · Pellizcá para escalar
      </p>
      <div
        style={{ width:PREV_W, height:PREV_H, borderRadius:14, overflow:"hidden", background:"#111", cursor:dragging?"grabbing":"grab", position:"relative", userSelect:"none", flexShrink:0, touchAction:"none" }}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      >
        <img
          ref={imgRef} src={src} alt="" onLoad={onImgLoad} draggable={false}
          style={{ position:"absolute", left:"50%", top:"50%", transform:`translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) rotate(${rotate}deg) scale(${scale})`, transformOrigin:"center", maxWidth:"none", pointerEvents:"none", userSelect:"none" }}
        />
      </div>
      <div style={{ width:PREV_W, display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontFamily:F.sans, fontSize:13, color:G.muted, lineHeight:1 }}>−</span>
        <input type="range" min={0.05} max={10} step={0.01} value={scale} onChange={e => setScale(Number(e.target.value))} style={{ flex:1, accentColor:G.green }} />
        <span style={{ fontFamily:F.sans, fontSize:13, color:G.muted, lineHeight:1 }}>+</span>
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <button style={{ ...s.btnGl, padding:"9px 18px" }} onClick={() => rotateDir(-90)}>↺ −90°</button>
        <button style={{ ...s.btnGl, padding:"9px 18px" }} onClick={() => rotateDir(90)}>+90° ↻</button>
      </div>
      <div style={{ display:"flex", gap:10, width:PREV_W }}>
        <button style={{ ...s.btnGl, flex:1 }} onClick={onCancel}>cancelar</button>
        <button style={{ ...s.btnG, flex:1 }} onClick={apply}>aplicar →</button>
      </div>
    </div>
  );
}

// ── Config Servicios ───────────────────────────────────────────────────────────
function ConfigServicios({ data, toast }) {
  const [sheet, setSheet]     = useState(false);
  const [editSv, setEditSv]   = useState(null);
  const [form, setForm]       = useState({ nombre:"", precio:"", duracion:"", descripcion:"", cuidados:"", intervaloService:"14", fotos:[] });
  const [saving, setSaving]   = useState(false);
  const [confirm, setConfirm]   = useState(null);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc]   = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));

  const abrirNuevo  = () => { setEditSv(null); setForm({ nombre:"", precio:"", duracion:"", descripcion:"", cuidados:"", intervaloService:"14", fotos:[] }); setSheet(true); };
  const abrirEditar = (sv) => { setEditSv(sv); setForm({ nombre:sv.nombre, precio:String(sv.precio||""), duracion:String(sv.duracion||""), descripcion:sv.descripcion||"", cuidados:sv.cuidados||"", intervaloService:String(sv.intervaloService||14), fotos:sv.fotos||[] }); setSheet(true); };

  const onFotoFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setCropSrc(URL.createObjectURL(file));
    e.target.value = "";
  };
  const onCropSave = async (dataUrl) => {
    URL.revokeObjectURL(cropSrc); setCropSrc(null);
    setUploading(true);
    try { const url = await subirFoto(dataUrl); set("fotos", [...(form.fotos||[]), url]); } catch { toast("Error al subir foto"); }
    setUploading(false);
  };
  const onCropCancel = () => { URL.revokeObjectURL(cropSrc); setCropSrc(null); };
  const removeFoto = (i) => set("fotos", form.fotos.filter((_, j) => j !== i));

  const guardar = async () => {
    if (!form.nombre || !form.precio) { toast("nombre y precio son obligatorios"); return; }
    setSaving(true);
    const payload = { nombre:form.nombre, precio:Number(form.precio), duracion:Number(form.duracion)||60, descripcion:form.descripcion, cuidados:form.cuidados||"", intervaloService:Number(form.intervaloService)||14, fotos:form.fotos||[] };
    if (editSv) await data.editarServicio(editSv._id, payload);
    else        await data.crearServicio(payload);
    setSaving(false); setSheet(false);
    toast(editSv ? "✓ servicio actualizado" : "✓ servicio creado");
  };

  return (
    <div>
      <button style={{ ...s.btnG, marginBottom:14 }} onClick={abrirNuevo}>+ agregar servicio</button>
      {data.servicios.length === 0 && <p style={{ color:G.muted, fontSize:13 }}>Sin servicios aún</p>}
      {data.servicios.map(sv => (
        <div key={sv._id} style={s.card}>
          {sv.fotos?.length > 0 && (
            <div style={{ display:"flex", gap:8, overflowX:"auto", marginBottom:10, paddingBottom:4 }}>
              {sv.fotos.map((url, i) => <img key={i} src={url} alt="" style={{ width:80, height:80, borderRadius:10, objectFit:"cover", flexShrink:0 }} onError={e => { e.target.style.display = "none"; }} />)}
            </div>
          )}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div style={{ flex:1 }}>
              <p style={{ margin:"0 0 3px", fontFamily:F.serif, fontWeight:700, fontSize:15 }}>{sv.nombre}</p>
              {sv.descripcion && <p style={{ margin:"0 0 7px", fontFamily:F.sans, fontSize:12, color:G.sub }}>{sv.descripcion}</p>}
              <div style={{ display:"flex", gap:7 }}>
                <span style={s.tag}>{sv.duracion}min est.</span>
                <span style={s.tag}>{fmtPesos(sv.precio)}</span>
              </div>
            </div>
            <div style={{ display:"flex", gap:6, marginLeft:10 }}>
              <button style={{ ...s.btnGl, padding:"6px 10px", fontSize:12 }} onClick={() => abrirEditar(sv)}>Editar</button>
              <button style={{ ...s.btnRed, padding:"6px 10px", fontSize:12 }} onClick={() => setConfirm(sv)}>✕</button>
            </div>
          </div>
          <p style={{ margin:"8px 0 0", fontFamily:F.sans, fontSize:10, color:G.muted, fontStyle:"italic" }}>La duración es estimada y puede variar según cada clienta</p>
        </div>
      ))}
      {sheet && (
        <Sheet titulo={editSv ? "Editar Servicio" : "Nuevo Servicio"} onClose={() => setSheet(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Field label="nombre del servicio *"><input style={s.input} value={form.nombre} onChange={e => set("nombre", e.target.value)} placeholder="Nombre del servicio" /></Field>
            <Field label="descripción"><input style={s.input} value={form.descripcion} onChange={e => set("descripcion", e.target.value)} placeholder="Breve descripción para las clientas" /></Field>
            <Field label="cuidados post-tratamiento" hint="Se enviará a la clienta al finalizar la cita"><textarea style={{ ...s.input, height:80, resize:"none" }} value={form.cuidados||""} onChange={e => set("cuidados", e.target.value)} placeholder="Evitá mojar la zona por 24hs, no uses rímel..." /></Field>
            <div style={{ display:"flex", gap:10 }}>
              <Field label="precio *"><input style={{ ...s.input }} type="number" value={form.precio} onChange={e => set("precio", e.target.value)} placeholder="0" /></Field>
              <Field label="duración (min)"><input style={{ ...s.input }} type="number" value={form.duracion} onChange={e => set("duracion", e.target.value)} placeholder="60" /></Field>
            </div>
            <Field label="intervalo de service (días)" hint="Cada cuántos días se recomienda repetir este servicio"><input style={s.input} type="number" value={form.intervaloService} onChange={e => set("intervaloService", e.target.value)} placeholder="14" /></Field>
            <div style={s.div} />
            <p style={{ fontFamily:F.display, fontWeight:400, fontSize:16, letterSpacing:"0.5px", color:G.white, margin:"0 0 4px" }}>Fotos del servicio</p>
            <p style={{ fontFamily:F.sans, fontSize:11, color:G.muted, margin:"0 0 10px" }}>Subí fotos desde tu dispositivo. Se muestran a las clientas al agendar.</p>
            {(form.fotos || []).map((url, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:9, marginBottom:7 }}>
                <img src={url} alt="" style={{ width:60, height:60, borderRadius:9, objectFit:"cover", flexShrink:0 }} onError={e => { e.target.style.display = "none"; }} />
                <p style={{ flex:1, margin:0, fontFamily:F.sans, fontSize:10, color:G.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{url.startsWith("data:") ? "imagen local" : url}</p>
                <button style={{ ...s.btnRed, padding:"4px 8px", fontSize:11 }} onClick={() => removeFoto(i)}>✕</button>
              </div>
            ))}
            <label style={{ ...s.btnGl, display:"flex", alignItems:"center", justifyContent:"center", gap:8, cursor:"pointer", opacity:uploading ? 0.6 : 1, textAlign:"center" }}>
              <Icon name="camera" size={14} color={G.sub} />
              {uploading ? "Subiendo..." : "Agregar foto desde dispositivo"}
              <input type="file" accept="image/*" style={{ display:"none" }} onChange={onFotoFile} disabled={uploading} />
            </label>
            <div style={s.div} />
            <button style={{ ...s.btnG, opacity:saving ? 0.6 : 1 }} onClick={guardar} disabled={saving}>{saving ? "guardando..." : editSv ? "guardar cambios →" : "crear servicio →"}</button>
          </div>
        </Sheet>
      )}
      {confirm && <Modal titulo="Eliminar servicio" msg={`¿Eliminar "${confirm.nombre}"?`} onOk={async () => { await data.borrarServicio(confirm._id); setConfirm(null); toast("servicio eliminado"); }} onCancel={() => setConfirm(null)} okLabel="eliminar" danger />}
      {cropSrc && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.97)", zIndex:200, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:20 }}>
          <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:18, color:G.text, marginBottom:18 }}>Ajustar foto</p>
          <ImageCropper src={cropSrc} onSave={onCropSave} onCancel={onCropCancel} />
        </div>
      )}
    </div>
  );
}

// ── Config Técnico ─────────────────────────────────────────────────────────────
function ConfigTecnico({ data, toast }) {
  const OpcionesEditor = ({ configKey, label, placeholder }) => {
    const vals = data.getConfig(configKey, []);
    const [nuevo, setNuevo] = useState("");
    const agregar = async () => {
      const v = nuevo.trim(); if (!v) return;
      if (vals.includes(v)) { toast("ya existe"); return; }
      await data.saveConfig(configKey, [...vals, v]); setNuevo(""); toast(`✓ ${v} agregado`);
    };
    const quitar = async (v) => { await data.saveConfig(configKey, vals.filter(x => x !== v)); toast(`${v} eliminado`); };
    return (
      <div style={{ ...s.card, marginBottom:12 }}>
        <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.white, margin:"0 0 10px" }}>{label}</p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginBottom:12 }}>
          {vals.length === 0 && <p style={{ color:G.muted, fontSize:12, margin:0 }}>Sin opciones aún</p>}
          {vals.map(v => (
            <div key={v} style={{ display:"flex", alignItems:"center", gap:4, background:G.greenM, border:`0.5px solid ${G.green}`, borderRadius:20, padding:"3px 10px" }}>
              <span style={{ fontFamily:F.sans, fontSize:12, color:G.greenL }}>{v}</span>
              <button onClick={() => quitar(v)} style={{ background:"none", border:"none", color:G.red, cursor:"pointer", fontSize:12, padding:"0 0 0 4px", lineHeight:1 }}>✕</button>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <input style={{ ...s.input, flex:1 }} value={nuevo} onChange={e => setNuevo(e.target.value)} placeholder={placeholder} onKeyDown={e => e.key === "Enter" && agregar()} />
          <button style={s.btnGl} onClick={agregar}>+ agregar</button>
        </div>
      </div>
    );
  };
  return (
    <div>
      <p style={{ fontFamily:F.sans, fontSize:12, color:G.muted, marginBottom:14, lineHeight:1.6 }}>Configurá las opciones que aparecen en la ficha técnica de cada clienta. Agregá solo lo que usés en tu trabajo.</p>
      <OpcionesEditor configKey="curvas"   label="Curvas de pestañas" placeholder="ej: C, CC, D..." />
      <OpcionesEditor configKey="grosores" label="Grosores"           placeholder="ej: 0.07, 0.10..." />
      <OpcionesEditor configKey="largos"   label="Largos"             placeholder="ej: 11mm, 12mm..." />
    </div>
  );
}

// ── Config Adicionales ─────────────────────────────────────────────────────────
function ConfigAdicionales({ data, toast }) {
  const [items, setItems] = useState(data.getConfig("adicionales", []));
  const [form, setForm]   = useState({ nombre:"", descripcion:"", precio:"", duracion:"" });
  const [showForm, setShowForm] = useState(false);
  const [editIdx, setEditIdx]   = useState(null);
  const set = (k,v) => setForm(f => ({...f, [k]:v}));

  const abrirNuevo = () => { setEditIdx(null); setForm({ nombre:"", descripcion:"", precio:"", duracion:"" }); setShowForm(true); };
  const abrirEditar = (i) => { const a = items[i]; setEditIdx(i); setForm({ nombre:a.nombre, descripcion:a.descripcion||"", precio:String(a.precio||""), duracion:String(a.duracion||"") }); setShowForm(true); };

  const guardar = async () => {
    if (!form.nombre.trim()) { toast("el nombre es obligatorio"); return; }
    const entry = { nombre:form.nombre.trim(), descripcion:form.descripcion.trim(), precio:parseFloat(form.precio)||0, duracion:parseInt(form.duracion)||0 };
    const upd = editIdx !== null ? items.map((a,i) => i === editIdx ? entry : a) : [...items, entry];
    await data.saveConfig("adicionales", upd);
    setItems(upd);
    setForm({ nombre:"", descripcion:"", precio:"", duracion:"" });
    setShowForm(false); setEditIdx(null);
    toast(editIdx !== null ? "✓ adicional editado" : "✓ adicional guardado");
  };

  const del = async (i) => {
    const upd = items.filter((_,j) => j !== i);
    await data.saveConfig("adicionales", upd);
    setItems(upd);
    toast("eliminado");
  };

  return (
    <div style={{ padding:"0" }}>
      <p style={{ fontFamily:F.sans, fontSize:12, color:G.muted, marginBottom:14, lineHeight:1.6 }}>
        Servicios adicionales que la clienta puede agregar a su turno (remoción, diseño de cejas, etc.)
      </p>
      <button style={{ ...s.btnG, width:"100%", marginBottom:14 }} onClick={() => showForm ? (setShowForm(false), setEditIdx(null)) : abrirNuevo()}>
        {showForm ? "cancelar" : "+ nuevo adicional"}
      </button>
      {showForm && (
        <div style={{ ...s.card, marginBottom:14 }}>
          <p style={{ ...s.eyebrow, marginBottom:8 }}>{editIdx !== null ? "editar adicional" : "nuevo adicional"}</p>
          <Field label="nombre"><input style={s.input} value={form.nombre} onChange={e => set("nombre", e.target.value)} placeholder="ej: Remoción de lash" /></Field>
          <Field label="descripción (opcional)"><input style={s.input} value={form.descripcion} onChange={e => set("descripcion", e.target.value)} /></Field>
          <div style={{ display:"flex", gap:10 }}>
            <div style={{ flex:1 }}><Field label="precio ($)"><input style={s.input} type="number" value={form.precio} onChange={e => set("precio", e.target.value)} /></Field></div>
            <div style={{ flex:1 }}><Field label="duración (min)"><input style={s.input} type="number" value={form.duracion} onChange={e => set("duracion", e.target.value)} /></Field></div>
          </div>
          <button style={{ ...s.btnG, width:"100%", marginTop:10 }} onClick={guardar}>guardar →</button>
        </div>
      )}
      {items.length === 0 && <p style={{ color:G.muted, fontSize:13 }}>Sin adicionales configurados</p>}
      {items.map((a, i) => (
        <div key={i} style={{ ...s.card, marginBottom:8, display:"flex", gap:10, alignItems:"center" }}>
          <div style={{ flex:1 }}>
            <p style={{ margin:"0 0 2px", fontFamily:F.serif, fontSize:14, color:G.white }}>{a.nombre}</p>
            <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>{a.duracion ? `+${a.duracion}min` : ""}{a.precio ? ` · ${fmtPesos(a.precio)}` : ""}</p>
            {a.descripcion && <p style={{ margin:"2px 0 0", fontFamily:F.sans, fontSize:11, color:G.sub }}>{a.descripcion}</p>}
          </div>
          <button style={{ background:"transparent", border:"none", cursor:"pointer", color:G.muted, fontSize:12, padding:"4px 6px" }} onClick={() => abrirEditar(i)}>✎</button>
          <button style={{ background:"transparent", border:"none", cursor:"pointer", color:G.red, fontSize:13, padding:"4px 6px" }} onClick={() => del(i)}>✕</button>
        </div>
      ))}
    </div>
  );
}

// helpers para verificar días laborales (usado en Agenda y CAgendar)
const DIAS_SEMANA_IDX = { domingo:0, lunes:1, martes:2, "miércoles":3, jueves:4, viernes:5, sábado:6 };
const esDiaLaboral = (fechaISO, diasLaborales) => {
  if (!diasLaborales || diasLaborales.length === 0) return true; // si no configuró, todos son laborales
  const dow = new Date(fechaISO + "T12:00:00").getDay(); // 0=dom
  return diasLaborales.includes(dow);
};

// ── Config Horarios ────────────────────────────────────────────────────────────
function ConfigHorarios({ data, toast }) {
  const [tab, setTab] = useState("dias");

  const DiasConfig = () => {
    const diasGuardados = data.getConfig("diasLaborales", [1,2,3,4,5,6]); // default lun-sáb
    const [dias, setDias] = useState(diasGuardados);

    const toggleDia = async (idx) => {
      const upd = dias.includes(idx) ? dias.filter(d => d !== idx) : [...dias, idx].sort();
      setDias(upd);
      await data.saveConfig("diasLaborales", upd);
      toast("✓ días laborales guardados");
    };

    const diasInfo = [
      { idx:1, label:"Lunes",     short:"L"  },
      { idx:2, label:"Martes",    short:"M"  },
      { idx:3, label:"Miércoles", short:"Mi" },
      { idx:4, label:"Jueves",    short:"J"  },
      { idx:5, label:"Viernes",   short:"V"  },
      { idx:6, label:"Sábado",    short:"S"  },
      { idx:0, label:"Domingo",   short:"D"  },
    ];

    return (
      <div>
        <p style={{ fontFamily:F.sans, fontSize:12, color:G.muted, marginBottom:14, lineHeight:1.6 }}>
          Seleccioná los días en que trabajás. Los días no seleccionados aparecerán bloqueados en el calendario automáticamente.
        </p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:7, marginBottom:14 }}>
          {diasInfo.map(d => {
            const activo = dias.includes(d.idx);
            return (
              <div key={d.idx} onClick={() => toggleDia(d.idx)} style={{ textAlign:"center", borderRadius:12, padding:"12px 4px", cursor:"pointer", background:activo ? G.greenM : "rgba(255,255,255,0.03)", border:`1px solid ${activo ? G.green : G.border}`, transition:"all 0.2s" }}>
                <p style={{ margin:"0 0 2px", fontFamily:F.sans, fontWeight:activo ? 700 : 400, fontSize:13, color:activo ? G.greenL : G.muted }}>{d.short}</p>
                <div style={{ width:5, height:5, borderRadius:"50%", background:activo ? G.green : "transparent", margin:"0 auto" }} />
              </div>
            );
          })}
        </div>
        <div style={{ ...s.card, background:"rgba(143,189,90,0.04)", borderColor:G.greenD }}>
          <p style={{ fontFamily:F.sans, fontSize:12, color:G.sub, margin:0, lineHeight:1.7 }}>
            Trabajás <b style={{ color:G.greenL }}>{dias.length}</b> día{dias.length !== 1 ? "s" : ""} por semana<br/>
            En el calendario, los días no laborables aparecen sin slots disponibles<br/>
            Para bloquear días específicos (feriados, vacaciones) usá la pestaña "días bloqueados"
          </p>
        </div>
      </div>
    );
  };

  const SlotsConfig = () => {
    // Estructura: slots globales (aplican a todos los días por defecto)
    // + overrides por día de semana { "1": ["09:00",...], "6": ["09:00","10:00"] }
    const slotsGlobal   = data.getConfig("slots", []);
    const slotsPorDia   = data.getConfig("slotsPorDia", {}); // overrides por dow
    const diasLaborales = data.getConfig("diasLaborales", [1,2,3,4,5,6]);
    const [nuevo, setNuevo]     = useState("");
    const [diaEdit, setDiaEdit] = useState(null); // null = global, 0-6 = día
    const [nuevoSlotDia, setNuevoSlotDia] = useState("");

    const diasInfo = [
      { idx:1,"label":"Lunes" },{ idx:2,"label":"Martes" },{ idx:3,"label":"Miércoles" },
      { idx:4,"label":"Jueves" },{ idx:5,"label":"Viernes" },{ idx:6,"label":"Sábado" },{ idx:0,"label":"Domingo" },
    ].filter(d => diasLaborales.includes(d.idx));

    const getSlotsForDia = (dow) => slotsPorDia[dow] !== undefined ? slotsPorDia[dow] : slotsGlobal;
    const tieneOverride  = (dow) => slotsPorDia[dow] !== undefined;

    // Global
    const agregarGlobal = async () => {
      const v = nuevo.trim(); if (!v) return;
      if (!/^\d{1,2}:\d{2}$/.test(v)) { toast("formato: HH:MM"); return; }
      if (slotsGlobal.includes(v)) { toast("ya existe"); return; }
      await data.saveConfig("slots", [...slotsGlobal, v].sort());
      setNuevo(""); toast(`✓ ${v} agregado`);
    };
    const quitarGlobal = async (v) => { await data.saveConfig("slots", slotsGlobal.filter(x => x !== v)); toast(`${v} eliminado`); };

    // Por día
    const agregarDia = async (dow) => {
      const v = nuevoSlotDia.trim(); if (!v) return;
      if (!/^\d{1,2}:\d{2}$/.test(v)) { toast("formato: HH:MM"); return; }
      const curr = getSlotsForDia(dow);
      if (curr.includes(v)) { toast("ya existe"); return; }
      const upd = { ...slotsPorDia, [dow]: [...curr, v].sort() };
      await data.saveConfig("slotsPorDia", upd); setNuevoSlotDia(""); toast(`✓ ${v} agregado`);
    };
    const quitarDia = async (dow, v) => {
      const curr = getSlotsForDia(dow);
      const upd = { ...slotsPorDia, [dow]: curr.filter(x => x !== v) };
      await data.saveConfig("slotsPorDia", upd); toast(`${v} eliminado`);
    };
    const resetearDia = async (dow) => {
      const upd = { ...slotsPorDia }; delete upd[dow];
      await data.saveConfig("slotsPorDia", upd); toast("horario reseteado al global");
    };

    return (
      <div>
        <p style={{ fontFamily:F.sans, fontSize:12, color:G.muted, marginBottom:14, lineHeight:1.6 }}>
          Configurá los horarios base que aplican a todos los días, y luego personalizá cada día si necesitás horarios distintos (ej: sábados medio día).
        </p>

        {/* Slots globales */}
        <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:14, color:G.white, margin:"0 0 10px" }}>horario base (todos los días)</p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginBottom:10 }}>
          {slotsGlobal.length === 0 && <p style={{ color:G.muted, fontSize:12 }}>sin horarios base ✦</p>}
          {slotsGlobal.map(v => (
            <div key={v} style={{ display:"flex", alignItems:"center", gap:4, background:G.greenM, border:`0.5px solid ${G.green}`, borderRadius:20, padding:"5px 12px" }}>
              <span style={{ fontFamily:F.sans, fontSize:13, color:G.greenL }}>{v}</span>
              <button onClick={() => quitarGlobal(v)} style={{ background:"none", border:"none", color:G.red, cursor:"pointer", fontSize:12, padding:"0 0 0 6px" }}>✕</button>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:20 }}>
          <input style={{ ...s.input, flex:1 }} value={nuevo} onChange={e => setNuevo(e.target.value)} placeholder="ej: 09:00" onKeyDown={e => e.key === "Enter" && agregarGlobal()} />
          <button style={s.btnGl} onClick={agregarGlobal}>+ agregar</button>
        </div>

        {/* Overrides por día */}
        {diasInfo.length > 0 && (
          <>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:14, color:G.white, margin:"0 0 4px" }}>horarios personalizados por día</p>
            <p style={{ fontFamily:F.sans, fontSize:11, color:G.muted, margin:"0 0 14px", lineHeight:1.5 }}>Si un día tiene horario diferente al base, configuralo acá. Los demás días usan el horario base.</p>
            {diasInfo.map(d => {
              const slots = getSlotsForDia(d.idx);
              const override = tieneOverride(d.idx);
              const expanded = diaEdit === d.idx;
              return (
                <div key={d.idx} style={{ ...s.card, padding:"12px 14px", marginBottom:8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer" }} onClick={() => setDiaEdit(expanded ? null : d.idx)}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:6, height:6, borderRadius:"50%", background:override ? G.amber : G.green }} />
                      <p style={{ margin:0, fontFamily:F.sans, fontSize:13, color:G.white }}>{d.label}</p>
                      {override && <span style={{ ...s.tag, fontSize:9, background:"rgba(224,184,112,0.15)", borderColor:G.amber, color:G.amber }}>personalizado</span>}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>{slots.length} slots</p>
                      <span style={{ color:G.muted, fontSize:12 }}>{expanded ? "▲" : "▼"}</span>
                    </div>
                  </div>
                  {expanded && (
                    <div style={{ marginTop:12 }}>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
                        {slots.map(v => (
                          <div key={v} style={{ display:"flex", alignItems:"center", gap:4, background:override ? "rgba(224,184,112,0.12)" : G.greenM, border:`0.5px solid ${override ? G.amber : G.green}`, borderRadius:20, padding:"4px 10px" }}>
                            <span style={{ fontFamily:F.sans, fontSize:12, color:override ? G.amber : G.greenL }}>{v}</span>
                            <button onClick={() => quitarDia(d.idx, v)} style={{ background:"none", border:"none", color:G.red, cursor:"pointer", fontSize:11, padding:"0 0 0 4px" }}>✕</button>
                          </div>
                        ))}
                      </div>
                      <div style={{ display:"flex", gap:8, marginBottom:override ? 8 : 0 }}>
                        <input style={{ ...s.input, flex:1 }} value={nuevoSlotDia} onChange={e => setNuevoSlotDia(e.target.value)} placeholder="ej: 14:00" onKeyDown={e => e.key === "Enter" && agregarDia(d.idx)} />
                        <button style={s.btnGl} onClick={() => agregarDia(d.idx)}>+ agregar</button>
                      </div>
                      {override && (
                        <button style={{ ...s.btnGl, width:"100%", fontSize:11, color:G.muted, borderColor:G.border }} onClick={() => resetearDia(d.idx)}>
                          Usar horario base para este día
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    );
  };

  const ExcepcionesConfig = () => {
    const [excs, setExcs]     = useState([]);
    const [loading, setLd]    = useState(true);
    const [fecha, setFecha]   = useState("");
    const [razon, setRazon]   = useState("");
    const [gd, setGd]         = useState(false);
    const [conf, setConf]     = useState(null);

    useEffect(() => { db.get("excepciones").then(d => { setExcs(d.sort((a, b) => a.fecha?.localeCompare(b.fecha))); setLd(false); }); }, []);

    const agregar = async () => {
      if (!fecha) { toast("elegí una fecha"); return; }
      if (excs.find(e => e.fecha === fecha)) { toast("ya está bloqueada"); return; }
      setGd(true);
      const id = await db.push("excepciones", { fecha, razon:razon.trim()||"día no laborable" });
      setExcs(p => [...p, { fecha, razon:razon.trim()||"día no laborable", _id:id }].sort((a, b) => a.fecha.localeCompare(b.fecha)));
      setFecha(""); setRazon(""); setGd(false); toast("✓ día bloqueado");
    };
    const borrar = async (id) => { await db.del(`excepciones/${id}`); setExcs(p => p.filter(e => e._id !== id)); setConf(null); toast("excepción eliminada"); };

    const hoy = hoyISO();
    const futuras = excs.filter(e => e.fecha >= hoy);
    const pasadas = excs.filter(e => e.fecha <  hoy);

    return (
      <div>
        <div style={{ ...s.card, background:"rgba(143,189,90,0.04)", borderColor:G.greenD, marginBottom:14 }}>
          <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.white, margin:"0 0 12px" }}>bloquear un día</p>
          <Field label="fecha"><input style={s.input} type="date" value={fecha} min={hoy} onChange={e => setFecha(e.target.value)} /></Field>
          <Field label="razón (opcional)"><input style={s.input} value={razon} onChange={e => setRazon(e.target.value)} placeholder="ej: vacaciones, feriado, evento..." /></Field>
          <button style={{ ...s.btnG, opacity:gd ? 0.6 : 1 }} onClick={agregar} disabled={gd}>{gd ? "guardando..." : "bloquear día →"}</button>
        </div>
        {loading && <p style={{ color:G.muted, fontSize:13 }}>cargando...</p>}
        {futuras.length > 0 && (
          <>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.white, margin:"0 0 10px" }}>días bloqueados</p>
            {futuras.map(e => {
              const dt = new Date(e.fecha + "T12:00:00");
              const df = Math.ceil((dt - new Date()) / (1000 * 60 * 60 * 24));
              return (
                <div key={e._id} style={{ ...s.card, display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ background:G.greenM, border:`0.5px solid ${G.green}`, borderRadius:9, padding:"7px 10px", textAlign:"center", minWidth:50 }}>
                    <p style={{ margin:0, fontFamily:F.sans, fontSize:10, color:G.muted }}>{e.fecha?.slice(5).replace("-", "/")}</p>
                    <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:13, color:G.greenL }}>{DIAS_F[dt.getDay()].slice(0, 3)}</p>
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ margin:"0 0 2px", fontFamily:F.sans, fontSize:13 }}>{e.razon}</p>
                    <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>{df === 0 ? "hoy" : df === 1 ? "mañana" : `en ${df} días`}</p>
                  </div>
                  <button style={{ ...s.btnRed, padding:"6px 10px", fontSize:12 }} onClick={() => setConf(e)}>✕</button>
                </div>
              );
            })}
          </>
        )}
        {futuras.length === 0 && !loading && <p style={{ color:G.muted, fontSize:13, marginBottom:14 }}>Sin días bloqueados próximos</p>}
        {pasadas.length > 0 && (
          <details style={{ marginTop:8 }}>
            <summary style={{ fontFamily:F.sans, fontSize:12, color:G.muted, cursor:"pointer", padding:"8px 0" }}>ver excepciones pasadas ({pasadas.length})</summary>
            <div style={{ marginTop:10 }}>
              {[...pasadas].reverse().map(e => <div key={e._id} style={{ ...s.card, opacity:0.5 }}><p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:G.muted }}>{fmtFecha(e.fecha)} — {e.razon}</p></div>)}
            </div>
          </details>
        )}
        {conf && <Modal titulo="Eliminar excepción" msg={`¿Eliminar el bloqueo del ${fmtFecha(conf.fecha)}?`} onOk={() => borrar(conf._id)} onCancel={() => setConf(null)} okLabel="eliminar" danger />}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display:"flex", gap:7, marginBottom:16 }}>
        {[["dias","días laborales"],["slots","horarios"],["excepciones","días bloqueados"]].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} style={{ ...s.btnGl, flex:1, fontSize:10, background:tab === v ? G.greenM : "transparent", borderColor:tab === v ? G.green : G.border, color:tab === v ? G.greenL : G.muted, padding:"8px 4px", fontWeight:tab === v ? 700 : 400 }}>{l}</button>
        ))}
      </div>
      {tab === "dias"        && <DiasConfig />}
      {tab === "slots"       && <SlotsConfig />}
      {tab === "excepciones" && <ExcepcionesConfig />}
    </div>
  );
}

// ── Config Estudio ─────────────────────────────────────────────────────────────
function ConfigEstudio({ data, toast, onLogout }) {
  const est  = data.getConfig("estudio", {});
  const [form, setForm] = useState({ nombre:est.nombre||"", direccion:est.direccion||"", telefono:est.telefono||"", instagram:est.instagram||"", descripcion:est.descripcion||"", recordatorioCita:est.recordatorioCita||"", googleMapsReview:est.googleMapsReview||"" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));

  const pols = data.getConfig("politicas", []);
  const [polsLocal, setPolsLocal] = useState(pols);
  const [newPol, setNewPol] = useState("");
  const [editIdx, setEditIdx] = useState(null);
  const [editTxt, setEditTxt] = useState("");

  useEffect(() => {
    const e = data.getConfig("estudio", {});
    setForm({ nombre:e.nombre||"", direccion:e.direccion||"", telefono:e.telefono||"", instagram:e.instagram||"", descripcion:e.descripcion||"", recordatorioCita:e.recordatorioCita||"", googleMapsReview:e.googleMapsReview||"" });
  }, [data.config]);

  const guardarEstudio = async () => { setSaving(true); await data.saveConfig("estudio", form); setSaving(false); toast("✓ datos guardados"); };

  const addPol  = async () => { if (!newPol.trim()) return; const upd = [...polsLocal, newPol.trim()]; await data.saveConfig("politicas", upd); setPolsLocal(upd); setNewPol(""); toast("✓ política agregada"); };
  const savePol = async (i) => { const upd = polsLocal.map((p, j) => j === i ? editTxt : p); await data.saveConfig("politicas", upd); setPolsLocal(upd); setEditIdx(null); toast("✓ guardado"); };
  const delPol  = async (i) => { const upd = polsLocal.filter((_, j) => j !== i); await data.saveConfig("politicas", upd); setPolsLocal(upd); toast("eliminada"); };

  return (
    <div>
      <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.white, margin:"0 0 12px" }}>datos del estudio</p>
      <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:20 }}>
        <Field label="nombre del estudio"><input style={s.input} value={form.nombre} onChange={e => set("nombre", e.target.value)} placeholder="ej: Lash Studio by Chulas" /></Field>
        <Field label="dirección"><input style={s.input} value={form.direccion} onChange={e => set("direccion", e.target.value)} placeholder="calle, localidad..." /></Field>
        <Field label="teléfono / WhatsApp"><input style={s.input} value={form.telefono} onChange={e => set("telefono", e.target.value)} placeholder="11 XXXX-XXXX" /></Field>
        <Field label="instagram"><input style={s.input} value={form.instagram} onChange={e => set("instagram", e.target.value)} placeholder="@tuusuario" /></Field>
        <Field label="link de reseña en Google Maps" hint="Aparece como botón para que clientas dejen su reseña"><input style={s.input} value={form.googleMapsReview} onChange={e => set("googleMapsReview", e.target.value)} placeholder="https://g.page/r/…/review" /></Field>
        <Field label="descripción (opcional)" hint="Se muestra a las clientas en la app">
          <textarea style={{ ...s.input, height:70, resize:"none" }} value={form.descripcion} onChange={e => set("descripcion", e.target.value)} placeholder="Breve descripción del estudio..." />
        </Field>
        <Field label="recordatorio para próxima cita" hint="Aparece en el card de próxima cita de la clienta">
          <textarea style={{ ...s.input, height:60, resize:"none" }} value={form.recordatorioCita} onChange={e => set("recordatorioCita", e.target.value)} placeholder="Ej: Llegar 5 min antes, sin maquillaje en los ojos." />
        </Field>
        <button style={{ ...s.btnG, opacity:saving ? 0.6 : 1 }} onClick={guardarEstudio} disabled={saving}>{saving ? "guardando..." : "guardar datos →"}</button>
      </div>
      <div style={s.div} />
      <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.white, margin:"0 0 4px" }}>políticas del estudio</p>
      <p style={{ fontFamily:F.sans, fontSize:11, color:G.muted, margin:"0 0 14px", lineHeight:1.6 }}>Aparecen en el perfil de las clientas cuando usan la app.</p>
      {polsLocal.length === 0 && <p style={{ color:G.muted, fontSize:13, marginBottom:14 }}>Sin políticas cargadas</p>}
      {polsLocal.map((p, i) => (
        <div key={i} style={{ ...s.card, padding:"10px 12px", marginBottom:8 }}>
          {editIdx === i ? (
            <div style={{ display:"flex", gap:8 }}>
              <input style={{ ...s.input, flex:1 }} value={editTxt} onChange={e => setEditTxt(e.target.value)} autoFocus onKeyDown={e => e.key === "Enter" && savePol(i)} />
              <button style={{ ...s.btnG, width:"auto", padding:"8px 12px" }} onClick={() => savePol(i)}>✓</button>
              <button style={{ ...s.btnGl, padding:"8px 12px" }} onClick={() => setEditIdx(null)}>✕</button>
            </div>
          ) : (
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <p style={{ flex:1, margin:0, fontFamily:F.sans, fontSize:13, color:G.sub }}>{p}</p>
              <button style={{ ...s.btnGl, padding:"5px 9px", fontSize:11 }} onClick={() => { setEditIdx(i); setEditTxt(p); }}>Editar</button>
              <button style={{ ...s.btnRed, padding:"5px 9px", fontSize:11 }} onClick={() => delPol(i)}>✕</button>
            </div>
          )}
        </div>
      ))}
      <div style={{ display:"flex", gap:8, marginTop:8 }}>
        <input style={{ ...s.input, flex:1 }} value={newPol} onChange={e => setNewPol(e.target.value)} placeholder="Nueva política..." onKeyDown={e => e.key === "Enter" && addPol()} />
        <button style={s.btnGl} onClick={addPol}>+ agregar</button>
      </div>
      <div style={s.div} />
      <button style={{ ...s.btnRed, width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }} onClick={onLogout}>
        <Icon name="logOut" size={15} color={G.red} />
        Cerrar sesión
      </button>
    </div>
  );
}

// ── Config Notificaciones ──────────────────────────────────────────────────────
function ConfigNotificaciones({ data, toast }) {
  const { status, subscribe, supported, loading } = usePushStatus("admin");
  const [sending, setSending] = useState(false);
  const DEFAULT_PUSH_TEXTS = {
    solicitud:    "Nueva solicitud de turno 🗓",
    confirmacion: "¡Tu turno está confirmado! 🌿",
    rechazo:      "Tu solicitud no pudo confirmarse",
    recordatorio: "Recordatorio de tu turno mañana 🌿",
  };
  const [pushTexts, setPushTexts] = useState(() => data.getConfig("pushTexts", {}));
  const savePushText = async (key, val) => {
    const upd = { ...pushTexts, [key]: val };
    setPushTexts(upd);
    await data.saveConfig("pushTexts", upd);
    toast("✓ guardado");
  };

  const defaultSchedule = { recordatorio24h: true, recordatorio24hTexto:"Recordatorio de tu turno mañana 🌿", recall: false, recallDias:30, recallTexto:"¡Te extrañamos! ¿Reagendamos tu servicio?", service: false, serviceDias:14, serviceTexto:"¡Es momento del service! Agendá tu turno 🌿", horaEnvio:"09:00" };
  const [schedule, setSchedule] = useState(() => ({ ...defaultSchedule, ...data.getConfig("notifSchedule", {}) }));
  const setSch = (k, v) => setSchedule(s => ({ ...s, [k]:v }));
  const saveSchedule = async (upd) => {
    const next = { ...schedule, ...upd };
    setSchedule(next);
    await data.saveConfig("notifSchedule", next);
    toast("✓ guardado");
  };

  const sendTest = async () => {
    setSending(true);
    try {
      const r = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targets: ["admin"], title: "🔔 Notificación de prueba", body: "Las notificaciones push están funcionando correctamente.", url: "/" }),
      });
      const j = await r.json();
      toast(j.sent > 0
        ? `✓ Notificación enviada (${j.sent} dispositivo${j.sent > 1 ? "s" : ""})`
        : "Sin suscripciones activas — activá las notificaciones primero");
    } catch { toast("Error al enviar la notificación"); }
    setSending(false);
  };

  const statusLabel = status === "subscribed" ? "Activas en este dispositivo"
    : status === "denied"    ? "Bloqueadas por el navegador"
    : !supported             ? "No compatible con este navegador"
    :                          "Inactivas";
  const statusColor = status === "subscribed" ? G.green : status === "denied" ? G.red : G.muted;

  return (
    <div>
      <div style={{ ...s.cardHero, marginBottom:18 }}>
        <p style={s.eyebrow}>push notifications</p>
        <p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:G.sub, lineHeight:1.6 }}>
          Recibí alertas de nuevas citas, confirmaciones y recordatorios aunque tengas la app cerrada.
        </p>
      </div>

      {/* Status card */}
      <div style={{ ...s.card, marginBottom:12, display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:9, height:9, borderRadius:"50%", background:statusColor, flexShrink:0 }} />
        <div style={{ flex:1 }}>
          <p style={{ margin:"0 0 1px", fontFamily:F.serif, fontWeight:600, fontSize:13, color:G.text }}>{statusLabel}</p>
          <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.sub }}>
            {status === "subscribed" ? "Este dispositivo recibirá alertas de citas y recordatorios"
              : status === "denied"  ? "Desbloqueá en la configuración del navegador — ver instrucciones abajo"
              : !supported           ? "Usá Chrome, Edge o Safari 16.4+ para activar notificaciones push"
              :                        "Tocá Activar para comenzar a recibir alertas en este dispositivo"}
          </p>
        </div>
        {status !== "subscribed" && status !== "denied" && supported && (
          <button style={{ ...s.btnG, width:"auto", padding:"8px 16px", fontSize:12, flexShrink:0, opacity:loading?0.6:1 }} onClick={subscribe} disabled={loading}>
            {loading ? "Activando..." : "Activar"}
          </button>
        )}
      </div>

      {/* Test notification */}
      <button
        style={{ ...s.btnGl, marginBottom:18, width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:8, opacity:(sending || status !== "subscribed") ? 0.5 : 1 }}
        onClick={sendTest} disabled={sending || status !== "subscribed"}>
        <Icon name="bell" size={14} color={G.sub} />
        {sending ? "Enviando..." : "Enviar notificación de prueba"}
      </button>

      {/* Configurable reminders */}
      <div style={{ ...s.card, marginBottom:14 }}>
        <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:14, color:G.text, margin:"0 0 14px" }}>Recordatorios automáticos</p>

        {/* Hora de envío */}
        <Field label="hora de envío diario">
          <input style={{ ...s.input, width:"auto", maxWidth:140 }} type="time" value={schedule.horaEnvio} onChange={e => saveSchedule({ horaEnvio: e.target.value })} />
        </Field>

        {/* Recordatorio 24h */}
        <div style={{ ...s.cardSub, marginBottom:10 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:schedule.recordatorio24h ? 10 : 0 }}>
            <div>
              <p style={{ margin:"0 0 2px", fontFamily:F.sans, fontWeight:600, fontSize:13, color:G.text }}>Recordatorio 24h antes</p>
              <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>Avisa a la clienta el día anterior al turno</p>
            </div>
            <div style={{ width:36, height:20, borderRadius:10, background:schedule.recordatorio24h ? G.green : G.border, cursor:"pointer", position:"relative", transition:"background 0.2s", flexShrink:0 }}
              onClick={() => saveSchedule({ recordatorio24h: !schedule.recordatorio24h })}>
              <div style={{ position:"absolute", top:3, left:schedule.recordatorio24h ? 18 : 3, width:14, height:14, borderRadius:"50%", background:"#fff", transition:"left 0.2s" }} />
            </div>
          </div>
          {schedule.recordatorio24h && (
            <Field label="texto del recordatorio">
              <input style={s.input} defaultValue={schedule.recordatorio24hTexto} onBlur={e => saveSchedule({ recordatorio24hTexto: e.target.value || defaultSchedule.recordatorio24hTexto })} />
            </Field>
          )}
        </div>

        {/* Recall por inactividad */}
        <div style={{ ...s.cardSub, marginBottom:10 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:schedule.recall ? 10 : 0 }}>
            <div>
              <p style={{ margin:"0 0 2px", fontFamily:F.sans, fontWeight:600, fontSize:13, color:G.text }}>Recall por inactividad</p>
              <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>Avisa a clientas que llevan N días sin turno</p>
            </div>
            <div style={{ width:36, height:20, borderRadius:10, background:schedule.recall ? G.green : G.border, cursor:"pointer", position:"relative", transition:"background 0.2s", flexShrink:0 }}
              onClick={() => saveSchedule({ recall: !schedule.recall })}>
              <div style={{ position:"absolute", top:3, left:schedule.recall ? 18 : 3, width:14, height:14, borderRadius:"50%", background:"#fff", transition:"left 0.2s" }} />
            </div>
          </div>
          {schedule.recall && (
            <>
              <Field label="días de inactividad"><input style={{ ...s.input, width:"auto", maxWidth:100 }} type="number" min="1" value={schedule.recallDias} onChange={e => setSch("recallDias", parseInt(e.target.value)||30)} onBlur={() => saveSchedule({ recallDias: schedule.recallDias })} /></Field>
              <Field label="texto del mensaje"><input style={s.input} defaultValue={schedule.recallTexto} onBlur={e => saveSchedule({ recallTexto: e.target.value || defaultSchedule.recallTexto })} /></Field>
            </>
          )}
        </div>

        {/* Recordatorio de service */}
        <div style={{ ...s.cardSub }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:schedule.service ? 10 : 0 }}>
            <div>
              <p style={{ margin:"0 0 2px", fontFamily:F.sans, fontWeight:600, fontSize:13, color:G.text }}>Recordatorio de service</p>
              <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>Avisa cuando es momento del service (N días)</p>
            </div>
            <div style={{ width:36, height:20, borderRadius:10, background:schedule.service ? G.green : G.border, cursor:"pointer", position:"relative", transition:"background 0.2s", flexShrink:0 }}
              onClick={() => saveSchedule({ service: !schedule.service })}>
              <div style={{ position:"absolute", top:3, left:schedule.service ? 18 : 3, width:14, height:14, borderRadius:"50%", background:"#fff", transition:"left 0.2s" }} />
            </div>
          </div>
          {schedule.service && (
            <>
              <Field label="días entre servicios"><input style={{ ...s.input, width:"auto", maxWidth:100 }} type="number" min="1" value={schedule.serviceDias} onChange={e => setSch("serviceDias", parseInt(e.target.value)||14)} onBlur={() => saveSchedule({ serviceDias: schedule.serviceDias })} /></Field>
              <Field label="texto del mensaje"><input style={s.input} defaultValue={schedule.serviceTexto} onBlur={e => saveSchedule({ serviceTexto: e.target.value || defaultSchedule.serviceTexto })} /></Field>
            </>
          )}
        </div>
      </div>

      {/* Push notification text editor */}
      <div style={{ ...s.card, marginBottom:14 }}>
        <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:14, color:G.text, margin:"0 0 4px" }}>Textos de notificaciones</p>
        <p style={{ fontFamily:F.sans, fontSize:11, color:G.muted, margin:"0 0 12px" }}>Editá el título de cada alerta push. Los cambios se aplican a partir del próximo envío.</p>
        {Object.entries(DEFAULT_PUSH_TEXTS).map(([k, def]) => (
          <Field key={k} label={k}>
            <input style={s.input} defaultValue={pushTexts[k] || def} onBlur={e => { if (e.target.value !== (pushTexts[k] || def)) savePushText(k, e.target.value || def); }} />
          </Field>
        ))}
      </div>

      {/* Per-platform instructions */}
      <div style={{ ...s.card, background:`rgba(${G.greenRGB},0.03)`, borderColor:`rgba(${G.greenRGB},0.14)` }}>
        <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:13, color:G.text, margin:"0 0 12px" }}>Cómo activar por plataforma</p>
        {[
          { os:"Android (Chrome / Edge)", steps:"1. Instalá la app: menú ⋮ → Agregar a pantalla de inicio.\n2. Abrí la app instalada.\n3. Tocá Activar y aceptá el permiso." },
          { os:"iOS 16.4+ (Safari)",      steps:"1. Abrí en Safari y tocá Compartir → Agregar a inicio.\n2. Abrí desde el ícono en el inicio.\n3. Tocá Activar notificaciones." },
          { os:"PC / Mac (Chrome / Edge)",steps:"Tocá Activar y aceptá el diálogo del navegador. No hace falta instalar la app." },
        ].map(({ os, steps }) => (
          <div key={os} style={{ marginBottom:12 }}>
            <p style={{ fontFamily:F.sans, fontWeight:600, fontSize:12, color:G.text, margin:"0 0 4px" }}>{os}</p>
            <p style={{ fontFamily:F.sans, fontSize:11, color:G.sub, margin:0, lineHeight:1.7, whiteSpace:"pre-line" }}>{steps}</p>
          </div>
        ))}
        {status === "denied" && (
          <div style={{ marginTop:4, padding:"10px 12px", background:`rgba(224,184,112,0.08)`, borderRadius:8, border:`0.5px solid rgba(224,184,112,0.25)` }}>
            <p style={{ fontFamily:F.sans, fontWeight:600, fontSize:12, color:G.amber, margin:"0 0 5px" }}>Actualmente bloqueadas — cómo desbloquear:</p>
            <p style={{ fontFamily:F.sans, fontSize:11, color:G.sub, margin:0, lineHeight:1.7 }}>
              Chrome: candado en barra de dirección → Notificaciones → Permitir.<br/>
              Firefox: candado → Permisos → Notificaciones → Permitir.<br/>
              Safari/iOS: Ajustes del dispositivo → Safari → Notificaciones → activar para este sitio.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function CNotificaciones({ clienta, notifs, setNotifs }) {
  useEffect(() => {
    if (!clienta.uid || !notifs.some(n => !n.leida)) return;
    // Mark all as read in Firebase and local state
    notifs.filter(n => !n.leida && n._id).forEach(n => {
      db.update(`notificaciones/${clienta.uid}/${n._id}`, { leida:true }).catch(() => {});
    });
    setNotifs(p => p.map(n => ({ ...n, leida:true })));
    if (typeof navigator.clearAppBadge === "function") navigator.clearAppBadge();
  }, []);

  const borrarTodo = async () => {
    if (!clienta.uid) return;
    await db.del(`notificaciones/${clienta.uid}`);
    setNotifs([]);
    if (typeof navigator.clearAppBadge === "function") navigator.clearAppBadge();
  };

  if (!clienta.uid) {
    return (
      <div>
        <div style={s.topBar}><h1 style={s.h1}>Avisos</h1></div>
        <div style={{ padding:24 }}><p style={{ fontFamily:F.sans, fontSize:13, color:G.muted }}>Necesitás una cuenta para recibir avisos.</p></div>
      </div>
    );
  }

  const sorted = [...notifs].sort((a, b) => (b.ts || 0) - (a.ts || 0));

  return (
    <div>
      <div style={s.topBar}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div><h1 style={s.h1}>Avisos</h1><p style={s.sub}>{notifs.length === 0 ? "sin mensajes" : `${notifs.length} mensaje${notifs.length !== 1 ? "s" : ""}`}</p></div>
          {notifs.length > 0 && (
            <button style={{ ...s.btnGl, fontSize:11, padding:"7px 12px" }} onClick={borrarTodo}>Borrar todo</button>
          )}
        </div>
      </div>
      <div style={{ padding:"18px" }}>
        {sorted.length === 0 && (
          <div style={{ textAlign:"center", paddingTop:40 }}>
            <Icon name="bell" size={36} color={G.border} />
            <p style={{ fontFamily:F.sans, fontSize:13, color:G.muted, marginTop:12 }}>No tenés avisos por ahora</p>
          </div>
        )}
        {sorted.map((n, i) => (
          <div key={n._id || i} style={{ ...s.card, borderLeft:`3px solid ${n.leida ? G.border : G.green}`, marginBottom:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
              <div style={{ flex:1 }}>
                <p style={{ margin:"0 0 4px", fontFamily:F.serif, fontWeight:700, fontSize:14, color:G.text }}>{n.titulo}</p>
                <p style={{ margin:"0 0 6px", fontFamily:F.sans, fontSize:13, color:G.sub, lineHeight:1.5 }}>{n.cuerpo}</p>
                <p style={{ margin:0, fontFamily:F.sans, fontSize:10, color:G.muted }}>{n.fecha}</p>
              </div>
              {!n.leida && <div style={{ width:8, height:8, borderRadius:"50%", background:G.green, flexShrink:0, marginTop:4 }} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PANEL CLIENTA
// ═══════════════════════════════════════════════════════════════════════════════
function ClientaApp({ clienta: clientaSession, data, onLogout }) {
  const [tab, setTab] = useState("inicio");
  const wide = useIsWide();
  const [notifs, setNotifs] = useState([]);
  const isStandalone = window.matchMedia?.("(display-mode: standalone)").matches || !!window.navigator.standalone;
  const [deferredInstall, setDeferredInstall] = useState(null);
  const [installDismissed, setInstallDismissed] = useState(() => localStorage.getItem("lash-install-dismissed") === "1");
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  useEffect(() => {
    const h = (e) => { e.preventDefault(); setDeferredInstall(e); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  // Derive live clienta from shared data (refreshed every 15s + on mutations)
  const clienta = (() => {
    const fresh = data.clientas.find(c => c._id === clientaSession._id);
    if (!fresh) return clientaSession;
    const h = Array.isArray(fresh.historial) ? fresh.historial : Object.values(fresh.historial || {});
    return { ...clientaSession, ...fresh, historial: h };
  })();

  // Load notifications from Firebase
  useEffect(() => {
    if (!clienta.uid) return;
    db.get(`notificaciones/${clienta.uid}`).then(list => setNotifs(list || []));
  }, [clienta.uid]);

  const unreadCount = notifs.filter(n => !n.leida).length;

  // Update PWA badge icon
  useEffect(() => {
    if (!("setAppBadge" in navigator)) return;
    if (unreadCount > 0) navigator.setAppBadge(unreadCount);
    else if (typeof navigator.clearAppBadge === "function") navigator.clearAppBadge();
  }, [unreadCount]);

  useEffect(() => {
    const onPop = () => setTab("inicio");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const tabs = [
    { id:"inicio",         iconName:"home",        label:"Inicio"  },
    { id:"agendar",        iconName:"calendarPlus", label:"Agendar" },
    { id:"notificaciones", iconName:"bell",         label:"Avisos"  },
    { id:"perfil",         iconName:"user",         label:"Perfil"  },
  ];

  const [servicioPresel, setServicioPresel] = useState(null);
  const goToAgendar = (sv) => { setServicioPresel(sv); setTab("agendar"); };

  const installProps = { isStandalone, deferredInstall, isIOS, installDismissed, setInstallDismissed };
  const render = () => {
    switch (tab) {
      case "inicio":         return <CInicio         clienta={clienta} data={data} setTab={setTab} goToAgendar={goToAgendar} installProps={installProps} />;
      case "agendar":        return <CAgendar        clienta={clienta} data={data} servicioPresel={servicioPresel} clearServicioPresel={() => setServicioPresel(null)} />;
      case "notificaciones": return <CNotificaciones clienta={clienta} notifs={notifs} setNotifs={setNotifs} />;
      case "perfil":         return <CPerfil         clienta={clienta} data={data} onLogout={onLogout} />;
      default:               return <CInicio         clienta={clienta} data={data} setTab={setTab} goToAgendar={goToAgendar} installProps={installProps} />;
    }
  };

  if (wide) {
    return (
      <div style={{ minHeight:"100vh", background:G.bg, color:G.text, fontFamily:F.sans, display:"flex", flexDirection:"row", overflowX:"hidden" }}>
        <GlobalStyles />
        <AppBg />
        <nav style={{ width:220, flexShrink:0, background:G.navBg, backdropFilter:"blur(32px)", borderRight:`0.5px solid ${G.border}`, display:"flex", flexDirection:"column", padding:"28px 14px 24px", gap:2, position:"sticky", top:0, height:"100vh", zIndex:20 }}>
          <img src="/logo.svg" alt="Lash Studio" style={{ width:100, height:100, objectFit:"contain", display:"block", marginBottom:8, flexShrink:0 }} />
          <p style={{ fontFamily:F.sans, fontSize:13, color:G.muted, padding:"0 4px 16px", margin:0 }}>{clienta.nombre?.split(" ")[0] || ""}</p>
          {tabs.map(t => (
            <div key={t.id} style={{ ...sideNavItmSty(tab === t.id), padding:"12px 16px", fontSize:14, position:"relative" }} onClick={() => setTab(t.id)}>
              <Icon name={t.iconName} size={18} color={tab===t.id ? G.green : G.muted} strokeWidth={tab===t.id ? 1.8 : 1.5} />
              <span>{t.label}</span>
              {t.id === "notificaciones" && unreadCount > 0 && (
                <div style={{ minWidth:16, height:16, borderRadius:8, background:G.red, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 4px", marginLeft:"auto" }}>
                  <span style={{ fontFamily:F.sans, fontSize:9, color:"#fff", fontWeight:700 }}>{unreadCount > 9 ? "9+" : unreadCount}</span>
                </div>
              )}
            </div>
          ))}
          <div style={{ flex:1 }} />
          <button style={{ ...s.btnGl, margin:"0 4px", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }} onClick={() => setTab("agendar")}>
            <Icon name="calendarPlus" size={15} color={G.sub} />
            Agendar
          </button>
        </nav>
        <div style={{ flex:1, overflowY:"auto", position:"relative", minWidth:0, paddingBottom:40 }} className="ls-wide-content">
          <div style={{ maxWidth:720, margin:"0 auto" }}>
            {render()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.app}>
      <GlobalStyles />
      <AppBg />
      <div style={s.screen}>{render()}</div>
      <nav style={s.nav}>
        {tabs.map(t => (
          <div key={t.id} style={{ ...navItmSty(tab === t.id), position:"relative" }} onClick={() => setTab(t.id)}>
            {tab === t.id && <div style={{ position:"absolute", top:6, width:16, height:3, borderRadius:2, background:G.green, opacity:0.8 }} />}
            <Icon name={t.iconName} size={20} color={tab === t.id ? G.green : G.muted} strokeWidth={tab === t.id ? 1.8 : 1.5} />
            {t.id === "notificaciones" && unreadCount > 0 && (
              <div style={{ position:"absolute", top:5, right:"calc(50% - 18px)", minWidth:15, height:15, borderRadius:8, background:G.red, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 3px" }}>
                <span style={{ fontFamily:F.sans, fontSize:8, color:"#fff", fontWeight:700 }}>{unreadCount > 9 ? "9+" : unreadCount}</span>
              </div>
            )}
            <span style={{ fontFamily:F.sans, fontSize:9, letterSpacing:"0.06em", fontWeight:tab === t.id ? 600 : 400 }}>{t.label}</span>
          </div>
        ))}
      </nav>
      <button style={s.fab} onClick={() => setTab("agendar")} title="Agendar">
        <Icon name="calendarPlus" size={22} color="#0a0a0a" strokeWidth={1.9} />
      </button>
    </div>
  );
}

function CInicio({ clienta, data, setTab, goToAgendar, installProps = {} }) {
  const _goToAgendar = goToAgendar || ((sv) => setTab("agendar"));
  const hoy   = hoyISO();
  const hist  = Array.isArray(clienta.historial) ? clienta.historial : Object.values(clienta.historial || {});
  // Solo entradas pasadas (fecha <= hoy) para métricas — evita que una cita futura completada de forma anticipada distorsione todo
  const histPasado = hist.filter(h => h.fecha && h.fecha <= hoy);
  const ultima = [...histPasado].sort((a, b) => b.fecha?.localeCompare(a.fecha))[0];
  const diasDesde = ultima?.fecha ? Math.floor((new Date() - new Date(ultima.fecha)) / (1000 * 60 * 60 * 24)) : null;
  const proxCita  = data.citas.filter(c => c.clientaId === clienta._id && c.fecha >= hoy && c.estado !== "completada" && c.estado !== "solicitada").sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
  const citasSolicitadas = data.citas.filter(c => c.clientaId === clienta._id && c.estado === "solicitada");
  const diasHasta = proxCita ? Math.floor((new Date(proxCita.fecha) - new Date()) / (1000 * 60 * 60 * 24)) : null;
  const estudio   = data.getConfig("estudio", {});
  const curvaFav  = (() => { const cnt = {}; histPasado.forEach(h => { if(h.curva) cnt[h.curva]=(cnt[h.curva]||0)+1; }); return Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0]?.[0] || clienta.curva || "—"; })();

  // Service interval from the last service config (defaults to 14 days)
  const svUltima = data.servicios.find(sv => sv.nombre === ultima?.servicio);
  const intervaloService = svUltima?.intervaloService || 14;
  const diasParaService = diasDesde !== null ? Math.max(0, intervaloService - diasDesde) : null;
  const necesitaService = diasDesde !== null && diasDesde >= intervaloService && !proxCita;

  const instagramUrl = estudio.instagram
    ? `https://www.instagram.com/${estudio.instagram.replace("@", "")}`
    : "https://www.instagram.com/bychulas.studio";

  const ubicacionUrl = estudio.direccion
    ? `https://maps.google.com/?q=${encodeURIComponent(estudio.direccion)}`
    : null;
  const reviewUrl = estudio.googleMapsReview || null;

  const politicas = data.getConfig("politicas", []);

  const fnac = clienta.fechaNacimiento;
  let diasHastaCumple = null;
  if (fnac) {
    const [, mm, dd] = fnac.split("-");
    const anioHoy = parseInt(hoy.slice(0,4));
    let bdayThis = `${anioHoy}-${mm}-${dd}`;
    if (bdayThis < hoy) bdayThis = `${anioHoy+1}-${mm}-${dd}`;
    diasHastaCumple = Math.ceil((new Date(bdayThis+"T12:00:00") - new Date(hoy+"T12:00:00")) / (1000*60*60*24));
  }
  const esCumple = diasHastaCumple === 0;
  const cumpleEnBreve = diasHastaCumple !== null && diasHastaCumple <= 14;
  const bdayPromo = data.getConfig("promos", {})?.cumpleanos || {};
  const visitasDescInfo = calcVisitasDesc(hist, data.getConfig("promos", {}));

  return (
    <div>
      <div style={s.topBar}>
        <p style={{ fontFamily:F.display, fontWeight:400, fontSize:36, letterSpacing:"1px", color:G.greenL, margin:"0 0 2px", lineHeight:1 }}>Hola, {clienta.nombre?.split(" ")[0]}</p>
        <p style={{ fontFamily:F.sans, fontSize:12, color:G.muted, margin:"4px 0 0" }}>{estudio.nombre || "Lash Studio"} · {new Date().toLocaleDateString("es-AR", { weekday:"long", day:"numeric", month:"long" })}</p>
        {histPasado.length > 0 && (
          <div style={{ display:"flex", gap:10, marginTop:8, flexWrap:"wrap" }}>
            <span style={{ ...s.tag, fontSize:10 }}>{histPasado.length} visita{histPasado.length !== 1 ? "s" : ""}</span>
            {curvaFav !== "—" && <span style={{ ...s.tag, fontSize:10 }}>curva fav: {curvaFav}</span>}
            {clienta.creadaEn && <span style={{ ...s.tag, fontSize:10 }}>desde {clienta.creadaEn?.slice(0,4)}</span>}
          </div>
        )}
      </div>
      <div style={{ padding:"18px" }}>
        <PushBanner role="clienta" uid={clienta.uid} />

        {/* PWA install banner */}
        {!installProps.isStandalone && !installProps.installDismissed && (installProps.deferredInstall || installProps.isIOS) && (
          <div style={{ ...s.card, marginBottom:14, background:`rgba(${G.greenRGB},0.06)`, borderColor:`rgba(${G.greenRGB},0.28)` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
              <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:14, color:G.text }}>Instalá la app</p>
              <button style={{ background:"transparent", border:"none", cursor:"pointer", color:G.muted, fontSize:16, lineHeight:1, padding:"0 2px" }}
                onClick={() => { installProps.setInstallDismissed(true); localStorage.setItem("lash-install-dismissed", "1"); }}>✕</button>
            </div>
            {installProps.isIOS ? (
              <p style={{ margin:"0 0 10px", fontFamily:F.sans, fontSize:12, color:G.sub, lineHeight:1.7 }}>
                En Safari: tocá <strong>Compartir</strong> (□↑) → <strong>Agregar a pantalla de inicio</strong>. Así podés recibir avisos y acceder más rápido.
              </p>
            ) : (
              <>
                <p style={{ margin:"0 0 10px", fontFamily:F.sans, fontSize:12, color:G.sub, lineHeight:1.6 }}>
                  Guardá la app en tu teléfono para recibir notificaciones y acceder sin abrir el navegador.
                </p>
                <button style={{ ...s.btnG, padding:"10px 16px", fontSize:12, width:"auto" }}
                  onClick={() => { installProps.deferredInstall.prompt(); installProps.deferredInstall.userChoice.then(() => installProps.setInstallDismissed(true)); }}>
                  Instalar →
                </button>
              </>
            )}
          </div>
        )}


        {cumpleEnBreve && bdayPromo.habilitado && (
          <div style={{ background:"linear-gradient(135deg,rgba(255,200,80,0.13),rgba(255,160,60,0.07))", border:`1.5px solid rgba(255,190,60,0.5)`, borderRadius:18, padding:"18px 16px", marginBottom:14 }}>
            <p style={{ fontFamily:F.display, fontSize:26, color:"#f5c842", letterSpacing:"0.5px", margin:"0 0 4px" }}>
              {esCumple ? "¡Feliz cumpleaños! 🎂" : `Tu cumpleaños es en ${diasHastaCumple} día${diasHastaCumple!==1?"s":""} 🎁`}
            </p>
            <p style={{ fontFamily:F.sans, fontSize:13, color:G.sub, margin:"0 0 12px", lineHeight:1.5 }}>
              {esCumple
                ? "¡Hoy es tu día! Tenés un regalo especial esperándote."
                : "Preparate — tenés un regalo esperándote para tu próxima visita."}
            </p>
            <div style={{ ...s.card, margin:0, display:"flex", alignItems:"center", gap:12, background:"rgba(245,200,66,0.1)", borderColor:"rgba(245,200,66,0.35)" }}>
              <span style={{ fontSize:28 }}>🎁</span>
              <div>
                <p style={{ margin:"0 0 2px", fontFamily:F.serif, fontWeight:700, fontSize:16, color:"#f5c842" }}>
                  {bdayPromo.tipo === "%" ? `${bdayPromo.monto}% de descuento` : `$${bdayPromo.monto} de descuento`}
                </p>
                <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>válido en tu próxima visita · mencionalo al reservar</p>
              </div>
            </div>
            {!esCumple && <button style={{ ...s.btnG, width:"100%", marginTop:12, background:"rgba(245,200,66,0.18)", borderColor:"rgba(245,200,66,0.5)", color:"#f5c842" }} onClick={() => setTab("agendar")}>reservar turno →</button>}
          </div>
        )}

        {/* ── Descuento por visitas ── */}
        {visitasDescInfo && (
          visitasDescInfo.disponible ? (
            <div style={{ background:"linear-gradient(135deg,rgba(143,189,90,0.18),rgba(143,189,90,0.05))", border:`1.5px solid ${G.green}`, borderRadius:18, padding:"18px 16px", marginBottom:14 }}>
              <p style={{ fontFamily:F.display, fontSize:26, color:G.greenL, letterSpacing:"0.5px", margin:"0 0 4px" }}>¡Descuento disponible! 🎯</p>
              <p style={{ fontFamily:F.sans, fontSize:13, color:G.sub, margin:"0 0 12px", lineHeight:1.5 }}>
                Llegaste a {visitasDescInfo.total} visitas. Tenés un regalo en tu próxima reserva — mencionalo al admin.
              </p>
              <div style={{ ...s.card, margin:0, display:"flex", alignItems:"center", gap:12, background:`rgba(${G.greenRGB},0.1)`, borderColor:`rgba(${G.greenRGB},0.4)` }}>
                <span style={{ fontSize:24 }}>✨</span>
                <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.greenL }}>
                  {visitasDescInfo.cfg.tipo === "%" ? `${visitasDescInfo.cfg.monto}% de descuento` : `$${visitasDescInfo.cfg.monto} de descuento`}
                </p>
              </div>
            </div>
          ) : (
            <div style={{ ...s.card, marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:G.sub, fontWeight:600 }}>🎯 Programa de visitas</p>
                <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>{visitasDescInfo.progreso}/{visitasDescInfo.cfg.cantidad}</p>
              </div>
              <div style={{ height:6, borderRadius:3, background:`rgba(${G.greenRGB},0.12)`, overflow:"hidden", marginBottom:6 }}>
                <div style={{ height:"100%", borderRadius:3, background:G.green, width:`${Math.round(visitasDescInfo.progreso / visitasDescInfo.cfg.cantidad * 100)}%`, transition:"width 0.5s ease" }} />
              </div>
              <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>
                {visitasDescInfo.faltan === 1 ? "¡1 visita más y desbloqueás tu descuento!" : `${visitasDescInfo.faltan} visitas más para tu próximo descuento`}
                {" · "}{visitasDescInfo.cfg.tipo === "%" ? `${visitasDescInfo.cfg.monto}%` : `$${visitasDescInfo.cfg.monto}`} de descuento
              </p>
            </div>
          )
        )}

        {/* ── Próxima cita hero card (top) ── */}
        {proxCita && (
          <div style={{ ...s.cardHero, marginBottom:12 }}>
            <p style={s.eyebrow}>próxima cita</p>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div>
                <p style={{ margin:"0 0 3px", fontFamily:F.serif, fontWeight:700, fontSize:17, color:G.white }}>{proxCita.servicio}</p>
                <p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:G.sub }}>{fmtFecha(proxCita.fecha)} · {proxCita.hora}</p>
              </div>
              <div style={{ textAlign:"center", background:"rgba(143,189,90,0.22)", border:`1px solid rgba(143,189,90,0.4)`, borderRadius:14, padding:"12px 16px", flexShrink:0, boxShadow:"0 4px 12px rgba(143,189,90,0.15)" }}>
                <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:28, color:G.greenL, lineHeight:1 }}>{diasHasta === 0 ? "¡hoy!" : diasHasta}</p>
                {diasHasta !== 0 && <p style={{ margin:0, fontFamily:F.sans, fontSize:9, color:G.muted, marginTop:3 }}>días</p>}
              </div>
            </div>
            {estudio.recordatorioCita && (
              <p style={{ margin:"0 0 10px", fontFamily:F.sans, fontSize:11, color:G.muted, fontStyle:"italic", lineHeight:1.5 }}>{estudio.recordatorioCita}</p>
            )}
            <button
              onClick={() => generarICS(proxCita, estudio)}
              style={{ ...s.btnGl, width:"100%", fontSize:12, borderColor:"rgba(143,189,90,0.35)", color:G.greenL, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              <Icon name="download" size={13} color={G.greenL} />
              Agregar al calendario
            </button>
          </div>
        )}

        {/* ── Preparate widget (1 día antes) ── */}
        {proxCita && diasHasta === 1 && (
          <div style={{ background:"linear-gradient(135deg,rgba(143,189,90,0.18),rgba(143,189,90,0.05))", border:`1.5px solid ${G.green}`, borderRadius:16, padding:"16px", marginBottom:12 }}>
            <p style={{ margin:"0 0 6px", fontFamily:F.display, fontSize:22, color:G.greenL, letterSpacing:"0.5px" }}>¡preparate! ✦</p>
            <p style={{ margin:"0 0 10px", fontFamily:F.sans, fontSize:12, color:G.sub, lineHeight:1.6 }}>
              Tu turno es mañana. Planificá tu llegada con tiempo, calculá la vuelta y revisá las políticas de cancelación si necesitás hacer algún cambio. ¡Te esperamos!
            </p>
            <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.greenL }}>{proxCita.servicio} · {proxCita.hora}</p>
          </div>
        )}

        {/* ── Post-care widget ── */}
        {(() => {
          const cuidados = svUltima?.cuidados || "";
          if (!ultima || !cuidados || diasDesde === null || diasDesde > intervaloService) return null;
          return (
            <div style={{ ...s.cardHero, marginBottom:12 }}>
              <p style={s.eyebrow}>cuidados post-tratamiento</p>
              <p style={{ fontFamily:F.sans, fontSize:11, color:G.muted, margin:"0 0 10px" }}>
                {ultima.servicio} · {fmtFecha(ultima.fecha)}
              </p>
              <p style={{ fontFamily:F.sans, fontSize:13, color:G.sub, lineHeight:1.7, margin:0, whiteSpace:"pre-line" }}>
                {cuidados}
              </p>
            </div>
          );
        })()}

        {/* ── Stats: última visita | curva fav ── */}
        {ultima && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9, marginBottom:16 }}>
            <div onClick={() => setTab("perfil")} style={{ ...s.card, textAlign:"center", cursor:"pointer", margin:0, padding:"16px 6px" }}>
              <div style={{ display:"flex", justifyContent:"center", marginBottom:5 }}><Icon name="star" size={16} color={G.muted} strokeWidth={1.5} /></div>
              <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:13, color:G.white, margin:"0 0 2px", lineHeight:1.3 }}>{fmtFecha(ultima.fecha)}</p>
              <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:0 }}>última visita</p>
            </div>
            <div onClick={() => setTab("perfil")} style={{ ...s.card, textAlign:"center", cursor:"pointer", margin:0, padding:"16px 6px" }}>
              <div style={{ display:"flex", justifyContent:"center", marginBottom:5 }}><Icon name="sparkles" size={16} color={G.muted} strokeWidth={1.5} /></div>
              <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:18, color:G.white, margin:"0 0 2px", lineHeight:1 }}>{curvaFav}</p>
              <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:0 }}>curva usada</p>
            </div>
          </div>
        )}

        {/* ── 1. Contact/quick-action 2x2 grid ── */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9, marginBottom:16 }}>
          <div onClick={() => openWA("Hola! Tengo una consulta 💚")} style={{ ...s.card, cursor:"pointer", margin:0, padding:"18px 12px", textAlign:"center", background:"rgba(37,211,102,0.07)", borderColor:"rgba(37,211,102,0.22)", display:"flex", flexDirection:"column", alignItems:"center", gap:7 }}>
            <div style={{ width:38, height:38, borderRadius:11, background:"rgba(37,211,102,0.14)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Icon name="messageCircle" size={19} color="rgba(37,211,102,0.9)" strokeWidth={1.6} />
            </div>
            <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:13, color:G.white }}>WhatsApp</p>
            <p style={{ margin:0, fontFamily:F.sans, fontSize:10, color:G.muted }}>consultas y turnos</p>
          </div>
          <div onClick={() => window.open(instagramUrl, "_blank")} style={{ ...s.card, cursor:"pointer", margin:0, padding:"18px 12px", textAlign:"center", background:"rgba(225,48,108,0.07)", borderColor:"rgba(225,48,108,0.18)", display:"flex", flexDirection:"column", alignItems:"center", gap:7 }}>
            <div style={{ width:38, height:38, borderRadius:11, background:"rgba(225,48,108,0.14)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Icon name="instagram" size={19} color="rgba(225,48,108,0.9)" strokeWidth={1.6} />
            </div>
            <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:13, color:G.white }}>Instagram</p>
            <p style={{ margin:0, fontFamily:F.sans, fontSize:10, color:G.muted }}>{estudio.instagram || "@bychulas.studio"}</p>
          </div>
          {ubicacionUrl ? (
            <div onClick={() => window.open(ubicacionUrl, "_blank")} style={{ ...s.card, cursor:"pointer", margin:0, padding:"18px 12px", textAlign:"center", background:"rgba(66,133,244,0.07)", borderColor:"rgba(66,133,244,0.18)", display:"flex", flexDirection:"column", alignItems:"center", gap:7 }}>
              <div style={{ width:38, height:38, borderRadius:11, background:"rgba(66,133,244,0.14)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Icon name="mapPin" size={19} color="rgba(100,160,255,0.9)" strokeWidth={1.6} />
              </div>
              <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:13, color:G.white }}>Cómo llegar</p>
              <p style={{ margin:0, fontFamily:F.sans, fontSize:10, color:G.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"100%" }}>{estudio.direccion}</p>
            </div>
          ) : (
            <div style={{ ...s.card, margin:0, padding:"18px 12px", textAlign:"center", background:"rgba(66,133,244,0.07)", borderColor:"rgba(66,133,244,0.18)", display:"flex", flexDirection:"column", alignItems:"center", gap:7, opacity:0.5 }}>
              <div style={{ width:38, height:38, borderRadius:11, background:"rgba(66,133,244,0.14)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Icon name="mapPin" size={19} color="rgba(100,160,255,0.9)" strokeWidth={1.6} />
              </div>
              <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:13, color:G.white }}>Mapa</p>
              <p style={{ margin:0, fontFamily:F.sans, fontSize:10, color:G.muted }}>sin dirección</p>
            </div>
          )}
          <div onClick={() => setTab("agendar")} style={{ ...s.card, cursor:"pointer", margin:0, padding:"18px 12px", textAlign:"center", background:"rgba(143,189,90,0.07)", borderColor:G.greenD, display:"flex", flexDirection:"column", alignItems:"center", gap:7 }}>
            <div style={{ width:38, height:38, borderRadius:11, background:"rgba(143,189,90,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Icon name="calendarPlus" size={19} color={G.greenL} strokeWidth={1.6} />
            </div>
            <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:13, color:G.white }}>Agendar</p>
            <p style={{ margin:0, fontFamily:F.sans, fontSize:10, color:G.muted }}>reservar turno</p>
          </div>
        </div>

        {reviewUrl && (
          <div onClick={() => window.open(reviewUrl, "_blank")} style={{ ...s.card, cursor:"pointer", marginBottom:16, padding:"16px 18px", background:"rgba(251,191,36,0.06)", borderColor:"rgba(251,191,36,0.22)", display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:"rgba(251,191,36,0.14)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Icon name="star" size={20} color="rgba(251,191,36,0.9)" strokeWidth={1.6} />
            </div>
            <div style={{ flex:1 }}>
              <p style={{ margin:"0 0 2px", fontFamily:F.serif, fontWeight:700, fontSize:14, color:G.white }}>Dejá tu reseña</p>
              <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>Contanos tu experiencia en Google Maps ⭐</p>
            </div>
            <Icon name="chevronRight" size={16} color={G.muted} strokeWidth={1.5} />
          </div>
        )}

        {/* ── 1b. Services carousel ── */}
        {data.servicios.length > 0 && (
          <div style={{ marginBottom:16 }}>
            <p style={{ ...s.eyebrow, marginBottom:9 }}>servicios</p>
            <div style={{ display:"flex", gap:9, overflowX:"auto", paddingBottom:4, scrollSnapType:"x mandatory", WebkitOverflowScrolling:"touch" }}>
              {data.servicios.map(sv => (
                <div key={sv._id} style={{ flexShrink:0, width:160, ...s.card, margin:0, padding:0, overflow:"hidden", scrollSnapAlign:"start", cursor:"pointer" }}
                  onClick={() => _goToAgendar(sv)}>
                  {sv.fotos?.[0]
                    ? <img src={sv.fotos[0]} alt={sv.nombre} style={{ width:"100%", height:90, objectFit:"cover" }} loading="lazy" />
                    : <div style={{ height:70, background:"rgba(143,189,90,0.12)", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="sparkles" size={22} color={G.greenL} /></div>
                  }
                  <div style={{ padding:"8px 10px 10px" }}>
                    <p style={{ margin:"0 0 2px", fontFamily:F.serif, fontSize:13 }}>{sv.nombre}</p>
                    <p style={{ margin:"0 0 8px", fontFamily:F.serif, fontWeight:700, fontSize:14, color:G.green }}>{fmtPesos(sv.precio)}</p>
                    <button style={{ ...s.btnG, padding:"7px 10px", fontSize:11, width:"100%" }} onClick={e => { e.stopPropagation(); _goToAgendar(sv); }}>agendar →</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Per-service countdowns ── */}
        {(() => {
          const svsConHistorial = data.servicios.filter(sv => histPasado.some(h => h.servicio === sv.nombre));
          if (svsConHistorial.length === 0) return null;
          return (
            <div style={{ marginBottom:16 }}>
              <p style={{ ...s.eyebrow, marginBottom:9 }}>seguimiento de servicios</p>
              {svsConHistorial.map(sv => {
                const ultSvHist = [...histPasado].filter(h => h.servicio === sv.nombre).sort((a, b) => (b.fecha||"").localeCompare(a.fecha||""))[0];
                if (!ultSvHist) return null;
                const diasDesdeSv = Math.floor((new Date() - new Date(ultSvHist.fecha)) / (1000*60*60*24));
                const intervalo = sv.intervaloService || 14;
                const diasParaSv = Math.max(0, intervalo - diasDesdeSv);
                const necesitaSv = diasDesdeSv >= intervalo;
                const proxCitaSv = data.citas.find(c => c.clientaId === clienta._id && c.servicio === sv.nombre && c.fecha >= hoy && c.estado !== "completada");
                return (
                  <div key={sv._id} style={{ ...s.card, marginBottom:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:proxCitaSv ? 0 : 8 }}>
                      <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:13 }}>{sv.nombre}</p>
                      {proxCitaSv ? (
                        <span style={{ ...s.tag, fontSize:9 }}>turno confirmado</span>
                      ) : necesitaSv ? (
                        <span style={{ ...s.tag, fontSize:9, background:"rgba(143,189,90,0.25)", borderColor:G.green, color:G.greenL }}>¡es hora!</span>
                      ) : (
                        <span style={{ fontFamily:F.sans, fontSize:10, color:G.muted }}>en {diasParaSv} día{diasParaSv !== 1 ? "s" : ""}</span>
                      )}
                    </div>
                    {!proxCitaSv && (
                      <>
                        <div style={{ height:5, background:G.border, borderRadius:3, overflow:"hidden", marginBottom:necesitaSv ? 8 : 0 }}>
                          <div style={{ height:"100%", width:`${Math.min(100, (diasDesdeSv / intervalo) * 100)}%`, background:necesitaSv ? `linear-gradient(90deg, ${G.green}, ${G.greenL})` : `linear-gradient(90deg, ${G.greenD}, ${G.green})`, borderRadius:3, transition:"width 0.5s ease" }} />
                        </div>
                        {necesitaSv && (
                          <button style={{ ...s.btnG, padding:"8px 12px", fontSize:11, width:"100%" }} onClick={() => setTab("agendar")}>agendar service →</button>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* ── CTA agendar (sin turno próximo) ── */}
        {!proxCita && !citasSolicitadas.length && (
          <div style={{ ...s.cardHero, marginBottom:12, cursor:"pointer" }} onClick={() => setTab("agendar")}>
            <p style={s.eyebrow}>¿lista para tu próximo turno?</p>
            <p style={{ fontFamily:F.sans, fontSize:12, color:G.sub, margin:"0 0 14px", lineHeight:1.5 }}>
              {ultima
                ? `Tu última visita fue ${diasDesde === 0 ? "hoy" : diasDesde === 1 ? "ayer" : `hace ${diasDesde} días`}${ultima.servicio ? ` · ${ultima.servicio}` : ""}`
                : "Todavía no tenés visitas registradas. ¡Te esperamos!"}
            </p>
            <button style={{ ...s.btnG, width:"100%" }} onClick={e => { e.stopPropagation(); setTab("agendar"); }}>agendar ahora →</button>
          </div>
        )}

        {/* ── Solicitud pendiente (solo si no hay prox cita) ── */}
        {citasSolicitadas.length > 0 && !proxCita && (
          <div style={{ ...s.card, borderColor:G.amber, background:"rgba(224,184,112,0.06)", marginBottom:12 }}>
            <p style={{ margin:"0 0 4px", fontFamily:F.sans, fontSize:10, color:G.amber, textTransform:"lowercase", letterSpacing:"0.08em" }}>solicitud pendiente</p>
            <p style={{ margin:"0 0 2px", fontFamily:F.serif, fontWeight:700, fontSize:15 }}>{citasSolicitadas[0].servicio}</p>
            <p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:G.sub }}>{fmtFecha(citasSolicitadas[0].fecha)} · {citasSolicitadas[0].hora} · esperando confirmación</p>
          </div>
        )}

        {/* ── Último servicio ── */}
        {ultima && (
          <>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.white, margin:"0 0 3px" }}>último servicio</p>
            <p style={{ ...s.sub, marginBottom:10 }}>{fmtFecha(ultima.fecha)}</p>
            <div style={{ ...s.card, cursor:"pointer" }} onClick={() => setTab("perfil")}>
              <p style={{ margin:"0 0 5px", fontFamily:F.serif, fontWeight:700, fontSize:15 }}>{ultima.servicio}</p>
              {ultima.curva && <span style={s.tag}>curva {ultima.curva}</span>}
              <p style={{ margin:"9px 0 0", fontFamily:F.sans, fontSize:11, color:G.muted }}>ver historial completo →</p>
            </div>
          </>
        )}

        {/* ── Políticas del Estudio (fijo al final) ── */}
        {politicas.length > 0 && (
          <div style={{ ...s.card, marginTop:8, background:"rgba(143,189,90,0.03)", borderColor:G.border }}>
            <p style={{ margin:"0 0 9px", fontFamily:F.serif, fontWeight:700, fontSize:14 }}>Políticas del Estudio</p>
            {politicas.map((p, i) => <p key={i} style={{ margin:"0 0 6px", fontFamily:F.sans, fontSize:12, color:G.sub }}>{p}</p>)}
          </div>
        )}
      </div>
    </div>
  );
}

function CAgendar({ clienta, data, servicioPresel, clearServicioPresel }) {
  const [paso, setPaso]       = useState(1);
  const [modo, setModo]       = useState("individual");
  const [form, setForm]       = useState({ servicio:null, fecha:"", hora:"", notas:"", adicionales:[] });
  const [fotoIdxMap, setFotoIdxMap] = useState({});
  const getFotoIdx = (svId) => fotoIdxMap[svId] || 0;
  const setFotoIdx = (svId, i) => setFotoIdxMap(p => ({ ...p, [svId]:i }));
  const [lightbox, setLightbox] = useState(null);
  const [lbTouchY, setLbTouchY] = useState(null);
  const [touchX, setTouchX]     = useState(null);
  const [calOffset, setCalOffset] = useState(0);
  const [enviado, setEnviado]           = useState(false);
  const [saving, setSaving]             = useState(false);
  const [recurrente, setRecurrente]     = useState(false);
  const [recurrInterval, setRecurrInterval] = useState(14);
  const [recurrReps, setRecurrReps]     = useState(3);
  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));

  const slots         = data.getConfig("slots", []);
  const diasLaborales = data.getConfig("diasLaborales", [1,2,3,4,5,6]);
  // Pre-select service when navigating from carousel (tieneAdicionales resolved below at first render)
  useEffect(() => {
    if (servicioPresel) {
      const adics = data.getConfig("adicionales", []);
      setForm(f => ({ ...f, servicio: servicioPresel }));
      setPaso(adics.length > 0 ? 2 : 3);
      clearServicioPresel?.();
    }
  }, []);
  const ocupadas      = data.citas.filter(c => c.fecha === form.fecha && c.estado !== "completada").map(c => c.hora);
  const fechasBloq    = new Set(data.excepciones.map(e => e.fecha));

  const fechaNoDisponible = (fecha) => !fecha ? false : fechasBloq.has(fecha) || !esDiaLaboral(fecha, diasLaborales);

  const waMsg = (() => {
    const sv = form.servicio?.nombre || "A confirmar con Male";
    return modo === "noSe"
      ? `Hola! 🌿 Quiero agendar un turno:\n📅 ${form.fecha} a las ${form.hora}\n💭 No sé bien qué hacerme${form.notas ? `\n${form.notas}` : ""}\n💚 ${clienta.nombre}`
      : `Hola! 🌿 Quiero agendar:\n${sv}\n📅 ${form.fecha} a las ${form.hora}${form.notas ? `\nNotas: ${form.notas}` : ""}\n💚 ${clienta.nombre}`;
  })();

  const confirmar = async () => {
    setSaving(true);
    try {
      const baseCita = {
        clientaId:     clienta._id,
        clientaNombre: clienta.nombre,
        clientaUid:    clienta.uid || "",
        servicio:      form.servicio?.nombre || "A confirmar",
        fecha:         form.fecha,
        hora:          form.hora,
        notas:         form.notas,
        adicionales:   form.adicionales || [],
        estado:        "solicitada",
      };
      await data.crearCita(baseCita);
      if (recurrente && recurrInterval > 0 && recurrReps > 0) {
        const base = new Date(form.fecha + "T12:00:00");
        for (let i = 1; i <= Math.min(recurrReps, 12); i++) {
          const d = new Date(base);
          d.setDate(d.getDate() + recurrInterval * i);
          await data.crearCita({ ...baseCita, fecha: d.toISOString().slice(0, 10) });
        }
      }
      sendPush(["admin"],
        `Nueva solicitud de turno 🗓`,
        `${clienta.nombre?.split(" ")[0]} quiere: ${form.servicio?.nombre || "A confirmar"} el ${form.fecha} a las ${form.hora}${recurrente ? ` (+${recurrReps} más c/${recurrInterval}d)` : ""}`);
    } catch (e) { console.warn("Firebase write:", e); }
    setSaving(false);
    setEnviado(true);
  };

  if (enviado) return (
    <div style={{ minHeight:"100vh", background:G.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:28, textAlign:"center" }}>
      <div style={{ fontSize:44, marginBottom:12 }}>🌿</div>
      <p style={{ fontFamily:F.display, fontWeight:400, fontSize:28, letterSpacing:"1px", color:G.greenL, margin:"0 0 8px" }}>solicitud enviada</p>
      <p style={{ fontFamily:F.sans, fontSize:13, color:G.sub, margin:"0 0 24px", lineHeight:1.7 }}>Male recibió tu pedido y te confirma a la brevedad. También podés avisarle por WhatsApp.</p>
      <button style={{ ...s.btnGl, width:"100%", marginBottom:10 }} onClick={() => openWA(waMsg)}>también avisar por WhatsApp →</button>
      <button style={s.btnG} onClick={() => { setEnviado(false); setPaso(1); setForm({ servicio:null, fecha:"", hora:"", notas:"", adicionales:[] }); }}>volver al inicio →</button>
    </div>
  );

  const adicionalesConfig = data.getConfig("adicionales", []);
  const tieneAdicionales = adicionalesConfig.length > 0;
  const nextAfterServicio = tieneAdicionales ? 2 : 3;
  const totalPasos = tieneAdicionales ? 4 : 3;
  const pasoDisplay = tieneAdicionales ? paso : (paso <= 1 ? paso : paso - 1);

  return (
    <div>
      <div style={s.topBar}><h1 style={s.h1}>Agendar</h1><p style={s.sub}>{pasoDisplay} de {totalPasos}</p></div>
      <div style={{ padding:"18px" }}>
        <div style={{ display:"flex", gap:5, marginBottom:20 }}>
          {Array(totalPasos).fill(0).map((_, i) => <div key={i} style={{ flex:1, height:3, borderRadius:2, background:(i+1) <= pasoDisplay ? G.green : G.border, transition:"background 0.3s" }} />)}
        </div>

        {paso === 1 && (
          <div>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:17, color:G.white, margin:"0 0 14px" }}>¿qué querés hacerte?</p>
            <div style={{ display:"flex", gap:7, marginBottom:16 }}>
              {[["individual","servicio"],["noSe","no sé aún"]].map(([m, l]) => (
                <button key={m} onClick={() => { setModo(m); set("servicio", null); }} style={{ ...s.btnGl, flex:1, fontSize:11, background:modo === m ? G.greenM : G.glass, borderColor:modo === m ? G.green : G.border, color:modo === m ? G.greenL : G.sub }}>{l}</button>
              ))}
            </div>
            {modo === "individual" && (
              data.servicios.length === 0
                ? <p style={{ color:G.muted, fontSize:13 }}>los servicios se están configurando, volvé pronto ✦</p>
                : data.servicios.map(sv => (
                  <div key={sv._id} style={{ ...s.card, borderColor:form.servicio?._id === sv._id ? G.green : G.border, background:form.servicio?._id === sv._id ? "rgba(143,189,90,0.06)" : G.card }}>
                    {sv.fotos?.length > 0 && (
                      <div style={{ marginBottom:10, position:"relative" }}
                        onTouchStart={e => setTouchX(e.touches[0].clientX)}
                        onTouchEnd={e => { if (touchX === null) return; const dx = e.changedTouches[0].clientX - touchX; if (Math.abs(dx) > 40) { const n = sv.fotos.length; const cur = getFotoIdx(sv._id); setFotoIdx(sv._id, dx < 0 ? (cur + 1) % n : (cur - 1 + n) % n); } setTouchX(null); }}>
                        <img src={sv.fotos[getFotoIdx(sv._id)]} alt={sv.nombre} onClick={() => setLightbox(sv.fotos[getFotoIdx(sv._id)])} style={{ width:"100%", height:140, objectFit:"cover", borderRadius:10, cursor:"zoom-in" }} onError={e => { e.target.style.display = "none"; }} />
                        {sv.fotos.length > 1 && (
                          <>
                            <button style={{ position:"absolute", left:4, top:"50%", transform:"translateY(-50%)", background:"rgba(0,0,0,0.5)", border:"none", borderRadius:6, color:"#fff", padding:"4px 8px", cursor:"pointer", zIndex:3, fontSize:16 }}
                              onClick={e => { e.stopPropagation(); setFotoIdx(sv._id, (getFotoIdx(sv._id) - 1 + sv.fotos.length) % sv.fotos.length); }}>‹</button>
                            <button style={{ position:"absolute", right:4, top:"50%", transform:"translateY(-50%)", background:"rgba(0,0,0,0.5)", border:"none", borderRadius:6, color:"#fff", padding:"4px 8px", cursor:"pointer", zIndex:3, fontSize:16 }}
                              onClick={e => { e.stopPropagation(); setFotoIdx(sv._id, (getFotoIdx(sv._id) + 1) % sv.fotos.length); }}>›</button>
                          </>
                        )}
                        {sv.fotos.length > 1 && (
                          <div style={{ position:"absolute", bottom:6, left:0, right:0, display:"flex", justifyContent:"center", gap:4 }}>
                            {sv.fotos.map((_, i) => <div key={i} style={{ width:5, height:5, borderRadius:"50%", background:i === getFotoIdx(sv._id) ? G.white : "rgba(255,255,255,0.4)", cursor:"pointer" }} onClick={e => { e.stopPropagation(); setFotoIdx(sv._id, i); }} />)}
                          </div>
                        )}
                      </div>
                    )}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }} onClick={() => { set("servicio", sv); setPaso(nextAfterServicio); }}>
                      <div style={{ flex:1, cursor:"pointer" }}>
                        <p style={{ margin:"0 0 3px", fontFamily:F.serif, fontSize:14 }}>{sv.nombre}</p>
                        {sv.descripcion && <p style={{ margin:"0 0 7px", fontFamily:F.sans, fontSize:12, color:G.sub }}>{sv.descripcion}</p>}
                        <span style={s.tag}>{sv.duracion}min est.</span>
                      </div>
                      <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, color:G.green, fontSize:15, cursor:"pointer" }}>{fmtPesos(sv.precio)}</p>
                    </div>
                    <p style={{ margin:"8px 0 0", fontFamily:F.sans, fontSize:10, color:G.muted, fontStyle:"italic" }}>La duración es estimada y puede variar</p>
                  </div>
                ))
            )}
            {modo === "noSe" && (
              <div>
                <div style={{ ...s.card, background:"rgba(143,189,90,0.05)", borderColor:G.greenD, textAlign:"center", padding:"22px 18px" }}>
                  <div style={{ fontSize:30, marginBottom:9 }}>🌿</div>
                  <p style={{ margin:"0 0 5px", fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.greenL }}>¡no te preocupes!</p>
                  <p style={{ margin:"0 0 14px", fontFamily:F.sans, fontSize:12, color:G.sub, lineHeight:1.7 }}>Agendá tu turno y Male te va a asesorar personalmente. Contale qué efecto buscás en las notas.</p>
                  <button style={{ ...s.btnG, padding:"10px" }} onClick={() => setPaso(nextAfterServicio)}>agendar igualmente →</button>
                </div>
                <div style={{ ...s.card, marginTop:8 }}>
                  <p style={{ ...s.sub, margin:"0 0 9px" }}>¿querés consultar antes?</p>
                  <button style={{ ...s.btnGl, width:"100%", borderColor:G.green, color:G.greenL }} onClick={() => openWA("Hola! No sé bien qué servicio hacerme, ¿me podés orientar? 🌿")}>Consultar por WhatsApp</button>
                </div>
              </div>
            )}
          </div>
        )}

        {paso === 2 && adicionalesConfig.length > 0 && (
          <div>
            <p style={{ ...s.eyebrow, marginBottom:8 }}>servicios adicionales</p>
            <p style={{ fontFamily:F.sans, fontSize:13, color:G.sub, marginBottom:14 }}>¿Querés agregar algo más? (opcional)</p>
            {adicionalesConfig.map(a => {
              const sel = (form.adicionales || []).includes(a.nombre);
              return (
                <div key={a.nombre}
                  onClick={() => set("adicionales", sel ? (form.adicionales||[]).filter(x=>x!==a.nombre) : [...(form.adicionales||[]),a.nombre])}
                  style={{ ...s.card, display:"flex", alignItems:"center", gap:12, cursor:"pointer", marginBottom:8, borderColor:sel?G.green:G.border, background:sel?G.greenM:G.card }}>
                  <div style={{ width:20, height:20, borderRadius:6, border:`1.5px solid ${sel?G.green:G.border}`, background:sel?G.green:"transparent", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {sel && <Icon name="check" size={12} color="#0a0a0a" strokeWidth={2.5} />}
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ margin:"0 0 2px", fontFamily:F.serif, fontSize:14 }}>{a.nombre}</p>
                    <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>{[a.duracion?`+${a.duracion}min`:"", a.precio?fmtPesos(a.precio):""].filter(Boolean).join(" · ")}</p>
                    {a.descripcion && <p style={{ margin:"2px 0 0", fontFamily:F.sans, fontSize:11, color:G.sub }}>{a.descripcion}</p>}
                  </div>
                </div>
              );
            })}
            <div style={{ display:"flex", gap:9, marginTop:14 }}>
              <button style={{ ...s.btnGl, flex:1 }} onClick={() => setPaso(1)}>← volver</button>
              <button style={{ ...s.btnG, flex:1 }} onClick={() => setPaso(3)}>continuar →</button>
            </div>
          </div>
        )}

        {paso === 3 && (() => {
          const DIAS_SEM  = ["D","L","M","Mi","J","V","S"];
          const MESES_CAL = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
          const hoy = new Date(hoyISO() + "T12:00:00");
          const calBase = new Date(hoy.getFullYear(), hoy.getMonth() + calOffset, 1);
          const calYear  = calBase.getFullYear();
          const calMonth = calBase.getMonth();
          const primerDia   = new Date(calYear, calMonth, 1).getDay();
          const diasEnMes   = new Date(calYear, calMonth + 1, 0).getDate();
          const tieneDisponibilidad = (dateStr) => {
            if (!dateStr) return false;
            if (fechasBloq.has(dateStr)) return false;
            if (!esDiaLaboral(dateStr, diasLaborales)) return false;
            if (slots.length === 0) return true;
            const ocDay = data.citas.filter(c => c.fecha === dateStr && c.estado !== "completada").map(c => c.hora);
            return slots.some(h => !ocDay.includes(h));
          };
          const celdas = [];
          for (let i = 0; i < primerDia; i++) celdas.push(null);
          for (let d = 1; d <= diasEnMes; d++) celdas.push(d);
          return (
            <div>
              <button style={{ ...s.btnGl, marginBottom:14, fontSize:12 }} onClick={() => { setPaso(adicionalesConfig.length > 0 ? 2 : 1); }}>← {adicionalesConfig.length > 0 ? "adicionales" : "cambiar servicio"}</button>
              {form.servicio && <div style={{ ...s.card, background:"rgba(143,189,90,0.05)", borderColor:G.greenD, marginBottom:16, padding:"9px 13px" }}><p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:G.greenL }}>{form.servicio.nombre}</p></div>}
              <div style={{ ...s.card, padding:"12px 10px" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                  <button style={{ ...s.btnGl, padding:"6px 12px", fontSize:13 }} onClick={() => setCalOffset(o => o - 1)} disabled={calOffset <= 0}>&lt;</button>
                  <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.text }}>{MESES_CAL[calMonth]} {calYear}</p>
                  <button style={{ ...s.btnGl, padding:"6px 12px", fontSize:13 }} onClick={() => setCalOffset(o => o + 1)}>&gt;</button>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:4 }}>
                  {DIAS_SEM.map(d => <div key={d} style={{ textAlign:"center", fontFamily:F.sans, fontSize:10, color:G.muted, padding:"4px 0" }}>{d}</div>)}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
                  {celdas.map((dia, i) => {
                    if (!dia) return <div key={`e${i}`} />;
                    const mm = String(calMonth + 1).padStart(2,"0");
                    const dd = String(dia).padStart(2,"0");
                    const dateStr = `${calYear}-${mm}-${dd}`;
                    const esPasado = dateStr < hoyISO();
                    const disponible = !esPasado && tieneDisponibilidad(dateStr);
                    const seleccionado = form.fecha === dateStr;
                    return (
                      <button key={dia} disabled={!disponible} onClick={() => { set("fecha", dateStr); set("hora", ""); }}
                        style={{ textAlign:"center", fontFamily:F.sans, fontSize:12, padding:"8px 2px", borderRadius:8, border:`1px solid ${seleccionado ? G.green : disponible ? G.border : "transparent"}`, background:seleccionado ? G.green : disponible ? G.glass : "transparent", color:seleccionado ? "#0a0a0a" : disponible ? G.text : G.border, cursor:disponible ? "pointer" : "default", fontWeight:seleccionado ? 700 : 400, opacity:esPasado ? 0.2 : 1 }}>
                        {dia}
                      </button>
                    );
                  })}
                </div>
              </div>
              {form.fecha && !fechaNoDisponible(form.fecha) && (
                <div style={{ marginTop:14 }}>
                  <Field label="hora disponible">
                    <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                      {slots.length === 0 && <p style={{ color:G.muted, fontSize:12 }}>sin horarios configurados</p>}
                      {slots.map(h => { const oc = ocupadas.includes(h); return <button key={h} disabled={oc} onClick={() => set("hora", h)} style={{ ...s.btnGl, padding:"9px 12px", fontSize:12, opacity:oc ? 0.3 : 1, background:form.hora === h ? G.greenM : G.glass, borderColor:form.hora === h ? G.green : G.border, color:form.hora === h ? G.greenL : G.sub, cursor:oc ? "not-allowed" : "pointer" }}>{h}{oc ? " ✕" : ""}</button>; })}
                    </div>
                  </Field>
                  <Field label={modo === "noSe" ? "contanos qué efecto buscás" : "notas (opcional)"}>
                    <textarea style={{ ...s.input, height:65, resize:"none" }} value={form.notas} onChange={e => set("notas", e.target.value)} placeholder={modo === "noSe" ? "largo, volumen, ocasión especial..." : "indicaciones especiales..."} />
                  </Field>
                  {form.hora && <button style={s.btnG} onClick={() => setPaso(4)}>confirmar horario →</button>}
                </div>
              )}
            </div>
          );
        })()}

        {paso === 4 && (
          <div>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:17, color:G.white, margin:"0 0 3px" }}>confirmá tu turno</p>
            <p style={{ ...s.sub, marginBottom:14 }}>revisá los detalles antes de enviar</p>
            <div style={{ ...s.card, background:"rgba(143,189,90,0.05)", borderColor:G.greenD }}>
              {[
                ["servicio",        form.servicio?.nombre || "a confirmar con Male"],
                ...(form.adicionales?.length ? [["adicionales", form.adicionales.join(", ")]] : []),
                ["fecha",           fmtFecha(form.fecha)],
                ["hora",            form.hora],
                ["duración aprox.", form.servicio?.duracion ? `${form.servicio.duracion}min est.` : "a confirmar"],
                ...(form.notas ? [["notas", form.notas]] : []),
              ].map(([k, v]) => (
                <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:`0.5px solid ${G.border}` }}>
                  <span style={{ ...s.label, margin:0 }}>{k}</span>
                  <span style={{ fontFamily:F.sans, fontSize:12, color:G.sub, maxWidth:"60%", textAlign:"right" }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 0", marginTop:8 }}>
              <div>
                <p style={{ margin:"0 0 2px", fontFamily:F.sans, fontSize:13, color:G.text, fontWeight:600 }}>¿Turno recurrente?</p>
                <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>Solicitar turnos futuros automáticamente</p>
              </div>
              <button onClick={() => setRecurrente(r => !r)} style={{ flexShrink:0, padding:"7px 14px", borderRadius:20, border:`1.5px solid ${recurrente ? G.green : G.border}`, background:recurrente ? G.greenM : "transparent", fontFamily:F.sans, fontSize:12, fontWeight:700, color:recurrente ? G.greenL : G.muted, cursor:"pointer", marginLeft:12 }}>
                {recurrente ? "Sí" : "No"}
              </button>
            </div>
            {recurrente && (
              <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:4 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <Field label="cada cuántos días">
                    <input style={{ ...s.input, textAlign:"center" }} type="number" min="1" max="365" value={recurrInterval} onChange={e => setRecurrInterval(Math.max(1, Math.min(365, Number(e.target.value) || 1)))} />
                  </Field>
                  <Field label="repeticiones (máx. 12)">
                    <input style={{ ...s.input, textAlign:"center" }} type="number" min="1" max="12" value={recurrReps} onChange={e => setRecurrReps(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} />
                  </Field>
                </div>
                <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted, background:G.glass, borderRadius:10, padding:"8px 12px", border:`0.5px solid ${G.border}` }}>
                  Se solicitarán <strong style={{ color:G.greenL }}>{recurrReps}</strong> turnos más, cada <strong style={{ color:G.greenL }}>{recurrInterval} días</strong>. Total: {recurrReps + 1} solicitudes.
                </p>
              </div>
            )}
            <button style={{ ...s.btnG, marginTop:6, opacity:saving?0.6:1 }} onClick={confirmar} disabled={saving}>
              {saving ? "enviando..." : recurrente ? `enviar ${recurrReps + 1} solicitudes →` : "enviar solicitud →"}
            </button>
            <button style={{ ...s.btnGl, marginTop:9, width:"100%" }} onClick={() => setPaso(1)}>modificar</button>
          </div>
        )}
      </div>
      {lightbox && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.94)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={() => setLightbox(null)}
          onTouchStart={e => setLbTouchY(e.touches[0].clientY)}
          onTouchEnd={e => { if (lbTouchY !== null && e.changedTouches[0].clientY - lbTouchY > 80) setLightbox(null); setLbTouchY(null); }}>
          <img src={lightbox} alt="" style={{ maxWidth:"100%", maxHeight:"100%", objectFit:"contain", pointerEvents:"none" }} />
          <button style={{ position:"absolute", top:"calc(env(safe-area-inset-top, 0px) + 24px)", right:20, background:"rgba(0,0,0,0.5)", border:"none", color:"#fff", fontSize:24, cursor:"pointer", lineHeight:1, borderRadius:8, padding:"4px 10px" }} onClick={e => { e.stopPropagation(); setLightbox(null); }}>✕</button>
        </div>
      )}
    </div>
  );
}

function CHistorial({ clienta }) {
  const hist = Array.isArray(clienta.historial) ? clienta.historial : Object.values(clienta.historial || {});
  const cnt  = {}; hist.forEach(h => { cnt[h.curva] = (cnt[h.curva] || 0) + 1; });
  const curvaFav = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]?.[0] || clienta.curva || "—";
  const badge = hist.length >= 10 ? "Clienta VIP" : hist.length >= 5 ? "Clienta frecuente" : hist.length >= 2 ? "Clienta activa" : null;
  return (
    <div>
      <div style={s.topBar}><h1 style={s.h1}>Historial</h1><p style={s.sub}>{hist.length} visitas al estudio</p></div>
      <div style={{ padding:"18px" }}>
        <div style={{ display:"flex", gap:9, marginBottom:16 }}>
          <div style={{ ...s.card, flex:1, textAlign:"center", margin:0, padding:"12px 6px" }}><p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:"0 0 3px" }}>visitas</p><p style={{ fontFamily:F.serif, fontWeight:700, fontSize:24, color:G.green, margin:0 }}>{hist.length}</p></div>
          <div style={{ ...s.card, flex:1, textAlign:"center", margin:0, padding:"12px 6px" }}><p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:"0 0 3px" }}>curva fav.</p><p style={{ fontFamily:F.serif, fontWeight:700, fontSize:24, margin:0 }}>{curvaFav}</p></div>
        </div>
        {badge && (
          <div style={{ ...s.card, background:"rgba(143,189,90,0.05)", borderColor:G.greenD, textAlign:"center", padding:"16px", marginBottom:14 }}>
            <p style={{ margin:"0 0 4px", fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.greenL }}>{badge}</p>
            <p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:G.muted }}>{hist.length} visitas y siempre hermosa 💚</p>
          </div>
        )}
        <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.white, margin:"0 0 3px" }}>tus visitas</p>
        <p style={{ ...s.sub, marginBottom:12 }}>más recientes primero</p>
        {hist.length === 0 && <p style={{ color:G.muted, fontSize:13 }}>tu historial estará aquí después de tu primera visita ✦</p>}
        {[...hist].reverse().map((h, i) => (
          <div key={i} style={s.card}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:5 }}>
              <div><p style={{ margin:"0 0 2px", fontFamily:F.serif, fontSize:14 }}>{h.servicio}</p><p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>{fmtFecha(h.fecha)}</p></div>
              {h.curva && <span style={s.tag}>curva {h.curva}</span>}
            </div>
            {h.notas && <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>{h.notas}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function CPerfil({ clienta, data, onLogout }) {
  const [editando, setEdit]   = useState(false);
  const [foto, setFoto]       = useState(null);
  const [saving, setSaving]   = useState(false);
  const [formP, setFormP]     = useState({ nombre:clienta.nombre||"", telefono:clienta.telefono||"", fechaNacimiento:clienta.fechaNacimiento||"", emergencia:clienta.emergencia||"" });
  const setFP = (k, v) => setFormP(f => ({ ...f, [k]:v }));
  const { dark, toggleTheme } = useTheme();
  const { status: pushStatus, subscribe: pushSubscribe } = usePushStatus("clienta", clienta.uid);

  const politicas = data.getConfig("politicas", []);
  const estudio   = data.getConfig("estudio",   {});
  const hist      = Array.isArray(clienta.historial) ? clienta.historial : Object.values(clienta.historial || {});

  const onFoto = (e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setFoto(ev.target.result); r.readAsDataURL(f); };

  const guardar = async () => {
    setSaving(true);
    await data.editarClientas(clienta._id, { nombre:formP.nombre, telefono:formP.telefono, fechaNacimiento:formP.fechaNacimiento, emergencia:formP.emergencia });
    setSaving(false); setEdit(false);
  };
  return (
    <div>
      <div style={s.topBar}><h1 style={s.h1}>Mi Perfil</h1><p style={s.sub}>Tus datos</p></div>
      <div style={{ padding:"18px" }}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:22 }}>
          <div style={{ position:"relative", marginBottom:10 }}>
            {foto ? <img src={foto} alt="perfil" style={{ width:78, height:78, borderRadius:"50%", objectFit:"cover", border:`2px solid ${G.green}` }} /> : <Avatar nombre={clienta.nombre} size={78} />}
            <label htmlFor="foto-input" style={{ position:"absolute", bottom:0, right:0, width:26, height:26, borderRadius:"50%", background:editando ? G.green : G.glass, border:`1.5px solid ${editando ? G.bg : G.border}`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
              <Icon name="camera" size={13} color={editando ? "#0a0a0a" : G.sub} />
            </label>
            <input id="foto-input" type="file" accept="image/*" style={{ display:"none" }} onChange={onFoto} />
          </div>
          <p style={{ margin:"0 0 5px", fontFamily:F.serif, fontWeight:700, fontSize:18, color:G.text }}>{clienta.nombre}</p>
          <span style={s.tag}>Clienta activa</span>
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          <button style={{ ...s.btnGl, flex:1, fontSize:12 }} onClick={() => setEdit(e => !e)}>{editando ? "Cancelar" : "Editar"}</button>
          <button style={{ ...s.btnGl, flex:1, fontSize:12 }} onClick={() => openWA()}>Contactar</button>
          <button title={pushStatus === "subscribed" ? "Notificaciones activas" : "Activar notificaciones"}
            style={{ ...s.btnGl, padding:"10px 12px", display:"flex", alignItems:"center", gap:5, borderColor: pushStatus === "subscribed" ? G.green : G.border }}
            onClick={pushStatus === "subscribed" ? undefined : pushSubscribe}>
            <Icon name="bell" size={15} color={pushStatus === "subscribed" ? G.green : G.muted} />
          </button>
          <button style={{ ...s.btnGl, padding:"10px 12px", display:"flex", alignItems:"center", gap:5 }} onClick={toggleTheme}>
            <Icon name={dark ? "sun" : "moon"} size={15} color={G.muted} />
          </button>
        </div>
        <div style={{ ...s.card, display:"flex", flexDirection:"column", gap:12 }}>
          {editando ? (
            <>
              <Field label="nombre"><input style={s.input} value={formP.nombre} onChange={e => setFP("nombre", e.target.value)} /></Field>
              <Field label="teléfono"><input style={s.input} type="tel" value={formP.telefono} onChange={e => setFP("telefono", e.target.value)} placeholder="11 XXXX-XXXX" /></Field>
              <Field label="contacto de emergencia"><input style={s.input} value={formP.emergencia} onChange={e => setFP("emergencia", e.target.value)} placeholder="nombre y teléfono..." /></Field>
            </>
          ) : (
            [["nombre", clienta.nombre], ["email", clienta.email || "—"], ["teléfono", clienta.telefono || "—"], ["emergencia", clienta.emergencia || "—"]].map(([l, v]) => (
              <div key={l}><label style={s.label}>{l}</label><p style={{ margin:0, fontFamily:F.sans, fontSize:13, color:G.sub }}>{v}</p></div>
            ))
          )}
        </div>
        {(clienta.curva || clienta.grosor || clienta.largo) && (
          <div style={{ marginTop:12 }}>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.white, margin:"0 0 10px" }}>mis preferencias</p>
            <div style={s.card}>
              {[["curva habitual", clienta.curva], ["grosor", clienta.grosor ? `${clienta.grosor}mm` : null], ["largo", clienta.largo]].filter(([, v]) => v).map(([l, v]) => (
                <div key={l} style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <span style={{ ...s.label, margin:0 }}>{l}</span>
                  <span style={s.tag}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {politicas.length > 0 && (
          <div style={{ ...s.card, marginTop:12, background:"rgba(143,189,90,0.03)", borderColor:G.border }}>
            <p style={{ margin:"0 0 9px", fontFamily:F.serif, fontWeight:700, fontSize:14 }}>Políticas del Estudio</p>
            {politicas.map((p, i) => <p key={i} style={{ margin:"0 0 6px", fontFamily:F.sans, fontSize:12, color:G.sub }}>{p}</p>)}
          </div>
        )}
        {editando && <button style={{ ...s.btnG, marginTop:12, opacity:saving?0.6:1 }} onClick={guardar} disabled={saving}>{saving?"Guardando...":"Guardar cambios →"}</button>}

        {clienta.laminado && (clienta.laminado.porosidad || clienta.laminado.molde || clienta.laminado.tecnica || clienta.laminado.tipoOjo) && (
          <div style={{ marginTop:16 }}>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.white, margin:"0 0 10px" }}>ficha laminado</p>
            <div style={s.card}>
              {[
                ["porosidad", clienta.laminado.porosidad],
                ["tipo de ojo", clienta.laminado.tipoOjo],
                ["formato óseo", clienta.laminado.formatoOseo],
                ["molde", clienta.laminado.molde],
                ["tiempos", clienta.laminado.tiempos],
                ["técnica", clienta.laminado.tecnica],
              ].filter(([, v]) => v).map(([l, v]) => (
                <div key={l} style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <span style={{ ...s.label, margin:0 }}>{l}</span>
                  <span style={{ fontFamily:F.sans, fontSize:13, color:G.sub }}>{v}</span>
                </div>
              ))}
              {clienta.laminado.estado && (
                <div style={{ marginTop:4 }}>
                  <label style={s.label}>estado / tricología</label>
                  <p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:G.sub, lineHeight:1.5 }}>{clienta.laminado.estado}</p>
                </div>
              )}
              {clienta.laminado.particularidades && (
                <div style={{ marginTop:8 }}>
                  <label style={s.label}>particularidades</label>
                  <p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:G.sub, lineHeight:1.5 }}>{clienta.laminado.particularidades}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {hist.length > 0 && (
          <div style={{ marginTop:16 }}>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.white, margin:"0 0 10px" }}>mis visitas</p>
            {[...hist].reverse().map((h, i) => (
              <div key={i} style={s.card}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <p style={{ margin:"0 0 2px", fontFamily:F.serif, fontSize:14 }}>{h.servicio}</p>
                    <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>{fmtFecha(h.fecha)}{h.curva ? ` · curva ${h.curva}` : ""}</p>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    {h.descuentoVisitas && <p style={{ margin:"0 0 2px", fontFamily:F.sans, fontSize:10, color:G.muted, textDecoration:"line-through" }}>{fmtPesos(h.montoOriginal)}</p>}
                    <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, color:G.green, fontSize:13 }}>{fmtPesos(h.monto)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button style={{ ...s.btnRed, marginTop:18, width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }} onClick={onLogout}>
          <Icon name="logOut" size={15} color={G.red} />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
