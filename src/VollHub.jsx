import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSupabase } from "./useSupabase";

// ─── ICON LIBRARY ───
const ICON_LIBRARY = [
  { group: "Negócios", icons: ["🤝", "💰", "📈", "💼", "🏢", "🎯", "💡", "🔑", "📋", "🏆", "💎", "🪙"] },
  { group: "Marketing", icons: ["📱", "📣", "🎨", "✍️", "📢", "🧲", "🔥", "⚡", "🚀", "💬", "🗣️", "📩"] },
  { group: "Conteúdo", icons: ["📄", "📝", "✅", "📊", "📐", "🗂️", "📚", "🎬", "🎙️", "📸", "🖼️", "🔗"] },
  { group: "Pilates", icons: ["🧘", "💪", "🏋️", "🤸", "🧠", "❤️", "🩺", "🦴", "🏃", "⚕️", "🌿", "✨"] },
  { group: "Hashtags", icons: ["#️⃣", "🏷️", "📌", "🔖", "⭐", "🌟", "💫", "🎖️", "🥇", "🎁", "🎉", "🔔"] },
];

const DEFAULT_CONFIG = {
  brandName: "VOLL PILATES GROUP", brandTag: "by Rafael Voll",
  landingSubtitle: "Materiais exclusivos para turbinar\nseus resultados no Pilates",
  landingStat1Label: "Materiais", landingStat2: "Grátis", landingStat2Label: "Para começar",
  landingStat3: "100%", landingStat3Label: "Prático",
  nameLabel: "Seu nome", namePlaceholder: "Como posso te chamar?",
  whatsLabel: "Seu WhatsApp", whatsPlaceholder: "(00) 00000-0000",
  ctaText: "Acessar materiais →", safeText: "🔒 Seus dados estão seguros.",
  hubGreetPrefix: "Olá,", hubGreetEmoji: "👋", hubSubtitle: "VOLL Pilates Hub",
  progressSuffix: "materiais baixados",
  progressHint: "Desbloqueie mais indicando amigos ou engajando nos posts!",
  sectionTitle: "Materiais disponíveis",
  ctaBannerTitle: "Quer acesso a tudo?", ctaBannerDesc: "Todos os materiais + conteúdos exclusivos", ctaBannerBtn: "Em breve",
  // Social proof
  socialProofMode: "downloads", // "downloads" | "recent" | "both" | "off"
  socialProofNames: ["Maria", "João", "Ana", "Pedro", "Carla", "Lucas", "Julia", "Rafael", "Camila", "Bruno"],
  socialProofMinutes: [3, 12, 25, 47, 68, 95, 120, 180, 240, 310],
  socialProofBoost: 150, // fake boost added to real download count
  // Dynamic banner
  bannerAllAccessPrice: 97,
  bannerAllAccessLink: "",
  bannerPersonalized: true,
  shareModalTitle: "Indique um amigo", shareModalDesc: "Indique um amigo para desbloquear. Quanto mais indica, mais conteúdo libera!",
  commentModalTitle: "Engaje no post", commentModalDesc: "Comente no post mais recente no Instagram e depois volte aqui!",
  surveyModalTitle: "Pesquisa Rápida",
  instagramUrl: "https://instagram.com/rafael.voll", instagramHandle: "@rafael.voll",
  baseUrl: "https://seuapp.com",
  logoUrl: "",
  // Profile phases
  profileEnabled: "true",
  phase1Title: "Fase 1 · Sobre você", phase1Prize: "🎁 Pack de Exercícios em Vídeo", phase1PrizeUrl: "", phase1Icon: "🎓", phase1Enabled: "true",
  phase2Title: "Fase 2 · Seu negócio", phase2Prize: "🎁 Guia: Como Montar seu Studio", phase2PrizeUrl: "", phase2Icon: "💼", phase2Enabled: "true",
  phase3Title: "Fase 3 · Mentoria", phase3Prize: "🎁 Áudio exclusivo de Mentoria", phase3PrizeUrl: "", phase3Icon: "✨", phase3Enabled: "true",
  // Phase questions (pipe-separated for selects: "opt1|opt2|opt3")
  phase1Q1Label: "Você é:", phase1Q1Key: "grau", phase1Q1Type: "select", phase1Q1Options: "Estudante|Graduado|Pós-Graduado",
  phase1Q2Label: "Formação:", phase1Q2Key: "formacao", phase1Q2Type: "select", phase1Q2Options: "Fisioterapia|Educação Física|Enfermagem|Dança|Outros",
  phase1Q3Label: "Atua com Pilates?", phase1Q3Key: "atuaPilates", phase1Q3Type: "select", phase1Q3Options: "Não|Sim há menos de 1 ano|Sim entre 1 a 3 anos|Sim entre 3 a 5 anos|Sim entre 5 a 8 anos|Sim há mais de 8 anos",
  phase2Q1Label: "Você tem Studio?", phase2Q1Key: "temStudio", phase2Q1Type: "select", phase2Q1Options: "Não e não pretendo|Não, mas pretendo|Sim",
  phase2Q2Label: "Qual é o seu maior desafio hoje?", phase2Q2Key: "maiorDesafio", phase2Q2Type: "text", phase2Q2Options: "",
  phase2Q3Label: "Que tipo de conteúdo te ajudaria mais hoje?", phase2Q3Key: "tipoConteudo", phase2Q3Type: "text", phase2Q3Options: "",
  phase3Q1Label: "Estamos em uma Mentoria, eu e você. Você pode fazer UMA pergunta pra mim. Qual seria?", phase3Q1Key: "perguntaMentoria", phase3Q1Type: "text", phase3Q1Options: "",
  phase3Q2Label: "Me diga qual o seu maior Sonho?", phase3Q2Key: "maiorSonho", phase3Q2Type: "text", phase3Q2Options: "",
  phase3Q3Label: "O profissional do Pilates que você mais admira:", phase3Q3Key: "profAdmira", phase3Q3Type: "text", phase3Q3Options: "",
  // Bio / Linktree
  bioPhotoUrl: "https://vollpilates.com.br/rafael/wp-content/uploads/2025/04/foto-rafa.webp",
  bioName: "RAFAEL JULIANO",
  bioLine1: "💼 Fundador | VOLL Pilates Group",
  bioLine2: "🎯 Marketing, Gestão e Vendas no Pilates",
  bioStat1: "+230", bioStat1Label: "Studios VOLL",
  bioStat2: "+85 mil", bioStat2Label: "Instrutores Formados",
};

const MASTER_PIN = "9512";
const MASTER_USER = { id: 0, name: "MASTER PICA", pin: MASTER_PIN, role: "master", permissions: { materials_view: true, materials_edit: true, leads_view: true, leads_export: true, leads_whatsapp: true, textos_edit: true, users_manage: true } };

const PERM_LABELS = {
  materials_view: { label: "Ver materiais", icon: "📄", group: "Materiais" },
  materials_edit: { label: "Criar / editar / excluir", icon: "✏️", group: "Materiais" },
  leads_view: { label: "Ver leads", icon: "👥", group: "Leads" },
  leads_export: { label: "Exportar CSV / copiar números", icon: "📊", group: "Leads" },
  leads_whatsapp: { label: "Enviar WhatsApp", icon: "💬", group: "Leads" },
  textos_edit: { label: "Editar textos e configs", icon: "✏️", group: "CMS" },
  users_manage: { label: "Gerenciar usuários", icon: "🔐", group: "Sistema" },
};

const THEMES = {
  dark: { bg: "#060a09", cardBg: "linear-gradient(180deg, #0d1512 0%, #080d0b 100%)", cardBorder: "#1a2e28", inputBg: "#080d0b", inputBorder: "#1a2e28", text: "#f0f0f0", textMuted: "#7a8d86", textFaint: "#4a5d56", accent: "#7DE2C7", accentDark: "#349980", gold: "#FFD863", badgeBg: "#111a17", badgeBorder: "#1e3029", progressTrack: "#152420", overlayBg: "rgba(0,0,0,0.8)", toastBg: "#0d1f1a", toastBorder: "#1a2e28", glowOp: 0.15, dlBg: "#0d2920", dlBorder: "#7DE2C744", statBg: "#0d1512", statBorder: "#1a2e28", tabBg: "#080d0b", tabBorder: "#152420", tabActiveBg: "#1a2e28", matIcon: "linear-gradient(135deg, #0d1f1a, #0a1a14)", matIconLock: "linear-gradient(135deg, #1a1a22, #141418)", ctaBanBg: "linear-gradient(135deg, #1a1a10, #0d1512)", ctaBanBrd: "#2e2e1a", placeholder: "#4a5450", focusRing: "#34998022", avBg: "linear-gradient(135deg, #0d1f1a, #0a1a14)", avBrd: "#1a2e28", shadow: "0 20px 60px rgba(0,0,0,0.6)", dangerBg: "#1a1210", dangerBrd: "#2e1a1a", dangerTxt: "#e87d7d", successBg: "#0d2920", newBg: "#1a1a10", newBorder: "#FFD86344", newText: "#FFD863", spotBg: "linear-gradient(135deg, #0d1f1a, #0a1610)", spotBorder: "#349980" },
  light: { bg: "#f4f7f6", cardBg: "linear-gradient(180deg, #ffffff 0%, #f8faf9 100%)", cardBorder: "#d4e5de", inputBg: "#f0f5f3", inputBorder: "#c8ddd5", text: "#1a2e28", textMuted: "#5a7a6e", textFaint: "#8aa89a", accent: "#349980", accentDark: "#1a7a60", gold: "#c49500", badgeBg: "#e8f5f0", badgeBorder: "#c8ddd5", progressTrack: "#d4e5de", overlayBg: "rgba(0,0,0,0.45)", toastBg: "#ffffff", toastBorder: "#d4e5de", glowOp: 0.08, dlBg: "#e0f5ed", dlBorder: "#7DE2C788", statBg: "#ffffff", statBorder: "#d4e5de", tabBg: "#e8f0ed", tabBorder: "#d4e5de", tabActiveBg: "#ffffff", matIcon: "linear-gradient(135deg, #e0f5ed, #d4ece3)", matIconLock: "linear-gradient(135deg, #e8e8ee, #dddde3)", ctaBanBg: "linear-gradient(135deg, #fdf8e8, #f4f7f6)", ctaBanBrd: "#e8ddb0", placeholder: "#8aa89a", focusRing: "#34998030", avBg: "linear-gradient(135deg, #e0f5ed, #d4ece3)", avBrd: "#c8ddd5", shadow: "0 20px 60px rgba(0,0,0,0.08)", dangerBg: "#fde8e8", dangerBrd: "#e8b0b0", dangerTxt: "#c44", successBg: "#e0f5ed", newBg: "#fdf8e8", newBorder: "#e8ddb044", newText: "#c49500", spotBg: "linear-gradient(135deg, #e0f5ed, #f0faf6)", spotBorder: "#349980" },
};

function getUnlockLabel(m) {
  if (m.unlockType === "free") return { label: "Gratuito", icon: "✨", color: "#7DE2C7" };
  if (m.unlockType === "social" && m.socialMethod === "share") return { label: "Indicação", icon: "👥", color: "#7DE2C7" };
  if (m.unlockType === "social" && m.socialMethod === "comment") return { label: "Comentário", icon: "💬", color: "#FFD863" };
  if (m.unlockType === "data") return { label: "Completar perfil", icon: "📋", color: "#7DE2C7" };
  if (m.unlockType === "survey") return { label: "Pesquisa", icon: "🔍", color: "#FFD863" };
  return { label: "—", icon: "—", color: "#999" };
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return "Agora";
  if (hrs < 24) return `${hrs}h atrás`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Ontem";
  if (days < 7) return `${days} dias atrás`;
  return "";
}

export default function VollHub() {
  const [view, setView] = useState("linktree");
  const [theme, setTheme] = useState("light");

  // Bio links data (stored as JSON in config.bioLinks)
  const DEFAULT_BIO_LINKS = [
    { id: "1", title: "Pós Internacional", imageUrl: "https://vollpilates.com.br/rafael/wp-content/uploads/2025/04/Pos.webp", url: "https://vollpilates.com.br/rafael/cta/pos-internacional", active: true, clicks: 0 },
    { id: "2", title: "Encontro Pilates 2026", imageUrl: "https://vollpilates.com.br/rafael/wp-content/uploads/2025/10/banner_link_bio_encontro-2026_rafa-4.png", url: "https://encontropilates.com.br/", active: true, clicks: 0 },
    { id: "3", title: "Pós Patologias e Biomecânica", imageUrl: "https://vollpilates.com.br/rafael/wp-content/uploads/2025/07/acC60wLz.png", url: "https://materiais.vollpilates.com.br/pos-graduacao-pilates-para-patologias-e-biomecanica-aplicada-captacao", active: true, clicks: 0 },
    { id: "4", title: "Jornada Pilates 2026", imageUrl: "https://vollpilates.com.br/rafael/wp-content/uploads/2025/06/banner_link_bio_jornada_2026_insta_rafa.png", url: "https://jornadapilates.com.br/2026", active: true, clicks: 0 },
    { id: "5", title: "Studio Blindado", imageUrl: "https://vollpilates.com.br/rafael/wp-content/uploads/2025/04/Link_BIO_Studio_Blindado.png", url: "https://vollpilates.com.br/imersaostudioblindado/", active: true, clicks: 0 },
    { id: "6", title: "Kit Documentos Jurídicos", imageUrl: "https://vollpilates.com.br/rafael/wp-content/uploads/2025/04/Link_BIO_Kit_Documentos_Juridicos.png", url: "https://materiais.vollpilates.com.br/kit-juridico-pagina-de-venda", active: true, clicks: 0 },
    { id: "7", title: "Pilates Connect", imageUrl: "https://vollpilates.com.br/rafael/wp-content/uploads/2025/04/PILATES-CONNECT.webp", url: "https://vollpilates.com.br/rafael/cta/pilatesconnect", active: true, clicks: 0 },
    { id: "8", title: "Formação Clássica", imageUrl: "https://vollpilates.com.br/rafael/wp-content/uploads/2025/04/FORMACAO-CLASSICA.webp", url: "https://cursopilatesclassico.com.br/", active: true, clicks: 0 },
    { id: "9", title: "MBA VOLL", imageUrl: "https://vollpilates.com.br/rafael/wp-content/uploads/2025/04/MBA.webp", url: "https://vollpilates.com.br/rafael/cta/mbavoll", active: true, clicks: 0 },
    { id: "10", title: "VOLL+", imageUrl: "https://vollpilates.com.br/rafael/wp-content/uploads/2025/04/VOLL.webp", url: "https://vollpilates.com.br/rafael/cta/vollplus", active: true, clicks: 0 },
    { id: "11", title: "Franquias", imageUrl: "https://vollpilates.com.br/rafael/wp-content/uploads/2025/04/VOLL-FRANQUIAS.webp", url: "https://vollpilates.com.br/rafael/cta/franquiadepilates", active: true, clicks: 0 },
    { id: "12", title: "Dúvidas Cursos", imageUrl: "https://vollpilates.com.br/rafael/wp-content/uploads/2025/04/DUVIDAS-CURSOS.webp", url: "https://vollpilates.com.br/rafael/cta/duvidas-cursos", active: true, clicks: 0 },
    { id: "13", title: "Grupos Exclusivos", imageUrl: "https://vollpilates.com.br/rafael/wp-content/uploads/2025/04/card_grupos_exclusivos_rafa.webp", url: "https://vollpilates.com.br/rafael/grupos-exclusivos/", active: true, clicks: 0 },
    { id: "hub", title: "🎁 Materiais Gratuitos", imageUrl: "", icon: "🎁", url: "_hub", active: true, clicks: 0 },
  ];
  const getBioLinks = () => {
    try { const v = config.bioLinks; if (v) return JSON.parse(v); } catch(e) {}
    return DEFAULT_BIO_LINKS;
  };
  const bioLinks = getBioLinks();
  const saveBioLinks = (links) => db.updateConfig("bioLinks", JSON.stringify(links));
  // ─── SUPABASE ───
  const db = useSupabase();
  const { materials, leads, adminUsers, loading: dbLoading, error: dbError } = db;
  const config = { ...DEFAULT_CONFIG, ...db.config };

  const [userName, setUserName] = useState("");
  const [userWhatsApp, setUserWhatsApp] = useState("");
  const [downloaded, setDownloaded] = useState([]);
  // Auto-login from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("vollhub_user");
      if (saved) {
        const u = JSON.parse(saved);
        if (u.name && u.whatsapp) {
          setUserName(u.name);
          setUserWhatsApp(u.whatsapp);
          if (u.downloaded) setDownloaded(u.downloaded);
          if (u.profile) setUserProfile(u.profile);
          setView("hub");
        }
      }
    } catch (e) {}
  }, []);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [unlockTarget, setUnlockTarget] = useState(null);
  const setUnlock = (m) => { setUnlockTarget(m); setPreviewImgIdx(0); };
  const [toast, setToast] = useState(null);
  const [animateIn, setAnimateIn] = useState(false);
  const [refName, setRefName] = useState("");
  const [refWA, setRefWA] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [adminTab, setAdminTab] = useState("materials");
  const [activityLog, setActivityLog] = useState([]);
  const addLog = (action) => {
    const entry = { who: currentAdmin?.name || "?", action, time: new Date().toLocaleString("pt-BR") };
    setActivityLog((p) => [entry, ...p].slice(0, 100));
  };
  const [searchLead, setSearchLead] = useState("");

  // ─── ADMIN USERS ───
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [showNewUser, setShowNewUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", pin: "", permissions: { materials_view: true, materials_edit: false, leads_view: true, leads_export: false, leads_whatsapp: false, textos_edit: false, users_manage: false } });
  const [editUserId, setEditUserId] = useState(null);
  const isMaster = currentAdmin?.role === "master";
  const can = (perm) => currentAdmin?.permissions?.[perm] === true;
  const [logoTaps, setLogoTaps] = useState(0);
  const [editId, setEditId] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newMat, setNewMat] = useState({ title: "", description: "", category: "", icon: "📄", date: "", unlockType: "free", socialMethod: null, surveyQuestions: [], downloadUrl: "", expiresAt: null, limitQty: null, limitUsed: 0, isFlash: false, flashUntil: null, previewBullets: [], previewImages: [] });
  const [showIconPicker, setShowIconPicker] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [previewImgIdx, setPreviewImgIdx] = useState(0);

  // ─── SURVEY SYSTEM ───
  const [surveyAnswers, setSurveyAnswers] = useState({});
  const [currentSurvey, setCurrentSurvey] = useState(null);
  const [tempAnswers, setTempAnswers] = useState({});

  // ─── LEAD FILTERS & WHATSAPP ───
  const [leadFilter, setLeadFilter] = useState("all"); // all, hot, warm, cold, referral
  const [showBulkWA, setShowBulkWA] = useState(false);
  const [bulkMsg, setBulkMsg] = useState("Olá {nome}! 👋 Temos novos materiais exclusivos no VOLL Pilates Hub. Acesse agora!");
  const [bulkWAIndex, setBulkWAIndex] = useState(-1);
  const [bulkWASent, setBulkWASent] = useState([]);

  // ─── DEEP LINK & RETURN TRIGGERS ───
  const [deepLinkMatId, setDeepLinkMatId] = useState(null);
  const [lastVisitTs, setLastVisitTs] = useState(Date.now());
  const [seenNewIds, setSeenNewIds] = useState([]);
  const [linkCopied, setLinkCopied] = useState(null);
  const spotlightRef = useRef(null);

  // ─── USER PROFILE (3 PHASES) ───
  const [userProfile, setUserProfile] = useState({ grau: "", formacao: "", atuaPilates: "", temStudio: "", maiorDesafio: "", tipoConteudo: "", perguntaMentoria: "", maiorSonho: "", profAdmira: "", phase1: false, phase2: false, phase3: false });
  const updProfile = (k, v) => setUserProfile((p) => ({ ...p, [k]: v }));
  const [activePhase, setActivePhase] = useState(null);
  const [phaseStartTime, setPhaseStartTime] = useState(null);
  const [phaseTimer, setPhaseTimer] = useState(0);
  const openPhase = (id) => { setActivePhase(id); setPhaseStartTime(Date.now()); setPhaseTimer(0); };
  const ALL_PHASES = [1,2,3].map(n => ({
    id: n,
    icon: config[`phase${n}Icon`] || ["🎓","💼","✨"][n-1],
    enabled: config[`phase${n}Enabled`] !== "false",
    fields: [1,2,3].map(q => {
      const label = config[`phase${n}Q${q}Label`] || "";
      const key = config[`phase${n}Q${q}Key`] || "";
      const type = config[`phase${n}Q${q}Type`] || "text";
      const optStr = config[`phase${n}Q${q}Options`] || "";
      const options = type === "select" && optStr ? (Array.isArray(optStr) ? optStr : optStr.split("|").map(s => s.trim()).filter(Boolean)) : [];
      return { key, label, type, options, placeholder: type === "text" ? "Digite aqui..." : "" };
    }).filter(f => f.key && f.label),
  }));
  const PHASES = ALL_PHASES.filter(p => p.enabled);
  const isPhaseFieldsComplete = (phaseId) => PHASES.find(p => p.id === phaseId)?.fields.every(f => userProfile[f.key]?.trim()) || false;
  const isPhaseUnlocked = (phaseId) => userProfile[`phase${phaseId}`];
  const completedPhases = PHASES.filter(p => isPhaseUnlocked(p.id)).length;
  const profileEnabled = config.profileEnabled !== "false";
  const profileComplete = PHASES.length > 0 && completedPhases === PHASES.length;

  const T = THEMES[theme];

  useEffect(() => {
    if (view === "hub" || view === "admin" || view === "profile" || view === "linktree") { setAnimateIn(false); setTimeout(() => setAnimateIn(true), 100); }
  }, [view, adminTab]);
  useEffect(() => { if (logoTaps >= 5) { setLogoTaps(0); setView("admin-login"); } }, [logoTaps]);

  // Auto-refresh data every 30s when in admin
  useEffect(() => {
    if (view !== "admin") return;
    const interval = setInterval(() => { db.reload(); }, 30000);
    return () => clearInterval(interval);
  }, [view]);

  // Phase timer countdown
  useEffect(() => {
    if (!phaseStartTime || !activePhase) return;
    const interval = setInterval(() => {
      setPhaseTimer(Math.floor((Date.now() - phaseStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [phaseStartTime, activePhase]);

  // Read URL param on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mParam = params.get("m");
    if (mParam) setDeepLinkMatId(parseInt(mParam, 10));
    // Track page view
    db.incrementPageView();
  }, []);

  // Scroll to spotlight when entering hub with deep link
  useEffect(() => {
    if (view === "hub" && deepLinkMatId && spotlightRef.current) {
      setTimeout(() => spotlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 400);
    }
  }, [view, deepLinkMatId]);

  const showT = (m) => { setToast(m); setTimeout(() => setToast(null), 3000); };

  // ─── COUNTDOWN TIMER ───
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (view === "admin") return; // no timer on admin to prevent input focus loss
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [view]);

  // Auto-expire: when expiresAt passes, convert to data unlock
  useEffect(() => {
    materials.forEach((m) => {
      if (m.expiresAt && m.expiresAt <= now && m.unlockType === "free") {
        db.updateMaterial(m.id, { unlockType: "data", expiresAt: null });
      }
      if (m.isFlash && m.flashUntil && m.flashUntil <= now) {
        db.updateMaterial(m.id, { isFlash: false, flashUntil: null });
      }
    });
  }, [now]);

  const formatCountdown = (target) => {
    const diff = Math.max(0, target - now);
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const min = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    if (d > 0) return `${d}d ${h}h ${min}m`;
    if (h > 0) return `${h}h ${min}m ${s}s`;
    return `${min}m ${s}s`;
  };
  const isUrgent = (target) => target && (target - now) < 86400000 && (target - now) > 0;

  const fmtWA = (v) => { const n = v.replace(/\D/g, "").slice(0, 11); if (n.length <= 2) return n; if (n.length <= 7) return `(${n.slice(0, 2)}) ${n.slice(2)}`; return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`; };
  const waDigitsCount = userWhatsApp.replace(/\D/g, "").length;
  const handleLogin = async () => {
    if (!userName.trim() || !userWhatsApp.trim()) return showT("Preencha todos os campos!");
    const waDigits = userWhatsApp.replace(/\D/g, "");
    if (waDigits.length !== 11) return showT("WhatsApp deve ter DDD (2 dígitos) + número (9 dígitos)");
    if (waDigits[2] !== "9") return showT("Número de celular deve começar com 9 após o DDD");
    const ddd = parseInt(waDigits.slice(0, 2));
    if (ddd < 11 || ddd > 99) return showT("DDD inválido");
    // Check if lead exists, update visits; else create
    const existing = await db.findLeadByWhatsApp(userWhatsApp);
    const today = new Date(); const dateStr = `${String(today.getDate()).padStart(2,"0")} ${["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][today.getMonth()]}`;
    if (existing) {
      await db.updateLead(existing.id, { visits: (existing.visits || 0) + 1, lastVisit: dateStr, name: userName });
      setDownloaded(existing.downloads || []);
    } else {
      await db.addLead({ name: userName, whatsapp: userWhatsApp, downloads: [], visits: 1, firstVisit: dateStr, lastVisit: dateStr, source: "direct", grau: "", formacao: "", atuaPilates: "", temStudio: "", maiorDesafio: "", tipoConteudo: "", perguntaMentoria: "", maiorSonho: "", profAdmira: "", phase1Complete: false, phase2Complete: false, phase3Complete: false, surveyResponses: {} });
    }
    setView("hub");
    localStorage.setItem("vollhub_user", JSON.stringify({ name: userName, whatsapp: userWhatsApp, downloaded: existing ? existing.downloads || [] : [], profile: existing ? { grau: existing.grau || "", formacao: existing.formacao || "", atuaPilates: existing.atuaPilates || "", temStudio: existing.temStudio || "", maiorDesafio: existing.maiorDesafio || "", tipoConteudo: existing.tipoConteudo || "", perguntaMentoria: existing.perguntaMentoria || "", maiorSonho: existing.maiorSonho || "", profAdmira: existing.profAdmira || "", phase1: !!existing.phase1Complete, phase2: !!existing.phase2Complete, phase3: !!existing.phase3Complete } : {} }));
    if (existing) {
      setUserProfile({ grau: existing.grau || "", formacao: existing.formacao || "", atuaPilates: existing.atuaPilates || "", temStudio: existing.temStudio || "", maiorDesafio: existing.maiorDesafio || "", tipoConteudo: existing.tipoConteudo || "", perguntaMentoria: existing.perguntaMentoria || "", maiorSonho: existing.maiorSonho || "", profAdmira: existing.profAdmira || "", phase1: !!existing.phase1Complete, phase2: !!existing.phase2Complete, phase3: !!existing.phase3Complete });
    }
  };
  const handleDownload = async (mat) => {
    if (!downloaded.includes(mat.id)) {
      const newDl = [...downloaded, mat.id];
      setDownloaded(newDl);
      localStorage.setItem("vollhub_user", JSON.stringify({ name: userName, whatsapp: userWhatsApp, downloaded: newDl }));
      // Find current lead and update downloads
      const lead = await db.findLeadByWhatsApp(userWhatsApp);
      if (lead) { await db.updateLead(lead.id, { downloads: [...new Set([...(lead.downloads || []), mat.id])] }); }
    }
    showT(`"${mat.title}" baixado! ✅`); setSelectedMaterial(null);
  };
  const confirmUnlock = async (method) => {
    if (method === "share" && (!refName.trim() || !refWA.trim())) return showT("Preencha os dados!");
    await db.updateMaterial(unlockTarget.id, { unlockType: "free" });
    if (method === "share") {
      const today = new Date(); const dateStr = `${String(today.getDate()).padStart(2,"0")} ${["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][today.getMonth()]}`;
      await db.addLead({ name: refName, whatsapp: refWA, downloads: [], visits: 0, firstVisit: dateStr, lastVisit: dateStr, source: "referral", grau: "", formacao: "", atuaPilates: "", temStudio: "", maiorDesafio: "", tipoConteudo: "", perguntaMentoria: "", maiorSonho: "", profAdmira: "", phase1Complete: false, phase2Complete: false, phase3Complete: false, surveyResponses: {} });
    }
    setUnlockTarget(null); setRefName(""); setRefWA(""); showT("Desbloqueado! 🎉");
  };
  const handleAdminLogin = async () => {
    if (adminPin === MASTER_PIN) { setCurrentAdmin(MASTER_USER); setView("admin"); setAdminPin(""); setAdminTab("materials"); return; }
    const found = await db.authenticateAdmin(adminPin);
    if (found) { setCurrentAdmin(found); setView("admin"); setAdminPin(""); setAdminTab(found.permissions.materials_view ? "materials" : found.permissions.leads_view ? "leads" : "textos"); return; }
    showT("PIN incorreto!");
  };
  const updCfg = (k, v) => { db.updateConfig(k, v); addLog(`Editou config: ${k}`); };
  const updMat = (id, k, v) => { const mat = materials.find(m => m.id === id); db.updateMaterial(id, { [k]: v }); addLog(`Editou material "${mat?.title || id}": ${k}`); };
  const deleteMat = async (id) => { await db.deleteMaterial(id); setConfirmDeleteId(null); setEditId(null); showT("Excluído! 🗑️"); };
  const addMat = async () => {
    if (!newMat.title.trim()) return showT("Preencha o título!");
    const today = new Date(); const d = `${String(today.getDate()).padStart(2, "0")} ${["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][today.getMonth()]} ${today.getFullYear()}`;
    await db.addMaterial({ ...newMat, date: newMat.date || d, active: true });
    addLog(`Criou material "${newMat.title}"`);
    setNewMat({ title: "", description: "", category: "", icon: "📄", date: "", unlockType: "free", socialMethod: null, surveyQuestions: [], downloadUrl: "", expiresAt: null, limitQty: null, limitUsed: 0, isFlash: false, flashUntil: null, previewBullets: [], previewImages: [] }); setShowNewForm(false); showT("Criado! ✅");
  };
  const copyLink = (id) => {
    const url = `${config.baseUrl}/?m=${id}`;
    navigator.clipboard?.writeText(url).then(() => { setLinkCopied(id); setTimeout(() => setLinkCopied(null), 2000); showT("Link copiado! 📋"); }).catch(() => { showT(url); });
  };
  const markNewAsSeen = (id) => { if (!seenNewIds.includes(id)) setSeenNewIds((p) => [...p, id]); };

  const activeMats = materials.filter((m) => m.active);
  const newMats = activeMats.filter((m) => m.createdAt > lastVisitTs && !seenNewIds.includes(m.id));
  const totalDl = leads.reduce((s, l) => s + l.downloads.length, 0);

  // ─── SOCIAL PROOF ───
  const getMatDownloads = (matId) => {
    const real = leads.reduce((s, l) => s + (l.downloads.includes(matId) ? 1 : 0), 0);
    return real + (config.socialProofBoost || 0) + (matId * 17 % 50); // deterministic variation per material
  };
  const getRecentPerson = (matId) => {
    const toArr = (v) => Array.isArray(v) ? v : typeof v === "string" ? v.split(",").map(s => s.trim()).filter(Boolean) : [];
    const names = toArr(config.socialProofNames);
    const mins = toArr(config.socialProofMinutes).map(Number);
    const idx = matId % names.length;
    const m = mins[idx] || 30;
    const name = names[idx] || "Alguém";
    if (m < 60) return `${name} baixou há ${m}min`;
    if (m < 1440) return `${name} baixou há ${Math.floor(m / 60)}h`;
    return `${name} baixou recentemente`;
  };

  // ─── DYNAMIC BANNER ───
  const lockedMats = activeMats.filter((m) => m.unlockType !== "free");
  const dlCount = downloaded.length;
  const getBannerContent = () => {
    if (!config.bannerPersonalized) return { title: config.ctaBannerTitle, desc: config.ctaBannerDesc, btn: config.ctaBannerBtn, icon: "⭐" };
    if (dlCount === 0) return { title: "Comece sua jornada!", desc: `${activeMats.length} materiais esperando por você. Baixe o primeiro agora!`, btn: "Explorar", icon: "🚀" };
    if (dlCount >= activeMats.length) return { title: "Você é fera! 🏆", desc: "Todos os materiais baixados. Fique ligado — novidades em breve!", btn: "Completo!", icon: "🏆" };
    if (lockedMats.length > 0 && dlCount >= 2) {
      const surveyMats = lockedMats.filter((m) => m.unlockType === "survey");
      const dataMats = lockedMats.filter((m) => m.unlockType === "data");
      if (surveyMats.length > 0) return { title: `Você já aproveitou ${dlCount} materiais!`, desc: `Responda pesquisas rápidas e desbloqueie ${surveyMats.length === 1 ? "mais 1 conteúdo exclusivo" : `mais ${surveyMats.length} conteúdos exclusivos`}!`, btn: "Ver conteúdos 🔍", icon: "🔓" };
      if (dataMats.length > 0) return { title: `Falta pouco!`, desc: `Complete seu perfil e desbloqueie ${dataMats.length === 1 ? "mais 1 material" : `mais ${dataMats.length} materiais`}!`, btn: "Completar perfil 📋", icon: "🔓" };
      return { title: `Você já aproveitou ${dlCount} materiais!`, desc: `Ainda ${lockedMats.length === 1 ? "tem 1 material" : `tem ${lockedMats.length} materiais`} esperando por você!`, btn: "Desbloquear", icon: "🔓" };
    }
    return { title: `${dlCount} de ${activeMats.length} baixados!`, desc: `Continue explorando — ainda ${activeMats.length - dlCount === 1 ? "tem 1 material" : `tem ${activeMats.length - dlCount} materiais`} pra você!`, btn: "Ver mais", icon: "💪" };
  };

  // Lead segmentation
  const getLeadSegment = (l) => {
    if (l.downloads.length >= 3) return "hot";
    if (l.downloads.length >= 1) return "warm";
    return "cold";
  };
  const segmentedLeads = leads.filter((l) => {
    const matchSearch = l.name.toLowerCase().includes(searchLead.toLowerCase()) || l.whatsapp.includes(searchLead);
    if (!matchSearch) return false;
    if (leadFilter === "all") return true;
    if (leadFilter === "referral") return l.source === "referral";
    return getLeadSegment(l) === leadFilter;
  });
  const segmentCounts = { all: leads.length, hot: leads.filter((l) => getLeadSegment(l) === "hot").length, warm: leads.filter((l) => getLeadSegment(l) === "warm").length, cold: leads.filter((l) => getLeadSegment(l) === "cold").length, referral: leads.filter((l) => l.source === "referral").length };

  // WhatsApp helpers
  const waNumber = (wa) => "55" + wa.replace(/\D/g, "");
  const openWA = (l, msg) => { const text = (msg || bulkMsg).replace("{nome}", l.name.split(" ")[0]); window.open(`https://wa.me/${waNumber(l.whatsapp)}?text=${encodeURIComponent(text)}`, "_blank"); };
  const exportCSV = (leadsArr) => {
    const matCols = materials.filter((m) => m.active).map((m) => m.title);
    // Build survey question columns: "MatTitle > Question"
    const surveyMats = materials.filter((m) => m.active && m.unlockType === "survey" && m.surveyQuestions?.length);
    const surveyColHeaders = [];
    const surveyColKeys = []; // [{ matId, qId }]
    surveyMats.forEach((m) => (m.surveyQuestions || []).forEach((q) => {
      surveyColHeaders.push(`[Pesquisa] ${m.title} > ${q.question}`);
      surveyColKeys.push({ matId: m.id, qId: q.id });
    }));
    const header = ["Nome", "WhatsApp", "Total Downloads", "Visitas", "Primeira Visita", "Última Visita", "Origem", "Segmento", "Grau", "Formação", "Atua Pilates", "Tem Studio", "Maior Desafio", "Tipo Conteúdo", "Pergunta Mentoria", "Maior Sonho", "Prof Admira", ...matCols, ...surveyColHeaders];
    const esc = (v) => `"${String(v || "").replace(/"/g, '""')}"`;
    const rows = leadsArr.map((l) => {
      const matFlags = materials.filter((m) => m.active).map((m) => l.downloads.includes(m.id) ? "Sim" : "");
      const surveyVals = surveyColKeys.map(({ matId, qId }) => esc(l.surveyResponses?.[matId]?.[qId] || ""));
      const seg = getLeadSegment(l);
      return [esc(l.name), esc(l.whatsapp), l.downloads.length, l.visits, esc(l.firstVisit), esc(l.lastVisit), l.source, seg, esc(l.grau || ""), esc(l.formacao || ""), esc(l.atuaPilates || ""), esc(l.temStudio || ""), esc(l.maiorDesafio || ""), esc(l.tipoConteudo || ""), esc(l.perguntaMentoria || ""), esc(l.maiorSonho || ""), esc(l.profAdmira || ""), ...matFlags, ...surveyVals].join(",");
    });
    const bom = "\uFEFF";
    const blob = new Blob([bom + header.join(",") + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `leads-voll-${leadFilter}-${new Date().toISOString().slice(0,10)}.csv`; a.click(); showT(`CSV exportado com ${leadsArr.length} leads, ${matCols.length} materiais e ${surveyColHeaders.length} respostas! 📊`);
  };
  const copyAllNumbers = (leadsArr) => {
    const nums = leadsArr.map((l) => waNumber(l.whatsapp)).join("\n");
    navigator.clipboard?.writeText(nums).then(() => showT(`${leadsArr.length} números copiados! 📋`)).catch(() => showT("Erro ao copiar"));
  };

  // The deep-linked material (if any)
  const spotlightMat = deepLinkMatId ? activeMats.find((m) => m.id === deepLinkMatId) : null;
  // Other materials (excluding spotlight)
  const otherMats = spotlightMat ? activeMats.filter((m) => m.id !== spotlightMat.id) : activeMats;

  const inp = { width: "100%", padding: "12px 14px", borderRadius: 11, border: `1px solid ${T.inputBorder}`, background: T.inputBg, color: T.text, fontSize: 14, fontFamily: "'Plus Jakarta Sans', sans-serif", transition: "all 0.2s" };
  const sInp = { ...inp, padding: "8px 10px", fontSize: 13 };

  const InfLogo = ({ size = 52 }) => config.logoUrl ? <img src={config.logoUrl} alt="Logo" style={{ width: size, height: size, objectFit: "contain" }} /> : (<svg width={size} height={size * 0.54} viewBox="0 0 52 28" fill="none"><path d="M14 14C14 14 14 4 7 4C0 4 0 14 0 14C0 14 0 24 7 24C14 24 14 14 14 14ZM14 14C14 14 14 4 21 4C28 4 28 14 28 14" stroke="#7DE2C7" strokeWidth="3" strokeLinecap="round" /><path d="M28 14C28 14 28 24 35 24C42 24 42 14 42 14C42 14 42 4 35 4C28 4 28 14 28 14" stroke="#349980" strokeWidth="3" strokeLinecap="round" /><path d="M42 14C42 14 42 24 48 24" stroke="#FFD863" strokeWidth="3" strokeLinecap="round" /></svg>);

  const Toast = () => toast ? <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", padding: "11px 22px", borderRadius: 14, background: T.toastBg, border: `1px solid ${T.toastBorder}`, color: T.text, fontSize: 14, fontFamily: "'Plus Jakarta Sans'", zIndex: 200, animation: "toastIn 0.3s ease", boxShadow: "0 10px 40px rgba(0,0,0,0.4)", whiteSpace: "nowrap", maxWidth: "90vw", overflow: "hidden", textOverflow: "ellipsis" }}>{toast}</div> : null;

  // ─── ICON PICKER ───
  const IconPicker = useMemo(() => function ICP({ onSelect, onClose }) { return (
    <div style={{ position: "fixed", inset: 0, background: T.overlayBg, backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 150, padding: 16 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 20, padding: "24px 20px", maxWidth: 360, width: "100%", maxHeight: "75vh", overflowY: "auto", animation: "fadeInUp 0.3s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h3 style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Escolha um ícone</h3><button onClick={onClose} style={{ background: "none", color: T.textFaint, fontSize: 18 }}>✕</button></div>
        {ICON_LIBRARY.map((g) => (<div key={g.group} style={{ marginBottom: 14 }}><p style={{ fontSize: 11, fontWeight: 600, color: T.accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, fontFamily: "'Plus Jakarta Sans'" }}>{g.group}</p><div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>{g.icons.map((ic) => (<button key={ic} onClick={() => { onSelect(ic); onClose(); }} style={{ width: "100%", aspectRatio: "1", borderRadius: 10, background: T.inputBg, border: `1px solid ${T.inputBorder}`, fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>{ic}</button>))}</div></div>))}
      </div>
    </div>
  ); }, [T]);

  // ─── UNLOCK EDITOR (admin) ───
  const UnlockEditor = useMemo(() => function ULE({ mat, onChange }) {
    const addBullet = () => onChange("previewBullets", [...(mat.previewBullets || []), ""]);
    const updBullet = (i, v) => { const b = [...(mat.previewBullets || [])]; b[i] = v; onChange("previewBullets", b); };
    const rmBullet = (i) => onChange("previewBullets", (mat.previewBullets || []).filter((_, j) => j !== i));
    const addImg = () => onChange("previewImages", [...(mat.previewImages || []), ""]);
    const updImg = (i, v) => { const b = [...(mat.previewImages || [])]; b[i] = v; onChange("previewImages", b); };
    const rmImg = (i) => onChange("previewImages", (mat.previewImages || []).filter((_, j) => j !== i));

    return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Como desbloqueia?</label>
      <div style={{ display: "flex", gap: 6 }}>
        {[["free", "✨ Grátis"], ["data", "📋 Dados"], ["social", "👥 Social"], ["survey", "🔍 Pesquisa"]].map(([k, l]) => (<button key={k} onClick={() => onChange("unlockType", k)} style={{ flex: 1, padding: "8px 4px", borderRadius: 9, fontSize: 11, fontWeight: 600, background: mat.unlockType === k ? (k === "survey" ? T.gold + "22" : T.accent + "22") : T.inputBg, color: mat.unlockType === k ? (k === "survey" ? T.gold : T.accent) : T.textFaint, border: `1px solid ${mat.unlockType === k ? (k === "survey" ? T.gold + "44" : T.accent + "44") : T.inputBorder}`, transition: "all 0.2s" }}>{l}</button>))}
      </div>
      {mat.unlockType === "social" && (<div style={{ display: "flex", gap: 6 }}>{[["share", "👥 Indicar amigo"], ["comment", "💬 Comentar no post"]].map(([k, l]) => (<button key={k} onClick={() => onChange("socialMethod", k)} style={{ flex: 1, padding: "8px 6px", borderRadius: 9, fontSize: 11, fontWeight: 600, background: mat.socialMethod === k ? T.accent + "22" : T.inputBg, color: mat.socialMethod === k ? T.accent : T.textFaint, border: `1px solid ${mat.socialMethod === k ? T.accent + "44" : T.inputBorder}` }}>{l}</button>))}</div>)}
      {mat.unlockType === "data" && (<p style={{ fontSize: 11, color: T.accent, fontFamily: "'Plus Jakarta Sans'", padding: "8px 0" }}>📋 O usuário precisa completar o perfil (cidade, atuação, studio, alunos, objetivo) para desbloquear.</p>)}

      {mat.unlockType === "survey" && (
        <div style={{ paddingTop: 4 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'Plus Jakarta Sans'", marginBottom: 6, display: "block" }}>🔍 Perguntas da pesquisa</label>
          <p style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginBottom: 8 }}>O lead responde estas perguntas para desbloquear. Cada resposta é salva no perfil dele.</p>
          {(mat.surveyQuestions || []).map((q, i) => (
            <div key={i} style={{ background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 10, padding: 10, marginBottom: 6 }}>
              <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: T.gold, marginTop: 6 }}>Q{i + 1}</span>
                <input value={q.question} onChange={(e) => { const qs = [...(mat.surveyQuestions || [])]; qs[i] = { ...qs[i], question: e.target.value }; onChange("surveyQuestions", qs); }} style={{ ...sInp, flex: 1 }} placeholder="Pergunta" />
                <button onClick={() => onChange("surveyQuestions", (mat.surveyQuestions || []).filter((_, j) => j !== i))} style={{ width: 30, height: 30, borderRadius: 7, background: T.dangerBg, border: `1px solid ${T.dangerBrd}`, color: T.dangerTxt, fontSize: 12, marginTop: 2 }}>✕</button>
              </div>
              <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                {[["text", "✏️ Texto livre"], ["choice", "📊 Múltipla escolha"]].map(([t, lb]) => (
                  <button key={t} onClick={() => { const qs = [...(mat.surveyQuestions || [])]; qs[i] = { ...qs[i], type: t }; onChange("surveyQuestions", qs); }} style={{ flex: 1, padding: "5px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: q.type === t ? T.gold + "22" : "transparent", color: q.type === t ? T.gold : T.textFaint, border: `1px solid ${q.type === t ? T.gold + "44" : T.inputBorder}` }}>{lb}</button>
                ))}
              </div>
              {q.type === "choice" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 4 }}>
                  {(q.options || []).map((opt, oi) => (
                    <div key={oi} style={{ display: "flex", gap: 4 }}>
                      <span style={{ color: T.textFaint, fontSize: 10, marginTop: 6 }}>○</span>
                      <input value={opt} onChange={(e) => { const qs = [...(mat.surveyQuestions || [])]; const opts = [...(qs[i].options || [])]; opts[oi] = e.target.value; qs[i] = { ...qs[i], options: opts }; onChange("surveyQuestions", qs); }} style={{ ...sInp, flex: 1, padding: "5px 8px", fontSize: 11 }} placeholder={`Opção ${oi + 1}`} />
                      <button onClick={() => { const qs = [...(mat.surveyQuestions || [])]; qs[i] = { ...qs[i], options: (qs[i].options || []).filter((_, j) => j !== oi) }; onChange("surveyQuestions", qs); }} style={{ background: "none", color: T.textFaint, fontSize: 10, padding: "0 4px" }}>✕</button>
                    </div>
                  ))}
                  <button onClick={() => { const qs = [...(mat.surveyQuestions || [])]; qs[i] = { ...qs[i], options: [...(qs[i].options || []), ""] }; onChange("surveyQuestions", qs); }} style={{ fontSize: 10, color: T.gold, background: "none", border: "none", textAlign: "left", padding: "2px 0", fontWeight: 600 }}>+ opção</button>
                </div>
              )}
            </div>
          ))}
          <button onClick={() => onChange("surveyQuestions", [...(mat.surveyQuestions || []), { id: "q" + Date.now(), question: "", type: "choice", options: ["", ""] }])} style={{ width: "100%", padding: "8px", borderRadius: 8, background: T.gold + "11", border: `1px dashed ${T.gold}33`, color: T.gold, fontSize: 12, fontWeight: 600 }}>+ Adicionar pergunta</button>
        </div>
      )}

      {/* ─── URGENCY ─── */}
      <div style={{ paddingTop: 8, borderTop: `1px solid ${T.cardBorder}` }}>
        <label style={{ fontSize: 10, fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'Plus Jakarta Sans'", marginBottom: 6, display: "block" }}>⏰ Urgência & Escassez</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Expira em (horas)</label>
            <input type="number" defaultValue={mat.expiresAt ? Math.max(0, Math.round((mat.expiresAt - Date.now()) / 3600000)) : ""} onBlur={(e) => onChange("expiresAt", e.target.value ? Date.now() + parseInt(e.target.value) * 3600000 : null)} key={"exp-" + mat.id + "-" + (mat.expiresAt ? "on" : "off")} style={sInp} placeholder="Ex: 48" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Vagas limitadas</label>
            <input type="number" defaultValue={mat.limitQty || ""} onBlur={(e) => onChange("limitQty", e.target.value ? parseInt(e.target.value) : null)} key={"lim-" + mat.id} style={sInp} placeholder="Ex: 50" />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => { onChange("isFlash", !mat.isFlash); if (!mat.isFlash) onChange("flashUntil", Date.now() + 86400000); }} style={{ flex: 1, padding: "8px 6px", borderRadius: 9, fontSize: 11, fontWeight: 600, background: mat.isFlash ? "#e8443a22" : T.inputBg, color: mat.isFlash ? "#e8443a" : T.textFaint, border: `1px solid ${mat.isFlash ? "#e8443a44" : T.inputBorder}` }}>⚡ {mat.isFlash ? "Flash ATIVO" : "Flash deal"}</button>
          {mat.isFlash && (
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Flash por (horas)</label>
              <input type="number" defaultValue={mat.flashUntil ? Math.max(0, Math.round((mat.flashUntil - Date.now()) / 3600000)) : ""} onBlur={(e) => onChange("flashUntil", e.target.value ? Date.now() + parseInt(e.target.value) * 3600000 : null)} key={"flash-" + mat.id + "-" + (mat.flashUntil ? "on" : "off")} style={sInp} placeholder="24" />
            </div>
          )}
        </div>
        {mat.expiresAt && <p style={{ fontSize: 10, color: T.gold, marginTop: 4, fontFamily: "'Plus Jakarta Sans'" }}>⏰ Expira em {formatCountdown(mat.expiresAt)} — depois requer perfil completo</p>}
        {mat.limitQty && <p style={{ fontSize: 10, color: T.accent, marginTop: 2, fontFamily: "'Plus Jakarta Sans'" }}>🔢 {mat.limitQty - (mat.limitUsed || 0)} vagas restantes de {mat.limitQty}</p>}
      </div>

      {/* ─── PREVIEW (survey materials) ─── */}
      {mat.unlockType === "survey" && (
        <div style={{ paddingTop: 8, borderTop: `1px solid ${T.cardBorder}` }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'Plus Jakarta Sans'", marginBottom: 6, display: "block" }}>👁 Preview para o cliente</label>
          <p style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginBottom: 6 }}>Bullets que aparecem antes da pesquisa (o que o lead vai receber)</p>
          {(mat.previewBullets || []).map((b, i) => (
            <div key={i} style={{ display: "flex", gap: 4, marginBottom: 4 }}>
              <span style={{ color: T.accent, fontSize: 13, marginTop: 6 }}>✓</span>
              <input value={b} onChange={(e) => updBullet(i, e.target.value)} style={{ ...sInp, flex: 1 }} placeholder={`Benefício ${i + 1}`} />
              <button onClick={() => rmBullet(i)} style={{ width: 30, height: 30, borderRadius: 7, background: T.dangerBg, border: `1px solid ${T.dangerBrd}`, color: T.dangerTxt, fontSize: 12, marginTop: 2 }}>✕</button>
            </div>
          ))}
          <button onClick={addBullet} style={{ width: "100%", padding: "6px", borderRadius: 8, background: T.gold + "11", border: `1px dashed ${T.gold}33`, color: T.gold, fontSize: 11, fontWeight: 600, marginTop: 2 }}>+ Adicionar bullet</button>

          <p style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginTop: 10, marginBottom: 6 }}>Telas de preview (descrição do que o cliente vai ver)</p>
          {(mat.previewImages || []).map((img, i) => (
            <div key={i} style={{ display: "flex", gap: 4, marginBottom: 4 }}>
              <span style={{ color: T.gold, fontSize: 13, marginTop: 6 }}>📸</span>
              <input value={img} onChange={(e) => updImg(i, e.target.value)} style={{ ...sInp, flex: 1 }} placeholder={`Tela ${i + 1}: descreva o conteúdo`} />
              <button onClick={() => rmImg(i)} style={{ width: 30, height: 30, borderRadius: 7, background: T.dangerBg, border: `1px solid ${T.dangerBrd}`, color: T.dangerTxt, fontSize: 12, marginTop: 2 }}>✕</button>
            </div>
          ))}
          {(mat.previewImages || []).length < 3 && <button onClick={addImg} style={{ width: "100%", padding: "6px", borderRadius: 8, background: T.gold + "11", border: `1px dashed ${T.gold}33`, color: T.gold, fontSize: 11, fontWeight: 600, marginTop: 2 }}>+ Adicionar tela preview</button>}
        </div>
      )}
    </div>
  );}, [T, sInp]);

  const CmsField = ({ label, ck, multi }) => (<div style={{ marginBottom: 10 }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.textMuted, marginBottom: 4, fontFamily: "'Plus Jakarta Sans'" }}>{label}</label>{multi ? <textarea defaultValue={config[ck] || ""} onBlur={(e) => updCfg(ck, e.target.value)} key={"cms-" + ck + "-" + String(config[ck] || "").slice(0,10)} style={{ ...inp, minHeight: 55, resize: "vertical" }} /> : <input defaultValue={config[ck] || ""} onBlur={(e) => updCfg(ck, e.target.value)} key={"cms-" + ck + "-" + String(config[ck] || "").slice(0,10)} style={inp} />}</div>);

  // ─── MATERIAL CARD (reusable) ───
  const MaterialCard = ({ m, index, isSpotlight, isNew }) => {
    const isFree = m.unlockType === "free" || (m.unlockType === "data" && profileComplete);
    const isSurvey = m.unlockType === "survey";
    const surveyDone = isSurvey && surveyAnswers[m.id];
    const isDl = downloaded.includes(m.id);
    const ul = getUnlockLabel(m);
    const ago = timeAgo(m.createdAt);
    const hasExpiry = m.expiresAt && m.expiresAt > now;
    const expiryUrgent = isUrgent(m.expiresAt);
    const hasLimit = m.limitQty && (m.limitQty - (m.limitUsed || 0)) > 0;
    const limitLow = hasLimit && (m.limitQty - (m.limitUsed || 0)) <= 10;
    const isFlashActive = m.isFlash && m.flashUntil && m.flashUntil > now;

    return (
      <div
        ref={isSpotlight ? spotlightRef : null}
        onClick={() => {
          if (isNew) markNewAsSeen(m.id);
          if (isFree || isFlashActive || surveyDone) { setSelectedMaterial(m); return; }
          if (m.unlockType === "data") { if (profileComplete) { setSelectedMaterial(m); } else { setView("profile"); showT("Complete seu perfil para desbloquear! 📋"); } return; }
          if (m.unlockType === "survey") { setCurrentSurvey(m); setTempAnswers({}); setPreviewImgIdx(0); return; }
          setUnlock(m); // social
        }}
        style={{
          background: isFlashActive ? (theme === "dark" ? "linear-gradient(135deg, #1a1210, #0d0a08)" : "linear-gradient(135deg, #fdf0e8, #fdf8f4)") : isSpotlight ? T.spotBg : T.cardBg,
          border: isFlashActive ? `2px solid #e8443a55` : isSpotlight ? `2px solid ${T.spotBorder}` : `1px solid ${T.cardBorder}`,
          borderRadius: 16, padding: 15, display: "flex", gap: 12, alignItems: "flex-start",
          cursor: "pointer", position: "relative", flexWrap: "wrap",
          opacity: animateIn ? (isFree || isFlashActive || surveyDone ? 1 : 0.6) : 0,
          transform: animateIn ? "translateY(0)" : "translateY(25px)",
          transition: `all 0.4s ease ${index * 0.07}s`,
          boxShadow: isFlashActive ? "0 0 20px #e8443a15" : isSpotlight ? `0 0 20px ${T.accent}15` : "none",
        }}
      >
        {/* Badges row */}
        <div style={{ position: "absolute", top: 9, right: 9, display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: "65%" }}>
          {isFlashActive && (
            <div style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 7, background: "#e8443a22", border: "1px solid #e8443a44", fontFamily: "'Plus Jakarta Sans'", animation: "pulse 1.5s ease-in-out infinite" }}>
              <span style={{ fontSize: 9 }}>⚡</span><span style={{ fontSize: 10, fontWeight: 700, color: "#e8443a" }}>FLASH</span>
            </div>
          )}
          {isNew && !isDl && (
            <div style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 7, background: T.newBg, border: `1px solid ${T.newBorder}`, fontFamily: "'Plus Jakarta Sans'", animation: "pulse 2s ease-in-out infinite" }}>
              <span style={{ fontSize: 9 }}>🔥</span><span style={{ fontSize: 10, fontWeight: 700, color: T.newText }}>NOVO</span>
            </div>
          )}
          {!isFree && !isFlashActive && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 7, background: T.badgeBg, border: `1px solid ${T.badgeBorder}`, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'" }}>
              <span style={{ fontSize: 10 }}>🔒</span><span style={{ fontSize: 10, fontWeight: 600 }}>{ul.label}</span>
            </div>
          )}
          {isFree && isDl && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 7, background: T.dlBg, border: `1px solid ${T.dlBorder}`, fontFamily: "'Plus Jakarta Sans'" }}>
              <span style={{ fontSize: 10 }}>✅</span><span style={{ fontSize: 10, fontWeight: 600, color: T.accent }}>Baixado</span>
            </div>
          )}
        </div>

        {isSpotlight && (
          <div style={{ width: "100%", marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: 1.5, fontFamily: "'Plus Jakarta Sans'" }}>📌 Você veio buscar este material</span>
          </div>
        )}

        <div style={{ width: 50, height: 50, borderRadius: 13, background: isFree || isFlashActive || surveyDone ? T.matIcon : T.matIconLock, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 26, filter: isFree || isFlashActive || surveyDone ? "none" : "grayscale(1) opacity(0.4)" }}>{m.icon}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: T.accentDark, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'Plus Jakarta Sans'" }}>{m.category}</span>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginTop: 3, lineHeight: 1.3, color: isFree || isFlashActive ? T.text : T.textFaint }}>{m.title}</h3>
          <p style={{ fontSize: 12, marginTop: 3, fontFamily: "'Plus Jakarta Sans'", lineHeight: 1.5, color: isFree || isFlashActive ? T.textMuted : T.textFaint }}>{m.description}</p>
        </div>

        {/* Urgency bar - only show if actually configured */}
        {(hasExpiry || (hasLimit && m.limitQty > 0) || (isFlashActive && !isFree)) && (
          <div style={{ width: "100%", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {hasExpiry && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, background: expiryUrgent ? "#e8443a15" : T.gold + "15", border: `1px solid ${expiryUrgent ? "#e8443a33" : T.gold + "33"}` }}>
                <span style={{ fontSize: 11 }}>⏰</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: expiryUrgent ? "#e8443a" : T.gold, fontFamily: "'Plus Jakarta Sans'", fontVariantNumeric: "tabular-nums" }}>{formatCountdown(m.expiresAt)}</span>
              </div>
            )}
            {isFlashActive && !hasExpiry && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, background: "#e8443a15", border: "1px solid #e8443a33" }}>
                <span style={{ fontSize: 11 }}>⚡</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#e8443a", fontFamily: "'Plus Jakarta Sans'", fontVariantNumeric: "tabular-nums" }}>{formatCountdown(m.flashUntil)}</span>
              </div>
            )}
            {hasLimit && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, background: limitLow ? "#e8443a15" : T.accent + "15", border: `1px solid ${limitLow ? "#e8443a33" : T.accent + "33"}` }}>
                <span style={{ fontSize: 11 }}>🔢</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: limitLow ? "#e8443a" : T.accent, fontFamily: "'Plus Jakarta Sans'" }}>{m.limitQty - (m.limitUsed || 0)} vagas</span>
              </div>
            )}
          </div>
        )}

        {/* Social proof */}
        {config.socialProofMode !== "off" && (
          <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {(config.socialProofMode === "downloads" || config.socialProofMode === "both") && (
              <span style={{ fontSize: 11, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'" }}>📥 {getMatDownloads(m.id)} downloads</span>
            )}
            {(config.socialProofMode === "recent" || config.socialProofMode === "both") && (
              <>
                {config.socialProofMode === "both" && <span style={{ color: T.progressTrack }}>·</span>}
                <span style={{ fontSize: 11, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'", fontStyle: "italic" }}>{getRecentPerson(m.id)}</span>
              </>
            )}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginTop: 3, paddingTop: 9, borderTop: `1px solid ${T.progressTrack}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>{m.date}</span>
            {ago && <span style={{ fontSize: 10, color: T.newText, fontFamily: "'Plus Jakarta Sans'", fontWeight: 600 }}>{ago}</span>}
          </div>
          {isFree ? <span style={{ fontSize: 12, fontWeight: 600, color: T.accent }}>{isDl ? "Abrir ↓" : "Baixar ↓"}</span> : isFlashActive ? <span style={{ fontSize: 12, fontWeight: 600, color: "#e8443a" }}>Grátis por tempo limitado →</span> : surveyDone ? <span style={{ fontSize: 12, fontWeight: 600, color: T.accent }}>Baixar ↓</span> : m.unlockType === "data" ? <span style={{ fontSize: 12, fontWeight: 600, color: T.accent }}>📋 Completar perfil →</span> : m.unlockType === "survey" ? <span style={{ fontSize: 12, fontWeight: 600, color: T.gold }}>🔍 Responder pesquisa →</span> : <span style={{ fontSize: 12, fontWeight: 600, color: T.textFaint }}>Desbloquear →</span>}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════
  // LINKTREE (Bio Page)
  // ═══════════════════════════════════════
  if (view === "linktree") {
    const activeLinks = bioLinks.filter(l => l.active);
    const handleLinkClick = (link) => {
      // Track click
      const updated = bioLinks.map(l => l.id === link.id ? { ...l, clicks: (l.clicks || 0) + 1 } : l);
      saveBioLinks(updated);
      // Navigate
      if (link.url === "_hub") {
        // Check if user is logged in
        try {
          const saved = localStorage.getItem("vollhub_user");
          if (saved) { const u = JSON.parse(saved); if (u.name && u.whatsapp) { setUserName(u.name); setUserWhatsApp(u.whatsapp); if (u.downloaded) setDownloaded(u.downloaded); if (u.profile) setUserProfile(u.profile); setView("hub"); return; } }
        } catch(e) {}
        setView("landing");
      } else {
        window.open(link.url, "_blank");
      }
    };

    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 16px 40px", fontFamily: "'Outfit'", background: T.bg, position: "relative", overflow: "hidden" }}>
        <style>{getCSS(T)}</style>
        <div style={{ position: "fixed", top: "-25%", right: "-15%", width: 450, height: 450, borderRadius: "50%", background: `radial-gradient(circle, rgba(125,226,199,${T.glowOp}) 0%, transparent 70%)`, animation: "pulse 5s ease-in-out infinite", pointerEvents: "none" }} />
        <div style={{ width: "100%", maxWidth: 480, position: "relative", zIndex: 1 }}>
          {/* Bio Header */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "30px 0 20px", opacity: animateIn ? 1 : 0, transform: animateIn ? "translateY(0)" : "translateY(20px)", transition: "all 0.5s ease" }}>
            <div onClick={() => setLogoTaps(t => t + 1)} style={{ cursor: "pointer" }}>
              {config.bioPhotoUrl ? (
                <img src={config.bioPhotoUrl} alt="" style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover", border: `3px solid ${T.accent}` }} />
              ) : (
                <div style={{ width: 100, height: 100, borderRadius: "50%", background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, fontWeight: 800, color: "#060a09" }}>R</div>
              )}
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text, marginTop: 14 }}>{config.bioName || "RAFAEL JULIANO"}</h1>
            <p style={{ fontSize: 13, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'", marginTop: 4, textAlign: "center", lineHeight: 1.5 }}>{config.bioLine1}</p>
            <p style={{ fontSize: 13, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'", textAlign: "center", lineHeight: 1.5 }}>{config.bioLine2}</p>
            {(config.bioStat1 || config.bioStat2) && (
              <div style={{ display: "flex", gap: 24, marginTop: 12 }}>
                {config.bioStat1 && <div style={{ textAlign: "center" }}><span style={{ fontSize: 20, fontWeight: 800, color: T.accent }}>{config.bioStat1}</span><br/><span style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>{config.bioStat1Label}</span></div>}
                {config.bioStat2 && <div style={{ textAlign: "center" }}><span style={{ fontSize: 20, fontWeight: 800, color: T.accent }}>{config.bioStat2}</span><br/><span style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>{config.bioStat2Label}</span></div>}
              </div>
            )}
          </div>

          {/* Link Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {activeLinks.map((link, i) => (
              <div key={link.id} onClick={() => handleLinkClick(link)} style={{ borderRadius: 14, overflow: "hidden", cursor: "pointer", border: `1px solid ${T.cardBorder}`, background: T.cardBg, opacity: animateIn ? 1 : 0, transform: animateIn ? "translateY(0)" : "translateY(15px)", transition: `all 0.4s ease ${i * 0.05}s`, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                {link.imageUrl ? (
                  <img src={link.imageUrl} alt={link.title} style={{ width: "100%", display: "block", borderRadius: 14 }} />
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px" }}>
                    {link.icon && <span style={{ fontSize: 24 }}>{link.icon}</span>}
                    <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: T.text }}>{link.title}</span>
                    <span style={{ fontSize: 14, color: T.accent }}>→</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Social links */}
          <div style={{ display: "flex", justifyContent: "center", gap: 16, padding: "24px 0" }}>
            <a href={config.instagramUrl} target="_blank" rel="noreferrer" style={{ color: T.textFaint, fontSize: 13, textDecoration: "none", fontFamily: "'Plus Jakarta Sans'" }}>{config.instagramHandle}</a>
          </div>

          <footer style={{ textAlign: "center", paddingBottom: 16 }}>
            <p style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>© {new Date().getFullYear()} – VOLL Pilates Group</p>
          </footer>
        </div>
        <Toast />
      </div>
    );
  }

  // ═══════════════════════════════════════
  // LANDING
  // ═══════════════════════════════════════
  if (view === "landing") {
    const dlMat = deepLinkMatId ? materials.find((m) => m.id === deepLinkMatId && m.active) : null;
  // ─── LOADING ───
  if (dbLoading) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: "'Outfit'" }}>
      <div style={{ fontSize: 48, marginBottom: 16, animation: "pulse 1.5s ease-in-out infinite" }}>⚡</div>
      <p style={{ fontSize: 18, fontWeight: 600, color: T.text }}>Carregando VOLL Hub...</p>
      <p style={{ fontSize: 13, color: T.textFaint, marginTop: 4 }}>Conectando ao servidor</p>
    </div>
  );

  if (dbError) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: "'Outfit'", padding: 24 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
      <p style={{ fontSize: 18, fontWeight: 600, color: T.text }}>Erro de conexão</p>
      <p style={{ fontSize: 13, color: T.textFaint, marginTop: 4, textAlign: "center" }}>{dbError}</p>
      <button onClick={() => db.reload()} style={{ marginTop: 16, padding: "12px 24px", borderRadius: 12, background: T.accent, color: "#060a09", fontSize: 14, fontWeight: 600 }}>Tentar novamente</button>
    </div>
  );

    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px", fontFamily: "'Outfit'", background: T.bg, position: "relative", overflow: "hidden" }}>
        <style>{getCSS(T)}</style>
        <div style={{ position: "fixed", top: "-25%", right: "-15%", width: 450, height: 450, borderRadius: "50%", background: `radial-gradient(circle, rgba(125,226,199,${T.glowOp}) 0%, transparent 70%)`, animation: "pulse 5s ease-in-out infinite", pointerEvents: "none" }} />
        <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 24, padding: "36px 24px 28px", maxWidth: 400, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", zIndex: 1, animation: "fadeInUp 0.6s ease", boxShadow: T.shadow }}>
          <button onClick={() => setTheme((t) => t === "dark" ? "light" : "dark")} style={{ position: "absolute", top: 14, right: 14, width: 44, height: 26, borderRadius: 13, background: T.tabBg, border: `1px solid ${T.cardBorder}`, display: "flex", alignItems: "center", padding: "0 3px", zIndex: 5 }}><div style={{ width: 20, height: 20, borderRadius: "50%", background: T.accent, transform: theme === "dark" ? "translateX(0)" : "translateX(17px)", transition: "all 0.3s", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>{theme === "dark" ? "🌙" : "☀️"}</div></button>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 8, cursor: "pointer", userSelect: "none" }} onClick={() => setLogoTaps((t) => t + 1)}>
            <div style={{ marginBottom: 12 }}><InfLogo /></div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: 1.5, textAlign: "center" }}>{config.brandName}</h1>
            <p style={{ fontSize: 13, color: T.accent, marginTop: 4, fontWeight: 500, fontFamily: "'Plus Jakarta Sans'" }}>{config.brandTag}</p>
          </div>

          {/* Deep link preview */}
          {dlMat ? (
            <div style={{ width: "100%", margin: "12px 0 16px", padding: "14px 16px", borderRadius: 14, background: T.spotBg, border: `2px solid ${T.spotBorder}`, display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: T.matIcon, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ fontSize: 24 }}>{dlMat.icon}</span></div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'Plus Jakarta Sans'" }}>📌 Seu material</span>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, marginTop: 2 }}>{dlMat.title}</h3>
                <p style={{ fontSize: 12, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'", marginTop: 2 }}>{dlMat.description}</p>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 14, color: T.textMuted, textAlign: "center", lineHeight: 1.6, margin: "12px 0 20px", whiteSpace: "pre-line", fontFamily: "'Plus Jakarta Sans'" }}>{config.landingSubtitle}</p>
          )}

          {!dlMat && (
            <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 24, padding: "14px 18px", background: T.inputBg, borderRadius: 14, border: `1px solid ${T.inputBorder}`, width: "100%", justifyContent: "center" }}>
              {[[activeMats.length, config.landingStat1Label], [config.landingStat2, config.landingStat2Label], [config.landingStat3, config.landingStat3Label]].map(([n, l], i) => (<div key={i} style={{ display: "flex", alignItems: "center" }}>{i > 0 && <div style={{ width: 1, height: 26, background: T.cardBorder, marginRight: 18 }} />}<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}><span style={{ fontSize: 17, fontWeight: 700, color: T.accent }}>{n}</span><span style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>{l}</span></div></div>))}
            </div>
          )}

          <div style={{ width: "100%", marginBottom: 12 }}><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.textMuted, marginBottom: 5, fontFamily: "'Plus Jakarta Sans'" }}>{config.nameLabel}</label><input style={inp} placeholder={config.namePlaceholder} value={userName} onChange={(e) => setUserName(e.target.value)} /></div>
          <div style={{ width: "100%", marginBottom: 12 }}><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.textMuted, marginBottom: 5, fontFamily: "'Plus Jakarta Sans'" }}>{config.whatsLabel}</label><input style={inp} type="tel" placeholder="(19) 99921-4116" value={userWhatsApp} onChange={(e) => setUserWhatsApp(fmtWA(e.target.value))} /><p style={{ fontSize: 10, color: waDigitsCount === 11 ? T.accent : T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginTop: 4 }}>{waDigitsCount === 11 ? "✅ Número válido" : `(DDD) 9XXXX-XXXX · ${waDigitsCount}/11 dígitos`}</p></div>
          <button onClick={handleLogin} style={{ width: "100%", padding: "15px", borderRadius: 14, background: "linear-gradient(135deg, #349980, #7DE2C7)", color: "#060a09", fontSize: 16, fontWeight: 700, marginTop: 6, boxShadow: "0 4px 20px #34998033" }}>{dlMat ? `Baixar "${dlMat.title}" →` : config.ctaText}</button>
          <p style={{ fontSize: 11, color: T.textFaint, marginTop: 14, fontFamily: "'Plus Jakarta Sans'" }}>{config.safeText}</p>
          <button onClick={() => setView("linktree")} style={{ background: "none", color: T.accent, fontSize: 13, marginTop: 12, fontFamily: "'Plus Jakarta Sans'", fontWeight: 600 }}>← Voltar</button>
        </div>
        <a href={config.instagramUrl} target="_blank" rel="noreferrer" style={{ color: T.textFaint, fontSize: 13, marginTop: 18, textDecoration: "none", fontFamily: "'Plus Jakarta Sans'", position: "relative", zIndex: 1 }}>{config.instagramHandle}</a>
        <Toast />
      </div>
    );
  }

  // ═══════════════════════════════════════
  // ADMIN LOGIN
  // ═══════════════════════════════════════
  if (view === "admin-login") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px", fontFamily: "'Outfit'", background: T.bg }}>
        <style>{getCSS(T)}</style>
        <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 24, padding: "36px 24px 28px", maxWidth: 360, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1, animation: "fadeInUp 0.6s ease" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: T.text }}>Painel Admin</h2>
          <p style={{ fontSize: 14, color: T.textMuted, marginBottom: 20, fontFamily: "'Plus Jakarta Sans'" }}>Digite o PIN</p>
          <div style={{ width: "100%", marginBottom: 12 }}><input style={{ ...inp, textAlign: "center", letterSpacing: 12, fontSize: 28, fontWeight: 700 }} type="password" maxLength={4} placeholder="• • • •" value={adminPin} onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()} /></div>
          <button onClick={handleAdminLogin} style={{ width: "100%", padding: "15px", borderRadius: 14, background: "linear-gradient(135deg, #349980, #7DE2C7)", color: "#060a09", fontSize: 16, fontWeight: 700, marginTop: 6 }}>Entrar</button>
          <button onClick={() => setView("linktree")} style={{ background: "none", color: T.textMuted, fontSize: 14, marginTop: 14, fontFamily: "'Plus Jakarta Sans'" }}>← Voltar</button>
        </div>
        <Toast />
      </div>
    );
  }

  // ═══════════════════════════════════════
  // ADMIN
  // ═══════════════════════════════════════
  if (view === "admin") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 16px", fontFamily: "'Outfit'", background: T.bg, position: "relative", overflow: "hidden" }}>
        <style>{getCSS(T)}</style>
        <div style={{ width: "100%", maxWidth: 520, position: "relative", zIndex: 1 }}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0 12px", flexWrap: "wrap", gap: 8 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text }}>Painel Admin</h1>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                <span style={{ fontSize: 12, color: T.accent, fontFamily: "'Plus Jakarta Sans'" }}>{currentAdmin?.name}</span>
                <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 5, background: isMaster ? T.gold + "22" : T.accent + "22", color: isMaster ? T.gold : T.accent, fontWeight: 700, fontFamily: "'Plus Jakarta Sans'", textTransform: "uppercase", letterSpacing: 0.5 }}>{isMaster ? "👑 MASTER" : "ADMIN"}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => { db.reload(); showT("Dados atualizados! 🔄"); }} style={{ padding: "8px 12px", borderRadius: 10, background: T.statBg, border: `1px solid ${T.statBorder}`, fontSize: 14 }}>🔄</button>
              <button onClick={() => setTheme((t) => t === "dark" ? "light" : "dark")} style={{ padding: "8px 12px", borderRadius: 10, background: T.statBg, border: `1px solid ${T.statBorder}`, fontSize: 14 }}>{theme === "dark" ? "☀️" : "🌙"}</button>
              <button onClick={() => setView("hub")} style={{ padding: "8px 14px", borderRadius: 10, background: T.statBg, border: `1px solid ${T.statBorder}`, color: T.accent, fontSize: 12, fontWeight: 600 }}>👁 Preview</button>
              <button onClick={() => { setView("linktree"); setCurrentAdmin(null); }} style={{ padding: "8px 14px", borderRadius: 10, background: T.dangerBg, border: `1px solid ${T.dangerBrd}`, color: T.dangerTxt, fontSize: 12, fontWeight: 600 }}>Sair</button>
            </div>
          </header>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            {[{ l: "Leads", v: leads.length, i: "👥", c: T.accent }, { l: "Downloads", v: totalDl, i: "📥", c: T.accentDark }, { l: "Materiais", v: activeMats.length, i: "📄", c: T.gold }, { l: "Indicações", v: leads.filter((l2) => l2.source === "referral").length, i: "🔗", c: T.accent }].map((st, i) => (
              <div key={i} style={{ background: T.statBg, border: `1px solid ${T.statBorder}`, borderRadius: 14, padding: "14px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, opacity: animateIn ? 1 : 0, transform: animateIn ? "translateY(0)" : "translateY(20px)", transition: `all 0.4s ease ${i * 0.08}s` }}>
                <span style={{ fontSize: 22 }}>{st.i}</span><span style={{ fontSize: 26, fontWeight: 800, color: st.c }}>{st.v}</span><span style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>{st.l}</span>
              </div>
            ))}
          </div>

          {/* Permission-based tabs */}
          <div style={{ display: "flex", gap: 3, marginBottom: 16, background: T.tabBg, borderRadius: 12, padding: 4, border: `1px solid ${T.tabBorder}`, flexWrap: "wrap" }}>
            {[
              can("materials_view") && ["materials", "📄"],
              can("leads_view") && ["leads", "👥"],
              can("leads_view") && ["insights", "📊"],
              can("textos_edit") && ["bio", "🔗"],
              can("textos_edit") && ["textos", "✏️"],
              isMaster && ["users", "👑"],
              isMaster && ["log", "📜"],
            ].filter(Boolean).map(([t, lbl]) => (<button key={t} onClick={() => setAdminTab(t)} style={{ flex: 1, padding: "10px 0", borderRadius: 9, background: adminTab === t ? T.tabActiveBg : "transparent", color: adminTab === t ? (t === "users" ? T.gold : T.accent) : T.textFaint, fontSize: 14, fontWeight: 600, transition: "all 0.2s", border: adminTab === t ? `1px solid ${T.statBorder}` : "1px solid transparent", minWidth: 40 }}>{lbl}</button>))}
          </div>

          {/* MATERIALS */}
          {adminTab === "materials" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {can("materials_edit") && (!showNewForm ? <button onClick={() => setShowNewForm(true)} style={{ width: "100%", padding: "14px", borderRadius: 14, background: T.accent + "15", border: `2px dashed ${T.accent}44`, color: T.accent, fontSize: 14, fontWeight: 700 }}>＋ Novo Material</button> : (
                <div style={{ background: T.statBg, border: `2px solid ${T.accent}44`, borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}><h3 style={{ fontSize: 15, fontWeight: 700, color: T.accent }}>＋ Novo Material</h3><button onClick={() => setShowNewForm(false)} style={{ background: "none", color: T.textFaint, fontSize: 16 }}>✕</button></div>
                  <div style={{ display: "flex", gap: 8 }}><button onClick={() => setShowIconPicker("new")} style={{ width: 48, height: 48, borderRadius: 12, background: T.inputBg, border: `1px solid ${T.inputBorder}`, fontSize: 24, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{newMat.icon}</button><div style={{ flex: 1 }}><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Título</label><input value={newMat.title} onChange={(e) => setNewMat((p) => ({ ...p, title: e.target.value }))} style={sInp} placeholder="Nome" /></div></div>
                  <div><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Descrição</label><textarea value={newMat.description} onChange={(e) => setNewMat((p) => ({ ...p, description: e.target.value }))} style={{ ...sInp, minHeight: 45, resize: "vertical" }} placeholder="Breve descrição" /></div>
                  <div><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>🔗 Link do material (Canva, Drive, PDF, etc)</label><input value={newMat.downloadUrl || ""} onChange={(e) => setNewMat((p) => ({ ...p, downloadUrl: e.target.value }))} style={sInp} placeholder="https://www.canva.com/..." /></div>
                  <div style={{ display: "flex", gap: 8 }}><div style={{ flex: 1 }}><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Categoria</label><input value={newMat.category} onChange={(e) => setNewMat((p) => ({ ...p, category: e.target.value }))} style={sInp} placeholder="Ex: Marketing" /></div><div style={{ flex: 1 }}><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Data</label><input value={newMat.date} onChange={(e) => setNewMat((p) => ({ ...p, date: e.target.value }))} style={sInp} placeholder="Auto" /></div></div>
                  <UnlockEditor mat={newMat} onChange={(k, v) => setNewMat((p) => ({ ...p, [k]: v }))} />
                  <button onClick={addMat} style={{ width: "100%", padding: "13px", borderRadius: 12, background: "linear-gradient(135deg, #349980, #7DE2C7)", color: "#060a09", fontSize: 14, fontWeight: 700, marginTop: 4 }}>✅ Criar material</button>
                </div>
              ))}

              {materials.map((m, i) => {
                const ul = getUnlockLabel(m);
                return (
                  <div key={m.id} style={{ background: T.statBg, border: `1px solid ${T.statBorder}`, borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 10, borderLeft: `3px solid ${m.active ? T.accent : T.textFaint}`, opacity: animateIn ? 1 : 0, transform: animateIn ? "translateY(0)" : "translateY(15px)", transition: `all 0.3s ease ${i * 0.05}s` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 22 }}>{m.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}><h3 style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{m.title}</h3><p style={{ fontSize: 12, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginTop: 2 }}>{m.category} · <span style={{ color: ul.color }}>{ul.icon} {ul.label}</span></p></div>
                      {can("materials_edit") && <button onClick={() => setEditId(editId === m.id ? null : m.id)} style={{ padding: "5px 10px", borderRadius: 7, background: T.tabBg, border: `1px solid ${T.tabBorder}`, color: T.textMuted, fontSize: 11, fontWeight: 600 }}>{editId === m.id ? "Fechar" : "✏️"}</button>}
                    </div>

                    {/* LINK COPIER */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, background: T.inputBg, borderRadius: 9, padding: "6px 10px", border: `1px solid ${T.inputBorder}` }}>
                      <span style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{config.baseUrl}/?m={m.id}</span>
                      <button onClick={() => copyLink(m.id)} style={{ padding: "4px 10px", borderRadius: 6, background: linkCopied === m.id ? T.successBg : T.tabBg, border: `1px solid ${linkCopied === m.id ? T.accent + "44" : T.tabBorder}`, color: linkCopied === m.id ? T.accent : T.textMuted, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", transition: "all 0.2s" }}>{linkCopied === m.id ? "✅ Copiado!" : "📋 Copiar link"}</button>
                    </div>

                    {can("materials_edit") && editId === m.id && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 10, borderTop: `1px solid ${T.cardBorder}` }}>
                        <div style={{ display: "flex", gap: 8 }}><button onClick={() => setShowIconPicker(m.id)} style={{ width: 48, height: 48, borderRadius: 12, background: T.inputBg, border: `1px solid ${T.inputBorder}`, fontSize: 24, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{m.icon}</button><div style={{ flex: 1 }}><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Título</label><input defaultValue={m.title} onBlur={(e) => updMat(m.id, "title", e.target.value)} key={"mt-" + m.id} style={sInp} /></div></div>
                        <div><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Descrição</label><textarea defaultValue={m.description} onBlur={(e) => updMat(m.id, "description", e.target.value)} key={"md-" + m.id} style={{ ...sInp, minHeight: 45, resize: "vertical" }} /></div>
                        <div><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>🔗 Link do material (Canva, Drive, PDF, etc)</label><input defaultValue={m.downloadUrl || ""} onBlur={(e) => updMat(m.id, "downloadUrl", e.target.value)} key={"mdu-" + m.id} style={sInp} placeholder="https://www.canva.com/..." /></div>
                        <div style={{ background: T.inputBg, borderRadius: 8, padding: 8, border: `1px solid ${T.inputBorder}` }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: T.gold, marginBottom: 6 }}>📸 Instagram do post</p>
                          <div><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Link do post</label><input defaultValue={m.instaPostUrl || ""} onBlur={(e) => updMat(m.id, "instaPostUrl", e.target.value)} key={"mip-" + m.id} style={sInp} placeholder="https://instagram.com/p/..." /></div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <div style={{ flex: 1 }}><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>👁 Views</label><input type="number" defaultValue={m.instaViews || 0} onBlur={(e) => updMat(m.id, "instaViews", parseInt(e.target.value) || 0)} key={"miv-" + m.id} style={sInp} /></div>
                            <div style={{ flex: 1 }}><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>❤️ Curtidas</label><input type="number" defaultValue={m.instaLikes || 0} onBlur={(e) => updMat(m.id, "instaLikes", parseInt(e.target.value) || 0)} key={"mil-" + m.id} style={sInp} /></div>
                            <div style={{ flex: 1 }}><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>💬 Coments</label><input type="number" defaultValue={m.instaComments || 0} onBlur={(e) => updMat(m.id, "instaComments", parseInt(e.target.value) || 0)} key={"mic-" + m.id} style={sInp} /></div>
                            <div style={{ flex: 1 }}><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>🔖 Salvam.</label><input type="number" defaultValue={m.instaSaves || 0} onBlur={(e) => updMat(m.id, "instaSaves", parseInt(e.target.value) || 0)} key={"mis-" + m.id} style={sInp} /></div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}><div style={{ flex: 1 }}><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Categoria</label><input defaultValue={m.category} onBlur={(e) => updMat(m.id, "category", e.target.value)} key={"mc-" + m.id} style={sInp} /></div><div style={{ flex: 1 }}><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Data</label><input defaultValue={m.date} onBlur={(e) => updMat(m.id, "date", e.target.value)} key={"mda-" + m.id} style={sInp} /></div></div>
                        <UnlockEditor mat={m} onChange={(k, v) => updMat(m.id, k, v)} />
                        {confirmDeleteId === m.id ? (
                          <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 12px", borderRadius: 10, background: T.dangerBg, border: `1px solid ${T.dangerBrd}` }}>
                            <span style={{ fontSize: 13, color: T.dangerTxt, flex: 1, fontFamily: "'Plus Jakarta Sans'" }}>Excluir?</span>
                            <button onClick={() => deleteMat(m.id)} style={{ padding: "6px 14px", borderRadius: 8, background: "#e84444", color: "#fff", fontSize: 12, fontWeight: 700 }}>Sim</button>
                            <button onClick={() => setConfirmDeleteId(null)} style={{ padding: "6px 14px", borderRadius: 8, background: T.inputBg, border: `1px solid ${T.inputBorder}`, color: T.textMuted, fontSize: 12, fontWeight: 600 }}>Não</button>
                          </div>
                        ) : (<button onClick={() => setConfirmDeleteId(m.id)} style={{ width: "100%", padding: "10px", borderRadius: 10, background: T.dangerBg, border: `1px solid ${T.dangerBrd}`, color: T.dangerTxt, fontSize: 13, fontWeight: 600 }}>🗑️ Excluir</button>)}
                      </div>
                    )}

                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {can("materials_edit") && <button onClick={() => updMat(m.id, "active", !m.active)} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: m.active ? T.successBg : T.dangerBg, color: m.active ? T.accent : T.gold, border: `1px solid ${m.active ? T.accent + "33" : T.gold + "33"}` }}>{m.active ? "✓ Ativo" : "Inativo"}</button>}
                      <span style={{ fontSize: 12, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginLeft: "auto" }}>📥 {leads.reduce((s2, l) => s2 + (l.downloads.includes(m.id) ? 1 : 0), 0)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* LEADS */}
          {adminTab === "leads" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Search + Bulk Actions Bar */}
              <input style={{ ...inp, marginBottom: 2 }} placeholder="🔍 Buscar por nome ou WhatsApp..." value={searchLead} onChange={(e) => setSearchLead(e.target.value)} key="lead-search" />

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {can("leads_export") && <button onClick={() => exportCSV(segmentedLeads)} style={{ padding: "8px 14px", borderRadius: 9, background: T.statBg, border: `1px solid ${T.statBorder}`, color: T.accent, fontSize: 12, fontWeight: 600, flex: 1 }}>📊 Exportar CSV</button>}
                {can("leads_export") && <button onClick={() => copyAllNumbers(segmentedLeads)} style={{ padding: "8px 14px", borderRadius: 9, background: T.statBg, border: `1px solid ${T.statBorder}`, color: T.accent, fontSize: 12, fontWeight: 600, flex: 1 }}>📋 Copiar números</button>}
                {can("leads_whatsapp") && <button onClick={() => setShowBulkWA(true)} style={{ padding: "8px 14px", borderRadius: 9, background: "#25D36622", border: "1px solid #25D36644", color: "#25D366", fontSize: 12, fontWeight: 600, flex: 1 }}>💬 Enviar em massa</button>}
              </div>

              {/* Segment Filters */}
              <div style={{ display: "flex", gap: 4, padding: 4, background: T.tabBg, borderRadius: 10, border: `1px solid ${T.tabBorder}` }}>
                {[["all", "Todos", T.text], ["hot", "🔥 Quentes", T.gold], ["warm", "Engajados", T.accent], ["cold", "❄️ Frios", T.textFaint], ["referral", "🔗 Indicados", T.accent]].map(([k, lbl, clr]) => (
                  <button key={k} onClick={() => setLeadFilter(k)} style={{ flex: 1, padding: "7px 2px", borderRadius: 7, fontSize: 10, fontWeight: 600, background: leadFilter === k ? T.tabActiveBg : "transparent", color: leadFilter === k ? clr : T.textFaint, border: leadFilter === k ? `1px solid ${T.statBorder}` : "1px solid transparent", transition: "all 0.2s", position: "relative" }}>
                    {lbl}
                    <span style={{ display: "block", fontSize: 9, fontWeight: 400, color: T.textFaint, marginTop: 1 }}>{segmentCounts[k]}</span>
                  </button>
                ))}
              </div>

              {/* Segment Legend */}
              <div style={{ display: "flex", gap: 12, padding: "6px 10px", flexWrap: "wrap" }}>
                {[["🔥 Quentes", "3+ downloads", T.gold], ["Engajados", "1-2 downloads", T.accent], ["❄️ Frios", "0 downloads", T.textFaint]].map(([l, d, c]) => (
                  <span key={l} style={{ fontSize: 10, color: c, fontFamily: "'Plus Jakarta Sans'" }}>{l}: <span style={{ color: T.textFaint }}>{d}</span></span>
                ))}
              </div>

              {/* Profile Phase Stats */}
              <div style={{ display: "flex", gap: 6 }}>
                {[["🎓 Fase 1", leads.filter(l => l.phase1Complete).length], ["💼 Fase 2", leads.filter(l => l.phase2Complete).length], ["✨ Fase 3", leads.filter(l => l.phase3Complete).length]].map(([label, count]) => (
                  <div key={label} style={{ flex: 1, background: T.statBg, border: `1px solid ${T.statBorder}`, borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
                    <span style={{ display: "block", fontSize: 18, fontWeight: 800, color: T.gold }}>{count}</span>
                    <span style={{ fontSize: 9, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'" }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* Lead Cards */}
              {segmentedLeads.map((l, i) => {
                const seg = getLeadSegment(l);
                const segColor = seg === "hot" ? T.gold : seg === "warm" ? T.accent : T.textFaint;
                return (
                <div key={l.id} style={{ background: T.statBg, border: `1px solid ${T.statBorder}`, borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 10, borderLeft: `3px solid ${segColor}`, opacity: animateIn ? 1 : 0, transform: animateIn ? "translateY(0)" : "translateY(15px)", transition: `all 0.3s ease ${i * 0.05}s` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg, ${segColor}, ${segColor}88)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#060a09", fontSize: 16, fontWeight: 800, flexShrink: 0 }}>{l.name.charAt(0)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{l.name}</h3>
                        {seg === "hot" && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 5, background: T.gold + "22", color: T.gold, fontWeight: 700 }}>🔥 QUENTE</span>}
                      </div>
                      <p style={{ fontSize: 12, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginTop: 2 }}>{l.whatsapp}</p>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {l.source === "referral" && <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: T.successBg, color: T.accent, fontFamily: "'Plus Jakarta Sans'" }}>🔗</span>}
                      {can("leads_whatsapp") && <button onClick={(e) => { e.stopPropagation(); openWA(l); }} style={{ width: 34, height: 34, borderRadius: 8, background: "#25D36622", border: "1px solid #25D36644", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }} title="Enviar WhatsApp">💬</button>}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, background: T.inputBg, borderRadius: 10, padding: "10px 8px" }}>
                    {[[l.downloads.length, "downloads"], [l.visits, "visitas"], [l.firstVisit, "1ª visita"], [l.lastVisit, "última"]].map(([v, lb], j) => (<div key={j} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}><span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{v}</span><span style={{ fontSize: 9, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>{lb}</span></div>))}
                  </div>
                  {l.downloads.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{l.downloads.map((d) => { const mt = materials.find((mm) => mm.id === d); return mt ? <span key={d} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: T.successBg, border: `1px solid ${T.cardBorder}`, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'" }}>{mt.icon} {mt.title}</span> : null; })}</div>}
                  {(l.grau || l.formacao || l.atuaPilates || l.temStudio || l.maiorDesafio || l.tipoConteudo || l.perguntaMentoria || l.maiorSonho || l.profAdmira) && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {[["🎓", l.grau], ["📚", l.formacao], ["🧘", l.atuaPilates], ["🏢", l.temStudio], ["🎯", l.maiorDesafio], ["📦", l.tipoConteudo], ["❓", l.perguntaMentoria], ["💭", l.maiorSonho], ["⭐", l.profAdmira]].filter(([, v]) => v).map(([ic, v], j) => (
                        <span key={j} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, background: T.inputBg, border: `1px solid ${T.inputBorder}`, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'" }}>{ic} {v}</span>
                      ))}
                    </div>
                  )}
                  {l.surveyResponses && Object.keys(l.surveyResponses).length > 0 && (
                    <div style={{ marginTop: 2 }}>
                      {Object.entries(l.surveyResponses).map(([matId, answers]) => {
                        const mat = materials.find((mm) => mm.id === parseInt(matId));
                        return mat ? (
                          <div key={matId} style={{ background: T.gold + "08", border: `1px solid ${T.gold}22`, borderRadius: 8, padding: "8px 10px", marginTop: 4 }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: T.gold, marginBottom: 4, fontFamily: "'Plus Jakarta Sans'" }}>🔍 Pesquisa: {mat.title}</p>
                            {(mat.surveyQuestions || []).map((q) => answers[q.id] ? (
                              <p key={q.id} style={{ fontSize: 10, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'", marginBottom: 2 }}><span style={{ color: T.textFaint }}>{q.question}</span> → <strong style={{ color: T.text }}>{answers[q.id]}</strong></p>
                            ) : null)}
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              );})}
              <p style={{ color: T.textFaint, fontSize: 12, textAlign: "center", marginTop: 12, fontFamily: "'Plus Jakarta Sans'" }}>{segmentedLeads.length} de {leads.length} lead{leads.length !== 1 && "s"}</p>
            </div>
          )}

          {/* BULK WHATSAPP MODAL */}
          {showBulkWA && (() => {
            const sending = bulkWAIndex >= 0;
            const currentLead = sending ? segmentedLeads[bulkWAIndex] : null;
            const total = segmentedLeads.length;
            const sentCount = bulkWASent.length;
            const progress = total > 0 ? (sentCount / total) * 100 : 0;
            const startSending = () => { setBulkWAIndex(0); setBulkWASent([]); };
            const sendCurrent = () => { if (!currentLead) return; openWA(currentLead, bulkMsg); setBulkWASent(p => [...p, currentLead.id]); };
            const goNext = () => { if (bulkWAIndex < total - 1) setBulkWAIndex(p => p + 1); else { setBulkWAIndex(-1); showT(`✅ ${sentCount} mensagens enviadas!`); } };
            const closeBulk = () => { setShowBulkWA(false); setBulkWAIndex(-1); setBulkWASent([]); };
            return (
              <div style={{ position: "fixed", inset: 0, background: T.overlayBg, backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 150, padding: 16 }} onClick={closeBulk}>
                <div onClick={(e) => e.stopPropagation()} style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 20, padding: "28px 22px", maxWidth: 420, width: "100%", display: "flex", flexDirection: "column", gap: 14, animation: "fadeInUp 0.3s ease", maxHeight: "85vh", overflowY: "auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: T.text }}>💬 Envio Sequencial</h3>
                    <button onClick={closeBulk} style={{ background: "none", color: T.textFaint, fontSize: 18 }}>✕</button>
                  </div>
                  {!sending ? (<>
                    <div style={{ padding: "12px 14px", borderRadius: 12, background: T.inputBg, border: `1px solid ${T.inputBorder}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Destinatários</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: T.accent }}>{total} leads</span>
                      </div>
                      <p style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Filtro: <span style={{ color: T.accent, fontWeight: 600 }}>{leadFilter === "all" ? "Todos" : leadFilter === "hot" ? "🔥 Quentes" : leadFilter === "warm" ? "Engajados" : leadFilter === "cold" ? "❄️ Frios" : "🔗 Indicados"}</span></p>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.textMuted, marginBottom: 5, fontFamily: "'Plus Jakarta Sans'" }}>Mensagem <span style={{ fontWeight: 400, color: T.textFaint }}>( use {"\"{nome}\""} )</span></label>
                      <textarea defaultValue={bulkMsg} onBlur={(e) => setBulkMsg(e.target.value)} key="bulk-msg" style={{ ...inp, minHeight: 80, resize: "vertical" }} />
                    </div>
                    <div style={{ padding: "10px 14px", borderRadius: 10, background: T.statBg, border: `1px solid ${T.statBorder}` }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, marginBottom: 4, fontFamily: "'Plus Jakarta Sans'" }}>Preview:</p>
                      <p style={{ fontSize: 13, color: T.text, fontFamily: "'Plus Jakarta Sans'", lineHeight: 1.5 }}>{bulkMsg.replace("{nome}", segmentedLeads[0]?.name.split(" ")[0] || "Nome")}</p>
                    </div>
                    <button onClick={startSending} style={{ padding: "14px", borderRadius: 12, background: "#25D366", color: "#fff", fontSize: 14, fontWeight: 700 }}>💬 Iniciar envio ({total} leads)</button>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => { copyAllNumbers(segmentedLeads); closeBulk(); }} style={{ flex: 1, padding: "10px", borderRadius: 10, background: T.statBg, border: `1px solid ${T.statBorder}`, color: T.accent, fontSize: 12, fontWeight: 600 }}>📋 Copiar números</button>
                      <button onClick={() => { exportCSV(segmentedLeads); closeBulk(); }} style={{ flex: 1, padding: "10px", borderRadius: 10, background: T.statBg, border: `1px solid ${T.statBorder}`, color: T.accent, fontSize: 12, fontWeight: 600 }}>📊 Exportar CSV</button>
                    </div>
                  </>) : (<>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'" }}>Progresso</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: T.accent, fontFamily: "'Plus Jakarta Sans'" }}>{sentCount}/{total}</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 4, background: T.progressTrack, overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 4, background: "linear-gradient(90deg, #25D366, #7DE2C7)", width: `${progress}%`, transition: "width 0.4s" }} /></div>
                    </div>
                    {currentLead && (
                      <div style={{ padding: "16px", borderRadius: 14, background: T.statBg, border: `1px solid ${T.statBorder}`, textAlign: "center" }}>
                        <div style={{ width: 50, height: 50, borderRadius: "50%", background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#060a09", margin: "0 auto 10px" }}>{currentLead.name.charAt(0).toUpperCase()}</div>
                        <h4 style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{currentLead.name}</h4>
                        <p style={{ fontSize: 13, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'", marginTop: 2 }}>{currentLead.whatsapp}</p>
                        <p style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginTop: 4 }}>{currentLead.downloads?.length || 0} downloads · {currentLead.visits || 0} visitas</p>
                        <div style={{ fontSize: 11, color: T.accent, marginTop: 6 }}>{bulkWAIndex + 1} de {total}</div>
                      </div>
                    )}
                    <div style={{ padding: "10px 14px", borderRadius: 10, background: T.inputBg, border: `1px solid ${T.inputBorder}` }}>
                      <p style={{ fontSize: 12, color: T.text, fontFamily: "'Plus Jakarta Sans'", lineHeight: 1.5 }}>{bulkMsg.replace("{nome}", currentLead?.name.split(" ")[0] || "")}</p>
                    </div>
                    {!bulkWASent.includes(currentLead?.id) ? (
                      <button onClick={sendCurrent} style={{ padding: "14px", borderRadius: 12, background: "#25D366", color: "#fff", fontSize: 14, fontWeight: 700 }}>💬 Abrir WhatsApp de {currentLead?.name.split(" ")[0]}</button>
                    ) : (
                      <div style={{ padding: "10px 14px", borderRadius: 10, background: T.dlBg, border: `1px solid ${T.accent}44`, textAlign: "center" }}>
                        <span style={{ fontSize: 13, color: T.accent, fontWeight: 600 }}>✅ Aberto! Envie e clique Próximo</span>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => goNext()} style={{ flex: 1, padding: "12px", borderRadius: 10, background: T.statBg, border: `1px solid ${T.statBorder}`, color: T.textFaint, fontSize: 13, fontWeight: 600 }}>⏭ Pular</button>
                      <button onClick={() => goNext()} style={{ flex: 1, padding: "12px", borderRadius: 10, background: bulkWASent.includes(currentLead?.id) ? "#25D366" : T.statBg, border: `1px solid ${bulkWASent.includes(currentLead?.id) ? "#25D36644" : T.statBorder}`, color: bulkWASent.includes(currentLead?.id) ? "#fff" : T.textFaint, fontSize: 13, fontWeight: 700 }}>{bulkWAIndex < total - 1 ? "Próximo →" : "✅ Finalizar"}</button>
                    </div>
                  </>)}
                  <p style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", textAlign: "center" }}>{sending ? "Envie no WhatsApp antes de ir pro próximo." : "Filtre os leads antes para segmentar."}</p>
                </div>
              </div>
            );
          })()}

          {/* INSIGHTS */}
          {adminTab === "insights" && (() => {
            const activeMats = materials.filter(m => m.active);
            const matDlCounts = activeMats.map(m => ({ ...m, dlCount: leads.filter(l => (l.downloads || []).includes(m.id)).length })).sort((a, b) => b.dlCount - a.dlCount);
            const totalDl = matDlCounts.reduce((s, m) => s + m.dlCount, 0);
            const avgDl = activeMats.length > 0 ? (totalDl / activeMats.length).toFixed(1) : 0;
            const topMat = matDlCounts[0];
            const categories = [...new Set(activeMats.map(m => m.category).filter(Boolean))];
            const catStats = categories.map(c => {
              const mats = matDlCounts.filter(m => m.category === c);
              return { name: c, count: mats.length, totalDl: mats.reduce((s, m) => s + m.dlCount, 0), avgDl: mats.length > 0 ? (mats.reduce((s, m) => s + m.dlCount, 0) / mats.length).toFixed(1) : 0 };
            }).sort((a, b) => b.totalDl - a.totalDl);

            // Profile cross-data for top material
            const getProfileBreakdown = (matId) => {
              const dlLeads = leads.filter(l => (l.downloads || []).includes(matId));
              if (dlLeads.length === 0) return [];
              const fields = [
                { key: "grau", label: "Grau" },
                { key: "formacao", label: "Formação" },
                { key: "atuaPilates", label: "Atua c/ Pilates" },
                { key: "temStudio", label: "Tem Studio" },
              ];
              return fields.map(f => {
                const vals = {};
                dlLeads.forEach(l => { const v = l[f.key]; if (v) vals[v] = (vals[v] || 0) + 1; });
                const entries = Object.entries(vals).sort((a, b) => b[1] - a[1]);
                return { ...f, entries, total: dlLeads.length };
              }).filter(f => f.entries.length > 0);
            };

            const pageViews = parseInt(config.pageViews) || 0;
            const registeredLeads = leads.length;
            const leadsWithDl = leads.filter(l => (l.downloads || []).length > 0).length;
            const leadsPhase1 = leads.filter(l => l.phase1Complete).length;
            const regRate = pageViews > 0 ? ((registeredLeads / pageViews) * 100).toFixed(1) : "—";
            const dlRate = registeredLeads > 0 ? ((leadsWithDl / registeredLeads) * 100).toFixed(1) : "—";

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Funnel */}
                <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 12 }}>🔄 Funil de Conversão</h3>
                  {[[pageViews, "Acessaram a página", "100%", T.textFaint],
                    [registeredLeads, "Se cadastraram", regRate + "%", T.accent],
                    [leadsWithDl, "Baixaram algo", dlRate + "%", T.gold],
                    [leadsPhase1, "Completaram Fase 1", registeredLeads > 0 ? ((leadsPhase1 / registeredLeads) * 100).toFixed(1) + "%" : "—", "#E87C3A"],
                  ].map(([val, label, pct, color], i) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                        <span style={{ fontSize: 12, color: T.text, fontFamily: "'Plus Jakarta Sans'" }}>{label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color }}>{val} <span style={{ fontSize: 10, fontWeight: 400, color: T.textFaint }}>({pct})</span></span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: T.progressTrack, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 3, background: color, width: `${pageViews > 0 ? (val / pageViews) * 100 : 0}%`, transition: "width 0.5s" }} />
                      </div>
                    </div>
                  ))}
                  <p style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginTop: 6 }}>Acessos contabilizados desde a ativação do contador.</p>
                </div>

                {/* Bio Link Clicks */}
                {(() => {
                  const linksWithClicks = bioLinks.filter(l => l.active && (l.clicks || 0) > 0).sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
                  const totalClicks = bioLinks.reduce((s, l) => s + (l.clicks || 0), 0);
                  const topClicks = linksWithClicks[0]?.clicks || 1;
                  if (totalClicks === 0) return null;
                  return (
                    <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: 16 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>🔗 Cliques nos Links</h3>
                      <p style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginBottom: 12 }}>Total: {totalClicks} cliques</p>
                      {linksWithClicks.map((link, i) => {
                        const pct = totalClicks > 0 ? ((link.clicks / totalClicks) * 100).toFixed(0) : 0;
                        const barW = (link.clicks / topClicks) * 100;
                        return (
                          <div key={link.id} style={{ marginBottom: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                              <span style={{ fontSize: 12, fontWeight: 800, color: i < 3 ? T.gold : T.textFaint, width: 18 }}>#{i + 1}</span>
                              <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: T.text, fontFamily: "'Plus Jakarta Sans'" }}>{link.title}</span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: T.accent }}>{link.clicks}</span>
                              <span style={{ fontSize: 10, color: T.textFaint, width: 32, textAlign: "right" }}>{pct}%</span>
                            </div>
                            <div style={{ height: 4, borderRadius: 2, background: T.progressTrack, overflow: "hidden", marginLeft: 26 }}>
                              <div style={{ height: "100%", borderRadius: 2, background: i === 0 ? `linear-gradient(90deg, ${T.gold}, #FFD863)` : `linear-gradient(90deg, ${T.accent}, #7DE2C7)`, width: `${barW}%`, transition: "width 0.5s" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Overview stats */}
                <div style={{ display: "flex", gap: 8 }}>
                  {[["📦", activeMats.length, "materiais"], ["📥", totalDl, "downloads"], ["📊", avgDl, "média/mat"]].map(([ic, val, lbl], i) => (
                    <div key={i} style={{ flex: 1, background: T.statBg, border: `1px solid ${T.statBorder}`, borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
                      <span style={{ fontSize: 14 }}>{ic}</span>
                      <span style={{ display: "block", fontSize: 22, fontWeight: 800, color: T.accent, marginTop: 2 }}>{val}</span>
                      <span style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>{lbl}</span>
                    </div>
                  ))}
                </div>

                {/* Ranking de materiais */}
                <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 12 }}>🏆 Ranking de Downloads</h3>
                  {matDlCounts.map((m, i) => {
                    const pct = totalDl > 0 ? ((m.dlCount / totalDl) * 100).toFixed(0) : 0;
                    const barW = topMat && topMat.dlCount > 0 ? (m.dlCount / topMat.dlCount) * 100 : 0;
                    return (
                      <div key={m.id} style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: i < 3 ? T.gold : T.textFaint, width: 18 }}>#{i + 1}</span>
                          <span style={{ fontSize: 16 }}>{m.icon}</span>
                          <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: T.text, fontFamily: "'Plus Jakarta Sans'" }}>{m.title}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: T.accent }}>{m.dlCount}</span>
                          <span style={{ fontSize: 10, color: T.textFaint, width: 32, textAlign: "right" }}>{pct}%</span>
                        </div>
                        <div style={{ height: 4, borderRadius: 2, background: T.progressTrack, overflow: "hidden", marginLeft: 26 }}>
                          <div style={{ height: "100%", borderRadius: 2, background: i === 0 ? `linear-gradient(90deg, ${T.gold}, #FFD863)` : `linear-gradient(90deg, ${T.accent}, #7DE2C7)`, width: `${barW}%`, transition: "width 0.5s" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Categorias */}
                {catStats.length > 0 && (
                  <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: 16 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 12 }}>📂 Performance por Categoria</h3>
                    {catStats.map((c, i) => (
                      <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < catStats.length - 1 ? `1px solid ${T.inputBorder}` : "none" }}>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: T.text }}>{c.name}</span>
                        <span style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>{c.count} mat.</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: T.accent }}>{c.totalDl} DL</span>
                        <span style={{ fontSize: 11, color: T.gold, fontFamily: "'Plus Jakarta Sans'" }}>~{c.avgDl}/mat</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Instagram stats */}
                {(() => {
                  const instaMatsSorted = activeMats.filter(m => m.instaPostUrl).sort((a, b) => (b.instaViews || 0) - (a.instaViews || 0));
                  if (instaMatsSorted.length === 0) return <div style={{ background: T.statBg, border: `1px solid ${T.statBorder}`, borderRadius: 14, padding: 16, textAlign: "center" }}><p style={{ fontSize: 13, color: T.textFaint }}>📸 Nenhum post do Instagram cadastrado ainda.</p><p style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginTop: 4 }}>Adicione o link do post e as métricas em cada material.</p></div>;
                  return (
                    <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: 16 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 12 }}>📸 Instagram vs Downloads</h3>
                      {instaMatsSorted.map((m) => {
                        const dlCount = matDlCounts.find(x => x.id === m.id)?.dlCount || 0;
                        const convRate = m.instaViews > 0 ? ((dlCount / m.instaViews) * 100).toFixed(1) : "—";
                        const engRate = m.instaViews > 0 ? (((m.instaLikes + m.instaComments + (m.instaSaves || 0)) / m.instaViews) * 100).toFixed(1) : "—";
                        return (
                          <div key={m.id} style={{ padding: "10px 0", borderBottom: `1px solid ${T.inputBorder}` }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                              <span style={{ fontSize: 16 }}>{m.icon}</span>
                              <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: T.text }}>{m.title}</span>
                              {m.instaPostUrl && <a href={m.instaPostUrl} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: T.accent, textDecoration: "none" }}>Ver post ↗</a>}
                            </div>
                            <div style={{ display: "flex", gap: 6 }}>
                              {[["👁", m.instaViews, "views"], ["❤️", m.instaLikes, "likes"], ["💬", m.instaComments, "coments"], ["🔖", m.instaSaves || 0, "salvam."], ["📥", dlCount, "downl."], ["🎯", convRate + "%", "convers."], ["📈", engRate + "%", "engaj."]].map(([ic, val, lbl], j) => (
                                <div key={j} style={{ flex: 1, textAlign: "center", background: T.statBg, borderRadius: 8, padding: "6px 2px" }}>
                                  <span style={{ display: "block", fontSize: 9 }}>{ic}</span>
                                  <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.text }}>{typeof val === "number" ? val.toLocaleString() : val}</span>
                                  <span style={{ fontSize: 8, color: T.textFaint }}>{lbl}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Profile cross-data for top 3 materials */}
                {matDlCounts.slice(0, 3).filter(m => m.dlCount > 0).map(m => {
                  const breakdown = getProfileBreakdown(m.id);
                  if (breakdown.length === 0) return null;
                  return (
                    <div key={m.id} style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: 16 }}>
                      <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 10 }}>🔍 Quem baixou: {m.icon} {m.title}</h3>
                      {breakdown.map(f => (
                        <div key={f.key} style={{ marginBottom: 10 }}>
                          <p style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, marginBottom: 4, fontFamily: "'Plus Jakarta Sans'" }}>{f.label}</p>
                          {f.entries.map(([val, count]) => {
                            const pct = ((count / f.total) * 100).toFixed(0);
                            return (
                              <div key={val} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                                <div style={{ flex: 1, height: 18, borderRadius: 4, background: T.progressTrack, overflow: "hidden", position: "relative" }}>
                                  <div style={{ height: "100%", borderRadius: 4, background: T.accent + "44", width: `${pct}%` }} />
                                  <span style={{ position: "absolute", left: 6, top: 2, fontSize: 10, fontWeight: 600, color: T.text }}>{val}</span>
                                </div>
                                <span style={{ fontSize: 10, fontWeight: 700, color: T.accent, width: 36, textAlign: "right" }}>{pct}%</span>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* BIO & LINKS */}
          {adminTab === "bio" && (() => {
            const linkInp = { padding: "8px 10px", borderRadius: 8, border: `1px solid ${T.inputBorder}`, background: T.bg, color: T.text, fontSize: 12, fontFamily: "'Plus Jakarta Sans'", width: "100%" };
            const updateLink = (id, key, val) => { const nl = bioLinks.map(l => l.id === id ? { ...l, [key]: val } : l); saveBioLinks(nl); };
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Bio */}
                <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 12 }}>👤 Meu Perfil</h3>
                  <CmsField label="URL da foto" ck="bioPhotoUrl" />
                  <CmsField label="Nome" ck="bioName" />
                  <CmsField label="Linha 1" ck="bioLine1" />
                  <CmsField label="Linha 2" ck="bioLine2" />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    <CmsField label="Stat 1 valor" ck="bioStat1" />
                    <CmsField label="Stat 1 label" ck="bioStat1Label" />
                    <CmsField label="Stat 2 valor" ck="bioStat2" />
                    <CmsField label="Stat 2 label" ck="bioStat2Label" />
                  </div>
                </div>

                {/* Links */}
                <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text }}>🔗 Meus Links</h3>
                    <button onClick={() => { const nl = [...bioLinks, { id: String(Date.now()), title: "Novo Link", imageUrl: "", icon: "🔗", url: "", active: true, clicks: 0 }]; saveBioLinks(nl); }} style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: T.accent + "22", color: T.accent, border: `1px solid ${T.accent}44` }}>＋ Novo link</button>
                  </div>
                  {bioLinks.map((link, i) => (
                    <div key={link.id + "-" + i} style={{ background: T.statBg, border: `1px solid ${link.active ? T.statBorder : T.dangerBrd}`, borderRadius: 12, padding: 12, marginBottom: 8, opacity: link.active ? 1 : 0.6 }}>
                      {/* Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {i > 0 && <button onClick={() => { const nl = [...bioLinks]; [nl[i-1], nl[i]] = [nl[i], nl[i-1]]; saveBioLinks(nl); }} style={{ width: 28, height: 28, borderRadius: 6, background: T.inputBg, border: `1px solid ${T.inputBorder}`, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", color: T.textFaint }}>↑</button>}
                          {i < bioLinks.length - 1 && <button onClick={() => { const nl = [...bioLinks]; [nl[i], nl[i+1]] = [nl[i+1], nl[i]]; saveBioLinks(nl); }} style={{ width: 28, height: 28, borderRadius: 6, background: T.inputBg, border: `1px solid ${T.inputBorder}`, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", color: T.textFaint }}>↓</button>}
                          <span style={{ fontSize: 10, color: T.textFaint, background: T.inputBg, padding: "2px 8px", borderRadius: 6 }}>{link.clicks || 0} cliques</span>
                        </div>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => updateLink(link.id, "active", !link.active)} style={{ width: 28, height: 28, borderRadius: 6, background: link.active ? T.accent + "22" : T.dangerBg, border: `1px solid ${link.active ? T.accent + "44" : T.dangerBrd}`, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>{link.active ? "👁" : "🚫"}</button>
                          <button onClick={() => { if (confirm("Remover este link?")) { saveBioLinks(bioLinks.filter(l => l.id !== link.id)); } }} style={{ width: 28, height: 28, borderRadius: 6, background: T.dangerBg, border: `1px solid ${T.dangerBrd}`, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>🗑</button>
                        </div>
                      </div>
                      {/* Fields */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", display: "block", marginBottom: 2 }}>Título</label><input value={link.title} onChange={(e) => updateLink(link.id, "title", e.target.value)} style={linkInp} /></div>
                        <div><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", display: "block", marginBottom: 2 }}>URL destino</label><input value={link.url} onChange={(e) => updateLink(link.id, "url", e.target.value)} style={linkInp} placeholder="https://... ou _hub" /></div>
                        <div><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", display: "block", marginBottom: 2 }}>URL da imagem <span style={{ color: T.accent }}>(vazio = card com ícone + texto)</span></label><input value={link.imageUrl || ""} onChange={(e) => updateLink(link.id, "imageUrl", e.target.value)} style={linkInp} placeholder="https://..." /></div>
                        {!link.imageUrl && <div style={{ width: 80 }}><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", display: "block", marginBottom: 2 }}>Ícone</label><input value={link.icon || ""} onChange={(e) => updateLink(link.id, "icon", e.target.value)} style={{ ...linkInp, width: 60 }} /></div>}
                      </div>
                    </div>
                  ))}
                  <p style={{ fontSize: 10, color: T.textFaint, marginTop: 4 }}>💡 <b>_hub</b> = link pro Hub · Imagem vazia = card texto · ↑↓ reordena</p>
                </div>
              </div>
            );
          })()}

          {/* TEXTOS */}
          {adminTab === "textos" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[
                ["🏠 Tela Inicial", [["Nome da marca", "brandName"], ["Subtítulo", "brandTag"], ["Texto principal", "landingSubtitle", true], ["Stat 1 label", "landingStat1Label"], ["Stat 2 valor", "landingStat2"], ["Stat 2 label", "landingStat2Label"], ["Stat 3 valor", "landingStat3"], ["Stat 3 label", "landingStat3Label"], ["Label nome", "nameLabel"], ["Placeholder nome", "namePlaceholder"], ["Label WhatsApp", "whatsLabel"], ["Placeholder WA", "whatsPlaceholder"], ["Botão CTA", "ctaText"], ["Texto segurança", "safeText"]]],
                ["📱 Hub", [["Saudação", "hubGreetPrefix"], ["Emoji", "hubGreetEmoji"], ["Subtítulo", "hubSubtitle"], ["Progresso", "progressSuffix"], ["Dica", "progressHint"], ["Título seção", "sectionTitle"]]],
                ["🔓 Modais", [["Título indicação", "shareModalTitle"], ["Desc indicação", "shareModalDesc", true], ["Título comentário", "commentModalTitle"], ["Desc comentário", "commentModalDesc", true], ["Título pesquisa", "surveyModalTitle"]]],
                ["🔗 Links", [["URL Instagram", "instagramUrl"], ["Handle", "instagramHandle"], ["URL base do app", "baseUrl"], ["URL da logo (imagem)", "logoUrl"]]],
              ].map(([title, fields]) => (<div key={title} style={{ background: T.statBg, border: `1px solid ${T.statBorder}`, borderRadius: 14, padding: 16, marginBottom: 4 }}><h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 12 }}>{title}</h3>{fields.map(([l, k, m]) => <CmsField key={k} label={l} ck={k} multi={m} />)}</div>))}

              {/* PROFILE CONFIG */}
              <div style={{ background: T.statBg, border: `1px solid ${T.statBorder}`, borderRadius: 14, padding: 16, marginBottom: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text }}>📋 Perfil (3 Fases)</h3>
                  <button onClick={() => updCfg("profileEnabled", config.profileEnabled === "false" ? "true" : "false")} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: config.profileEnabled !== "false" ? T.accent + "22" : T.dangerBg, color: config.profileEnabled !== "false" ? T.accent : T.dangerTxt, border: `1px solid ${config.profileEnabled !== "false" ? T.accent + "44" : T.dangerBrd}` }}>{config.profileEnabled !== "false" ? "✅ Ativo" : "🚫 Oculto"}</button>
                </div>
                {[1,2,3].map(n => (
                  <div key={n} style={{ background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 10, padding: 12, marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: T.gold }}>Fase {n}</p>
                      <button onClick={() => updCfg(`phase${n}Enabled`, config[`phase${n}Enabled`] === "false" ? "true" : "false")} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: config[`phase${n}Enabled`] !== "false" ? T.accent + "22" : T.dangerBg, color: config[`phase${n}Enabled`] !== "false" ? T.accent : T.dangerTxt, border: `1px solid ${config[`phase${n}Enabled`] !== "false" ? T.accent + "44" : T.dangerBrd}` }}>{config[`phase${n}Enabled`] !== "false" ? "✅ Visível" : "👁 Oculta"}</button>
                    </div>
                    <CmsField label="Título" ck={`phase${n}Title`} />
                    <CmsField label="Ícone (emoji)" ck={`phase${n}Icon`} />
                    <CmsField label="Nome do prêmio" ck={`phase${n}Prize`} />
                    <CmsField label="🔗 Link do prêmio (PDF, Drive, etc)" ck={`phase${n}PrizeUrl`} />
                    <p style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, marginTop: 8, marginBottom: 6 }}>Perguntas:</p>
                    {[1,2,3].map(q => (
                      <div key={q} style={{ background: T.statBg, borderRadius: 8, padding: 8, marginBottom: 6, border: `1px solid ${T.statBorder}` }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: T.textFaint, marginBottom: 4 }}>Pergunta {q}</p>
                        <CmsField label="Texto da pergunta" ck={`phase${n}Q${q}Label`} />
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                          <CmsField label="Campo (key)" ck={`phase${n}Q${q}Key`} />
                          <CmsField label="Tipo (select ou text)" ck={`phase${n}Q${q}Type`} />
                        </div>
                        <CmsField label="Opções (separar com |)" ck={`phase${n}Q${q}Options`} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* SOCIAL PROOF CMS */}
              <div style={{ background: T.statBg, border: `1px solid ${T.statBorder}`, borderRadius: 14, padding: 16, marginBottom: 4 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 12 }}>👥 Prova Social</h3>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.textMuted, marginBottom: 6, fontFamily: "'Plus Jakarta Sans'" }}>Modo de exibição</label>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[["downloads", "📥 Downloads"], ["recent", "👤 Atividade"], ["both", "📥+👤 Ambos"], ["off", "🚫 Desligado"]].map(([k, l]) => (
                      <button key={k} onClick={() => updCfg("socialProofMode", k)} style={{ flex: 1, padding: "8px 4px", borderRadius: 9, fontSize: 11, fontWeight: 600, background: config.socialProofMode === k ? T.accent + "22" : T.inputBg, color: config.socialProofMode === k ? T.accent : T.textFaint, border: `1px solid ${config.socialProofMode === k ? T.accent + "44" : T.inputBorder}`, transition: "all 0.2s" }}>{l}</button>
                    ))}
                  </div>
                </div>

                {config.socialProofMode !== "off" && (
                  <>
                    {(config.socialProofMode === "downloads" || config.socialProofMode === "both") && (
                      <div style={{ marginBottom: 10 }}>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.textMuted, marginBottom: 4, fontFamily: "'Plus Jakarta Sans'" }}>Boost de downloads <span style={{ fontWeight: 400, color: T.textFaint }}>(somado ao real)</span></label>
                        <input type="number" defaultValue={config.socialProofBoost} onBlur={(e) => updCfg("socialProofBoost", parseInt(e.target.value) || 0)} key={"spb-" + config.socialProofBoost} style={inp} placeholder="150" />
                        <p style={{ fontSize: 10, color: T.textFaint, marginTop: 4, fontFamily: "'Plus Jakarta Sans'" }}>Número base somado aos downloads reais de cada material. Ex: 150 → "167 downloads"</p>
                      </div>
                    )}

                    {(config.socialProofMode === "recent" || config.socialProofMode === "both") && (
                      <>
                        <div style={{ marginBottom: 10 }}>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.textMuted, marginBottom: 4, fontFamily: "'Plus Jakarta Sans'" }}>Nomes simulados <span style={{ fontWeight: 400, color: T.textFaint }}>(separados por vírgula)</span></label>
                          <textarea defaultValue={Array.isArray(config.socialProofNames) ? config.socialProofNames.join(", ") : (config.socialProofNames || "")} onBlur={(e) => updCfg("socialProofNames", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} key={"spn"} style={{ ...inp, minHeight: 45, resize: "vertical" }} placeholder="Maria, João, Ana, Pedro..." />
                        </div>
                        <div style={{ marginBottom: 10 }}>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.textMuted, marginBottom: 4, fontFamily: "'Plus Jakarta Sans'" }}>Tempos (minutos) <span style={{ fontWeight: 400, color: T.textFaint }}>(separados por vírgula)</span></label>
                          <textarea defaultValue={Array.isArray(config.socialProofMinutes) ? config.socialProofMinutes.join(", ") : (config.socialProofMinutes || "")} onBlur={(e) => updCfg("socialProofMinutes", e.target.value.split(",").map((s) => parseInt(s.trim())).filter(Boolean))} key={"spm"} style={{ ...inp, minHeight: 45, resize: "vertical" }} placeholder="3, 12, 25, 47, 68..." />
                          <p style={{ fontSize: 10, color: T.textFaint, marginTop: 4, fontFamily: "'Plus Jakarta Sans'" }}>Cada material usa um par nome+tempo. Ex: "Maria baixou há 12min"</p>
                        </div>
                      </>
                    )}

                    <div style={{ padding: "10px 14px", borderRadius: 10, background: T.inputBg, border: `1px solid ${T.inputBorder}`, marginTop: 4 }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, marginBottom: 6, fontFamily: "'Plus Jakarta Sans'" }}>Preview:</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {(config.socialProofMode === "downloads" || config.socialProofMode === "both") && <span style={{ fontSize: 12, color: T.text, fontFamily: "'Plus Jakarta Sans'" }}>📥 {getMatDownloads(1)} downloads</span>}
                        {config.socialProofMode === "both" && <span style={{ color: T.progressTrack }}>·</span>}
                        {(config.socialProofMode === "recent" || config.socialProofMode === "both") && <span style={{ fontSize: 12, color: T.text, fontFamily: "'Plus Jakarta Sans'", fontStyle: "italic" }}>{getRecentPerson(1)}</span>}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* DYNAMIC BANNER CMS */}
              <div style={{ background: T.statBg, border: `1px solid ${T.statBorder}`, borderRadius: 14, padding: 16, marginBottom: 4 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 12 }}>🎯 Banner Dinâmico</h3>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                    <button onClick={() => updCfg("bannerPersonalized", true)} style={{ flex: 1, padding: "10px 8px", borderRadius: 9, fontSize: 12, fontWeight: 600, background: config.bannerPersonalized ? T.accent + "22" : T.inputBg, color: config.bannerPersonalized ? T.accent : T.textFaint, border: `1px solid ${config.bannerPersonalized ? T.accent + "44" : T.inputBorder}` }}>🎯 Personalizado</button>
                    <button onClick={() => updCfg("bannerPersonalized", false)} style={{ flex: 1, padding: "10px 8px", borderRadius: 9, fontSize: 12, fontWeight: 600, background: !config.bannerPersonalized ? T.accent + "22" : T.inputBg, color: !config.bannerPersonalized ? T.accent : T.textFaint, border: `1px solid ${!config.bannerPersonalized ? T.accent + "44" : T.inputBorder}` }}>✏️ Fixo (manual)</button>
                  </div>

                  {config.bannerPersonalized ? (
                    <>
                      <div style={{ padding: "12px 14px", borderRadius: 10, background: T.inputBg, border: `1px solid ${T.inputBorder}`, marginBottom: 10 }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: T.accent, marginBottom: 8, fontFamily: "'Plus Jakarta Sans'" }}>Regras automáticas:</p>
                        {[
                          ["🚀", "0 downloads", "\"Comece sua jornada! X materiais esperando...\""],
                          ["💪", "1-2 downloads", "\"X de Y baixados! Continue explorando...\""],
                          ["🔓", "2+ downloads + materiais travados", "\"Já aproveitou X materiais. Desbloqueie os Y restantes por R$Z\""],
                          ["🏆", "Todos baixados", "\"Você é fera! Fique ligado...\""],
                        ].map(([ico, cond, txt], i) => (
                          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
                            <span style={{ fontSize: 14, flexShrink: 0 }}>{ico}</span>
                            <div>
                              <span style={{ fontSize: 11, fontWeight: 600, color: T.text, fontFamily: "'Plus Jakarta Sans'" }}>{cond}</span>
                              <p style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginTop: 1 }}>{txt}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ padding: "10px 12px", borderRadius: 8, background: T.accent + "11", border: `1px solid ${T.accent}22` }}>
                        <p style={{ fontSize: 11, color: T.accent, fontFamily: "'Plus Jakarta Sans'" }}>💡 O banner adapta automaticamente a mensagem incentivando o lead a completar perfil ou responder pesquisas para desbloquear conteúdos.</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <CmsField label="Banner título" ck="ctaBannerTitle" />
                      <CmsField label="Banner descrição" ck="ctaBannerDesc" />
                      <CmsField label="Banner botão" ck="ctaBannerBtn" />
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* USERS (MASTER ONLY) */}
          {adminTab === "users" && isMaster && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Add new user */}
              {!showNewUser ? (
                <button onClick={() => setShowNewUser(true)} style={{ width: "100%", padding: "14px", borderRadius: 14, background: T.gold + "15", border: `2px dashed ${T.gold}44`, color: T.gold, fontSize: 14, fontWeight: 700 }}>＋ Criar novo Admin</button>
              ) : (
                <div style={{ background: T.statBg, border: `2px solid ${T.gold}44`, borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: T.gold }}>＋ Novo Admin</h3>
                    <button onClick={() => setShowNewUser(false)} style={{ background: "none", color: T.textFaint, fontSize: 16 }}>✕</button>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 2 }}><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Nome</label><input value={newUser.name} onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))} style={sInp} placeholder="Nome do funcionário" /></div>
                    <div style={{ flex: 1 }}><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>PIN (4 dígitos)</label><input value={newUser.pin} onChange={(e) => setNewUser((p) => ({ ...p, pin: e.target.value.replace(/\D/g, "").slice(0, 4) }))} style={{ ...sInp, textAlign: "center", letterSpacing: 6, fontWeight: 700 }} placeholder="0000" maxLength={4} /></div>
                  </div>

                  <div style={{ paddingTop: 8, borderTop: `1px solid ${T.cardBorder}` }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'Plus Jakarta Sans'", marginBottom: 8, display: "block" }}>Permissões</label>
                    {Object.entries(PERM_LABELS).filter(([k]) => k !== "users_manage").map(([k, v]) => (
                      <div key={k} onClick={() => setNewUser((p) => ({ ...p, permissions: { ...p.permissions, [k]: !p.permissions[k] } }))} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, marginBottom: 4, cursor: "pointer", background: newUser.permissions[k] ? T.accent + "11" : "transparent", border: `1px solid ${newUser.permissions[k] ? T.accent + "33" : T.inputBorder}`, transition: "all 0.2s" }}>
                        <div style={{ width: 22, height: 22, borderRadius: 6, background: newUser.permissions[k] ? T.accent : T.inputBg, border: `2px solid ${newUser.permissions[k] ? T.accent : T.inputBorder}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", flexShrink: 0 }}>{newUser.permissions[k] && <span style={{ color: "#060a09", fontSize: 12, fontWeight: 800 }}>✓</span>}</div>
                        <span style={{ fontSize: 14 }}>{v.icon}</span>
                        <div style={{ flex: 1 }}><span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{v.label}</span><p style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>{v.group}</p></div>
                      </div>
                    ))}
                  </div>

                  <button onClick={async () => {
                    if (!newUser.name.trim() || newUser.pin.length !== 4) return showT("Preencha nome e PIN (4 dígitos)!");
                    if (newUser.pin === MASTER_PIN || adminUsers.some((u) => u.pin === newUser.pin)) return showT("PIN já em uso!");
                    await db.addAdminUser({ name: newUser.name, pin: newUser.pin, permissions: newUser.permissions });
                    setNewUser({ name: "", pin: "", permissions: { materials_view: true, materials_edit: false, leads_view: true, leads_export: false, leads_whatsapp: false, textos_edit: false, users_manage: false } });
                    setShowNewUser(false); showT("Admin criado! 🎉");
                  }} style={{ width: "100%", padding: "13px", borderRadius: 12, background: `linear-gradient(135deg, #c49500, #FFD863)`, color: "#1a1a12", fontSize: 14, fontWeight: 700, marginTop: 4 }}>👑 Criar Admin</button>
                </div>
              )}

              {/* MASTER card */}
              <div style={{ background: T.statBg, border: `1px solid ${T.gold}33`, borderRadius: 14, padding: 16, borderLeft: `3px solid ${T.gold}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg, #c49500, #FFD863)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>👑</div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: T.gold }}>MASTER PICA</h3>
                    <p style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>PIN: {MASTER_PIN} · Acesso total</p>
                  </div>
                  <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 5, background: T.gold + "22", color: T.gold, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>MASTER</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {Object.values(PERM_LABELS).map((v, i) => (<span key={i} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, background: T.accent + "15", color: T.accent, fontFamily: "'Plus Jakarta Sans'" }}>{v.icon} {v.label}</span>))}
                </div>
              </div>

              {/* Admin users list */}
              {adminUsers.map((u, i) => {
                const isEditing = editUserId === u.id;
                return (
                  <div key={u.id} style={{ background: T.statBg, border: `1px solid ${T.statBorder}`, borderRadius: 14, padding: 16, borderLeft: `3px solid ${T.accent}`, opacity: animateIn ? 1 : 0, transform: animateIn ? "translateY(0)" : "translateY(15px)", transition: `all 0.3s ease ${i * 0.05}s` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: isEditing ? 12 : 0 }}>
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: T.avBg, border: `2px solid ${T.avBrd}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: T.accent }}>{u.name.charAt(0).toUpperCase()}</div>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{u.name}</h3>
                        <p style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>PIN: {u.pin} · {Object.values(u.permissions).filter(Boolean).length} permissões</p>
                      </div>
                      <button onClick={() => setEditUserId(isEditing ? null : u.id)} style={{ padding: "5px 10px", borderRadius: 7, background: T.tabBg, border: `1px solid ${T.tabBorder}`, color: T.textMuted, fontSize: 11, fontWeight: 600 }}>{isEditing ? "Fechar" : "✏️"}</button>
                    </div>

                    {!isEditing && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                        {Object.entries(u.permissions).filter(([, v]) => v).map(([k]) => PERM_LABELS[k] && (<span key={k} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, background: T.accent + "15", color: T.accent, fontFamily: "'Plus Jakarta Sans'" }}>{PERM_LABELS[k].icon} {PERM_LABELS[k].label}</span>))}
                        {Object.values(u.permissions).every((v) => !v) && <span style={{ fontSize: 11, color: T.textFaint, fontStyle: "italic" }}>Nenhuma permissão</span>}
                      </div>
                    )}

                    {isEditing && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 10, borderTop: `1px solid ${T.cardBorder}` }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <div style={{ flex: 2 }}><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Nome</label><input defaultValue={u.name} onBlur={(e) => db.updateAdminUser(u.id, { name: e.target.value })} key={"un-" + u.id} style={sInp} /></div>
                          <div style={{ flex: 1 }}><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>PIN</label><input defaultValue={u.pin} onBlur={(e) => db.updateAdminUser(u.id, { pin: e.target.value.replace(/\D/g, "").slice(0, 4) })} key={"up-" + u.id} style={{ ...sInp, textAlign: "center", letterSpacing: 6, fontWeight: 700 }} maxLength={4} /></div>
                        </div>

                        <label style={{ fontSize: 10, fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'Plus Jakarta Sans'" }}>Permissões</label>
                        {Object.entries(PERM_LABELS).filter(([k]) => k !== "users_manage").map(([k, v]) => (
                          <div key={k} onClick={() => db.updateAdminUser(u.id, { permissions: { ...u.permissions, [k]: !u.permissions[k] } })} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, cursor: "pointer", background: u.permissions[k] ? T.accent + "11" : "transparent", border: `1px solid ${u.permissions[k] ? T.accent + "33" : T.inputBorder}`, transition: "all 0.2s" }}>
                            <div style={{ width: 22, height: 22, borderRadius: 6, background: u.permissions[k] ? T.accent : T.inputBg, border: `2px solid ${u.permissions[k] ? T.accent : T.inputBorder}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", flexShrink: 0 }}>{u.permissions[k] && <span style={{ color: "#060a09", fontSize: 12, fontWeight: 800 }}>✓</span>}</div>
                            <span style={{ fontSize: 14 }}>{v.icon}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: T.text, flex: 1 }}>{v.label}</span>
                          </div>
                        ))}

                        <button onClick={async () => { await db.deleteAdminUser(u.id); setEditUserId(null); showT("Admin removido!"); }} style={{ width: "100%", padding: "10px", borderRadius: 10, background: T.dangerBg, border: `1px solid ${T.dangerBrd}`, color: T.dangerTxt, fontSize: 13, fontWeight: 600, marginTop: 4 }}>🗑️ Remover este admin</button>
                      </div>
                    )}
                  </div>
                );
              })}

              {adminUsers.length === 0 && <p style={{ textAlign: "center", fontSize: 13, color: T.textFaint, padding: 20, fontFamily: "'Plus Jakarta Sans'" }}>Nenhum admin criado ainda. Você é o único com acesso.</p>}
            </div>
          )}

          {/* LOG */}
          {adminTab === "log" && isMaster && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text }}>📜 Atividades desta sessão</h3>
                <button onClick={() => setActivityLog([])} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: T.dangerBg, color: T.dangerTxt, border: `1px solid ${T.dangerBrd}` }}>Limpar</button>
              </div>
              {activityLog.length === 0 && <p style={{ textAlign: "center", fontSize: 13, color: T.textFaint, padding: 30, fontFamily: "'Plus Jakarta Sans'" }}>Nenhuma atividade registrada ainda.</p>}
              {activityLog.map((log, i) => (
                <div key={i} style={{ background: T.statBg, border: `1px solid ${T.statBorder}`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: T.avBg, border: `1px solid ${T.avBrd}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: T.accent, flexShrink: 0 }}>{log.who.charAt(0)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{log.who}</p>
                    <p style={{ fontSize: 11, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.action}</p>
                  </div>
                  <span style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", whiteSpace: "nowrap" }}>{log.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {showIconPicker && <IconPicker onSelect={(ic) => { if (showIconPicker === "new") setNewMat((p) => ({ ...p, icon: ic })); else updMat(showIconPicker, "icon", ic); }} onClose={() => setShowIconPicker(null)} />}
        <Toast />
      </div>
    );
  }

  // ═══════════════════════════════════════
  // USER PROFILE
  // ═══════════════════════════════════════
  if (view === "profile") {
    const MIN_TEXT_LEN = 10;
    const PHASE_TIMER = 15; // seconds

    const validatePhaseText = (phaseId) => {
      const phase = PHASES.find(p => p.id === phaseId);
      if (!phase) return null;
      for (const f of phase.fields) {
        if (f.type === "text") {
          const val = (userProfile[f.key] || "").trim();
          if (val.length < MIN_TEXT_LEN) return `"${f.label.slice(0, 30)}..." precisa ter pelo menos ${MIN_TEXT_LEN} caracteres.`;
          // Check if all chars are the same
          if (new Set(val.replace(/\s/g, "")).size <= 2) return `Resposta inválida em "${f.label.slice(0, 30)}..."`;
        }
      }
      // Check duplicates across text fields
      const textVals = phase.fields.filter(f => f.type === "text").map(f => (userProfile[f.key] || "").trim().toLowerCase());
      if (textVals.length > 1 && new Set(textVals).size === 1 && textVals[0]) return "As respostas não podem ser todas iguais.";
      return null;
    };

    const handlePhaseSubmit = async (phaseId) => {
      if (!isPhaseFieldsComplete(phaseId)) return showT("Preencha todos os campos!");
      const textErr = validatePhaseText(phaseId);
      if (textErr) return showT(textErr);
      const newProfile = { ...userProfile, [`phase${phaseId}`]: true };
      setUserProfile(newProfile);
      // Save to localStorage
      try {
        const saved = JSON.parse(localStorage.getItem("vollhub_user") || "{}");
        saved.profile = newProfile;
        localStorage.setItem("vollhub_user", JSON.stringify(saved));
      } catch(e) {}
      // Save to lead in Supabase
      const lead = await db.findLeadByWhatsApp(userWhatsApp);
      if (lead) {
        const phase = PHASES.find(p2 => p2.id === phaseId);
        const updates = {};
        phase.fields.forEach(f => { updates[f.key] = userProfile[f.key]; });
        updates[`phase${phaseId}Complete`] = true;
        await db.updateLead(lead.id, updates);
      }
      setActivePhase(null);
      showT(`🎉 Fase ${phaseId} completa! Prêmio desbloqueado!`);
    };

    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 16px 40px", fontFamily: "'Outfit'", background: T.bg, position: "relative", overflow: "hidden" }}>
        <style>{getCSS(T)}</style>
        <div style={{ position: "fixed", top: "-25%", right: "-15%", width: 450, height: 450, borderRadius: "50%", background: `radial-gradient(circle, rgba(125,226,199,${T.glowOp}) 0%, transparent 70%)`, animation: "pulse 5s ease-in-out infinite", pointerEvents: "none" }} />
        <div style={{ width: "100%", maxWidth: 480, position: "relative", zIndex: 1 }}>
          <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0" }}>
            <button onClick={() => { setView("hub"); setActivePhase(null); }} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", color: T.accent, fontSize: 14, fontWeight: 600, fontFamily: "'Plus Jakarta Sans'" }}>← Voltar ao Hub</button>
            <button onClick={() => setTheme((t) => t === "dark" ? "light" : "dark")} style={{ width: 34, height: 34, borderRadius: "50%", background: T.statBg, border: `1px solid ${T.statBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{theme === "dark" ? "☀️" : "🌙"}</button>
          </header>

          {/* Profile Header */}
          <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 20, padding: "24px 20px", marginBottom: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, opacity: animateIn ? 1 : 0, transform: animateIn ? "translateY(0)" : "translateY(20px)", transition: "all 0.5s ease" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#060a09", fontWeight: 800 }}>{userName.charAt(0).toUpperCase()}</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: T.text }}>{userName}</h2>
            <p style={{ fontSize: 13, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'" }}>{userWhatsApp}</p>
            {/* Phase progress dots */}
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              {PHASES.map((p, idx) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: isPhaseUnlocked(p.id) ? `linear-gradient(135deg, ${T.accent}, #7DE2C7)` : T.statBg, border: `2px solid ${isPhaseUnlocked(p.id) ? T.accent : T.statBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: isPhaseUnlocked(p.id) ? "#060a09" : T.textFaint }}>{isPhaseUnlocked(p.id) ? "✓" : idx + 1}</div>
                  {idx < PHASES.length - 1 && <div style={{ width: 20, height: 2, background: isPhaseUnlocked(p.id) ? T.accent : T.progressTrack, borderRadius: 1 }} />}
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'" }}>{completedPhases}/{PHASES.length} fases completas</p>
          </div>

          {/* Active Phase Form */}
          {activePhase && (() => {
            const phase = PHASES.find(p => p.id === activePhase);
            const phaseTitle = config[`phase${activePhase}Title`] || `Fase ${activePhase}`;
            return (
              <div style={{ background: theme === "dark" ? "linear-gradient(135deg, #1a1a10, #0d1210)" : "linear-gradient(135deg, #fdf8e8, #fdf0d0)", border: `1px solid ${T.gold}33`, borderRadius: 18, padding: "20px 18px", marginBottom: 16, opacity: animateIn ? 1 : 0, transform: animateIn ? "translateY(0)" : "translateY(20px)", transition: "all 0.5s ease 0.1s" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{phase.icon} {phaseTitle}</h3>
                  <button onClick={() => setActivePhase(null)} style={{ background: "none", color: T.textFaint, fontSize: 18 }}>✕</button>
                </div>
                {phase.fields.map((f, i) => (
                  <div key={f.key} style={{ marginBottom: 14, opacity: animateIn ? 1 : 0, transform: animateIn ? "translateX(0)" : "translateX(-15px)", transition: `all 0.3s ease ${i * 0.08}s` }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 6, fontFamily: "'Plus Jakarta Sans'", lineHeight: 1.4 }}>{f.label}</label>
                    {f.type === "select" ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {f.options.map(opt => (
                          <button key={opt} onClick={() => updProfile(f.key, opt)} style={{ padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600, background: userProfile[f.key] === opt ? T.accent + "22" : T.inputBg, color: userProfile[f.key] === opt ? T.accent : T.textMuted, border: `1.5px solid ${userProfile[f.key] === opt ? T.accent : T.inputBorder}`, transition: "all 0.2s", fontFamily: "'Plus Jakarta Sans'" }}>{opt}</button>
                        ))}
                      </div>
                    ) : (
                      <textarea value={userProfile[f.key] || ""} onChange={(e) => updProfile(f.key, e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${userProfile[f.key]?.trim() ? T.accent + "44" : T.inputBorder}`, background: T.inputBg, color: T.text, fontSize: 13, fontFamily: "'Plus Jakarta Sans'", minHeight: 60, resize: "vertical" }} placeholder={f.placeholder} />
                    )}
                  </div>
                ))}
                {(() => {
                  const timeLeft = Math.max(0, PHASE_TIMER - phaseTimer);
                  const canSubmit = isPhaseFieldsComplete(activePhase) && timeLeft === 0;
                  return <button onClick={() => { if (timeLeft > 0) return showT(`Aguarde ${timeLeft}s para enviar...`); handlePhaseSubmit(activePhase); }} style={{ width: "100%", padding: "14px", borderRadius: 14, background: canSubmit ? `linear-gradient(135deg, #c49500, #FFD863)` : T.inputBg, color: canSubmit ? "#1a1a12" : T.textFaint, fontSize: 14, fontWeight: 700, marginTop: 4, opacity: canSubmit ? 1 : 0.5, transition: "all 0.3s" }}>{timeLeft > 0 ? `⏳ Aguarde ${timeLeft}s...` : "🎁 Desbloquear prêmio!"}</button>;
                })()}
              </div>
            );
          })()}

          {/* Phase Cards */}
          {!activePhase && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 2 }}>🏆 Desbloqueie prêmios</h3>
              {PHASES.map((phase, i) => {
                const unlocked = isPhaseUnlocked(phase.id);
                const phaseIdx = PHASES.findIndex(p => p.id === phase.id);
                const canStart = phaseIdx === 0 || isPhaseUnlocked(PHASES[phaseIdx - 1]?.id);
                const prize = config[`phase${phase.id}Prize`] || `Prêmio Fase ${phase.id}`;
                const prizeUrl = config[`phase${phase.id}PrizeUrl`] || "";
                return (
                  <div key={phase.id} onClick={() => { if (!unlocked && canStart) openPhase(phase.id); }} style={{ background: unlocked ? T.dlBg : canStart ? T.cardBg : T.statBg, border: `1px solid ${unlocked ? T.accent + "44" : canStart ? T.cardBorder : T.statBorder}`, borderRadius: 16, padding: "16px 18px", cursor: unlocked ? "default" : canStart ? "pointer" : "default", opacity: animateIn ? (canStart || unlocked ? 1 : 0.5) : 0, transform: animateIn ? "translateY(0)" : "translateY(15px)", transition: `all 0.4s ease ${i * 0.1}s` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: unlocked ? T.accent + "22" : canStart ? T.gold + "15" : T.statBg, border: `1px solid ${unlocked ? T.accent + "44" : canStart ? T.gold + "33" : T.statBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{unlocked ? "✅" : phase.icon}</div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 700, color: unlocked ? T.accent : canStart ? T.text : T.textFaint }}>{config[`phase${phase.id}Title`] || `Fase ${phase.id}`}</h4>
                        <p style={{ fontSize: 12, color: unlocked ? T.accent : T.textMuted, fontFamily: "'Plus Jakarta Sans'", marginTop: 2 }}>{unlocked ? `✅ ${prize}` : canStart ? `🎁 Prêmio: ${prize}` : "🔒 Complete a fase anterior"}</p>
                      </div>
                      {!unlocked && canStart && <span style={{ fontSize: 14, color: T.gold, fontWeight: 700 }}>→</span>}
                    </div>
                    {unlocked && prizeUrl && (
                      <a href={prizeUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ display: "block", width: "100%", padding: "10px", borderRadius: 10, background: "linear-gradient(135deg, #349980, #7DE2C7)", color: "#060a09", fontSize: 13, fontWeight: 700, textAlign: "center", textDecoration: "none", marginTop: 10 }}>📥 Baixar prêmio</a>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <footer style={{ textAlign: "center", padding: "24px 0 8px" }}><a href={config.instagramUrl} target="_blank" rel="noreferrer" style={{ color: T.textFaint, fontSize: 13, textDecoration: "none", fontFamily: "'Plus Jakarta Sans'" }}>{config.instagramHandle}</a></footer>
        </div>
        <Toast />
      </div>
    );
  }

  // ═══════════════════════════════════════
  // USER HUB
  // ═══════════════════════════════════════
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 16px 40px", fontFamily: "'Outfit'", background: T.bg, position: "relative", overflow: "hidden" }}>
      <style>{getCSS(T)}</style>
      <div style={{ position: "fixed", top: "-25%", right: "-15%", width: 450, height: 450, borderRadius: "50%", background: `radial-gradient(circle, rgba(125,226,199,${T.glowOp}) 0%, transparent 70%)`, animation: "pulse 5s ease-in-out infinite", pointerEvents: "none" }} />
      <div style={{ width: "100%", maxWidth: 480, position: "relative", zIndex: 1 }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div onClick={() => setLogoTaps((t) => t + 1)} style={{ width: 42, height: 42, borderRadius: "50%", background: T.avBg, border: `2px solid ${T.avBrd}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><InfLogo size={24} /></div>
            <div><p style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{config.hubGreetPrefix} {userName.split(" ")[0]}! {config.hubGreetEmoji}</p><p style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginTop: 1 }}>{config.hubSubtitle}</p></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {profileEnabled && <button onClick={() => setView("profile")} style={{ width: 34, height: 34, borderRadius: "50%", background: profileComplete ? T.accent + "22" : T.statBg, border: `1px solid ${profileComplete ? T.accent + "44" : T.statBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, position: "relative" }}>
              👤
              {!profileComplete && <div style={{ position: "absolute", top: -2, right: -2, width: 10, height: 10, borderRadius: "50%", background: T.gold, border: `2px solid ${T.bg}` }} />}
            </button>}
            <button onClick={() => setTheme((t) => t === "dark" ? "light" : "dark")} style={{ width: 34, height: 34, borderRadius: "50%", background: T.statBg, border: `1px solid ${T.statBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{theme === "dark" ? "☀️" : "🌙"}</button>
            <button onClick={() => { setView("linktree"); setUserName(""); setUserWhatsApp(""); setDownloaded([]); localStorage.removeItem("vollhub_user"); }} style={{ width: 34, height: 34, borderRadius: "50%", background: T.dangerBg, border: `1px solid ${T.dangerBrd}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }} title="Sair">🚪</button>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 18, background: T.statBg, border: `1px solid ${T.statBorder}` }}><span style={{ fontSize: 13 }}>📥</span><span style={{ fontSize: 14, fontWeight: 700, color: T.accent }}>{downloaded.length}</span></div>
          </div>
        </header>

        {/* NEW MATERIALS ALERT */}
        {newMats.length > 0 && (
          <div style={{ background: T.newBg, border: `1px solid ${T.newBorder}`, borderRadius: 14, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10, animation: "fadeInUp 0.5s ease", opacity: animateIn ? 1 : 0, transition: "opacity 0.5s ease" }}>
            <span style={{ fontSize: 22 }}>🔥</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: T.newText }}>{newMats.length} {newMats.length === 1 ? "novo material" : "novos materiais"}!</p>
              <p style={{ fontSize: 12, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'", marginTop: 2 }}>Adicionado{newMats.length > 1 ? "s" : ""} desde sua última visita</p>
            </div>
            <button onClick={() => setSeenNewIds((p) => [...p, ...newMats.map((m) => m.id)])} style={{ padding: "6px 12px", borderRadius: 8, background: T.newText + "22", color: T.newText, fontSize: 12, fontWeight: 600, border: `1px solid ${T.newText}33` }}>Visto ✓</button>
          </div>
        )}

        {/* Profile completion prompt */}
        {!userProfile.completed && (
          <div onClick={() => setView("profile")} style={{ background: theme === "dark" ? "linear-gradient(135deg, #1a1a10, #0d1210)" : "linear-gradient(135deg, #fdf8e8, #fdf0d0)", border: `1px solid ${T.gold}22`, borderRadius: 14, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10, cursor: "pointer", opacity: animateIn ? 1 : 0, transition: "opacity 0.5s ease" }}>
            <span style={{ fontSize: 22 }}>🎁</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: T.gold }}>{completedPhases === PHASES.length ? "Todas as fases completas! 🏆" : `Desbloqueie prêmios! ${completedPhases}/${PHASES.length} fases`}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <div style={{ flex: 1, height: 4, borderRadius: 2, background: T.progressTrack, overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 2, background: `linear-gradient(90deg, ${T.gold}, #FFD863)`, width: `${(completedPhases / (PHASES.length || 1)) * 100}%`, transition: "width 0.5s" }} /></div>
                <span style={{ fontSize: 11, fontWeight: 600, color: T.gold }}>{completedPhases}/{PHASES.length}</span>
              </div>
            </div>
            <span style={{ fontSize: 12, color: T.gold, fontWeight: 600 }}>→</span>
          </div>
        )}

        {/* Progress bar */}
        <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 18, padding: "18px 18px 14px", marginBottom: 24, opacity: animateIn ? 1 : 0, transform: animateIn ? "translateY(0)" : "translateY(20px)", transition: "all 0.5s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 9 }}><span style={{ fontSize: 13, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'" }}>{downloaded.length} de {activeMats.length} {config.progressSuffix}</span><span style={{ fontSize: 13, fontWeight: 700, color: T.accent }}>{Math.round((downloaded.length / Math.max(activeMats.length, 1)) * 100)}%</span></div>
          <div style={{ width: "100%", height: 5, borderRadius: 3, background: T.progressTrack, overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg, #349980, #7DE2C7)", width: `${(downloaded.length / Math.max(activeMats.length, 1)) * 100}%`, transition: "width 0.8s ease" }} /></div>
          <p style={{ fontSize: 11, color: T.textFaint, marginTop: 9, fontFamily: "'Plus Jakarta Sans'" }}>{config.progressHint}</p>
        </div>

        {/* SPOTLIGHT MATERIAL (deep link) */}
        {spotlightMat && (
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.accent, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>📌 Seu material</h2>
            <MaterialCard m={spotlightMat} index={0} isSpotlight isNew={newMats.some((nm) => nm.id === spotlightMat.id)} />
          </div>
        )}

        {/* ALL OTHER MATERIALS */}
        <h2 style={{ fontSize: 17, fontWeight: 700, color: T.text, marginBottom: 14 }}>{spotlightMat ? "Explore mais materiais" : config.sectionTitle}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {otherMats.map((m, i) => (
            <MaterialCard key={m.id} m={m} index={i + (spotlightMat ? 1 : 0)} isSpotlight={false} isNew={newMats.some((nm) => nm.id === m.id)} />
          ))}
        </div>

        {/* CTA Banner — Dynamic */}
        {(() => {
          const b = getBannerContent();
          return (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", borderRadius: 18, background: b.icon === "🔓" ? (theme === "dark" ? "linear-gradient(135deg, #1a1610, #0d1210)" : "linear-gradient(135deg, #fdf0e0, #fdf8f0)") : T.ctaBanBg, border: `1px solid ${b.icon === "🔓" ? T.gold + "33" : T.ctaBanBrd}`, marginTop: 20, opacity: animateIn ? 1 : 0, transform: animateIn ? "translateY(0)" : "translateY(20px)", transition: "all 0.5s ease 0.4s" }}>
              <span style={{ fontSize: 24 }}>{b.icon}</span>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{b.title}</h3>
                <p style={{ fontSize: 11, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'", marginTop: 2 }}>{b.desc}</p>
              </div>
              {b.link ? (
                <a href={b.link} target="_blank" rel="noreferrer" style={{ padding: "7px 14px", borderRadius: 10, background: "linear-gradient(135deg, #c49500, #FFD863)", color: "#1a1a12", fontSize: 12, fontWeight: 700, border: "none", whiteSpace: "nowrap", textDecoration: "none" }}>{b.btn}</a>
              ) : (
                <button style={{ padding: "7px 14px", borderRadius: 10, background: T.gold + "22", color: T.gold, fontSize: 12, fontWeight: 600, border: `1px solid ${T.gold}33`, whiteSpace: "nowrap" }}>{b.btn}</button>
              )}
            </div>
          );
        })()}
        <footer style={{ textAlign: "center", padding: "24px 0 8px" }}><a href={config.instagramUrl} target="_blank" rel="noreferrer" style={{ color: T.textFaint, fontSize: 13, textDecoration: "none", fontFamily: "'Plus Jakarta Sans'" }}>{config.instagramHandle}</a></footer>
      </div>

      {/* Download Modal */}
      {selectedMaterial && (
        <div style={{ position: "fixed", inset: 0, background: T.overlayBg, backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100, padding: 16 }} onClick={() => setSelectedMaterial(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: "22px 22px 14px 14px", padding: "30px 22px 22px", maxWidth: 400, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", animation: "slideUp 0.3s ease", position: "relative" }}>
            <button onClick={() => setSelectedMaterial(null)} style={{ position: "absolute", top: 12, right: 16, background: "none", color: T.textFaint, fontSize: 18 }}>✕</button>
            <div style={{ width: 76, height: 76, borderRadius: 20, background: T.matIcon, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}><span style={{ fontSize: 48 }}>{selectedMaterial.icon}</span></div>
            <h2 style={{ fontSize: 19, fontWeight: 700, color: T.text, textAlign: "center" }}>{selectedMaterial.title}</h2>
            <p style={{ fontSize: 13, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'", lineHeight: 1.6, textAlign: "center", marginTop: 6 }}>{selectedMaterial.description}</p>
            <span style={{ fontSize: 11, color: T.textFaint, marginTop: 4, marginBottom: 14, fontFamily: "'Plus Jakarta Sans'" }}>{selectedMaterial.date}</span>
            {downloaded.includes(selectedMaterial.id) && <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 10, background: T.dlBg, border: `1px solid ${T.dlBorder}`, color: T.accent, fontSize: 13, fontFamily: "'Plus Jakarta Sans'", marginBottom: 8, width: "100%" }}><span>✅</span><span>Você já baixou este material</span></div>}
            {selectedMaterial.downloadUrl ? (
              <a href={selectedMaterial.downloadUrl} target="_blank" rel="noreferrer" onClick={() => handleDownload(selectedMaterial)} style={{ display: "block", width: "100%", padding: "14px", borderRadius: 14, background: "linear-gradient(135deg, #349980, #7DE2C7)", color: "#060a09", fontSize: 15, fontWeight: 700, boxShadow: "0 4px 20px #34998033", marginTop: 6, textAlign: "center", textDecoration: "none" }}>{downloaded.includes(selectedMaterial.id) ? "📥 Acessar novamente" : "📥 Acessar material"}</a>
            ) : (
              <button onClick={() => handleDownload(selectedMaterial)} style={{ width: "100%", padding: "14px", borderRadius: 14, background: "linear-gradient(135deg, #349980, #7DE2C7)", color: "#060a09", fontSize: 15, fontWeight: 700, boxShadow: "0 4px 20px #34998033", marginTop: 6 }}>{downloaded.includes(selectedMaterial.id) ? "📥 Baixar novamente" : "📥 Baixar material"}</button>
            )}
          </div>
        </div>
      )}

      {/* Unlock Modal */}
      {unlockTarget && (
        <div style={{ position: "fixed", inset: 0, background: T.overlayBg, backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100, padding: 16 }} onClick={() => { setUnlockTarget(null); setRefName(""); setRefWA(""); }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: "22px 22px 14px 14px", padding: "30px 22px 22px", maxWidth: 400, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", animation: "slideUp 0.3s ease", position: "relative", maxHeight: "85vh", overflowY: "auto" }}>
            <button onClick={() => { setUnlockTarget(null); setRefName(""); setRefWA(""); }} style={{ position: "absolute", top: 12, right: 16, background: "none", color: T.textFaint, fontSize: 18 }}>✕</button>
            <div style={{ width: 76, height: 76, borderRadius: 20, background: `linear-gradient(135deg, ${getUnlockLabel(unlockTarget).color}15, ${getUnlockLabel(unlockTarget).color}08)`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}><span style={{ fontSize: 48 }}>{getUnlockLabel(unlockTarget).icon}</span></div>
            {unlockTarget.unlockType === "social" && unlockTarget.socialMethod === "share" && (<><h2 style={{ fontSize: 19, fontWeight: 700, color: T.text, textAlign: "center" }}>{config.shareModalTitle}</h2><p style={{ fontSize: 13, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'", lineHeight: 1.6, textAlign: "center", margin: "6px 0 12px" }}>{config.shareModalDesc}</p><div style={{ width: "100%", marginBottom: 10 }}><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.textMuted, marginBottom: 5, fontFamily: "'Plus Jakarta Sans'" }}>Nome do amigo</label><input style={inp} placeholder="Nome" value={refName} onChange={(e) => setRefName(e.target.value)} /></div><div style={{ width: "100%", marginBottom: 10 }}><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.textMuted, marginBottom: 5, fontFamily: "'Plus Jakarta Sans'" }}>WhatsApp</label><input style={inp} type="tel" placeholder="(00) 00000-0000" value={refWA} onChange={(e) => setRefWA(fmtWA(e.target.value))} /></div><button onClick={() => confirmUnlock("share")} style={{ width: "100%", padding: "14px", borderRadius: 14, background: "linear-gradient(135deg, #349980, #7DE2C7)", color: "#060a09", fontSize: 15, fontWeight: 700 }}>👥 Indicar e desbloquear</button></>)}
            {unlockTarget.unlockType === "social" && unlockTarget.socialMethod === "comment" && (<><h2 style={{ fontSize: 19, fontWeight: 700, color: T.text, textAlign: "center" }}>{config.commentModalTitle}</h2><p style={{ fontSize: 13, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'", lineHeight: 1.6, textAlign: "center", margin: "6px 0 12px" }}>{config.commentModalDesc}</p><a href={config.instagramUrl} target="_blank" rel="noreferrer" style={{ display: "block", width: "100%", padding: "13px", borderRadius: 14, background: "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)", color: "#fff", fontSize: 14, fontWeight: 700, textAlign: "center", textDecoration: "none" }}>Ir para o Instagram →</a><button onClick={() => confirmUnlock("comment")} style={{ width: "100%", padding: "14px", borderRadius: 14, background: "linear-gradient(135deg, #c49500, #FFD863)", color: "#1a1a12", fontSize: 15, fontWeight: 700, marginTop: 8 }}>✅ Já comentei!</button></>)}
          </div>
        </div>
      )}

      {/* SURVEY MODAL */}
      {currentSurvey && (
        <div style={{ position: "fixed", inset: 0, background: T.overlayBg, backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100, padding: 16 }} onClick={() => setCurrentSurvey(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: "22px 22px 14px 14px", padding: "30px 22px 22px", maxWidth: 400, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, animation: "slideUp 0.3s ease", position: "relative", maxHeight: "85vh", overflowY: "auto" }}>
            <button onClick={() => setCurrentSurvey(null)} style={{ position: "absolute", top: 14, right: 14, background: "none", color: T.textFaint, fontSize: 18 }}>✕</button>
            <span style={{ fontSize: 40 }}>{currentSurvey.icon}</span>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, textAlign: "center" }}>🔍 Pesquisa rápida</h2>
            <p style={{ fontSize: 13, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'", textAlign: "center", lineHeight: 1.5 }}>Responda {currentSurvey.surveyQuestions?.length || 0} perguntas e desbloqueie <strong style={{ color: T.text }}>{currentSurvey.title}</strong></p>

            {/* Preview bullets */}
            {currentSurvey.previewBullets?.length > 0 && (
              <div style={{ width: "100%", padding: "12px 14px", borderRadius: 10, background: T.inputBg, border: `1px solid ${T.inputBorder}` }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, fontFamily: "'Plus Jakarta Sans'" }}>O que você vai receber:</p>
                {currentSurvey.previewBullets.map((b, i) => b && (
                  <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 6 }}>
                    <span style={{ color: T.accent, fontSize: 12 }}>✓</span>
                    <span style={{ fontSize: 12, color: T.text, fontFamily: "'Plus Jakarta Sans'", lineHeight: 1.4 }}>{b}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Survey questions */}
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14, margin: "4px 0" }}>
              {(currentSurvey.surveyQuestions || []).map((q, i) => (
                <div key={q.id || i}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 8, fontFamily: "'Plus Jakarta Sans'" }}>{i + 1}. {q.question}</p>
                  {q.type === "choice" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {(q.options || []).map((opt, oi) => (
                        <button key={oi} onClick={() => setTempAnswers((p) => ({ ...p, [q.id]: opt }))} style={{ padding: "10px 14px", borderRadius: 10, textAlign: "left", fontSize: 13, fontFamily: "'Plus Jakarta Sans'", background: tempAnswers[q.id] === opt ? T.accent + "22" : T.inputBg, color: tempAnswers[q.id] === opt ? T.accent : T.text, border: `1px solid ${tempAnswers[q.id] === opt ? T.accent + "66" : T.inputBorder}`, fontWeight: tempAnswers[q.id] === opt ? 600 : 400, transition: "all 0.2s" }}>
                          <span style={{ marginRight: 8 }}>{tempAnswers[q.id] === opt ? "●" : "○"}</span>{opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <textarea value={tempAnswers[q.id] || ""} onChange={(e) => setTempAnswers((p) => ({ ...p, [q.id]: e.target.value }))} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${T.inputBorder}`, background: T.inputBg, color: T.text, fontSize: 13, fontFamily: "'Plus Jakarta Sans'", minHeight: 60, resize: "vertical" }} placeholder="Sua resposta..." />
                  )}
                </div>
              ))}
            </div>

            {(() => {
              const allAnswered = (currentSurvey.surveyQuestions || []).every((q) => tempAnswers[q.id]?.trim());
              const answeredCount = (currentSurvey.surveyQuestions || []).filter((q) => tempAnswers[q.id]?.trim()).length;
              const totalQ = (currentSurvey.surveyQuestions || []).length;
              return (
                <button onClick={async () => {
                  if (!allAnswered) return showT("Responda todas as perguntas!");
                  setSurveyAnswers((p) => ({ ...p, [currentSurvey.id]: { ...tempAnswers, answeredAt: new Date().toISOString() } }));
                  const newDl = [...downloaded, currentSurvey.id];
                  setDownloaded(newDl);
                  // Save survey responses + download to lead
                  const lead = await db.findLeadByWhatsApp(userWhatsApp);
                  if (lead) {
                    const sr = { ...(lead.surveyResponses || {}), [currentSurvey.id]: { ...tempAnswers, answeredAt: new Date().toISOString() } };
                    await db.updateLead(lead.id, { surveyResponses: sr, downloads: [...new Set([...(lead.downloads || []), currentSurvey.id])] });
                  }
                  setSelectedMaterial(currentSurvey);
                  setCurrentSurvey(null);
                  showT("Pesquisa enviada! Material desbloqueado 🎉");
                }} style={{ width: "100%", padding: "14px", borderRadius: 14, background: allAnswered ? "linear-gradient(135deg, #349980, #7DE2C7)" : T.inputBg, color: allAnswered ? "#060a09" : T.textFaint, fontSize: 15, fontWeight: 700, opacity: allAnswered ? 1 : 0.5, transition: "all 0.3s" }}>
                  {allAnswered ? "🔓 Desbloquear material!" : `Responda ${totalQ - answeredCount} pergunta${totalQ - answeredCount !== 1 ? "s" : ""} restante${totalQ - answeredCount !== 1 ? "s" : ""}`}
                </button>
              );
            })()}
          </div>
        </div>
      )}
      <Toast />
    </div>
  );
}

function getCSS(T) {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: ${T.bg}; }
    input::placeholder, textarea::placeholder { color: ${T.placeholder}; }
    input:focus, textarea:focus { outline: none; border-color: #349980 !important; box-shadow: 0 0 0 3px ${T.focusRing}; }
    button { cursor: pointer; border: none; font-family: 'Outfit', sans-serif; }
    button:hover { filter: brightness(1.08); }
    button:active { transform: scale(0.98); }
    textarea { font-family: 'Plus Jakarta Sans', sans-serif; }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.7; } }
    @keyframes urgencyGlow { 0%, 100% { box-shadow: 0 0 0px transparent; } 50% { box-shadow: 0 0 12px #e8443a22; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(100px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
  `;
}