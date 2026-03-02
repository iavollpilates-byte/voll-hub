import { useState, useEffect, useCallback, useRef } from "react";
import { normalizeWhatsApp } from "../utils";

const LS_KEY = "vollhub_user";

// Timeout para hidratação: após 15s resolve com null para não travar a UI
function withTimeoutResolveNull(ms, promise) {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), ms);
    promise.then((res) => { clearTimeout(t); resolve(res); }).catch(() => { clearTimeout(t); resolve(null); });
  });
}

// Em dev (React.StrictMode) o efeito roda 2x; reutilizamos a mesma busca ao Supabase
let sessionHydratePromise = null;

function readIdentityFromLS() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (u.name && u.whatsapp) return { name: u.name, whatsapp: u.whatsapp };
  } catch (_) {}
  return null;
}

function saveIdentityToLS(name, whatsapp) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ name, whatsapp }));
  } catch (_) {}
}

function clearIdentityFromLS() {
  try { localStorage.removeItem(LS_KEY); } catch (_) {}
}

// Evita hidratação duplicada no dev (React.StrictMode dispara efeitos 2x)
let sessionHydrateLastRun = 0
const SESSION_DEBOUNCE_MS = 500

export function useUserSession(db, showT) {
  const [userName, setUserName] = useState("");
  const [userWhatsApp, setUserWhatsApp] = useState("");
  const [userAvatarUrl, setUserAvatarUrl] = useState("");
  const [souDeForaDoBrasil, setSouDeForaDoBrasil] = useState(false);
  const [downloaded, setDownloaded] = useState([]);
  const [userCredits, setUserCredits] = useState(3);
  const [userCreditsEarned, setUserCreditsEarned] = useState({});
  const [streak, setStreak] = useState({ count: 0, lastDate: "", best: 0 });
  const [totalDays, setTotalDays] = useState(0);
  const [reflectionsRead, setReflectionsRead] = useState([]);
  const [milestonesAchieved, setMilestonesAchieved] = useState([]);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [leadId, setLeadId] = useState(null);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [seenHubOnce, setSeenHubOnce] = useState(false);
  const [photoAnnounceSeen, setPhotoAnnounceSeen] = useState(false);
  const [refVotes, setRefVotes] = useState({});
  const [phaseResponses, setPhaseResponses] = useState({});
  const [userProfile, setUserProfile] = useState({});

  const mountedRef = useRef(false);
  const hydratedRef = useRef(false);

  const hydrateFromLead = useCallback((lead) => {
    if (!lead) return;
    setLeadId(lead.id);
    setDownloaded(lead.downloads || []);
    setUserCredits(lead.credits ?? 3);
    setUserCreditsEarned(lead.creditsEarned || {});
    setStreak({ count: lead.streakCount || 0, lastDate: lead.streakLastDate || "", best: lead.streakBest || 0 });
    setTotalDays(lead.totalDays || 0);
    setReflectionsRead(lead.reflectionsRead || []);
    setMilestonesAchieved(lead.milestonesAchieved || []);
    setUserAvatarUrl(lead.avatarUrl || "");
    setPhaseResponses(lead.phaseResponses || {});
    setOnboardingDone(!!lead.onboardingDone);
    setSeenHubOnce(!!lead.seenHubOnce);
    setPhotoAnnounceSeen(!!lead.photoAnnounceSeen);
    setRefVotes(lead.refVotes || {});
    hydratedRef.current = true;
  }, []);

  // On mount: read {name, whatsapp} from LS, then fetch full lead from Supabase
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const identity = readIdentityFromLS();
    if (!identity) {
      setSessionLoading(false);
      return;
    }
    const normalizedWA = normalizeWhatsApp(identity.whatsapp) || identity.whatsapp;
    if (normalizedWA !== identity.whatsapp) saveIdentityToLS(identity.name, normalizedWA);
    setUserName(identity.name);
    setUserWhatsApp(normalizedWA);

    if (!sessionHydratePromise) {
      sessionHydratePromise = (async () => {
        try {
          return await withTimeoutResolveNull(15000, db.findLeadByWhatsApp(normalizedWA));
        } catch (e) {
          console.error("useUserSession: failed to load from Supabase", e);
          return null;
        }
      })();
    }
    sessionHydratePromise.then((lead) => {
      if (lead) {
        hydrateFromLead(lead);
        if (lead.name !== identity.name) setUserName(lead.name);
      }
      setSessionLoading(false);
    });
  }, [db, hydrateFromLead]);

  const isLoggedIn = !!(userName && userWhatsApp && !sessionLoading);

  const updateLead = useCallback(async (updates) => {
    if (!leadId) return false;
    const ok = await db.updateLead(leadId, updates);
    return ok;
  }, [leadId, db]);

  const earnCredits = useCallback(async (amount, earnKey) => {
    if (earnKey && userCreditsEarned[earnKey]) return false;
    const newCredits = userCredits + amount;
    const newEarned = earnKey ? { ...userCreditsEarned, [earnKey]: true } : userCreditsEarned;
    if (leadId) {
      const ok = await db.updateLead(leadId, { credits: newCredits, creditsEarned: newEarned });
      if (!ok) {
        showT?.("Crédito concedido aqui, mas não foi possível sincronizar. Tente recarregar.");
      }
    }
    setUserCredits(newCredits);
    setUserCreditsEarned(newEarned);
    return true;
  }, [userCredits, userCreditsEarned, leadId, db, showT]);

  const spendCredits = useCallback(async (amount) => {
    if (userCredits < amount) return false;
    const newCredits = userCredits - amount;
    if (leadId) {
      const ok = await db.updateLead(leadId, { credits: newCredits });
      if (!ok) {
        showT?.("Crédito descontado aqui, mas a sincronização falhou. Recarregue a página.");
      }
    }
    setUserCredits(newCredits);
    return true;
  }, [userCredits, leadId, db, showT]);

  const persistUiFlag = useCallback(async (flagKey, value) => {
    const newEarned = { ...userCreditsEarned, [flagKey]: value };
    setUserCreditsEarned(newEarned);
    if (leadId) await db.updateLead(leadId, { creditsEarned: newEarned });
  }, [userCreditsEarned, leadId, db]);

  const addDownload = useCallback(async (matId) => {
    if (downloaded.includes(matId)) return;
    const newDl = [...downloaded, matId];
    setDownloaded(newDl);
    if (leadId) {
      const ok = await db.updateLead(leadId, { downloads: [...new Set(newDl)] });
      if (!ok) showT?.("Material baixado, mas não foi possível salvar no servidor. Tente novamente mais tarde.");
    }
  }, [downloaded, leadId, db, showT]);

  const markReflectionRead = useCallback(async (reflectionId, dateStr) => {
    const alreadyRead = reflectionsRead.some(r => r.id === reflectionId);
    if (alreadyRead) return;
    const newReads = [...reflectionsRead, { id: reflectionId, date: dateStr }];
    setReflectionsRead(newReads);
    if (leadId) await db.updateLead(leadId, { reflectionsRead: newReads });
  }, [reflectionsRead, leadId, db]);

  const voteReflection = useCallback(async (reflectionId, voteType) => {
    const newVotes = { ...refVotes, [reflectionId]: voteType };
    setRefVotes(newVotes);
    if (leadId) await db.updateLead(leadId, { refVotes: newVotes });
  }, [refVotes, leadId, db]);

  const setOnboardingDoneFlag = useCallback(async () => {
    setOnboardingDone(true);
    if (leadId) await db.updateLead(leadId, { onboardingDone: true });
  }, [leadId, db]);

  const setSeenHubOnceFlag = useCallback(async () => {
    setSeenHubOnce(true);
    if (leadId) await db.updateLead(leadId, { seenHubOnce: true });
  }, [leadId, db]);

  const setPhotoAnnounceSeenFlag = useCallback(async () => {
    setPhotoAnnounceSeen(true);
    if (leadId) await db.updateLead(leadId, { photoAnnounceSeen: true });
  }, [leadId, db]);

  // Login: creates or finds lead in Supabase, stores only {name, whatsapp} in LS.
  // Returns { lead, isNew } or null on error.
  const login = useCallback(async (config) => {
    setLoginError(false);
    if (!userName.trim() || !userWhatsApp.trim()) { showT?.("Preencha todos os campos!"); return null; }

    const waDigits = userWhatsApp.replace(/\D/g, "");
    let whatsappToUse = userWhatsApp;
    if (souDeForaDoBrasil) {
      const norm = normalizeWhatsApp(userWhatsApp, true);
      if (norm.length < 10 || norm.length > 15) { showT?.("Informe o número com código do país (ex.: +34 612 345 678)"); return null; }
      whatsappToUse = norm;
    } else {
      if (waDigits.length !== 11) { showT?.("WhatsApp deve ter DDD (2 dígitos) + número (9 dígitos)"); return null; }
      if (waDigits[2] !== "9") { showT?.("Número de celular deve começar com 9 após o DDD"); return null; }
      const ddd = parseInt(waDigits.slice(0, 2));
      if (ddd < 11 || ddd > 99) { showT?.("DDD inválido"); return null; }
      whatsappToUse = normalizeWhatsApp(userWhatsApp, false) || ("55" + waDigits);
    }

    setLoginLoading(true);
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const today = new Date();
      const dateStr = `${String(today.getDate()).padStart(2, "0")} ${["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][today.getMonth()]}`;

      const existing = await db.findLeadByWhatsApp(whatsappToUse);
      if (existing) {
        const ok = await db.updateLead(existing.id, { visits: (existing.visits || 0) + 1, lastVisit: dateStr, name: userName });
        if (!ok) { setLoginError(true); showT?.("Erro ao atualizar. Tente novamente."); return null; }
        hydrateFromLead(existing);
        setUserWhatsApp(whatsappToUse);
        saveIdentityToLS(userName, whatsappToUse);
        return { lead: existing, isNew: false };
      } else {
        const created = await db.addLead({
          name: userName, whatsapp: whatsappToUse, downloads: [], visits: 1,
          firstVisit: dateStr, lastVisit: dateStr, source: "direct",
          phaseResponses: {}, surveyResponses: {},
          credits: parseInt(config.creditsInitial) || 3, creditsEarned: {},
          streakCount: 1, streakLastDate: todayStr, streakBest: 1,
          totalDays: 1, reflectionsRead: [], milestonesAchieved: [],
        });
        if (!created) { setLoginError(true); showT?.("Erro ao criar cadastro. Verifique sua conexão e tente novamente."); return null; }
        setLeadId(created.id);
        setUserCredits(parseInt(config.creditsInitial) || 3);
        setStreak({ count: 1, lastDate: todayStr, best: 1 });
        setTotalDays(1);
        setDownloaded([]);
        setUserCreditsEarned({});
        setPhaseResponses({});
        setReflectionsRead([]);
        setMilestonesAchieved([]);
        setUserWhatsApp(whatsappToUse);
        saveIdentityToLS(userName, whatsappToUse);
        return { lead: created, isNew: true };
      }
    } catch (e) {
      console.error("Login error:", e);
      setLoginError(true);
      showT?.("Erro ao conectar. Tente novamente.");
      return null;
    } finally {
      setLoginLoading(false);
    }
  }, [userName, userWhatsApp, souDeForaDoBrasil, db, showT, hydrateFromLead]);

  const logout = useCallback(() => {
    setUserName(""); setUserWhatsApp(""); setUserAvatarUrl("");
    setDownloaded([]); setUserCredits(3); setUserCreditsEarned({});
    setPhaseResponses({}); setStreak({ count: 0, lastDate: "", best: 0 });
    setTotalDays(0); setReflectionsRead([]); setMilestonesAchieved([]);
    setLeadId(null); setOnboardingDone(false); setSeenHubOnce(false);
    setPhotoAnnounceSeen(false); setRefVotes({});
    clearIdentityFromLS();
  }, []);

  return {
    userName, setUserName,
    userWhatsApp, setUserWhatsApp,
    userAvatarUrl, setUserAvatarUrl,
    souDeForaDoBrasil, setSouDeForaDoBrasil,
    downloaded, setDownloaded,
    userCredits, setUserCredits,
    userCreditsEarned, setUserCreditsEarned,
    streak, setStreak,
    totalDays, setTotalDays,
    reflectionsRead, setReflectionsRead,
    milestonesAchieved, setMilestonesAchieved,
    phaseResponses, setPhaseResponses,
    userProfile, setUserProfile,
    loginLoading, loginError,
    sessionLoading,
    isLoggedIn,
    leadId,
    onboardingDone, seenHubOnce, photoAnnounceSeen, refVotes,
    login, logout,
    earnCredits, spendCredits,
    addDownload,
    persistUiFlag,
    updateLead,
    markReflectionRead,
    voteReflection,
    setOnboardingDoneFlag,
    setSeenHubOnceFlag,
    setPhotoAnnounceSeenFlag,
    hydrateFromLead,
  };
}
