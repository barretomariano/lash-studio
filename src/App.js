import { useState, useEffect, useCallback, createContext, useContext } from "react";

const FB        = "https://lash-studio-c9cd7-default-rtdb.firebaseio.com";
const API_KEY   = "AIzaSyDq8japdXOWaAAOjBLhESJB1h2qITdnhvk";
const AUTH_URL  = "https://identitytoolkit.googleapis.com/v1/accounts";
const ADMIN_EMAIL = "maleocampo3@gmail.com";
const WA_NUM    = "541126509699";
const DEPLOY_URL = "https://lash-studio-gilt.vercel.app";
const VAPID_PUBLIC_KEY = "BBsJiZsDUVmNPVoNNvzhlKiJG25M27n7IEKJmf9gCO1CDiAM7D-8pFlxuRQP_CNN_p0utbKR1JOR90HoA78_Hxk";

const db = {
  get: async (path) => {
    const r = await fetch(`${FB}/${path}.json`);
    const d = await r.json();
    if (!d || typeof d !== "object" || Array.isArray(d)) return [];
    return Object.entries(d).map(([k, v]) => ({ ...v, _id: k }));
  },
  getVal: async (path) => { const r = await fetch(`${FB}/${path}.json`); return r.json(); },
  set:    async (path, data) => { await fetch(`${FB}/${path}.json`, { method:"PUT",    body:JSON.stringify(data) }); },
  push:   async (path, data) => { const r = await fetch(`${FB}/${path}.json`, { method:"POST",   body:JSON.stringify(data) }); return (await r.json()).name; },
  update: async (path, data) => { await fetch(`${FB}/${path}.json`, { method:"PATCH",  body:JSON.stringify(data) }); },
  del:    async (path)       => { await fetch(`${FB}/${path}.json`, { method:"DELETE" }); },
};

const fbAuth = {
  signIn:  async (email, pass) => (await fetch(`${AUTH_URL}:signInWithPassword?key=${API_KEY}`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email, password:pass, returnSecureToken:true }) })).json(),
  create:  async (email, pass) => (await fetch(`${AUTH_URL}:signUp?key=${API_KEY}`,             { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email, password:pass, returnSecureToken:true }) })).json(),
  resetPw: async (email)       => (await fetch(`${AUTH_URL}:sendOobCode?key=${API_KEY}`,        { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ requestType:"PASSWORD_RESET", email }) })).json(),
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

const G_dark = {
  bg:"#0a0a0a", card:"rgba(255,255,255,0.045)", glass:"rgba(255,255,255,0.07)",
  border:"rgba(255,255,255,0.09)", borderHov:"rgba(255,255,255,0.18)",
  green:"#8fbd5a", greenD:"#5c8f2e", greenL:"#b5d98a", greenM:"rgba(143,189,90,0.18)", greenRGB:"143,189,90",
  text:"#f0f0f0", muted:"rgba(240,240,240,0.45)", sub:"rgba(240,240,240,0.65)",
  white:"#fff", red:"#e07070", amber:"#e0b870",
  navBg:"rgba(12,12,12,0.95)", topBarBg:"rgba(10,10,10,0.88)",
  shadow:"rgba(0,0,0,0.28)", shadowMd:"rgba(0,0,0,0.18)", shadowSm:"rgba(0,0,0,0.1)",
  appBgGradient:"radial-gradient(ellipse 90% 60% at 50% -8%, rgba(143,189,90,0.18) 0%, transparent 62%), radial-gradient(ellipse 45% 40% at 96% 88%, rgba(143,189,90,0.10) 0%, transparent 56%), radial-gradient(ellipse 55% 45% at 4% 100%, rgba(143,189,90,0.07) 0%, transparent 58%)",
};
const G_light = {
  bg:"#f5f1eb", card:"rgba(255,255,255,0.85)", glass:"rgba(0,0,0,0.04)",
  border:"rgba(0,0,0,0.1)", borderHov:"rgba(0,0,0,0.2)",
  green:"#5a9020", greenD:"#3d6e14", greenL:"#3a7010", greenM:"rgba(90,144,32,0.15)", greenRGB:"90,144,32",
  text:"#2a2a2a", muted:"rgba(30,30,30,0.5)", sub:"rgba(30,30,30,0.7)",
  white:"#1a1a1a", red:"#c04040", amber:"#9a6418",
  navBg:"rgba(244,240,234,0.96)", topBarBg:"rgba(244,240,234,0.92)",
  shadow:"rgba(0,0,0,0.1)", shadowMd:"rgba(0,0,0,0.07)", shadowSm:"rgba(0,0,0,0.04)",
  appBgGradient:"radial-gradient(ellipse 90% 60% at 50% -8%, rgba(90,144,32,0.11) 0%, transparent 55%), radial-gradient(ellipse 55% 45% at 4% 100%, rgba(90,144,32,0.07) 0%, transparent 52%)",
};
const G = Object.assign({}, G_dark);
const F = { serif:"'Fraunces',Georgia,serif", sans:"'Outfit','Segoe UI',sans-serif" };

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

// WA message templates — stored in /config/mensajes, editable by admin
const DEFAULT_MENSAJES = {
  service14d:  "Hola {nombre}! 🌿 ¿Cómo están tus pestañas? Ya es momento del service. ¡Te espero! 💚",
  recordatorio:"Hola {nombre}! 🌿 Te recuerdo tu cita mañana a las {hora}. ¡Te espero! 💚",
  bienvenida:  "Hola {nombre}! 🌿 Te creé tu acceso en {estudio}.\n\nEmail: {email}\nContraseña: {pass}\n\nEntrá desde: {url}\n\n¡Podés ver tus citas, historial y más! 💚",
};
const fillMsg = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] !== undefined ? vars[k] : `{${k}}`);

// ── Push notifications ─────────────────────────────────────────────────────────
function urlBase64ToUint8Array(b64) {
  const pad = "=".repeat((4 - b64.length % 4) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// Fire-and-forget push send (called from React components)
const sendPush = (targets, title, body, url = "/") => {
  fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targets, title, body, url }),
  }).catch(() => {});
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
  get topBar() { return { padding:"52px 20px 14px", background:G.topBarBg, backdropFilter:"blur(28px) saturate(180%)", position:"sticky", top:0, zIndex:10, boxShadow:`0 0.5px 0 ${G.border}, 0 4px 20px ${G.shadow}` }; },
  get h1()     { return { fontFamily:F.serif, fontWeight:700, fontSize:26, letterSpacing:"-0.5px", color:G.text, margin:0, lineHeight:1.1 }; },
  get sub()    { return { fontFamily:F.sans, fontSize:12, color:G.muted, margin:"4px 0 0", fontWeight:400 }; },
  get eyebrow(){ return { fontFamily:F.sans, fontSize:10, letterSpacing:"0.18em", textTransform:"uppercase", color:`rgba(${G.greenRGB},0.65)`, margin:"0 0 3px", fontWeight:500 }; },
  // Cards con jerarquía
  get card()   { return { background:G.card, border:`0.5px solid ${G.border}`, borderRadius:16, padding:"15px 17px", marginBottom:10, backdropFilter:"blur(12px)", transition:"all 0.2s", boxShadow:`0 2px 16px ${G.shadowMd}` }; },
  get cardHero(){ return { background:`linear-gradient(135deg, rgba(${G.greenRGB},0.15) 0%, rgba(${G.greenRGB},0.04) 100%)`, border:`1px solid rgba(${G.greenRGB},0.28)`, borderRadius:20, padding:"18px 20px", marginBottom:12, backdropFilter:"blur(16px)", boxShadow:`0 8px 32px ${G.shadow}, 0 0 0 0.5px rgba(${G.greenRGB},0.12) inset` }; },
  get cardSub(){ return { background:G.glass, border:`0.5px solid ${G.border}`, borderRadius:14, padding:"12px 14px", marginBottom:8, boxShadow:`0 1px 8px ${G.shadowSm}` }; },
  get input()  { return { background:G.glass, border:`0.5px solid ${G.border}`, borderRadius:11, padding:"13px 15px", color:G.text, fontFamily:F.sans, fontSize:15, width:"100%", outline:"none", boxSizing:"border-box", transition:"border-color 0.2s" }; },
  get label()  { return { fontFamily:F.sans, fontSize:12, color:G.muted, display:"block", marginBottom:6, fontWeight:500 }; },
  btnG:   { background:"linear-gradient(135deg, #a3d468 0%, #7db047 100%)", border:"none", borderRadius:13, padding:"14px 20px", color:"#0a0a0a", fontFamily:F.sans, fontSize:14, fontWeight:700, cursor:"pointer", width:"100%", transition:"opacity 0.15s, transform 0.1s", letterSpacing:"0.02em", boxShadow:"0 4px 18px rgba(143,189,90,0.38), 0 1px 3px rgba(0,0,0,0.3)" },
  get btnGl()  { return { background:G.glass, border:`0.5px solid ${G.borderHov}`, borderRadius:12, padding:"10px 16px", color:G.text, fontFamily:F.sans, fontSize:13, fontWeight:500, cursor:"pointer", backdropFilter:"blur(10px)", transition:"all 0.2s", boxShadow:`0 2px 8px ${G.shadowSm}` }; },
  get btnRed() { return { background:"rgba(224,112,112,0.1)", border:`0.5px solid rgba(224,112,112,0.35)`, borderRadius:12, padding:"10px 16px", color:G.red, fontFamily:F.sans, fontSize:13, cursor:"pointer" }; },
  get tag()    { return { background:G.greenM, border:`0.5px solid rgba(${G.greenRGB},0.35)`, borderRadius:20, padding:"3px 11px", fontSize:11, color:G.greenL, fontFamily:F.sans, display:"inline-block", marginRight:5, marginBottom:3, fontWeight:500 }; },
  get div()    { return { height:"0.5px", background:G.border, margin:"16px 0" }; },
  get nav() { return { position:"fixed", bottom:20, left:"50%", transform:"translateX(-50%)", width:"calc(100% - 32px)", maxWidth:398, background:G.navBg, backdropFilter:"blur(32px) saturate(200%)", border:`0.5px solid ${G.border}`, borderRadius:28, display:"flex", zIndex:20, padding:"8px 6px", boxShadow:`0 8px 40px ${G.shadow}, 0 1px 0 rgba(255,255,255,0.06) inset` }; },
  fab:  { position:"fixed", bottom:90, right:18, width:54, height:54, borderRadius:"50%", background:"linear-gradient(135deg, #a3d468 0%, #7db047 100%)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 6px 24px rgba(143,189,90,0.5), 0 2px 8px rgba(0,0,0,0.4)`, zIndex:30, transition:"transform 0.15s" },
};

const navItmSty     = (active) => ({ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"7px 0", cursor:"pointer", color:active ? G.green : G.muted, transition:"color 0.18s, background 0.18s, box-shadow 0.18s", borderRadius:22, background:active ? `rgba(${G.greenRGB},0.13)` : "transparent", boxShadow:active ? `inset 0 2px 0 rgba(${G.greenRGB},0.55)` : "none" });
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
  `}</style>
);

// ── useData ────────────────────────────────────────────────────────────────────
function useData() {
  const [servicios, setServicios]     = useState([]);
  const [clientas, setClientas]       = useState([]);
  const [citas, setCitas]             = useState([]);
  const [excepciones, setExcepciones] = useState([]);
  const [config, setConfig]           = useState({});
  const [loading, setLoading]         = useState(true);

  const recargar = useCallback(async () => {
    setLoading(true);
    const [sv, cl, ct, ex, cfg] = await Promise.all([db.get("servicios"), db.get("clientas"), db.get("citas"), db.get("excepciones"), db.getVal("config")]);
    setServicios(sv); setClientas(cl); setCitas(ct); setExcepciones(ex); setConfig(cfg || {});
    setLoading(false);
  }, []);

  useEffect(() => { recargar(); }, []);

  const getConfig  = (key, def) => config?.[key] ?? def;
  const saveConfig = async (key, val) => { await db.update("config", { [key]: val }); setConfig(p => ({ ...p, [key]: val })); };

  const crearServicio  = async (d)     => { const id = await db.push("servicios", d); setServicios(p => [...p, { ...d, _id:id }]); };
  const editarServicio = async (id, d) => { await db.set(`servicios/${id}`, d); setServicios(p => p.map(x => x._id === id ? { ...d, _id:id } : x)); };
  const borrarServicio = async (id)    => { await db.del(`servicios/${id}`); setServicios(p => p.filter(x => x._id !== id)); };

  const crearClientas = async (datos) => {
    const pass = genPass();
    const res  = await fbAuth.create(datos.email, pass);
    if (res.error) return { error: res.error.message };
    const id = await db.push("clientas", { ...datos, uid:res.localId, creadaEn:hoyISO() });
    setClientas(p => [...p, { ...datos, uid:res.localId, creadaEn:hoyISO(), _id:id, historial:[] }]);
    return { ok:true, pass, email:datos.email };
  };
  const editarClientas        = async (id, d) => { await db.update(`clientas/${id}`, d); setClientas(p => p.map(x => x._id === id ? { ...x, ...d } : x)); };
  const resetPasswordClientas = async (email)  => { await fbAuth.resetPw(email); };

  const crearCita  = async (d)     => { const id = await db.push("citas", { ...d, creadaEn:hoyISO() }); setCitas(p => [...p, { ...d, creadaEn:hoyISO(), _id:id }]); return id; };
  const editarCita = async (id, d) => { await db.update(`citas/${id}`, d); setCitas(p => p.map(x => x._id === id ? { ...x, ...d } : x)); };
  const borrarCita = async (id)    => { await db.del(`citas/${id}`); setCitas(p => p.filter(x => x._id !== id)); };

  const registrarPago = async (clientaId, citaId, reg) => {
    await db.push(`clientas/${clientaId}/historial`, reg);
    await editarCita(citaId, { estado:"completada" });
    setClientas(p => p.map(c => {
      if (c._id !== clientaId) return c;
      const h = Array.isArray(c.historial) ? c.historial : (c.historial ? Object.values(c.historial) : []);
      return { ...c, historial:[...h, reg] };
    }));
  };

  return { servicios, clientas, citas, excepciones, config, loading, recargar, getConfig, saveConfig, crearServicio, editarServicio, borrarServicio, crearClientas, editarClientas, resetPasswordClientas, crearCita, editarCita, borrarCita, registrarPago };
}

// ── Componentes UI comunes ─────────────────────────────────────────────────────
function Loader({ msg = "Cargando..." }) {
  return (
    <div style={{ minHeight:"100vh", background:G.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:18, position:"relative" }}>
      <GlobalStyles />
      <AppBg />
      <div style={{ width:56, height:56, borderRadius:"50%", background:`radial-gradient(circle, rgba(143,189,90,0.22) 0%, rgba(143,189,90,0.06) 100%)`, border:`1.5px solid rgba(143,189,90,0.45)`, display:"flex", alignItems:"center", justifyContent:"center", zIndex:1, animation:"logoPulse 2.5s ease-in-out infinite", boxShadow:"0 0 24px rgba(143,189,90,0.16)" }}>
        <Icon name="scissors" size={24} color={G.greenL} />
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
      <div style={{ background:G.bg, border:`0.5px solid ${G.border}`, borderRadius:"20px 20px 0 0", width:"100%", maxWidth:430, maxHeight:"92vh", overflowY:"auto", padding:"18px 20px 44px", boxShadow:"0 -8px 32px rgba(0,0,0,0.5)" }}>
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
          style={{ ...s.btnGl, padding:"7px 13px", fontSize:13, background:value === o ? G.greenM : G.glass, borderColor:value === o ? G.green : G.border, color:value === o ? G.greenL : G.sub }}>
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
    if (g) { try { const p = JSON.parse(g); if (p.expiry > Date.now()) onLogin(p.tipo, p.data); } catch {} }
  }, []);

  const guardar = (tipo, data = null) => {
    if (recordar) localStorage.setItem("ls_session", JSON.stringify({ tipo, data, expiry:Date.now() + 1000 * 60 * 60 * 24 * 30 }));
  };

  const entrar = async () => {
    if (!email || !pass) { setErr("Completá los campos"); return; }
    setLoading(true); setErr("");
    const r = await fbAuth.signIn(email, pass);
    if (r.error) { setErr("Email o contraseña incorrectos"); setLoading(false); return; }
    if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      guardar("admin"); onLogin("admin");
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
        <div style={{ width:72, height:72, borderRadius:"50%", background:`radial-gradient(circle, rgba(${G.greenRGB},0.22) 0%, rgba(${G.greenRGB},0.08) 100%)`, border:`1.5px solid rgba(${G.greenRGB},0.45)`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", animation:"logoPulse 3.5s ease-in-out infinite", boxShadow:`0 0 24px rgba(${G.greenRGB},0.18)` }}>
          <Icon name="scissors" size={30} color={G.greenL} />
        </div>
        <h1 style={{ ...s.h1, fontSize:34, letterSpacing:"-0.5px", textAlign:"center", marginBottom:4 }}>Lash Studio</h1>
        <p style={{ fontFamily:F.serif, fontSize:14, fontStyle:"italic", color:G.green, margin:"0 0 14px", letterSpacing:"0.04em" }}>by chulas</p>
        <div style={{ width:64, height:1.5, background:`linear-gradient(90deg, transparent, ${G.green}, transparent)`, margin:"0 auto 12px" }} />
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
              <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:17, color:G.text, margin:"0 0 3px" }}>Mi espacio</p>
              <p style={{ ...s.sub, fontSize:12 }}>Ver mis citas y perfil</p>
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
  const [dark, setDark] = useState(() => localStorage.getItem("ls_theme") !== "light");
  const data = useData();

  Object.assign(G, dark ? G_dark : G_light);

  const login  = (tipo, d = null) => setSession({ tipo, data:d });
  const logout = () => { localStorage.removeItem("ls_session"); setSession(null); };
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
  const [toast, setToast] = useState(null);
  const wide = useIsWide();

  const push     = (screen, props = {}) => setStack(p => [...p, { screen, props }]);
  const pop      = ()                   => setStack(p => p.slice(0, -1));
  const shwToast = (msg)                => setToast(msg);
  const cur      = stack[stack.length - 1];

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
      <div style={{ minHeight:"100vh", background:G.bg, color:G.text, fontFamily:F.sans, display:"flex", flexDirection:"row", overflowX:"hidden" }}>
        <GlobalStyles />
        <AppBg />
        {/* Sidebar nav */}
        <nav style={{ width:190, flexShrink:0, background:G.navBg, backdropFilter:"blur(32px)", borderRight:`0.5px solid ${G.border}`, display:"flex", flexDirection:"column", padding:"24px 10px 20px", gap:3, position:"sticky", top:0, height:"100vh", zIndex:20 }}>
          <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.green, padding:"0 4px 18px", margin:0, letterSpacing:"-0.3px" }}>Lash Studio</p>
          {navItems.map(n => (
            <div key={n.id} style={sideNavItmSty(tab === n.id && !cur)} onClick={() => { setStack([]); setTab(n.id); }}>
              <Icon name={n.iconName} size={17} color={tab===n.id && !cur ? G.green : G.muted} strokeWidth={tab===n.id && !cur ? 1.8 : 1.5} />
              <span>{n.label}</span>
            </div>
          ))}
          <div style={{ flex:1 }} />
          <button style={{ ...s.btnG, margin:"0 4px", width:"auto" }} onClick={() => push("nueva-cita")}>+ Nueva cita</button>
        </nav>
        {/* Content */}
        <div style={{ flex:1, overflowY:"auto", position:"relative", minWidth:0, paddingBottom:24 }}>
          {renderScreen()}
        </div>
        {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
      </div>
    );
  }

  return (
    <div style={s.app}>
      <GlobalStyles />
      <AppBg />
      <div style={s.screen}>{renderScreen()}</div>
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
function AdminInicio({ data, push, setTab }) {
  const hoy = hoyISO();
  const mes = mesISO();
  const { dark, toggleTheme } = useTheme();
  const citasHoy    = data.citas.filter(c => c.fecha === hoy && c.estado !== "completada");
  const proximas    = data.citas.filter(c => c.fecha > hoy && c.estado !== "completada").sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora)).slice(0, 4);
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
      <div style={{ padding:"18px 18px 0" }}>
        <PushBanner role="admin" />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:18 }}>
          <div onClick={() => setTab("finanzas")} style={{ ...s.cardHero, cursor:"pointer", margin:0, padding:"16px 14px", gridColumn:"1 / -1" }}>
            <p style={{ fontFamily:F.sans, fontSize:9, color:"rgba(181,217,138,0.7)", margin:"0 0 4px", textTransform:"uppercase", letterSpacing:"0.14em" }}>ingresos del mes</p>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:28, color:G.greenL, margin:"0 0 2px", lineHeight:1.1 }}>{fmtPesos(ingresosMes)}</p>
            <p style={{ fontFamily:F.sans, fontSize:10, color:"rgba(181,217,138,0.55)", margin:0 }}>{todoHist.filter(h => h.fecha?.startsWith(mes)).length} servicios este mes</p>
          </div>
          <div onClick={() => setTab("agenda")} style={{ ...s.card, cursor:"pointer", margin:0, padding:"14px 12px", textAlign:"center" }}>
            <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:"0 0 4px", textTransform:"uppercase", letterSpacing:"0.1em" }}>hoy</p>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:26, color:G.white, margin:"0 0 2px", lineHeight:1.1 }}>{citasHoy.length}</p>
            <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:0 }}>{data.citas.filter(c => c.fecha === hoy).length} citas</p>
          </div>
          <div onClick={() => setTab("clientas")} style={{ ...s.card, cursor:"pointer", margin:0, padding:"14px 12px", textAlign:"center" }}>
            <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:"0 0 4px", textTransform:"uppercase", letterSpacing:"0.1em" }}>clientas</p>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:26, color:G.white, margin:"0 0 2px", lineHeight:1.1 }}>{data.clientas.length}</p>
            <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:0 }}>activas</p>
          </div>
        </div>

        <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:17, color:G.white, margin:"0 0 10px" }}>citas de hoy</p>
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

        <div style={s.div} />
        <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:17, color:G.white, margin:"0 0 3px" }}>próximas</p>
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

        {sinCita.length > 0 && (
          <>
            <div style={s.div} />
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:17, color:G.amber, margin:"0 0 3px" }}>pendientes de service</p>
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
                    onClick={() => { const tpl = data.getConfig("mensajes", DEFAULT_MENSAJES); openWAClienta(c, fillMsg(tpl.service14d || DEFAULT_MENSAJES.service14d, { nombre:c.nombre?.split(" ")[0] })); }}>💬</button>
                </div>
              );
            })}
          </>
        )}

        {topSv.length > 0 && (
          <>
            <div style={s.div} />
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:17, color:G.white, margin:"0 0 3px" }}>top servicios del mes</p>
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

// ── Admin Agenda ───────────────────────────────────────────────────────────────
function AdminAgenda({ data, push }) {
  const hoy    = hoyISO();
  const ahora  = new Date();
  const [offset, setOffset]       = useState(0);
  const [diaS,   setDiaS]         = useState(hoy);
  const [vista,  setVista]         = useState("mes");
  const [weekOffset, setWeekOffset] = useState(0);

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

  const dtManana = new Date(diaS + "T12:00:00"); dtManana.setDate(dtManana.getDate() + 1);
  const keyManana = dtManana.toISOString().slice(0, 10);
  const citasManana = citasPorFecha[keyManana] || [];

  return (
    <div>
      <div style={s.topBar}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div><h1 style={s.h1}>Agenda</h1><p style={s.sub}>calendario del estudio</p></div>
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            {["mes","semana"].map(v => (
              <button key={v} onClick={() => setVista(v)}
                style={{ ...s.btnGl, padding:"6px 12px", fontSize:11, textTransform:"capitalize",
                  background:vista===v ? G.greenM : G.glass,
                  borderColor:vista===v ? G.green : G.border,
                  color:vista===v ? G.greenL : G.sub }}>
                {v}
              </button>
            ))}
            <button style={{ ...s.btnG, width:"auto", padding:"9px 14px", fontSize:12 }} onClick={() => push("nueva-cita")}>+ nueva</button>
          </div>
        </div>
      </div>
      {vista === "semana"
        ? <AgendaSemana data={data} push={push} weekOffset={weekOffset} setWeekOffset={setWeekOffset} />
        : <div style={{ padding:"18px 14px 0" }}>
        <div style={{ ...s.card, padding:"14px 10px", marginBottom:18 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <button style={{ ...s.btnGl, padding:"6px 12px", fontSize:15 }} onClick={() => setOffset(o => o - 1)}>‹</button>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.white, margin:0, textTransform:"capitalize" }}>{MESES[mes]} {anio}</p>
            <button style={{ ...s.btnGl, padding:"6px 12px", fontSize:15 }} onClick={() => setOffset(o => o + 1)}>›</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:4 }}>
            {DIAS_C.map(d => <div key={d} style={{ textAlign:"center", fontFamily:F.sans, fontSize:10, color:G.muted, padding:"2px 0" }}>{d}</div>)}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
            {Array(primDia).fill(null).map((_, i) => <div key={"e" + i} />)}
            {Array(diasMes).fill(null).map((_, i) => {
              const dia = i + 1, key = fmtKey(dia);
              const tiene = !!(citasPorFecha[key]?.length);
              const bloqExcep = fechasBloq.has(key);
              const bloqDia   = !esDiaLaboral(key, diasLaborales);
              const bloq = bloqExcep || bloqDia;
              const esH = key === hoy, esSel = key === diaS;
              return (
                <div key={dia} onClick={() => setDiaS(key)} style={{ textAlign:"center", borderRadius:8, padding:"5px 2px", cursor:"pointer", background:esSel ? G.green : esH ? G.greenM : bloq ? "rgba(224,112,112,0.1)" : "transparent", border:esSel ? "none" : esH ? `0.5px solid ${G.green}` : bloq ? `0.5px solid rgba(224,112,112,0.3)` : "0.5px solid transparent" }}>
                  <span style={{ fontFamily:F.sans, fontSize:12, color:esSel ? "#0a0a0a" : esH ? G.greenL : bloq ? G.red : G.sub, fontWeight:esSel || esH ? 700 : 400, display:"block" }}>{dia}</span>
                  {tiene && <div style={{ display:"flex", justifyContent:"center", gap:2, marginTop:2 }}>{Array(Math.min(citasPorFecha[key].length, 3)).fill(null).map((_, pi) => <div key={pi} style={{ width:3, height:3, borderRadius:"50%", background:esSel ? "rgba(10,10,10,0.5)" : G.green }} />)}</div>}
                  {bloq && !tiene && <div style={{ fontSize:7, color:G.red }}>✕</div>}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
          <div style={{ width:5, height:5, borderRadius:"50%", background:G.green }} />
          <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.white }}>{DIAS_F[new Date(diaS + "T12:00:00").getDay()]} {fmtFecha(diaS)}</p>
          {citasDia.length > 0 && <span style={s.tag}>{citasDia.length} citas</span>}
        </div>

        {diaEsBloq && (
          <div style={{ ...s.card, background:"rgba(224,112,112,0.08)", borderColor:G.red, marginBottom:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <p style={{ margin:"0 0 2px", fontFamily:F.sans, fontSize:11, color:G.red }}>
                {fechasBloq.has(diaS) ? "día bloqueado manualmente" : "día no laborable"}
              </p>
              <p style={{ margin:0, fontFamily:F.sans, fontSize:13, color:G.sub }}>
                {excepDia?.razon || (esDiaLaboral(diaS, diasLaborales) ? "" : `los ${DIAS_F[new Date(diaS+"T12:00:00").getDay()]}s no trabajás`)}
              </p>
            </div>
            <span style={{ fontSize:18 }}></span>
          </div>
        )}

        {citasManana.length > 0 && (
          <div style={{ ...s.card, background:"rgba(143,189,90,0.06)", borderColor:G.greenD, marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <p style={{ margin:"0 0 2px", fontFamily:F.sans, fontSize:10, color:G.greenL }}>recordatorio mañana</p>
                <p style={{ margin:0, fontFamily:F.serif, fontSize:13 }}>{citasManana.length} cita{citasManana.length > 1 ? "s" : ""} para {keyManana.slice(8, 10)}/{keyManana.slice(5, 7)}</p>
              </div>
              <button style={{ ...s.btnGl, fontSize:11, padding:"7px 12px", borderColor:G.green, color:G.greenL }}
                onClick={() => { const tpl = data.getConfig("mensajes", DEFAULT_MENSAJES); citasManana.forEach(c => { const cl = data.clientas.find(x => x._id === c.clientaId); openWAClienta(cl, fillMsg(tpl.recordatorio || DEFAULT_MENSAJES.recordatorio, { nombre:c.clientaNombre?.split(" ")[0], hora:c.hora })); }); }}>
                Avisar →
              </button>
            </div>
          </div>
        )}

        <div>
          {diaEsBloq ? (
            <div style={{ ...s.card, textAlign:"center", padding:"24px", opacity:0.5 }}>
              <p style={{ fontFamily:F.sans, fontSize:13, color:G.muted, margin:0 }}>día bloqueado — sin turnos</p>
            </div>
          ) : slots.length === 0 ? (
            <div style={{ ...s.card, textAlign:"center", padding:"20px" }}>
              <p style={{ fontFamily:F.sans, fontSize:13, color:G.muted, margin:"0 0 8px" }}>No configuraste horarios aún</p>
              <p style={{ fontFamily:F.sans, fontSize:11, color:G.muted, margin:0 }}>Andá a Config → Horarios para agregar tus horarios de trabajo</p>
            </div>
          ) : slots.map(hora => {
            const cita = citasDia.find(c => c.hora === hora && c.estado !== "completada");
            return (
              <div key={hora} style={{ display:"flex", alignItems:"center", gap:10, background:cita ? G.card : "rgba(255,255,255,0.01)", border:`0.5px solid ${cita ? G.border : "rgba(255,255,255,0.03)"}`, borderRadius:11, padding:"9px 12px", marginBottom:7, opacity:cita ? 1 : 0.6 }}>
                <div style={{ background:cita ? G.greenM : "transparent", border:`0.5px solid ${cita ? G.green : G.border}`, borderRadius:8, padding:"5px 8px", minWidth:46, textAlign:"center" }}>
                  <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:13, color:cita ? G.greenL : G.muted }}>{hora}</p>
                </div>
                {!cita ? (
                  <div style={{ flex:1, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:G.muted }}>disponible</p>
                    <button style={{ ...s.btnGl, fontSize:10, padding:"4px 10px" }} onClick={() => push("nueva-cita", { fechaDefault:diaS, horaDefault:hora })}>+ agendar</button>
                  </div>
                ) : (
                  <>
                    <div style={{ flex:1 }}>
                      <p style={{ margin:"0 0 1px", fontFamily:F.serif, fontSize:13 }}>{cita.clientaNombre}</p>
                      <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>{cita.servicio}</p>
                    </div>
                    <div style={{ display:"flex", gap:6 }}>
                      <button style={{ background:"rgba(37,211,102,0.12)", border:"0.5px solid rgba(37,211,102,0.3)", borderRadius:8, width:30, height:30, cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center" }}
                        onClick={() => { const tpl = data.getConfig("mensajes", DEFAULT_MENSAJES); const cl = data.clientas.find(c => c._id === cita.clientaId); openWAClienta(cl, fillMsg(tpl.recordatorio || DEFAULT_MENSAJES.recordatorio, { nombre:cita.clientaNombre?.split(" ")[0], hora:cita.hora })); }}>💬</button>
                      <button style={{ ...s.btnGl, padding:"5px 9px", fontSize:11 }} onClick={() => push("cita-detalle", { cita })}>→</button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
      }
    </div>
  );
}

// ── Semana Calendar View ───────────────────────────────────────────────────────
function AgendaSemana({ data, push, weekOffset, setWeekOffset }) {
  const hoy = hoyISO();
  const ROW_H = 56;

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

  // Collect all slot times across the week to determine time axis range
  const allSlotMins = new Set();
  weekDays.forEach(d => {
    const dow = d.getDay();
    const slots = slotsPorDia[dow] !== undefined ? slotsPorDia[dow] : slotsGlobal;
    slots.forEach(t => allSlotMins.add(toMin(t)));
  });
  const minsSorted = [...allSlotMins].sort((a, b) => a - b);
  const minMin = minsSorted.length ? minsSorted[0]                     : 8*60;
  const maxMin = minsSorted.length ? minsSorted[minsSorted.length-1]+60 : 18*60;
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

      {/* Scrollable grid */}
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
            const dayCitas = (citasPorFecha[key] || []).filter(c => c.estado !== "completada");

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
                {dayCitas.map(cita => {
                  const startMin = toMin(cita.hora);
                  if (startMin < minMin || startMin >= maxMin) return null;
                  const sv = data.servicios.find(s => s.nombre === cita.servicio);
                  const duracion = sv?.duracion || 60;
                  const top = ((startMin - minMin) / 60) * ROW_H;
                  const height = Math.max(42, (duracion / 60) * ROW_H);
                  return (
                    <div key={cita._id}
                      onClick={e => { e.stopPropagation(); push("cita-detalle", { cita }); }}
                      style={{ position:"absolute", top, left:2, right:2, height,
                        background:blkBg(cita.estado), border:`1px solid ${blkBdr(cita.estado)}`,
                        borderRadius:8, padding:"3px 5px", overflow:"hidden",
                        cursor:"pointer", zIndex:2, boxSizing:"border-box" }}>
                      <p style={{ margin:0, fontFamily:F.sans, fontWeight:700, fontSize:10,
                        color:blkTxt(cita.estado), lineHeight:1.3,
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {cita.hora} · {cita.clientaNombre?.split(" ")[0]}
                      </p>
                      {height >= 54 && (
                        <p style={{ margin:0, fontFamily:F.sans, fontSize:9,
                          color:blkTxt(cita.estado), opacity:0.75, lineHeight:1.3,
                          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {cita.servicio}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Nueva Cita ─────────────────────────────────────────────────────────────────
function NuevaCita({ data, pop, toast, fechaDefault = "", horaDefault = "", clientaIdDefault = "" }) {
  const [form, setForm] = useState({ clientaId:clientaIdDefault, fecha:fechaDefault, hora:horaDefault, servicio:"", notas:"" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));
  const slots = (() => {
    const global = data.getConfig("slots", []);
    const porDia = data.getConfig("slotsPorDia", {});
    const dow    = form.fecha ? new Date(form.fecha + "T12:00:00").getDay() : null;
    return dow !== null && porDia[dow] !== undefined ? porDia[dow] : global;
  })();
  const ocupadas = data.citas.filter(c => c.fecha === form.fecha && c.estado !== "completada").map(c => c.hora);

  const guardar = async () => {
    if (!form.clientaId || !form.fecha || !form.hora || !form.servicio) { toast("completá todos los campos"); return; }
    setSaving(true);
    const clienta = data.clientas.find(c => c._id === form.clientaId);
    await data.crearCita({ ...form, clientaNombre:clienta?.nombre || "", clientaUid:clienta?.uid || "", estado:"confirmada" });
    // Notify the clienta that their appointment was confirmed
    if (clienta?.uid) {
      sendPush([`clienta:${clienta.uid}`],
        "¡Tu cita está confirmada! 🌿",
        `${form.servicio} · ${form.fecha} a las ${form.hora}`);
    }
    toast("✓ cita agendada"); pop();
  };

  return (
    <div>
      <div style={s.topBar}><Back onClick={pop} label="agenda" /><h1 style={s.h1}>Nueva Cita</h1></div>
      <div style={{ padding:"18px" }}>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <Field label="clienta">
            <select style={{ ...s.input, appearance:"none" }} value={form.clientaId} onChange={e => set("clientaId", e.target.value)}>
              <option value="">seleccionar clienta...</option>
              {[...data.clientas].sort((a, b) => a.nombre?.localeCompare(b.nombre)).map(c => <option key={c._id} value={c._id}>{c.nombre}</option>)}
            </select>
          </Field>
          <Field label="servicio">
            <select style={{ ...s.input, appearance:"none" }} value={form.servicio} onChange={e => set("servicio", e.target.value)}>
              <option value="">seleccionar servicio...</option>
              {data.servicios.map(sv => <option key={sv._id} value={sv.nombre}>{sv.nombre} · {fmtPesos(sv.precio)}</option>)}
            </select>
          </Field>
          <Field label="fecha"><input style={s.input} type="date" value={form.fecha} onChange={e => set("fecha", e.target.value)} /></Field>
          <Field label="hora">
            <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
              {slots.length === 0 && <p style={{ color:G.muted, fontSize:12 }}>Configurá los horarios en Config → Horarios</p>}
              {slots.map(h => { const oc = ocupadas.includes(h); return <button key={h} disabled={oc} onClick={() => set("hora", h)} style={{ ...s.btnGl, padding:"8px 12px", fontSize:12, opacity:oc ? 0.3 : 1, background:form.hora === h ? G.greenM : G.glass, borderColor:form.hora === h ? G.green : G.border, color:form.hora === h ? G.greenL : G.sub, cursor:oc ? "not-allowed" : "pointer" }}>{h}{oc ? " ✕" : ""}</button>; })}
            </div>
          </Field>
          <Field label="notas (opcional)"><textarea style={{ ...s.input, height:70, resize:"none" }} value={form.notas} onChange={e => set("notas", e.target.value)} placeholder="indicaciones especiales..." /></Field>
          <button style={{ ...s.btnG, opacity:saving ? 0.6 : 1 }} onClick={guardar} disabled={saving}>{saving ? "guardando..." : "confirmar cita →"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Detalle Cita ───────────────────────────────────────────────────────────────
function CitaDetalle({ data, pop, toast, cita:citaInit }) {
  const [cita, setCita]      = useState(citaInit);
  const [modalPago, setMP]   = useState(false);
  const [modalBorrar, setMB] = useState(false);
  // Pago: soporta efectivo, transferencia o mixto
  const [pago, setPago] = useState({ metodo:"efectivo", montoEfectivo:"", montoTransf:"", montoTotal:"" });

  const sv      = data.servicios.find(s => s.nombre === cita.servicio);
  const clienta = data.clientas.find(c => c._id === cita.clientaId);
  const estudio = data.getConfig("estudio", {});

  // Calcular total según modo
  const modoMixto = pago.metodo === "mixto";
  const totalCalculado = modoMixto
    ? (Number(pago.montoEfectivo)||0) + (Number(pago.montoTransf)||0)
    : Number(pago.montoTotal)||0;

  const completar = async () => {
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
    };

    await data.registrarPago(cita.clientaId, cita._id, registro);
    toast("Cita completada y pago registrado");
    setMP(false);
    setCita(p => ({ ...p, estado:"completada" }));
  };

  const borrar = async () => { await data.borrarCita(cita._id); toast("cita eliminada"); pop(); };

  const msgRecordatorio = `Hola ${cita.clientaNombre?.split(" ")[0]}! 🌿 Te recuerdo tu cita el ${fmtFecha(cita.fecha)} a las ${cita.hora} en ${estudio.nombre || "el estudio"}. ¡Te espero! 💚`;

  return (
    <div>
      <div style={s.topBar}><Back onClick={pop} /><h1 style={s.h1}>Detalle de Cita</h1><p style={s.sub}>{cita.fecha} · {cita.hora}</p></div>
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
              onClick={() => openWAClienta(clienta, msgRecordatorio)}>💬</button>
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

        {cita.estado !== "completada" && (
          <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
            <button style={s.btnG} onClick={() => setMP(true)}>✓ marcar como completada</button>
            <button style={{ ...s.btnGl, width:"100%" }} onClick={() => openWAClienta(clienta, msgRecordatorio)}>Recordatorio a {clienta?.nombre?.split(" ")[0] || "clienta"}</button>
            <button style={{ ...s.btnRed, width:"100%" }} onClick={() => setMB(true)}>eliminar cita</button>
          </div>
        )}
        {cita.estado === "completada" && <p style={{ color:G.green, fontFamily:F.sans, fontSize:13, textAlign:"center" }}>Cita completada y pago registrado</p>}
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
              {totalCalculado > 0 && (
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

          <button style={s.btnG} onClick={completar}>guardar y cerrar cita →</button>
        </Sheet>
      )}
      {modalBorrar && <Modal titulo="Eliminar cita" msg={`¿Segura que querés eliminar la cita de ${cita.clientaNombre}?`} onOk={borrar} onCancel={() => setMB(false)} okLabel="eliminar" danger />}
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
  const [form, setForm]         = useState({ nombre:"", email:"", telefono:"", curva:"", grosor:"", largo:"", alergias:"", observaciones:"" });
  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));

  const opcCurvas = data.getConfig("curvas",   []);
  const opcGrosor = data.getConfig("grosores", []);
  const opcLargo  = data.getConfig("largos",   []);

  const getUlt = (c) => {
    const h = Array.isArray(c.historial) ? c.historial : (c.historial ? Object.values(c.historial) : []);
    return h.length ? [...h].sort((a, b) => b.fecha?.localeCompare(a.fecha))[0] : null;
  };

  const filtradas = data.clientas
    .filter(c => c.nombre?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (orden === "az") return a.nombre?.localeCompare(b.nombre);
      const ua = getUlt(a)?.fecha || ""; const ub = getUlt(b)?.fecha || "";
      return ub.localeCompare(ua);
    });

  const guardar = async () => {
    if (!form.nombre || !form.email) { toast("nombre y email son obligatorios"); return; }
    setSaving(true);
    const res = await data.crearClientas(form);
    setSaving(false);
    if (res.error) { toast("error: " + res.error); return; }
    setSheet(false);
    setCreds({ email:res.email, pass:res.pass, nombre:form.nombre });
    setForm({ nombre:"", email:"", telefono:"", curva:"", grosor:"", largo:"", alergias:"", observaciones:"" });
  };

  return (
    <div>
      <div style={s.topBar}><h1 style={s.h1}>Clientas</h1><p style={s.sub}>{data.clientas.length} registradas</p></div>
      <div style={{ padding:"18px" }}>
        <div style={{ display:"flex", gap:9, marginBottom:12 }}>
          <input style={{ ...s.input, flex:1, margin:0 }} placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
          <button style={{ ...s.btnG, width:"auto", padding:"9px 14px", fontSize:12 }} onClick={() => setSheet(true)}>+ nueva</button>
        </div>
        <div style={{ display:"flex", gap:7, marginBottom:14 }}>
          {[["az", "A → Z"], ["reciente", "última visita"]].map(([v, l]) => (
            <button key={v} onClick={() => setOrden(v)} style={{ ...s.btnGl, fontSize:11, background:orden === v ? G.greenM : G.glass, borderColor:orden === v ? G.green : G.border, color:orden === v ? G.greenL : G.sub, padding:"6px 12px" }}>{l}</button>
          ))}
        </div>
        {filtradas.length === 0 && <p style={{ color:G.muted, fontSize:13 }}>Sin clientas aún</p>}
        {filtradas.map(c => {
          const ult = getUlt(c);
          const hist = Array.isArray(c.historial) ? c.historial : (c.historial ? Object.values(c.historial) : []);
          const dias = ult?.fecha ? Math.floor((new Date() - new Date(ult.fecha)) / (1000 * 60 * 60 * 24)) : null;
          return (
            <div key={c._id} style={{ ...s.card, display:"flex", alignItems:"center", gap:11, cursor:"pointer", opacity:c.estado === "pausada" ? 0.5 : 1 }} onClick={() => push("clienta-detalle", { clienta:c })}>
              <Avatar nombre={c.nombre} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <p style={{ margin:"0 0 2px", fontFamily:F.serif, fontSize:14, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.nombre}</p>
                  {c.estado === "pausada" && <span style={{ ...s.tag, fontSize:9, background:"rgba(224,112,112,0.12)", borderColor:G.red, color:G.red }}>pausada</span>}
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

      {sheet && (
        <Sheet titulo="Nueva Clienta" onClose={() => setSheet(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Field label="nombre y apellido *"><input style={s.input} value={form.nombre} onChange={e => set("nombre", e.target.value)} placeholder="Nombre Apellido" /></Field>
            <Field label="email * (será su usuario)" hint="Lo usará para iniciar sesión en la app"><input style={s.input} type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="email@ejemplo.com" /></Field>
            <Field label="teléfono"><input style={s.input} type="tel" value={form.telefono} onChange={e => set("telefono", e.target.value)} placeholder="11 XXXX-XXXX" /></Field>
            <div style={s.div} />
            {opcCurvas.length > 0 && <Field label="curva habitual"><Chips options={opcCurvas} value={form.curva} onChange={v => set("curva", v)} /></Field>}
            {opcGrosor.length > 0 && <Field label="grosor"><Chips options={opcGrosor} value={form.grosor} onChange={v => set("grosor", v)} /></Field>}
            {opcLargo.length  > 0 && <Field label="largo"><Chips  options={opcLargo}  value={form.largo}  onChange={v => set("largo",  v)} /></Field>}
            {(opcCurvas.length === 0 && opcGrosor.length === 0 && opcLargo.length === 0) && <p style={{ color:G.muted, fontSize:12 }}>Agregá opciones técnicas desde Config → Técnico</p>}
            <div style={s.div} />
            <Field label="alergias / condiciones"><input style={s.input} value={form.alergias} onChange={e => set("alergias", e.target.value)} placeholder="Ninguna, o especificar..." /></Field>
            <Field label="observaciones"><textarea style={{ ...s.input, height:60, resize:"none" }} value={form.observaciones} onChange={e => set("observaciones", e.target.value)} placeholder="preferencias, notas..." /></Field>
            <button style={{ ...s.btnG, opacity:saving ? 0.6 : 1 }} onClick={guardar} disabled={saving}>{saving ? "creando cuenta..." : "crear clienta →"}</button>
            <p style={{ fontFamily:F.sans, fontSize:11, color:G.muted, textAlign:"center" }}>Se genera una contraseña automática para enviarle por WhatsApp</p>
          </div>
        </Sheet>
      )}

      {creds && (
        <Sheet titulo="✓ Clienta creada" onClose={() => setCreds(null)}>
          <div style={{ ...s.card, background:"rgba(143,189,90,0.06)", borderColor:G.greenD, marginBottom:14 }}>
            <p style={{ fontFamily:F.sans, fontSize:12, color:G.muted, margin:"0 0 8px" }}>accesos para {creds.nombre}:</p>
            <p style={{ fontFamily:F.sans, fontSize:13, color:G.sub, margin:"0 0 4px" }}><b style={{ color:G.white }}>{creds.email}</b></p>
            <p style={{ fontFamily:F.sans, fontSize:13, color:G.sub, margin:0 }}>Contraseña: <b style={{ color:G.white, letterSpacing:"0.1em" }}>{creds.pass}</b></p>
          </div>
          <button style={s.btnG} onClick={() => { const tpl = data.getConfig("mensajes", DEFAULT_MENSAJES); const estudio = data.getConfig("estudio", {}); openWAClienta({ telefono:creds.telefono }, fillMsg(tpl.bienvenida || DEFAULT_MENSAJES.bienvenida, { nombre:creds.nombre?.split(" ")[0], estudio:estudio.nombre || "Lash Studio", email:creds.email, pass:creds.pass, url:DEPLOY_URL })); setCreds(null); }}>Enviar por WhatsApp →</button>
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
  const [form, setForm]   = useState({ nombre:cInit.nombre||"", telefono:cInit.telefono||"", curva:cInit.curva||"", grosor:cInit.grosor||"", largo:cInit.largo||"", alergias:cInit.alergias||"", observaciones:cInit.observaciones||"", estado:cInit.estado||"activa" });
  const [editing, setEditing] = useState(false);
  const [pwModal, setPwModal] = useState(false);
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
  const enviarReset = async () => {
    if (!c.email) { toast("la clienta no tiene email"); return; }
    await data.resetPasswordClientas(c.email);
    toast("✓ email de recuperación enviado"); setPwModal(false);
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
          {["info", "ficha", "historial", "citas", "métricas"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ ...s.btnGl, flex:1, fontSize:9, padding:"7px 2px", background:tab === t ? G.greenM : G.glass, borderColor:tab === t ? G.green : G.border, color:tab === t ? G.greenL : G.sub }}>{t}</button>
          ))}
        </div>

        {tab === "info" && (
          <div>
            <div style={{ display:"flex", gap:9, marginBottom:14 }}>
              <button style={{ ...s.btnG, flex:1 }} onClick={() => openWA(`Hola ${c.nombre?.split(" ")[0]}! 🌿`)}>WhatsApp</button>
              <button style={{ ...s.btnGl, flex:1 }} onClick={() => setEditing(e => !e)}>{editing ? "cancelar" : "Editar"}</button>
            </div>
            <div style={{ ...s.card, display:"flex", flexDirection:"column", gap:12 }}>
              {editing ? (
                <>
                  <Field label="nombre"><input style={s.input} value={form.nombre} onChange={e => set("nombre", e.target.value)} /></Field>
                  <Field label="teléfono"><input style={s.input} value={form.telefono} onChange={e => set("telefono", e.target.value)} /></Field>
                  <Field label="estado">
                    <div style={{ display:"flex", gap:8 }}>
                      {["activa", "pausada"].map(v => <button key={v} onClick={() => set("estado", v)} style={{ ...s.btnGl, flex:1, background:form.estado === v ? G.greenM : G.glass, borderColor:form.estado === v ? G.green : G.border, color:form.estado === v ? G.greenL : G.sub }}>{v}</button>)}
                    </div>
                  </Field>
                  <button style={s.btnG} onClick={guardar}>guardar →</button>
                </>
              ) : (
                [["teléfono", c.telefono || "—"], ["email", c.email || "—"], ["estado", c.estado || "activa"], ["clienta desde", fmtFecha(c.creadaEn)]].map(([k, v]) => (
                  <div key={k} style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ ...s.label, margin:0 }}>{k}</span>
                    <span style={{ fontFamily:F.sans, fontSize:13, color:G.sub }}>{v}</span>
                  </div>
                ))
              )}
            </div>
            <button style={{ ...s.btnGl, width:"100%", marginTop:8 }} onClick={() => setPwModal(true)}>Resetear contraseña</button>
          </div>
        )}

        {tab === "ficha" && (
          <div>
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
          </div>
        )}

        {tab === "historial" && (
          <div>
            {hist.length === 0 && <p style={{ color:G.muted, fontSize:13 }}>Sin historial aún</p>}
            {[...hist].reverse().map((h, i) => (
              <div key={i} style={s.card}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <div><p style={{ margin:"0 0 2px", fontFamily:F.serif, fontSize:14 }}>{h.servicio}</p><p style={{ margin:0, ...s.sub, fontSize:11 }}>{fmtFecha(h.fecha)}{h.curva ? ` · curva ${h.curva}` : ""}</p></div>
                  <div style={{ textAlign:"right" }}><p style={{ margin:"0 0 2px", fontFamily:F.serif, fontWeight:700, color:G.green, fontSize:14 }}>{fmtPesos(h.monto)}</p><span style={s.tag}>{h.pago}</span></div>
                </div>
                {h.notas && <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>{h.notas}</p>}
              </div>
            ))}
          </div>
        )}

        {tab === "citas" && (
          <div>
            <button style={{ ...s.btnG, marginBottom:14 }} onClick={() => push("nueva-cita", { clientaIdDefault:c._id })}>+ nueva cita para {c.nombre?.split(" ")[0]}</button>
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
      {pwModal && <Modal titulo="Resetear contraseña" msg={`Se enviará un email a ${c.email} para que ${c.nombre?.split(" ")[0]} pueda crear una nueva contraseña.`} onOk={enviarReset} onCancel={() => setPwModal(false)} okLabel="enviar email" />}
    </div>
  );
}

// ── Admin Finanzas ─────────────────────────────────────────────────────────────
function AdminFinanzas({ data }) {
  const [tab, setTab]         = useState("resumen");
  const [periodo, setPeriodo] = useState("mes");
  const hoy  = hoyISO();
  const mes  = mesISO();
  const anio = hoy.slice(0, 4);

  const todoHist = data.clientas.flatMap(c => Array.isArray(c.historial) ? c.historial : (c.historial ? Object.values(c.historial) : []));

  return (
    <div>
      <div style={s.topBar}><h1 style={s.h1}>Finanzas</h1><p style={s.sub}>resumen de ingresos</p></div>
      <div style={{ padding:"18px" }}>
        <div style={{ display:"flex", gap:7, marginBottom:18 }}>
          {[["resumen","resumen"],["calendario","calendario"]].map(([v, l]) => (
            <button key={v} onClick={() => setTab(v)} style={{ ...s.btnGl, flex:1, fontSize:12, background:tab === v ? G.greenM : G.glass, borderColor:tab === v ? G.green : G.border, color:tab === v ? G.greenL : G.sub }}>{l}</button>
          ))}
        </div>

        {tab === "resumen" && <FinanzasResumen data={data} todoHist={todoHist} periodo={periodo} setPeriodo={setPeriodo} hoy={hoy} mes={mes} anio={anio} />}
        {tab === "calendario" && <FinanzasCalendario data={data} todoHist={todoHist} />}
      </div>
    </div>
  );
}

function FinanzasResumen({ data, todoHist, periodo, setPeriodo, hoy, mes, anio }) {
  const filtrar = (h) => { if (periodo === "hoy") return h.fecha === hoy; if (periodo === "mes") return h.fecha?.startsWith(mes); if (periodo === "año") return h.fecha?.startsWith(anio); return true; };
  const ings   = todoHist.filter(filtrar);
  const total  = ings.reduce((a, h) => a + (h.monto || 0), 0);
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
          <button key={v} onClick={() => setPeriodo(v)} style={{ ...s.btnGl, flex:1, fontSize:10, background:periodo === v ? G.greenM : G.glass, borderColor:periodo === v ? G.green : G.border, color:periodo === v ? G.greenL : G.sub, padding:"7px 2px" }}>{l}</button>
        ))}
      </div>
      <div style={{ ...s.card, textAlign:"center", padding:"22px 16px", marginBottom:12 }}>
        <p style={{ fontFamily:F.sans, fontSize:10, color:G.muted, margin:"0 0 6px", textTransform:"lowercase", letterSpacing:"0.08em" }}>ingresos · {periodo === "mes" ? new Date().toLocaleDateString("es-AR", { month:"long", year:"numeric" }) : periodo === "año" ? anio : periodo === "hoy" ? "hoy" : "histórico"}</p>
        <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:36, color:G.green, margin:"0 0 4px" }}>{fmtPesos(total)}</p>
        <p style={{ fontFamily:F.sans, fontSize:12, color:G.sub, margin:0 }}>{ings.length} servicio{ings.length !== 1 ? "s" : ""}</p>
      </div>
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
      <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.white, margin:"0 0 3px" }}>por servicio</p>
      <p style={{ ...s.sub, marginBottom:12 }}>ingresos del período</p>
      {Object.entries(porSv).length === 0 && <p style={{ color:G.muted, fontSize:13 }}>Sin registros</p>}
      {Object.entries(porSv).sort((a, b) => b[1] - a[1]).map(([nom, tot]) => (
        <div key={nom} style={{ ...s.card, padding:"11px 13px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}><p style={{ margin:0, fontFamily:F.sans, fontSize:13 }}>{nom}</p><p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:13, color:G.green }}>{fmtPesos(tot)}</p></div>
          <div style={{ height:3, background:G.border, borderRadius:2 }}><div style={{ height:"100%", width:`${(tot / maxSv) * 100}%`, background:G.green, borderRadius:2 }} /></div>
        </div>
      ))}
      <div style={s.div} />
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
  );
}

function FinanzasCalendario({ data, todoHist }) {
  const ahora = new Date();
  const [offset, setOffset] = useState(0);
  const [diaS,   setDiaS]   = useState(hoyISO());

  const mesD    = new Date(ahora.getFullYear(), ahora.getMonth() + offset, 1);
  const anio    = mesD.getFullYear();
  const mes     = mesD.getMonth();
  const primDia = new Date(anio, mes, 1).getDay();
  const diasMes = new Date(anio, mes + 1, 0).getDate();
  const fmtKey  = (d) => `${anio}-${String(mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const hoy     = hoyISO();

  // Ingresos agrupados por fecha
  const ingresosPorFecha = {};
  todoHist.forEach(h => {
    if (!h.fecha) return;
    if (!ingresosPorFecha[h.fecha]) ingresosPorFecha[h.fecha] = [];
    ingresosPorFecha[h.fecha].push(h);
  });

  const totalDia    = (fecha) => (ingresosPorFecha[fecha] || []).reduce((a, h) => a + (h.monto || 0), 0);
  const maxDelMes   = Math.max(...Array(diasMes).fill(null).map((_, i) => totalDia(fmtKey(i + 1))), 1);
  const totalMes    = Array(diasMes).fill(null).reduce((a, _, i) => a + totalDia(fmtKey(i + 1)), 0);

  // Detalle del día seleccionado
  const registrosDia = ingresosPorFecha[diaS] || [];
  const totalDiaS    = registrosDia.reduce((a, h) => a + (h.monto || 0), 0);

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

      {registrosDia.length === 0 ? (
        <p style={{ color:G.muted, fontSize:13 }}>sin ingresos registrados para este día ✦</p>
      ) : (
        registrosDia.map((h, i) => {
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
                  {/* Mostrar desglose si fue pago mixto */}
                  {h.pago === "mixto" ? (
                    <div style={{ display:"flex", flexDirection:"column", gap:2, alignItems:"flex-end" }}>
                      <span style={{ ...s.tag, fontSize:9, marginRight:0, background:"rgba(143,189,90,0.1)" }}>{fmtPesos(h.montoEfectivo)}</span>
                      <span style={{ ...s.tag, fontSize:9, marginRight:0 }}>{fmtPesos(h.montoTransf)}</span>
                    </div>
                  ) : (
                    <span style={s.tag}>{h.pago === "transferencia" ? "🏦" : "💵"} {h.pago}</span>
                  )}
                </div>
              </div>
              {h.notas && <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>{h.notas}</p>}
            </div>
          );
        })
      )}
    </div>
  );
}

// ── Admin Config ───────────────────────────────────────────────────────────────
function AdminConfig({ data, toast, onLogout }) {
  const [tab, setTab] = useState("servicios");
  return (
    <div>
      <div style={s.topBar}><h1 style={s.h1}>Configuración</h1><p style={s.sub}>Parámetros del estudio</p></div>
      <div style={{ padding:"18px" }}>
        <div style={{ display:"flex", gap:7, marginBottom:18, flexWrap:"wrap" }}>
          {["servicios","mensajes","técnico","horarios","estudio","notificaciones"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ ...s.btnGl, fontSize:11, background:tab === t ? G.greenM : G.glass, borderColor:tab === t ? G.green : G.border, color:tab === t ? G.greenL : G.sub, padding:"7px 14px", textTransform:"capitalize" }}>{t}</button>
          ))}
        </div>
        {tab === "servicios"      && <ConfigServicios      data={data} toast={toast} />}
        {tab === "mensajes"       && <ConfigMensajes       data={data} toast={toast} />}
        {tab === "técnico"        && <ConfigTecnico        data={data} toast={toast} />}
        {tab === "horarios"       && <ConfigHorarios       data={data} toast={toast} />}
        {tab === "estudio"        && <ConfigEstudio        data={data} toast={toast} onLogout={onLogout} />}
        {tab === "notificaciones" && <ConfigNotificaciones data={data} toast={toast} />}
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
    service14d:  "Recordatorio de service (14 días sin cita)",
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

// ── Config Servicios ───────────────────────────────────────────────────────────
function ConfigServicios({ data, toast }) {
  const [sheet, setSheet]     = useState(false);
  const [editSv, setEditSv]   = useState(null);
  const [form, setForm]       = useState({ nombre:"", precio:"", duracion:"", descripcion:"", fotos:[] });
  const [saving, setSaving]   = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [fotoUrl, setFotoUrl] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));

  const abrirNuevo  = () => { setEditSv(null); setForm({ nombre:"", precio:"", duracion:"", descripcion:"", fotos:[] }); setFotoUrl(""); setSheet(true); };
  const abrirEditar = (sv) => { setEditSv(sv); setForm({ nombre:sv.nombre, precio:String(sv.precio||""), duracion:String(sv.duracion||""), descripcion:sv.descripcion||"", fotos:sv.fotos||[] }); setFotoUrl(""); setSheet(true); };

  const addFoto    = () => { if (!fotoUrl.trim()) return; set("fotos", [...(form.fotos||[]), fotoUrl.trim()]); setFotoUrl(""); };
  const removeFoto = (i) => set("fotos", form.fotos.filter((_, j) => j !== i));

  const guardar = async () => {
    if (!form.nombre || !form.precio) { toast("nombre y precio son obligatorios"); return; }
    setSaving(true);
    const payload = { nombre:form.nombre, precio:Number(form.precio), duracion:Number(form.duracion)||60, descripcion:form.descripcion, fotos:form.fotos||[] };
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
            <div style={{ display:"flex", gap:10 }}>
              <Field label="precio *"><input style={{ ...s.input }} type="number" value={form.precio} onChange={e => set("precio", e.target.value)} placeholder="0" /></Field>
              <Field label="duración (min)"><input style={{ ...s.input }} type="number" value={form.duracion} onChange={e => set("duracion", e.target.value)} placeholder="60" /></Field>
            </div>
            <div style={s.div} />
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:14, color:G.white, margin:"0 0 4px" }}>Fotos del servicio</p>
            <p style={{ fontFamily:F.sans, fontSize:11, color:G.muted, margin:"0 0 10px" }}>Pegá URLs de fotos para que las clientas vean el resultado al agendar</p>
            {(form.fotos || []).map((url, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:9, marginBottom:7 }}>
                <img src={url} alt="" style={{ width:50, height:50, borderRadius:8, objectFit:"cover" }} onError={e => { e.target.src = ""; }} />
                <p style={{ flex:1, margin:0, fontFamily:F.sans, fontSize:11, color:G.sub, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{url}</p>
                <button style={{ ...s.btnRed, padding:"4px 8px", fontSize:11 }} onClick={() => removeFoto(i)}>✕</button>
              </div>
            ))}
            <div style={{ display:"flex", gap:8 }}>
              <input style={{ ...s.input, flex:1 }} value={fotoUrl} onChange={e => setFotoUrl(e.target.value)} placeholder="https://...foto.jpg" onKeyDown={e => e.key === "Enter" && addFoto()} />
              <button style={s.btnGl} onClick={addFoto}>+ agregar</button>
            </div>
            <p style={{ fontFamily:F.sans, fontSize:10, color:G.muted }}>Podés usar fotos de Google Drive, Instagram o cualquier imagen pública</p>
            <div style={s.div} />
            <button style={{ ...s.btnG, opacity:saving ? 0.6 : 1 }} onClick={guardar} disabled={saving}>{saving ? "guardando..." : editSv ? "guardar cambios →" : "crear servicio →"}</button>
          </div>
        </Sheet>
      )}
      {confirm && <Modal titulo="Eliminar servicio" msg={`¿Eliminar "${confirm.nombre}"?`} onOk={async () => { await data.borrarServicio(confirm._id); setConfirm(null); toast("servicio eliminado"); }} onCancel={() => setConfirm(null)} okLabel="eliminar" danger />}
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
          <button key={v} onClick={() => setTab(v)} style={{ ...s.btnGl, flex:1, fontSize:10, background:tab === v ? G.greenM : G.glass, borderColor:tab === v ? G.green : G.border, color:tab === v ? G.greenL : G.sub, padding:"7px 4px" }}>{l}</button>
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
  const [form, setForm] = useState({ nombre:est.nombre||"", direccion:est.direccion||"", telefono:est.telefono||"", instagram:est.instagram||"", descripcion:est.descripcion||"" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));

  const pols = data.getConfig("politicas", []);
  const [polsLocal, setPolsLocal] = useState(pols);
  const [newPol, setNewPol] = useState("");
  const [editIdx, setEditIdx] = useState(null);
  const [editTxt, setEditTxt] = useState("");

  useEffect(() => {
    const e = data.getConfig("estudio", {});
    setForm({ nombre:e.nombre||"", direccion:e.direccion||"", telefono:e.telefono||"", instagram:e.instagram||"", descripcion:e.descripcion||"" });
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
        <Field label="descripción (opcional)" hint="Se muestra a las clientas en la app">
          <textarea style={{ ...s.input, height:70, resize:"none" }} value={form.descripcion} onChange={e => set("descripcion", e.target.value)} placeholder="Breve descripción del estudio..." />
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

      {/* Cron schedule info */}
      <div style={{ ...s.card, marginBottom:14 }}>
        <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:14, color:G.text, margin:"0 0 10px" }}>Recordatorios automáticos</p>
        {[
          ["Horario de envío", "9:00 am (Buenos Aires)"],
          ["Frecuencia",       "Cada día"],
          ["Qué recibís",      "Resumen de citas del día siguiente"],
          ["Clientas",         "Reciben su recordatorio 24h antes"],
        ].map(([l, v]) => (
          <div key={l} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
            <span style={{ fontFamily:F.sans, fontSize:12, color:G.sub }}>{l}</span>
            <span style={s.tag}>{v}</span>
          </div>
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

// ═══════════════════════════════════════════════════════════════════════════════
// PANEL CLIENTA
// ═══════════════════════════════════════════════════════════════════════════════
function ClientaApp({ clienta, data, onLogout }) {
  const [tab, setTab] = useState("inicio");
  const wide = useIsWide();
  const tabs = [
    { id:"inicio",    iconName:"home",        label:"Inicio"    },
    { id:"agendar",   iconName:"calendarPlus", label:"Agendar"   },
    { id:"historial", iconName:"history",      label:"Historial" },
    { id:"perfil",    iconName:"user",         label:"Perfil"    },
  ];
  const render = () => {
    switch (tab) {
      case "inicio":    return <CInicio    clienta={clienta} data={data} setTab={setTab} />;
      case "agendar":   return <CAgendar   clienta={clienta} data={data} />;
      case "historial": return <CHistorial clienta={clienta} />;
      case "perfil":    return <CPerfil    clienta={clienta} data={data} onLogout={onLogout} />;
      default:          return <CInicio    clienta={clienta} data={data} setTab={setTab} />;
    }
  };

  if (wide) {
    return (
      <div style={{ minHeight:"100vh", background:G.bg, color:G.text, fontFamily:F.sans, display:"flex", flexDirection:"row", overflowX:"hidden" }}>
        <GlobalStyles />
        <AppBg />
        <nav style={{ width:190, flexShrink:0, background:G.navBg, backdropFilter:"blur(32px)", borderRight:`0.5px solid ${G.border}`, display:"flex", flexDirection:"column", padding:"24px 10px 20px", gap:3, position:"sticky", top:0, height:"100vh", zIndex:20 }}>
          <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.green, padding:"0 4px 18px", margin:0, letterSpacing:"-0.3px" }}>{clienta.nombre?.split(" ")[0] || "Lash Studio"}</p>
          {tabs.map(t => (
            <div key={t.id} style={sideNavItmSty(tab === t.id)} onClick={() => setTab(t.id)}>
              <Icon name={t.iconName} size={17} color={tab===t.id ? G.green : G.muted} strokeWidth={tab===t.id ? 1.8 : 1.5} />
              <span>{t.label}</span>
            </div>
          ))}
          <div style={{ flex:1 }} />
          <button style={{ ...s.btnGl, margin:"0 4px", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }} onClick={() => openWA("Hola! Tengo una consulta")}>
            <Icon name="messageCircle" size={15} color={G.sub} />
            Consultar
          </button>
        </nav>
        <div style={{ flex:1, overflowY:"auto", position:"relative", minWidth:0, paddingBottom:24 }}>
          {render()}
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
            <span style={{ fontFamily:F.sans, fontSize:9, letterSpacing:"0.06em", fontWeight:tab === t.id ? 600 : 400 }}>{t.label}</span>
          </div>
        ))}
      </nav>
      <button style={s.fab} onClick={() => openWA("Hola! Tengo una consulta")} title="Consultar a Male">
        <Icon name="messageCircle" size={22} color="#0a0a0a" strokeWidth={1.8} />
      </button>
    </div>
  );
}

function CInicio({ clienta, data, setTab }) {
  const hoy   = hoyISO();
  const hist  = clienta.historial || [];
  const ultima = [...hist].sort((a, b) => b.fecha?.localeCompare(a.fecha))[0];
  const diasDesde = ultima?.fecha ? Math.floor((new Date() - new Date(ultima.fecha)) / (1000 * 60 * 60 * 24)) : null;
  const proxCita  = data.citas.filter(c => c.clientaId === clienta._id && c.fecha >= hoy && c.estado !== "completada" && c.estado !== "solicitada").sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
  const citasSolicitadas = data.citas.filter(c => c.clientaId === clienta._id && c.estado === "solicitada");
  const diasHasta = proxCita ? Math.floor((new Date(proxCita.fecha) - new Date()) / (1000 * 60 * 60 * 24)) : null;
  const estudio   = data.getConfig("estudio", {});
  const curvaFav  = (() => { const cnt = {}; hist.forEach(h => { if(h.curva) cnt[h.curva]=(cnt[h.curva]||0)+1; }); return Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0]?.[0] || clienta.curva || "—"; })();

  // Días hasta cumplir 14 días del service (para el countdown motivacional)
  const diasParaService = diasDesde !== null ? Math.max(0, 14 - diasDesde) : null;
  const necesitaService = diasDesde !== null && diasDesde >= 14 && !proxCita;

  const instagramUrl = estudio.instagram
    ? `https://www.instagram.com/${estudio.instagram.replace("@", "")}`
    : "https://www.instagram.com/bychulas.studio";

  const ubicacionUrl = estudio.direccion
    ? `https://maps.google.com/?q=${encodeURIComponent(estudio.direccion)}`
    : null;

  return (
    <div>
      <div style={s.topBar}>
        <h1 style={s.h1}>{estudio.nombre || "Lash Studio"}</h1>
        <p style={s.sub}>Hola, {clienta.nombre?.split(" ")[0]}</p>
      </div>
      <div style={{ padding:"18px" }}>
        <PushBanner role="clienta" uid={clienta.uid} />

        {/* ── Banner service vencido ── */}
        {necesitaService && (
          <div style={{ background:"linear-gradient(135deg,rgba(143,189,90,0.18),rgba(143,189,90,0.05))", border:`1.5px solid ${G.green}`, borderRadius:16, padding:"16px", marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
              <div>
                <p style={{ margin:"0 0 3px", fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.greenL }}>¡es hora del service! ✦</p>
                <p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:G.sub }}>hace {diasDesde} días de tu último tratamiento</p>
              </div>
              <div style={{ textAlign:"center", background:"rgba(143,189,90,0.2)", borderRadius:12, padding:"8px 12px", flexShrink:0 }}>
                <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:22, color:G.greenL }}>{diasDesde}</p>
                <p style={{ margin:0, fontFamily:F.sans, fontSize:9, color:G.muted }}>días</p>
              </div>
            </div>
            <button style={{ ...s.btnG, padding:"10px 14px" }} onClick={() => setTab("agendar")}>agendar ahora →</button>
          </div>
        )}

        {/* ── Cita solicitada pendiente ── */}
        {citasSolicitadas.length > 0 && !proxCita && (
          <div style={{ ...s.card, borderColor:G.amber, background:"rgba(224,184,112,0.06)", marginBottom:12 }}>
            <p style={{ margin:"0 0 4px", fontFamily:F.sans, fontSize:10, color:G.amber, textTransform:"lowercase", letterSpacing:"0.08em" }}>solicitud pendiente</p>
            <p style={{ margin:"0 0 2px", fontFamily:F.serif, fontWeight:700, fontSize:15 }}>{citasSolicitadas[0].servicio}</p>
            <p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:G.sub }}>{fmtFecha(citasSolicitadas[0].fecha)} · {citasSolicitadas[0].hora} · esperando confirmación</p>
          </div>
        )}

        {/* ── Próxima cita con countdown ── */}
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
                {diasHasta !== 0 && <p style={{ margin:0, fontFamily:F.sans, fontSize:9, color:"rgba(181,217,138,0.6)", marginTop:3 }}>días</p>}
              </div>
            </div>
            <button
              onClick={() => generarICS(proxCita, estudio)}
              style={{ ...s.btnGl, width:"100%", fontSize:12, borderColor:"rgba(143,189,90,0.35)", color:G.greenL, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              <Icon name="download" size={13} color={G.greenL} />
              Agregar al calendario
            </button>
          </div>
        )}

        {/* ── Countdown al service (cuando no vence aún) ── */}
        {diasParaService !== null && diasParaService > 0 && !proxCita && (
          <div style={{ ...s.card, marginBottom:12 }}>
            <p style={{ fontFamily:F.sans, fontSize:10, color:G.muted, margin:"0 0 8px", textTransform:"lowercase" }}>próximo service recomendado</p>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ flex:1 }}>
                {/* Barra de progreso */}
                <div style={{ height:6, background:G.border, borderRadius:3, marginBottom:6, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${((14 - diasParaService) / 14) * 100}%`, background:`linear-gradient(90deg, ${G.greenD}, ${G.green})`, borderRadius:3, transition:"width 0.5s ease" }} />
                </div>
                <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.sub }}>
                  {diasParaService === 1 ? "¡mañana es el momento ideal!" : `en ${diasParaService} días estarás lista para el service`}
                </p>
              </div>
              <div style={{ textAlign:"center", flexShrink:0 }}>
                <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:22, color:G.green }}>{diasParaService}</p>
                <p style={{ margin:0, fontFamily:F.sans, fontSize:9, color:G.muted }}>días</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Widgets principales ── */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:9, marginBottom:16 }}>
          <div onClick={() => setTab("historial")} style={{ ...s.card, textAlign:"center", cursor:"pointer", margin:0, padding:"16px 6px" }}>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:5 }}><Icon name="star" size={16} color={G.muted} strokeWidth={1.5} /></div>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:22, color:G.white, margin:"0 0 2px", lineHeight:1 }}>{hist.length}</p>
            <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:0 }}>visitas</p>
          </div>
          <div onClick={() => setTab("perfil")} style={{ ...s.card, textAlign:"center", cursor:"pointer", margin:0, padding:"16px 6px" }}>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:5 }}><Icon name="scissors" size={16} color={G.muted} strokeWidth={1.5} /></div>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:18, color:G.white, margin:"0 0 2px", lineHeight:1 }}>{curvaFav}</p>
            <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:0 }}>mi curva</p>
          </div>
          <div onClick={() => setTab("agendar")} style={{ ...s.card, textAlign:"center", cursor:"pointer", margin:0, padding:"16px 6px", background:"rgba(143,189,90,0.16)", borderColor:G.green }}>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:5 }}><Icon name="calendarPlus" size={16} color={G.greenL} strokeWidth={1.5} /></div>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:22, color:G.greenL, margin:"0 0 2px", lineHeight:1 }}>+</p>
            <p style={{ fontFamily:F.sans, fontSize:9, color:G.greenL, margin:0 }}>agendar</p>
          </div>
        </div>

        {/* ── Widgets de contacto ── */}
        <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.white, margin:"0 0 10px" }}>el estudio</p>
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
          {ubicacionUrl && (
            <div onClick={() => window.open(ubicacionUrl, "_blank")} style={{ ...s.card, cursor:"pointer", margin:0, padding:"18px 12px", textAlign:"center", background:"rgba(66,133,244,0.07)", borderColor:"rgba(66,133,244,0.18)", display:"flex", flexDirection:"column", alignItems:"center", gap:7 }}>
              <div style={{ width:38, height:38, borderRadius:11, background:"rgba(66,133,244,0.14)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Icon name="mapPin" size={19} color="rgba(100,160,255,0.9)" strokeWidth={1.6} />
              </div>
              <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:13, color:G.white }}>Cómo llegar</p>
              <p style={{ margin:0, fontFamily:F.sans, fontSize:10, color:G.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"100%" }}>{estudio.direccion}</p>
            </div>
          )}
          <div onClick={() => setTab("historial")} style={{ ...s.card, cursor:"pointer", margin:0, padding:"18px 12px", textAlign:"center", background:"rgba(143,189,90,0.07)", borderColor:G.greenD, display:"flex", flexDirection:"column", alignItems:"center", gap:7 }}>
            <div style={{ width:38, height:38, borderRadius:11, background:"rgba(143,189,90,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Icon name="history" size={19} color={G.greenL} strokeWidth={1.6} />
            </div>
            <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:13, color:G.white }}>Mi historial</p>
            <p style={{ margin:0, fontFamily:F.sans, fontSize:10, color:G.muted }}>{hist.length > 0 ? `${hist.length} visitas` : "ver mis visitas"}</p>
          </div>
        </div>

        {/* ── Último servicio ── */}
        {ultima && (
          <>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.white, margin:"0 0 3px" }}>último servicio</p>
            <p style={{ ...s.sub, marginBottom:10 }}>{fmtFecha(ultima.fecha)}</p>
            <div style={{ ...s.card, cursor:"pointer" }} onClick={() => setTab("historial")}>
              <p style={{ margin:"0 0 5px", fontFamily:F.serif, fontWeight:700, fontSize:15 }}>{ultima.servicio}</p>
              {ultima.curva && <span style={s.tag}>curva {ultima.curva}</span>}
              <p style={{ margin:"9px 0 0", fontFamily:F.sans, fontSize:11, color:G.muted }}>ver historial completo →</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CAgendar({ clienta, data }) {
  const [paso, setPaso]       = useState(1);
  const [modo, setModo]       = useState("individual");
  const [form, setForm]       = useState({ servicio:null, fecha:"", hora:"", notas:"" });
  const [fotoIdx, setFotoIdx] = useState(0);
  const [enviado, setEnviado] = useState(false);
  const [saving, setSaving]   = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));

  const slots         = data.getConfig("slots", []);
  const diasLaborales = data.getConfig("diasLaborales", [1,2,3,4,5,6]);
  const ocupadas      = data.citas.filter(c => c.fecha === form.fecha && c.estado !== "completada").map(c => c.hora);
  const fechasBloq    = new Set(data.excepciones.map(e => e.fecha));

  const fechaNoDisponible = (fecha) => !fecha ? false : fechasBloq.has(fecha) || !esDiaLaboral(fecha, diasLaborales);

  const confirmar = async () => {
    setSaving(true);
    // Crear la cita pendiente en Firebase (estado "solicitada" — Male confirma)
    try {
      await data.crearCita({
        clientaId:     clienta._id,
        clientaNombre: clienta.nombre,
        clientaUid:    clienta.uid || "",
        servicio:      form.servicio?.nombre || "A confirmar",
        fecha:         form.fecha,
        hora:          form.hora,
        notas:         form.notas,
        estado:        "solicitada",
      });
      // Push to admin so Male sees it even without WA
      sendPush(["admin"],
        `Nueva solicitud de turno 🗓`,
        `${clienta.nombre?.split(" ")[0]} quiere: ${form.servicio?.nombre || "A confirmar"} el ${form.fecha} a las ${form.hora}`);
    } catch (e) { console.warn("Firebase write:", e); }
    // Abrir WA para avisar a Male
    const sv  = form.servicio?.nombre || "A confirmar con Male";
    const msg = modo === "noSe"
      ? `Hola! 🌿 Quiero agendar un turno:\n📅 ${form.fecha} a las ${form.hora}\n💭 No sé bien qué hacerme${form.notas ? `\n${form.notas}` : ""}\n💚 ${clienta.nombre}`
      : `Hola! 🌿 Quiero agendar:\n${sv}\n📅 ${form.fecha} a las ${form.hora}${form.notas ? `\nNotas: ${form.notas}` : ""}\n💚 ${clienta.nombre}`;
    openWA(msg);
    setSaving(false);
    setEnviado(true);
  };

  if (enviado) return (
    <div style={{ minHeight:"100vh", background:G.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:28, textAlign:"center" }}>
      <div style={{ fontSize:44, marginBottom:12 }}>🌿</div>
      <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:22, color:G.greenL, margin:"0 0 8px" }}>¡solicitud enviada!</p>
      <p style={{ fontFamily:F.sans, fontSize:13, color:G.sub, margin:"0 0 24px", lineHeight:1.7 }}>Male va a confirmar tu turno por WhatsApp. ¡Nos vemos pronto!</p>
      <button style={s.btnG} onClick={() => { setEnviado(false); setPaso(1); setForm({ servicio:null, fecha:"", hora:"", notas:"" }); }}>volver →</button>
    </div>
  );

  return (
    <div>
      <div style={s.topBar}><h1 style={s.h1}>Agendar</h1><p style={s.sub}>paso {paso} de 3</p></div>
      <div style={{ padding:"18px" }}>
        <div style={{ display:"flex", gap:5, marginBottom:20 }}>
          {[1,2,3].map(p => <div key={p} style={{ flex:1, height:3, borderRadius:2, background:p <= paso ? G.green : G.border, transition:"background 0.3s" }} />)}
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
                      <div style={{ marginBottom:10, position:"relative" }}>
                        <img src={sv.fotos[fotoIdx % sv.fotos.length]} alt={sv.nombre} style={{ width:"100%", height:140, objectFit:"cover", borderRadius:10 }} onError={e => { e.target.style.display = "none"; }} />
                        {sv.fotos.length > 1 && (
                          <div style={{ position:"absolute", bottom:6, left:0, right:0, display:"flex", justifyContent:"center", gap:4 }}>
                            {sv.fotos.map((_, i) => <div key={i} style={{ width:5, height:5, borderRadius:"50%", background:i === fotoIdx % sv.fotos.length ? G.white : "rgba(255,255,255,0.4)", cursor:"pointer" }} onClick={e => { e.stopPropagation(); setFotoIdx(i); }} />)}
                          </div>
                        )}
                      </div>
                    )}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }} onClick={() => { set("servicio", sv); setPaso(2); }}>
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
                  <button style={{ ...s.btnG, padding:"10px" }} onClick={() => setPaso(2)}>agendar igualmente →</button>
                </div>
                <div style={{ ...s.card, marginTop:8 }}>
                  <p style={{ ...s.sub, margin:"0 0 9px" }}>¿querés consultar antes?</p>
                  <button style={{ ...s.btnGl, width:"100%", borderColor:G.green, color:G.greenL }} onClick={() => openWA("Hola! No sé bien qué servicio hacerme, ¿me podés orientar? 🌿")}>Consultar por WhatsApp</button>
                </div>
              </div>
            )}
          </div>
        )}

        {paso === 2 && (
          <div>
            <button style={{ ...s.btnGl, marginBottom:14, fontSize:12 }} onClick={() => setPaso(1)}>← cambiar servicio</button>
            {form.servicio && <div style={{ ...s.card, background:"rgba(143,189,90,0.05)", borderColor:G.greenD, marginBottom:16, padding:"9px 13px" }}><p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:G.greenL }}>{form.servicio.nombre}</p></div>}
            <Field label="fecha"><input style={s.input} type="date" value={form.fecha} onChange={e => set("fecha", e.target.value)} min={hoyISO()} /></Field>
            {form.fecha && fechaNoDisponible(form.fecha) && <p style={{ color:G.red, fontSize:12, marginBottom:12 }}>⚠ Este día no está disponible. Elegí otra fecha.</p>}
            {form.fecha && !fechaNoDisponible(form.fecha) && (
              <>
                <Field label="hora disponible">
                  <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                    {slots.length === 0 && <p style={{ color:G.muted, fontSize:12 }}>sin horarios configurados</p>}
                    {slots.map(h => { const oc = ocupadas.includes(h); return <button key={h} disabled={oc} onClick={() => set("hora", h)} style={{ ...s.btnGl, padding:"9px 12px", fontSize:12, opacity:oc ? 0.3 : 1, background:form.hora === h ? G.greenM : G.glass, borderColor:form.hora === h ? G.green : G.border, color:form.hora === h ? G.greenL : G.sub, cursor:oc ? "not-allowed" : "pointer" }}>{h}{oc ? " ✕" : ""}</button>; })}
                  </div>
                </Field>
                <Field label={modo === "noSe" ? "contanos qué efecto buscás" : "notas (opcional)"}>
                  <textarea style={{ ...s.input, height:65, resize:"none" }} value={form.notas} onChange={e => set("notas", e.target.value)} placeholder={modo === "noSe" ? "largo, volumen, ocasión especial..." : "indicaciones especiales..."} />
                </Field>
                {form.hora && <button style={s.btnG} onClick={() => setPaso(3)}>confirmar horario →</button>}
              </>
            )}
          </div>
        )}

        {paso === 3 && (
          <div>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:17, color:G.white, margin:"0 0 3px" }}>confirmá tu cita</p>
            <p style={{ ...s.sub, marginBottom:14 }}>revisá los detalles antes de enviar</p>
            <div style={{ ...s.card, background:"rgba(143,189,90,0.05)", borderColor:G.greenD }}>
              {[
                ["servicio",        form.servicio?.nombre || "a confirmar con Male"],
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
            <button style={{ ...s.btnG, marginTop:14, opacity:saving?0.6:1 }} onClick={confirmar} disabled={saving}>{saving?"enviando...":"confirmar y avisar a Male →"}</button>
            <button style={{ ...s.btnGl, marginTop:9, width:"100%" }} onClick={() => setPaso(1)}>modificar</button>
          </div>
        )}
      </div>
    </div>
  );
}

function CHistorial({ clienta }) {
  const hist = clienta.historial || [];
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
  const [formP, setFormP]     = useState({ nombre:clienta.nombre||"", telefono:clienta.telefono||"", emergencia:clienta.emergencia||"" });
  const setFP = (k, v) => setFormP(f => ({ ...f, [k]:v }));
  const { dark, toggleTheme } = useTheme();
  const { status: pushStatus, subscribe: pushSubscribe } = usePushStatus("clienta", clienta.uid);

  const politicas = data.getConfig("politicas", []);
  const estudio   = data.getConfig("estudio",   {});

  const onFoto = (e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setFoto(ev.target.result); r.readAsDataURL(f); };

  const guardar = async () => {
    setSaving(true);
    await data.editarClientas(clienta._id, { nombre:formP.nombre, telefono:formP.telefono, emergencia:formP.emergencia });
    setSaving(false); setEdit(false);
  };
  return (
    <div>
      <div style={s.topBar}><h1 style={s.h1}>Mi Perfil</h1><p style={s.sub}>Tus datos</p></div>
      <div style={{ padding:"18px" }}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:22 }}>
          <div style={{ position:"relative", marginBottom:10 }}>
            {foto ? <img src={foto} alt="perfil" style={{ width:78, height:78, borderRadius:"50%", objectFit:"cover", border:`2px solid ${G.green}` }} /> : <Avatar nombre={clienta.nombre} size={78} />}
            <label htmlFor="foto-input" style={{ position:"absolute", bottom:0, right:0, width:26, height:26, borderRadius:"50%", background:editando ? G.green : G.glass, border:`1.5px solid ${editando ? G.bg : G.border}`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:13 }}></label>
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
        <button style={{ ...s.btnRed, marginTop:18, width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }} onClick={onLogout}>
          <Icon name="logOut" size={15} color={G.red} />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
