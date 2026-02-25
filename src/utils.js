export function getUnlockLabel(m) {
  if (m.unlockType === "free") return { label: "Gratuito", icon: "✨", color: "#7DE2C7" };
  if (m.unlockType === "social" && m.socialMethod === "share") return { label: "Indicação", icon: "👥", color: "#7DE2C7" };
  if (m.unlockType === "social" && m.socialMethod === "comment") return { label: "Comentário", icon: "💬", color: "#FFD863" };
  if (m.unlockType === "data") return { label: "Completar perfil", icon: "📋", color: "#7DE2C7" };
  if (m.unlockType === "survey") return { label: "Pesquisa", icon: "🔍", color: "#FFD863" };
  return { label: "—", icon: "—", color: "#999" };
}

export function timeAgo(ts) {
  const diff = Date.now() - ts;
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return "Agora";
  if (hrs < 24) return `${hrs}h atrás`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Ontem";
  if (days < 7) return `${days} dias atrás`;
  return "";
}

/** Normaliza para E.164: só dígitos. BR (10-11 dígitos) vira 55+número; internacional 10-15 dígitos. */
export function normalizeWhatsApp(value, isInternational = false) {
  const digits = (value || "").replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (isInternational || digits.length > 11) {
    const d = digits.slice(0, 15);
    return d.length >= 10 && d.length <= 15 ? d : "";
  }
  if (digits.length === 10 || digits.length === 11) return "55" + digits;
  return "";
}

export function fmtWA(v, isInternational = false) {
  const raw = (v || "").replace(/\D/g, "");
  if (isInternational) {
    const n = raw.slice(0, 15);
    if (n.length === 0) return "";
    if (n.length <= 3) return "+" + n;
    return "+" + n.match(/.{1,3}/g).join(" ").trim();
  }
  const n = raw.slice(0, 11);
  if (n.length <= 2) return n;
  if (n.length <= 7) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}

export function formatCountdown(target, now) {
  const diff = Math.max(0, target - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const min = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (d > 0) return `${d}d ${h}h ${min}m`;
  if (h > 0) return `${h}h ${min}m ${s}s`;
  return `${min}m ${s}s`;
}

export function isUrgent(target, now) {
  return target && (target - now) < 86400000 && (target - now) > 0;
}

export function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export function getDateStr(date) {
  return `${String(date.getDate()).padStart(2,"0")} ${["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][date.getMonth()]}`;
}

export function getCSS(T) {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: ${T.bg}; }
    input::placeholder, textarea::placeholder { color: ${T.placeholder}; }
    input:focus, textarea:focus { outline: none; border-color: #349980 !important; box-shadow: 0 0 0 3px ${T.focusRing}; }
    button { cursor: pointer; border: none; font-family: 'Outfit', sans-serif; }
    button:focus-visible { outline: 2px solid #349980; outline-offset: 2px; }
    button:hover { filter: brightness(1.08); }
    button:active { transform: scale(0.98); }
    textarea { font-family: 'Plus Jakarta Sans', sans-serif; }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.7; } }
    @keyframes heroGlow { 0%, 100% { box-shadow: 0 6px 30px rgba(196,149,0,0.25), 0 0 0 1px rgba(196,149,0,0.13); } 50% { box-shadow: 0 8px 40px rgba(196,149,0,0.4), 0 0 0 2px rgba(196,149,0,0.25); } }
    .bio-card { transition: transform 0.25s ease, box-shadow 0.25s ease !important; }
    .bio-card:hover { transform: translateY(-2px) scale(1.01) !important; box-shadow: 0 6px 24px rgba(0,0,0,0.12) !important; }
    .bio-card:active { transform: scale(0.98) !important; }
    .bio-hero { animation: heroGlow 2.5s ease-in-out infinite !important; }
    .bio-hero:hover { animation: none !important; transform: translateY(-3px) scale(1.02) !important; box-shadow: 0 8px 40px rgba(196,149,0,0.4) !important; }
    @keyframes urgencyGlow { 0%, 100% { box-shadow: 0 0 0px transparent; } 50% { box-shadow: 0 0 12px #e8443a22; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(100px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
  `;
}
