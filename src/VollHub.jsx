import { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense, memo, forwardRef } from "react";
import { useSupabase } from "./useSupabase";
import { useUserSession } from "./hooks/useUserSession";
import { useGamification } from "./hooks/useGamification";
import { useMaterialsHub } from "./hooks/useMaterialsHub";
import { useUIState } from "./hooks/useUIState";
import { useProfilePhases } from "./hooks/useProfilePhases";
import { ICON_LIBRARY, DEFAULT_CONFIG, DEFAULT_BIO_LINKS, PERM_LABELS, THEMES } from "./constants";
import { getUnlockLabel, timeAgo, fmtWA, normalizeWhatsApp, formatCountdown as fmtCountdown, isUrgent as checkUrgent, getTodayStr, getDateStr, getCSS } from "./utils";
import { REFLECTION_STYLES, drawReflectionCanvas, getPreviewDataUrl, wrapCanvasText } from "./canvasUtils";

const AdminPanel = lazy(() => import("./components/AdminPanel"));

// ─── MATERIAL CARD (standalone, memoized) ───
const MaterialCard = memo(forwardRef(function MaterialCard({
  m, index, isSpotlight, isNew,
  downloaded, surveyAnswers, profileComplete, creditsEnabled, userCredits,
  animateIn, theme, T, now, config,
  onCardClick, formatCountdown, isUrgent, getMatDownloads, getRecentPerson,
}, ref) {
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
      ref={isSpotlight ? ref : null}
      onClick={() => onCardClick(m, { isNew, isFree, isFlashActive, surveyDone, isDl })}
      style={{
        background: isFlashActive ? (theme === "dark" ? "linear-gradient(135deg, #1a1210, #0d0a08)" : "linear-gradient(135deg, #fdf0e8, #fdf8f4)") : isSpotlight ? T.spotBg : T.cardBg,
        border: isFlashActive ? `2px solid #e8443a55` : isSpotlight ? `2px solid ${T.spotBorder}` : `1px solid ${T.cardBorder}`,
        borderRadius: 16, padding: 15, display: "flex", gap: 12, alignItems: "flex-start",
        cursor: "pointer", position: "relative", flexWrap: "wrap",
        opacity: animateIn ? (isDl || isFree || isFlashActive || surveyDone || (m.creditCost || 0) === 0 || (creditsEnabled && userCredits >= (m.creditCost || 0)) ? 1 : 0.7) : 0,
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
        {(() => {
          const cost = m.creditCost || 0;
          if (isDl) return <span style={{ fontSize: 12, fontWeight: 600, color: T.accent }}>Abrir ↓</span>;
          if (cost === 0 || isFree || isFlashActive) return <span style={{ fontSize: 12, fontWeight: 600, color: isFlashActive ? "#e8443a" : T.accent }}>{isFlashActive ? "Grátis por tempo limitado →" : "Baixar ↓"}</span>;
          if (surveyDone) return <span style={{ fontSize: 12, fontWeight: 600, color: T.accent }}>Baixar ↓</span>;
          if (creditsEnabled && cost > 0) return <span style={{ fontSize: 12, fontWeight: 600, color: userCredits >= cost ? T.gold : T.textFaint }}>🎯 {cost} crédito{cost > 1 ? "s" : ""}</span>;
          if (m.unlockType === "data") return <span style={{ fontSize: 12, fontWeight: 600, color: T.accent }}>📋 Completar perfil →</span>;
          if (m.unlockType === "survey") return <span style={{ fontSize: 12, fontWeight: 600, color: T.gold }}>🔍 Responder pesquisa →</span>;
          return <span style={{ fontSize: 12, fontWeight: 600, color: T.textFaint }}>Desbloquear →</span>;
        })()}
      </div>
    </div>
  );
}));

export default function VollHub() {
  const [view, setView] = useState("linktree");
  const [theme, setTheme] = useState("light");

  // ─── SUPABASE (must be before anything that uses config) ───
  const db = useSupabase();
  const { materials, leads, adminUsers, reflections: dbReflections, phases: dbPhases, loading: dbLoading, error: dbError, leaderboard, leadsLoading, loadLeads, fetchLeaderboard } = db;
  const config = { ...DEFAULT_CONFIG, ...db.config };

  // Bio links
  const [bioLinks, setBioLinks] = useState(DEFAULT_BIO_LINKS);
  const bioLinksLoaded = useRef(false);
  useEffect(() => {
    if (db.config.bioLinks && !bioLinksLoaded.current) {
      try { setBioLinks(JSON.parse(db.config.bioLinks)); bioLinksLoaded.current = true; } catch(e) {}
    }
  }, [db.config.bioLinks]);
  const saveBioLinks = useCallback((links) => { setBioLinks(links); db.updateConfig("bioLinks", JSON.stringify(links)); }, [db]);

  // ─── USER SESSION (Supabase as source of truth, LS only stores {name, whatsapp}) ───
  const [toast, setToast] = useState(null);
  const showT = useCallback((m) => { setToast(m); setTimeout(() => setToast(null), 3000); }, []);
  const session = useUserSession(db, showT);
  const {
    userName, setUserName, userWhatsApp, setUserWhatsApp, userAvatarUrl, setUserAvatarUrl,
    souDeForaDoBrasil, setSouDeForaDoBrasil, downloaded, setDownloaded,
    userCredits, setUserCredits, userCreditsEarned, setUserCreditsEarned,
    streak, setStreak, totalDays, setTotalDays,
    reflectionsRead, setReflectionsRead, milestonesAchieved, setMilestonesAchieved,
    loginLoading, loginError, sessionLoading, isLoggedIn, leadId,
    onboardingDone: sessionOnboardingDone, seenHubOnce: sessionSeenHubOnce,
    photoAnnounceSeen: sessionPhotoAnnounceSeen, refVotes: sessionRefVotes,
    phaseResponses, setPhaseResponses, userProfile, setUserProfile,
  } = session;

  // ─── MATERIALS HUB (hook) ───
  const mats = useMaterialsHub(materials, downloaded, config);
  const {
    selectedMaterial, setSelectedMaterial, unlockTarget, setUnlockTarget, setUnlock,
    downloadingMatId, setDownloadingMatId, deepLinkMatId, setDeepLinkMatId,
    selectedCategory, setSelectedCategory, showDownloadedOnly, setShowDownloadedOnly,
    previewImgIdx, setPreviewImgIdx, funnelStep, setFunnelStep, funnelAnswers, setFunnelAnswers,
    seenNewIds, setSeenNewIds, spotlightRef,
    selectMat, markNewAsSeen,
    activeMats, newMats, lockedMats, categories, spotlightMat, otherMats, dlCount, bannerContent,
  } = mats;

  // ─── UI STATE (hook) ───
  const ui = useUIState();
  const {
    animateIn, setAnimateIn,
    showOnboarding, setShowOnboarding, onboardingStep, setOnboardingStep,
    showCreditTooltip, setShowCreditTooltip, showCreditStore, setShowCreditStore,
    phaseReward, setPhaseReward,
    showQuiz, setShowQuiz, quizAnswers, setQuizAnswers, quizSubmitted, setQuizSubmitted,
    commentVerifying, setCommentVerifying,
    instaCommentOpenClickedAt, setInstaCommentOpenClickedAt,
    showInstaCommentButton, setShowInstaCommentButton,
    reflectionVote, setReflectionVote, reflectionExpanded, setReflectionExpanded,
    showShareModal, setShowShareModal, shareSelectedStyle, setShareSelectedStyle, shareGenerating, setShareGenerating,
    isOffline,
    showSupportModal, setShowSupportModal, supportType, setSupportType, supportMessage, setSupportMessage, supportSending, setSupportSending,
    showHowWorksModal, setShowHowWorksModal,
    headerNarrow, showHeaderMenu, setShowHeaderMenu,
    showEmailPopup, setShowEmailPopup, emailPopupLeadId, setEmailPopupLeadId, emailPopupValue, setEmailPopupValue, emailPopupSaving, setEmailPopupSaving,
    installBannerDismissed, installBannerHiddenThisSession, deferredInstallPrompt, setDeferredInstallPrompt,
    dismissInstallBanner,
    referralVerifying, setReferralVerifying,
    logoTaps, setLogoTaps,
  } = ui;

  const creditsEnabled = config.creditsEnabled === "true";
  const getQuizzes = useCallback(() => {
    const raw = config.quizzes;
    if (raw != null && typeof raw === "object") return Array.isArray(raw) ? raw : [];
    if (typeof raw !== "string") return [];
    try { return JSON.parse(raw); } catch (e) { return []; }
  }, [config.quizzes]);
  const quizzes = useMemo(() => getQuizzes(), [getQuizzes]);
  const getInstaPosts = useCallback(() => {
    if (!config || typeof config !== "object") return [];
    try {
      const raw = config.instaposts ?? config.instaPosts ?? (() => { const key = Object.keys(config).find((k) => String(k).toLowerCase() === "instaposts"); return key ? config[key] : ""; })() ?? "";
      if (raw != null && typeof raw === "object") return Array.isArray(raw) ? raw : [];
      if (!raw || typeof raw !== "string") return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }, [config]);
  const instaPosts = useMemo(() => getInstaPosts(), [getInstaPosts]);
  const activeInstaPosts = useMemo(() =>
    instaPosts.filter(p => p && (p.active === undefined || p.active === true) && (p.url || "").trim().length > 0),
    [instaPosts]);
  const pendingInstaComments = useMemo(() =>
    activeInstaPosts.filter(p => !userCreditsEarned[`comment_${p.id ?? p.url ?? ""}`]),
    [activeInstaPosts, userCreditsEarned]);

  // ─── REFLECTION OF THE DAY ───
  const todayStr = new Date().toISOString().split("T")[0];
  const todayReflection = useMemo(() => (dbReflections || []).find(r => r.publishDate === todayStr && r.active), [dbReflections, todayStr]);

  // ─── GAMIFICATION (hook) ───
  const gamification = useGamification(session, db, config);
  const { gamificationPopup, gamificationQueue, showLeaderboard, setShowLeaderboard, processGamification, dismissPopup, getStreakRules, getMilestones } = gamification;

  const photoAnnounceDismissed = sessionPhotoAnnounceSeen;
  const [hubTab, setHubTab] = useState("home");

  // When ranking modal opens, fetch leaderboard if not yet loaded
  useEffect(() => {
    if (showLeaderboard && (leaderboard || []).length === 0 && userWhatsApp) {
      db.fetchLeaderboard({ limit: 50, me: userWhatsApp });
    }
  }, [showLeaderboard]);

  // Check if user already voted today (from Supabase via session)
  useEffect(() => {
    if (todayReflection && sessionRefVotes[todayReflection.id]) setReflectionVote(sessionRefVotes[todayReflection.id]);
    else setReflectionVote(null);
  }, [todayReflection, sessionRefVotes]);

  // Auto-mark reflection as read (via session hook)
  useEffect(() => {
    if (!todayReflection || !userWhatsApp || view !== "hub") return;
    session.markReflectionRead(todayReflection.id, todayStr);
  }, [todayReflection, view, userWhatsApp]);

  // Email popup: only when hub, logged in, lead has no email, and not dismissed this session
  useEffect(() => {
    if (view !== "hub" || !userWhatsApp || dbLoading || !leadId) return;
    if (config.messagesEmailPopupEnabled !== "false" && !sessionStorage.getItem("vollhub_email_popup_dismissed")) {
      setEmailPopupLeadId(leadId);
      setShowEmailPopup(true);
    }
  }, [view, userWhatsApp, dbLoading, config.messagesEmailPopupEnabled, leadId]);
  const [refName, setRefName] = useState("");
  const [refWA, setRefWA] = useState("");
  const [adminPin, setAdminPin] = useState("");

  // ─── ADMIN USERS ───
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const isMaster = currentAdmin?.role === "master";
  const can = (perm) => currentAdmin?.permissions?.[perm] === true;

  // Load leads only when admin opens panel (must be after currentAdmin is defined)
  useEffect(() => {
    if (view === "admin" && currentAdmin && db.setAdminToken) {
      db.loadLeads(0, 2000);
    }
  }, [view, currentAdmin, db]);

  // Fetch leaderboard when user opens Community tab (must be after hubTab, userWhatsApp defined)
  useEffect(() => {
    if (view === "hub" && hubTab === "community" && config.rankingEnabled !== "false" && userWhatsApp) {
      db.fetchLeaderboard({ limit: 50, me: userWhatsApp });
    }
  }, [view, hubTab, config.rankingEnabled, userWhatsApp, db]);

  // logoTaps from UI hook

  // ─── SURVEY SYSTEM ───
  const [surveyAnswers, setSurveyAnswers] = useState({});
  const [currentSurvey, setCurrentSurvey] = useState(null);
  const [tempAnswers, setTempAnswers] = useState({});

  // Deep link & return triggers from mats hook

  // ─── PROFILE PHASES (hook) ───
  const profile = useProfilePhases(dbPhases, phaseResponses, setPhaseResponses, config);
  const {
    activePhase, setActivePhase, phaseStartTime, phaseTimer, setPhaseTimer,
    avatarUploading, setAvatarUploading, profilePhotoInputRef,
    openPhase, PHASES,
    getPhaseAnswer, setPhaseAnswer,
    isPhaseFieldsComplete, isPhaseUnlocked,
    completedPhases, profileEnabled, profileComplete,
  } = profile;
  const updProfile = (k, v) => session.setUserProfile((p) => ({ ...p, [k]: v }));

  const T = THEMES[theme];

  useEffect(() => {
    if (view === "hub" || view === "admin" || view === "profile" || view === "linktree") { setAnimateIn(false); setTimeout(() => setAnimateIn(true), 100); }
  }, [view]);

  // Profile draft is ephemeral (React state only, no localStorage)

  // Narrow header detection is in useUIState hook
  useEffect(() => {
    if (view === "hub" && config.messagesHowWorksAutoShow !== "false" && !sessionSeenHubOnce) {
      session.setSeenHubOnceFlag();
      setShowHowWorksModal(true);
    }
  }, [view, config.messagesHowWorksAutoShow, sessionSeenHubOnce]);
  useEffect(() => { if (logoTaps >= 5) { setLogoTaps(0); setView("admin-login"); } }, [logoTaps]);

  // Auto-refresh data every 30s when in admin
  useEffect(() => {
    if (view !== "admin") return;
    const interval = setInterval(() => { db.reload(); }, 600000);
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

  // Read URL params and deep link (session hook handles identity from LS → Supabase)
  const urlParamsRef = useRef(false);
  useEffect(() => {
    if (urlParamsRef.current) return;
    urlParamsRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const mParam = params.get("m");
    const vParam = params.get("view");
    if (mParam) setDeepLinkMatId(parseInt(mParam, 10));
    if (vParam === "landing" || vParam === "cadastro") setView("landing");
    db.incrementPageView();
  }, []);

  // When session loads and URL params want hub view, navigate accordingly
  useEffect(() => {
    if (sessionLoading) return;
    const params = new URLSearchParams(window.location.search);
    const mParam = params.get("m");
    const vParam = params.get("view");
    if (mParam || vParam === "hub" || vParam === "materiais") {
      if (userName && userWhatsApp) setView("hub");
      else if (view === "linktree") setView("landing");
    }
  }, [sessionLoading, userName, userWhatsApp]);

  // Scroll to spotlight when entering hub with deep link
  useEffect(() => {
    if (view === "hub" && deepLinkMatId && spotlightRef.current) {
      setTimeout(() => spotlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 400);
    }
  }, [view, deepLinkMatId]);

  // Auto-open material modal when opening hub via direct link (?m=id)
  useEffect(() => {
    if (!deepLinkMatId || view !== "hub") return;
    const found = materials.find((m) => m.id === deepLinkMatId && m.active);
    if (found) setSelectedMaterial(found);
  }, [deepLinkMatId, materials, view, setSelectedMaterial]);

  // Fechar modais com tecla Escape (acessibilidade)
  useEffect(() => {
    const fn = (e) => {
      if (e.key !== "Escape") return;
      if (selectedMaterial) setSelectedMaterial(null);
      else if (unlockTarget) { setUnlockTarget(null); setRefName(""); setRefWA(""); }
      else if (showShareModal) setShowShareModal(false);
      else if (showHowWorksModal) setShowHowWorksModal(false);
      else if (currentSurvey) setCurrentSurvey(null);
      else if (showCreditStore) setShowCreditStore(false);
      else if (showQuiz) setShowQuiz(false);
      else if (gamificationPopup) dismissPopup();
      else if (showLeaderboard) setShowLeaderboard(false);
      else if (phaseReward) setPhaseReward(null);
      else if (showEmailPopup) { setShowEmailPopup(false); sessionStorage.setItem("vollhub_email_popup_dismissed", "1"); }
      else if (showOnboarding) setShowOnboarding(false);
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [selectedMaterial, unlockTarget, showShareModal, showHowWorksModal, currentSurvey, showCreditStore, showQuiz, gamificationPopup, showLeaderboard, phaseReward, showEmailPopup, showOnboarding]);

  // Mostrar botão "Já comentei" só 10s depois de clicar em "Abrir Post e Comentar"
  const firstPendingPostKey = pendingInstaComments[0] ? (pendingInstaComments[0].id ?? pendingInstaComments[0].url ?? "") : "";
  useEffect(() => {
    setInstaCommentOpenClickedAt(0);
    setShowInstaCommentButton(false);
  }, [firstPendingPostKey]);
  useEffect(() => {
    if (!instaCommentOpenClickedAt) return;
    const id = setTimeout(() => setShowInstaCommentButton(true), 10000);
    return () => clearTimeout(id);
  }, [instaCommentOpenClickedAt]);

  // ─── COUNTDOWN TIMER ───
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (view === "admin") return; // no timer on admin to prevent input focus loss
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [view]);

  // Auto-expire: when expiresAt passes, convert to data unlock
  const expiredUpdatedRef = useRef(new Set());
  const flashUpdatedRef = useRef(new Set());
  useEffect(() => {
    let willUpdate = 0;
    let willFlash = 0;
    materials.forEach((m) => {
      if (m.expiresAt && m.expiresAt <= now && m.unlockType === "free") {
        if (!expiredUpdatedRef.current.has(m.id)) {
          expiredUpdatedRef.current.add(m.id);
          willUpdate++;
          db.updateMaterial(m.id, { unlockType: "data", expiresAt: null });
        }
      }
      if (m.isFlash && m.flashUntil && m.flashUntil <= now) {
        if (!flashUpdatedRef.current.has(m.id)) {
          flashUpdatedRef.current.add(m.id);
          willFlash++;
          db.updateMaterial(m.id, { isFlash: false, flashUntil: null });
        }
      }
    });
  }, [now]);

  const formatCountdown = useCallback((target) => fmtCountdown(target, now), [now]);
  const isUrgent = useCallback((target) => checkUrgent(target, now), [now]);
  const waDigits = userWhatsApp.replace(/\D/g, "");
  const waDigitsCount = waDigits.length;
  const waValidBR = waDigits.length === 11 && waDigits[2] === "9" && parseInt(waDigits.slice(0, 2)) >= 11 && parseInt(waDigits.slice(0, 2)) <= 99;
  const waNormalizedIntl = normalizeWhatsApp(userWhatsApp, true);
  const waValidIntl = waNormalizedIntl.length >= 10 && waNormalizedIntl.length <= 15;
  const handleLogin = async () => {
    const result = await session.login(config);
    if (!result) return;
    setView("hub");
    if (result.isNew) {
      if (config.messagesOnboardingEnabled !== "false" && !sessionOnboardingDone) { setShowOnboarding(true); setOnboardingStep(0); }
    } else {
      processGamification(result.lead);
    }
  };
  // ─── CREDITS HELPERS ───
  // ─── REFLECTION SHARE (uses canvasUtils.js) ───
  const reflectionStyles = useMemo(() => REFLECTION_STYLES, []);

  // Generate & share
  const generateShareImage = async (styleIndex) => {
    if (!todayReflection?.quote) { showT("Sem frase para compartilhar"); return; }
    setShareGenerating(true);
    try {
      const handle = config.instagramHandle || "@rafael.voll";
      const canvas = drawReflectionCanvas(styleIndex, todayReflection.quote, handle);
      canvas.toBlob(async (blob) => {
        if (!blob) { showT("Erro ao gerar imagem"); setShareGenerating(false); return; }
        const file = new File([blob], "reflexao-do-dia.png", { type: "image/png" });
        if (navigator.share) {
          try {
            await navigator.share({ title: todayReflection.quote, files: [file] });
          } catch (e) {
            if (e.name !== "AbortError") { downloadBlob(blob); }
          }
        } else { downloadBlob(blob); }
        setShareGenerating(false);
        setShowShareModal(false);
      }, "image/png");
    } catch(e) { console.error(e); showT("Erro ao gerar."); setShareGenerating(false); }
  };

  const downloadBlob = (blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "reflexao-do-dia.png";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      showT("Imagem salva! Abrindo o Instagram...");
      setTimeout(() => { window.location.href = "instagram://story-camera"; }, 800);
    } else {
      showT("Imagem salva! Abra o Instagram e poste.");
      window.open(config.instagramUrl || "https://instagram.com", "_blank");
    }
  };

  // ─── GENERATE & UPLOAD ALL 4 STYLES TO SUPABASE STORAGE ───
  const generateAndUploadAllStyles = async (reflectionId, quote) => {
    if (!quote) return null;
    const handle = config.instagramHandle || "@rafael.voll";
    const urls = {};
    const canvasToBlob = (canvas) => new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    for (let i = 0; i < 4; i++) {
      try {
        const canvas = drawReflectionCanvas(i, quote, handle);
        const blob = await canvasToBlob(canvas);
        if (!blob) continue;
        const url = await db.uploadReflectionImage(reflectionId, i, blob);
        if (url) urls[`style_${i}`] = url;
      } catch (e) { console.error(`Error generating style ${i}:`, e); /* feedback via showT is in AdminPanel caller */ }
    }
    if (Object.keys(urls).length > 0) {
      const updated = await db.updateReflection(reflectionId, { imageUrl: JSON.stringify(urls) });
      if (!updated) return null;
      try {
        const ogCanvas = drawReflectionCanvas(0, quote, handle);
        const ogBlob = await canvasToBlob(ogCanvas);
        if (ogBlob) await db.uploadOgImage(ogBlob);
      } catch (e) { console.error("OG image upload error:", e); }
    }
    return urls;
  };

  // ─── SHARE VIA WHATSAPP (full text + link) ───
  const shareReflectionWhatsApp = () => {
    if (!todayReflection) return;
    const msg = `*${todayReflection.title}*\n\n${todayReflection.body}${todayReflection.actionText ? "\n\n\u2728 *Ação do dia:* " + todayReflection.actionText : ""}\n\n\u{1F449} Acesse: https://rafael.grupovoll.com.br/?view=hub`;
    window.open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank");
  };

  // ─── REFLECTION VOTE ───
  const voteReflection = async (isLike) => {
    if (!todayReflection || reflectionVote) return;
    const voteType = isLike ? "like" : "dislike";
    await db.likeReflection(todayReflection.id, isLike);
    setReflectionVote(voteType);
    await session.voteReflection(todayReflection.id, voteType);
    showT(isLike ? "Obrigado pelo feedback! 💚" : "Obrigado pelo feedback! Vamos melhorar 🙏");
  };

  const earnCredits = session.earnCredits;
  const spendCredits = session.spendCredits;

  const persistUiFlag = session.persistUiFlag;

  const handleDownload = async (mat) => {
    if (mat.downloadUrl) window.open(mat.downloadUrl, "_blank");
    setDownloadingMatId(mat.id);
    try {
      if (!downloaded.includes(mat.id)) {
        const cost = mat.creditCost || 0;
        if (creditsEnabled && cost > 0) {
          const spent = await spendCredits(cost);
          if (!spent) { showT("Créditos insuficientes! 🎯"); setShowCreditStore(true); return; }
        }
        await session.addDownload(mat.id);
      }
      if (Object.keys(funnelAnswers).length > 0 && leadId) {
        await session.updateLead({ surveyResponses: { [`funnel_${mat.id}`]: funnelAnswers } });
      }
      if (mat.funnel?.cta?.url && !downloaded.includes(mat.id)) {
        showT(`"${mat.title}" baixado! ✅`);
        setFunnelStep("cta");
      } else {
        showT(`"${mat.title}" baixado! ✅`); setSelectedMaterial(null);
      }
    } finally {
      setDownloadingMatId(null);
    }
  };
  const confirmUnlock = async (method) => {
    if (method === "share" && (!refName.trim() || !refWA.trim())) return showT("Preencha os dados!");
    const matOk = await db.updateMaterial(unlockTarget.id, { unlockType: "free" });
    if (!matOk) { showT("Erro ao desbloquear. Tente novamente."); return; }
    if (method === "share") {
      const today = new Date(); const dateStr = `${String(today.getDate()).padStart(2,"0")} ${["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][today.getMonth()]}`;
      const created = await db.addLead({ name: refName, whatsapp: refWA, downloads: [], visits: 0, firstVisit: dateStr, lastVisit: dateStr, source: "referral", phaseResponses: {}, surveyResponses: {} });
      if (!created) { showT("Erro ao salvar indicação. Tente novamente."); return; }
    }
    setUnlockTarget(null); setRefName(""); setRefWA(""); showT("Desbloqueado! 🎉");
  };
  const handleAdminLogin = async () => {
    if (!adminPin || adminPin.length < 4) {
      showT("Digite o PIN de 4 dígitos.");
      return;
    }
    const apiUrl = `${window.location.origin}/api/verify-pin`;
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: adminPin })
      });
      const text = await res.text();
      let result;
      try {
        result = text ? JSON.parse(text) : {};
      } catch (_) {
        if (res.status === 404) {
          showT("Rota da API não encontrada. Verifique se o projeto está no Vercel com a pasta api/.");
          return;
        }
        if (res.status >= 500) {
          showT("Erro no servidor (500). Confira as variáveis de ambiente no Vercel: ADMIN_PIN, ADMIN_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.");
          return;
        }
        showT("Resposta inválida do servidor. Tente novamente.");
        return;
      }
      if (res.ok) {
        db.setAdminToken(result.token);
        setCurrentAdmin(result.admin);
        setView("admin");
        setAdminPin("");
        db.loadAdminUsers();
        return;
      }
      showT(result.error || "PIN incorreto!");
    } catch (e) {
      showT("Não foi possível conectar. Verifique sua internet e se o site está no ar.");
    }
  };
  // markNewAsSeen, activeMats, newMats from mats hook
  const totalDl = useMemo(() => leads.reduce((s, l) => s + l.downloads.length, 0), [leads]);

  // ─── SOCIAL PROOF ───
  const dlByMat = useMemo(() => {
    const map = {};
    leads.forEach(l => l.downloads.forEach(id => { map[id] = (map[id] || 0) + 1; }));
    return map;
  }, [leads]);
  const getMatDownloads = useCallback((matId) => {
    return (dlByMat[matId] || 0) + (config.socialProofBoost || 0) + (matId * 17 % 50);
  }, [dlByMat, config.socialProofBoost]);
  const getRecentPerson = useCallback((matId) => {
    const toArr = (v) => Array.isArray(v) ? v : typeof v === "string" ? v.split(",").map(s => s.trim()).filter(Boolean) : [];
    const names = toArr(config.socialProofNames);
    const mins = toArr(config.socialProofMinutes).map(Number);
    const idx = matId % names.length;
    const m = mins[idx] || 30;
    const name = names[idx] || "Alguém";
    if (m < 60) return `${name} baixou há ${m}min`;
    if (m < 1440) return `${name} baixou há ${Math.floor(m / 60)}h`;
    return `${name} baixou recentemente`;
  }, [config.socialProofNames, config.socialProofMinutes]);

  // lockedMats, dlCount, bannerContent, categories, spotlightMat, otherMats from mats hook

  // Máx. 2 CTAs visíveis (Instalar > Instagram > Perfil) para reduzir poluição
  const visibleAlerts = useMemo(() => {
    const list = [];
    const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isStandalone = typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || !!window.navigator.standalone);
    if (isMobile && !isStandalone && !installBannerDismissed && !installBannerHiddenThisSession) list.push("install");
    if (creditsEnabled && (activeInstaPosts.length > 0 || instaPosts.length > 0)) list.push("instagram");
    if (!userProfile.completed) list.push("profile");
    return list.slice(0, 2);
  }, [installBannerDismissed, installBannerHiddenThisSession, creditsEnabled, activeInstaPosts.length, instaPosts.length, userProfile.completed]);

  const inp = { width: "100%", padding: "12px 14px", borderRadius: 11, border: `1px solid ${T.inputBorder}`, background: T.inputBg, color: T.text, fontSize: 14, fontFamily: "'Plus Jakarta Sans', sans-serif", transition: "all 0.2s" };
  const sInp = { ...inp, padding: "8px 10px", fontSize: 13 };

  const InfLogo = useMemo(() => function InfLogoInner({ size = 52 }) { return config.logoUrl ? <img src={config.logoUrl} alt="Logo" style={{ width: size, height: size, objectFit: "contain" }} /> : (<svg width={size} height={size * 0.54} viewBox="0 0 52 28" fill="none"><path d="M14 14C14 14 14 4 7 4C0 4 0 14 0 14C0 14 0 24 7 24C14 24 14 14 14 14ZM14 14C14 14 14 4 21 4C28 4 28 14 28 14" stroke="#7DE2C7" strokeWidth="3" strokeLinecap="round" /><path d="M28 14C28 14 28 24 35 24C42 24 42 14 42 14C42 14 42 4 35 4C28 4 28 14 28 14" stroke="#349980" strokeWidth="3" strokeLinecap="round" /><path d="M42 14C42 14 42 24 48 24" stroke="#FFD863" strokeWidth="3" strokeLinecap="round" /></svg>); }, [config.logoUrl]);

  const Toast = () => toast ? <div role="status" aria-live="polite" aria-atomic="true" style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", padding: "11px 22px", borderRadius: 14, background: T.toastBg, border: `1px solid ${T.toastBorder}`, color: T.text, fontSize: 14, fontFamily: "'Plus Jakarta Sans'", zIndex: 200, animation: "toastIn 0.3s ease", boxShadow: "0 10px 40px rgba(0,0,0,0.4)", whiteSpace: "nowrap", maxWidth: "90vw", overflow: "hidden", textOverflow: "ellipsis" }}>{toast}</div> : null;



  // ─── CARD CLICK HANDLER (stable callback for MaterialCard) ───
  const handleCardClick = useCallback((m, { isNew, isFree, isFlashActive, surveyDone, isDl }) => {
    if (isNew) markNewAsSeen(m.id);
    const cost = m.creditCost || 0;
    if (isDl) { selectMat(m); return; }
    if (cost === 0 || isFree || isFlashActive || surveyDone) { selectMat(m); return; }
    if (creditsEnabled && cost > 0) {
      if (userCredits >= cost) { selectMat(m); return; }
      else { setShowCreditStore(true); showT(`Você precisa de ${cost} crédito${cost > 1 ? "s" : ""} para baixar. Ganhe créditos! 🎯`); return; }
    }
    if (m.unlockType === "data") { if (profileComplete) { selectMat(m); } else { setView("profile"); showT("Complete seu perfil para desbloquear! 📋"); } return; }
    if (m.unlockType === "survey") { setCurrentSurvey(m); setTempAnswers({}); setPreviewImgIdx(0); return; }
    setUnlock(m);
  }, [creditsEnabled, userCredits, profileComplete, markNewAsSeen, selectMat, setShowCreditStore, showT, setView, setCurrentSurvey, setTempAnswers, setPreviewImgIdx, setUnlock]);

  // ─── LOADING ───
  if (dbLoading || sessionLoading) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: "'Outfit'" }}>
      <style>{getCSS(T)}</style>
      <div style={{ fontSize: 48, marginBottom: 16, animation: "pulse 1.5s ease-in-out infinite" }}>⚡</div>
      <p style={{ fontSize: 18, fontWeight: 600, color: T.text }}>Carregando...</p>
    </div>
  );

  if (dbError) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: "'Outfit'", padding: 24 }}>
      <style>{getCSS(T)}</style>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
      <p style={{ fontSize: 18, fontWeight: 600, color: T.text }}>Erro de conexão</p>
      <p style={{ fontSize: 13, color: T.textFaint, marginTop: 4, textAlign: "center" }}>{dbError}</p>
      <button onClick={() => db.reload()} style={{ marginTop: 16, padding: "12px 24px", borderRadius: 12, background: T.accent, color: "#060a09", fontSize: 14, fontWeight: 600 }}>Tentar novamente</button>
    </div>
  );

  // ═══════════════════════════════════════
  // LINKTREE (Bio Page)
  // ═══════════════════════════════════════
  if (view === "linktree") {
    const activeLinks = bioLinks.filter(l => l.active && l.id !== "board" && l.id !== "calendario" && l.title !== "Board" && l.title !== "Calendário");
    const handleLinkClick = (link) => {
      // Track click
      const updated = bioLinks.map(l => l.id === link.id ? { ...l, clicks: (l.clicks || 0) + 1 } : l);
      saveBioLinks(updated);
      // Navigate
      if (link.url === "_hub") {
        if (userName && userWhatsApp) { setView("hub"); return; }
        setView("landing");
      } else {
        window.open(link.url, "_blank");
      }
    };

    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 16px 40px", fontFamily: "'Outfit'", background: T.bg, position: "relative", overflow: "hidden" }}>
        <style>{getCSS(T)}</style>
        {isOffline && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, padding: "10px 16px", background: T.gold + "22", borderBottom: `1px solid ${T.gold}44`, color: T.text, fontSize: 13, fontFamily: "'Plus Jakarta Sans'", textAlign: "center", zIndex: 50 }} role="status">Você está offline</div>
        )}
        <div style={{ position: "fixed", top: "-25%", right: "-15%", width: 450, height: 450, borderRadius: "50%", background: `radial-gradient(circle, rgba(125,226,199,${T.glowOp}) 0%, transparent 70%)`, animation: "pulse 5s ease-in-out infinite", pointerEvents: "none" }} />
        <div style={{ width: "100%", maxWidth: 480, position: "relative", zIndex: 1, paddingTop: isOffline ? 44 : 0 }}>
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
            {activeLinks.map((link, i) => {
              const isHL = link.highlight;
              const hasImg = !!link.imageUrl;
              const isHero = isHL && i === 0;
              const grad = isHL ? (link.color || "linear-gradient(135deg, #1a3a30, #0d2920)") : "";
              return (
                <div key={link.id} onClick={() => handleLinkClick(link)} className={`bio-card${isHero ? " bio-hero" : ""}`} style={{
                  borderRadius: 16, overflow: "hidden", cursor: "pointer", position: "relative",
                  border: isHL ? `2px solid ${T.gold}` : `1px solid ${T.cardBorder}`,
                  background: hasImg ? "transparent" : (grad || T.cardBg),
                  opacity: animateIn ? 1 : 0,
                  transform: animateIn ? "translateY(0) scale(1)" : "translateY(15px) scale(0.97)",
                  transition: `all 0.4s ease ${i * 0.06}s`,
                  boxShadow: isHero ? `0 6px 30px ${T.gold}44, 0 0 0 1px ${T.gold}22` : isHL ? `0 4px 20px ${T.gold}33` : "0 2px 8px rgba(0,0,0,0.06)",
                }}>
                  {isHL && <div style={{ position: "absolute", top: isHero ? 10 : 8, right: isHero ? 12 : 10, fontSize: isHero ? 11 : 10, fontWeight: 700, color: T.gold, background: `${T.gold}22`, padding: isHero ? "4px 10px" : "3px 8px", borderRadius: 6, zIndex: 2, fontFamily: "'Plus Jakarta Sans'", letterSpacing: 0.5, border: `1px solid ${T.gold}33` }}>{link.badge || "🔥 DESTAQUE"}</div>}
                  {hasImg ? (
                    <img src={link.imageUrl} alt={link.title} style={{ width: "100%", display: "block", maxHeight: 120, objectFit: "cover" }} />
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: isHero ? 16 : 14, padding: isHero ? "22px 22px" : "16px 18px" }}>
                      {link.icon && <div style={{ width: isHero ? 52 : 44, height: isHero ? 52 : 44, borderRadius: isHero ? 14 : 12, background: isHL ? `${T.gold}22` : `${T.accent}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isHero ? 26 : 22, flexShrink: 0 }}>{link.icon}</div>}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: isHero ? 16 : 14, fontWeight: 800, color: isHL ? "#fff" : T.text, display: "block", lineHeight: 1.3 }}>{link.title}</span>
                        {link.subtitle && <span style={{ fontSize: isHero ? 12 : 11, color: isHL ? "#ffffffaa" : T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginTop: 3, display: "block", lineHeight: 1.3 }}>{link.subtitle}</span>}
                      </div>
                      <span style={{ fontSize: isHero ? 20 : 16, color: isHL ? T.gold : T.accent, flexShrink: 0 }}>›</span>
                    </div>
                  )}
                </div>
              );
            })}
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

    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px", fontFamily: "'Outfit'", background: T.bg, position: "relative", overflow: "hidden" }}>
        <style>{getCSS(T)}</style>
        {isOffline && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, padding: "10px 16px", background: T.gold + "22", borderBottom: `1px solid ${T.gold}44`, color: T.text, fontSize: 13, fontFamily: "'Plus Jakarta Sans'", textAlign: "center", zIndex: 50 }} role="status">Sem conexão. Conecte-se para continuar.</div>
        )}
        <div style={{ position: "fixed", top: "-25%", right: "-15%", width: 450, height: 450, borderRadius: "50%", background: `radial-gradient(circle, rgba(125,226,199,${T.glowOp}) 0%, transparent 70%)`, animation: "pulse 5s ease-in-out infinite", pointerEvents: "none" }} />
        <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 24, padding: "36px 24px 28px", maxWidth: 400, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", zIndex: 1, animation: "fadeInUp 0.6s ease", boxShadow: T.shadow, marginTop: isOffline ? 44 : 0 }}>
          <button type="button" aria-label={theme === "dark" ? "Usar tema claro" : "Usar tema escuro"} onClick={() => setTheme((t) => t === "dark" ? "light" : "dark")} style={{ position: "absolute", top: 14, right: 14, width: 44, height: 26, borderRadius: 13, background: T.tabBg, border: `1px solid ${T.cardBorder}`, display: "flex", alignItems: "center", padding: "0 3px", zIndex: 5 }}><div style={{ width: 20, height: 20, borderRadius: "50%", background: T.accent, transform: theme === "dark" ? "translateX(0)" : "translateX(17px)", transition: "all 0.3s", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>{theme === "dark" ? "🌙" : "☀️"}</div></button>
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
          <div style={{ width: "100%", marginBottom: 8 }}><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.textMuted, marginBottom: 5, fontFamily: "'Plus Jakarta Sans'" }}>{config.whatsLabel}</label><input style={inp} type="tel" placeholder={souDeForaDoBrasil ? "+34 612 345 678" : "(19) 99921-4116"} value={userWhatsApp} onChange={(e) => setUserWhatsApp(fmtWA(e.target.value, souDeForaDoBrasil))} /><p style={{ fontSize: 10, color: (souDeForaDoBrasil ? waValidIntl : waValidBR) ? T.accent : T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginTop: 4 }}>{souDeForaDoBrasil ? (waValidIntl ? "✅ Número válido" : `Código do país + número (${waDigitsCount}/10-15 dígitos)`) : (waValidBR ? "✅ Número válido" : `(DDD) 9XXXX-XXXX · ${waDigitsCount}/11 dígitos`)}</p></div>
          <button type="button" onClick={() => setSouDeForaDoBrasil((b) => !b)} style={{ background: "none", color: T.textFaint, fontSize: 11, marginBottom: 12, fontFamily: "'Plus Jakarta Sans'", textDecoration: "underline", padding: 0 }}>{souDeForaDoBrasil ? "Usar número brasileiro" : "Sou de fora do Brasil"}</button>
          <button type="button" onClick={handleLogin} disabled={loginLoading || isOffline} aria-busy={loginLoading} style={{ width: "100%", padding: "15px", borderRadius: 14, background: (loginLoading || isOffline) ? T.inputBg : "linear-gradient(135deg, #349980, #7DE2C7)", color: (loginLoading || isOffline) ? T.textFaint : "#060a09", fontSize: 16, fontWeight: 700, marginTop: 6, boxShadow: (loginLoading || isOffline) ? "none" : "0 4px 20px #34998033", cursor: (loginLoading || isOffline) ? "not-allowed" : "pointer" }}>{loginLoading ? "Entrando..." : isOffline ? "Sem conexão" : loginError ? "Tentar novamente" : (dlMat ? `Baixar "${dlMat.title}" →` : config.ctaText)}</button>
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
      <Suspense fallback={
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: "'Outfit', sans-serif" }}>
          <span style={{ color: T.textMuted, fontSize: 14 }}>Carregando painel…</span>
        </div>
      }>
      <AdminPanel
        db={db} config={config} T={T} theme={theme} setTheme={setTheme} setView={setView}
        currentAdmin={currentAdmin} setCurrentAdmin={setCurrentAdmin} isMaster={isMaster} can={can}
        showT={showT} animateIn={animateIn} Toast={Toast}
        materials={materials} leads={leads} adminUsers={adminUsers} dbReflections={dbReflections} dbPhases={dbPhases}
        leadsLoading={leadsLoading} loadLeads={loadLeads}
        bioLinks={bioLinks} saveBioLinks={saveBioLinks}
        activeMats={activeMats} totalDl={totalDl} getMatDownloads={getMatDownloads} getRecentPerson={getRecentPerson}
        creditsEnabled={creditsEnabled} todayStr={todayStr}
        getStreakRules={getStreakRules} getMilestones={getMilestones} getQuizzes={getQuizzes} getInstaPosts={getInstaPosts}
        generateAndUploadAllStyles={generateAndUploadAllStyles}
      />
      </Suspense>
    );
  }

  // ═══════════════════════════════════════
  // USER PROFILE
  // ═══════════════════════════════════════
  if (view === "profile") {
    const MIN_TEXT_LEN = 10;
    const PHASE_TIMER = 15; // seconds

    const getCompletedQuizzesCount = () =>
      Object.keys(userCreditsEarned || {}).filter((k) => k.startsWith("quiz_") && !k.endsWith("_fail") && userCreditsEarned[k]).length;

    const getCommentActionsCount = () =>
      Object.keys(userCreditsEarned || {}).filter((k) => k.startsWith("comment_") && userCreditsEarned[k]).length;

    const getReferralActionsCount = () =>
      userCreditsEarned && userCreditsEarned["referral_share"] ? 1 : 0;

    const getSocialActionsCount = () => getCommentActionsCount() + getReferralActionsCount();

    const validatePhaseText = (phaseId) => {
      const phase = PHASES.find(p => p.id === phaseId);
      if (!phase) return null;
      for (const q of phase.questions) {
        if (q.type === "text" || q.type === "textarea") {
          const val = (getPhaseAnswer(phaseId, q.id) || "").trim();
          if (q.required !== false && val.length < MIN_TEXT_LEN) return `"${q.label.slice(0, 30)}..." precisa ter pelo menos ${MIN_TEXT_LEN} caracteres.`;
          if (val && new Set(val.replace(/\s/g, "")).size <= 2) return `Resposta inválida em "${q.label.slice(0, 30)}..."`;
        }
      }
      const textVals = phase.questions.filter(q => q.type === "text" || q.type === "textarea").map(q => (getPhaseAnswer(phaseId, q.id) || "").trim().toLowerCase()).filter(Boolean);
      if (textVals.length > 1 && new Set(textVals).size === 1) return "As respostas não podem ser todas iguais.";
      return null;
    };

    const handlePhaseSubmit = async (phaseId) => {
      if (!isPhaseFieldsComplete(phaseId)) return showT("Preencha todos os campos!");
      const textErr = validatePhaseText(phaseId);
      if (textErr) return showT(textErr);
      const newResponses = { ...phaseResponses, [String(phaseId)]: { ...(phaseResponses[String(phaseId)] || {}), completed_at: new Date().toISOString().slice(0, 10) } };
      setPhaseResponses(newResponses);
      if (leadId) {
        const ok = await session.updateLead({ phaseResponses: newResponses });
        if (!ok) { showT("Erro ao salvar fase. Tente novamente."); return; }
        const phase = PHASES.find(p2 => p2.id === phaseId);
        const creditsPerPhase = phase?.credits || 2;
        await earnCredits(creditsPerPhase, `phase${phaseId}`);
      }
      setActivePhase(null);
      const phase = PHASES.find(p2 => p2.id === phaseId);
      setPhaseReward({ title: phase?.title || "Fase", credits: phase?.credits || 2, prize: phase?.prize || "", prizeUrl: phase?.prizeUrl || "", icon: phase?.icon || "🎉" });
    };

    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 16px 40px", fontFamily: "'Outfit'", background: T.bg, position: "relative", overflow: "hidden" }}>
        <style>{getCSS(T)}</style>
        {isOffline && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, padding: "10px 16px", background: T.gold + "22", borderBottom: `1px solid ${T.gold}44`, color: T.text, fontSize: 13, fontFamily: "'Plus Jakarta Sans'", textAlign: "center", zIndex: 50 }} role="status">Você está offline</div>
        )}
        <div style={{ position: "fixed", top: "-25%", right: "-15%", width: 450, height: 450, borderRadius: "50%", background: `radial-gradient(circle, rgba(125,226,199,${T.glowOp}) 0%, transparent 70%)`, animation: "pulse 5s ease-in-out infinite", pointerEvents: "none" }} />
        <div style={{ width: "100%", maxWidth: 480, position: "relative", zIndex: 1, paddingTop: isOffline ? 44 : 0 }}>
          <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0" }}>
            <button onClick={() => { setView("hub"); setHubTab("home"); setActivePhase(null); }} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", color: T.accent, fontSize: 14, fontWeight: 600, fontFamily: "'Plus Jakarta Sans'" }}>← Voltar ao Hub</button>
            <button type="button" aria-label={theme === "dark" ? "Usar tema claro" : "Usar tema escuro"} onClick={() => setTheme((t) => t === "dark" ? "light" : "dark")} style={{ width: 34, height: 34, borderRadius: "50%", background: T.statBg, border: `1px solid ${T.statBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{theme === "dark" ? "☀️" : "🌙"}</button>
          </header>

          {/* Profile Header */}
          <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 20, padding: "24px 20px", marginBottom: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, opacity: animateIn ? 1 : 0, transform: animateIn ? "translateY(0)" : "translateY(20px)", transition: "all 0.5s ease" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: userAvatarUrl ? "transparent" : `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#060a09", fontWeight: 800, overflow: "hidden" }}>{userAvatarUrl ? <img src={userAvatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : userName.charAt(0).toUpperCase()}</div>
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

          {/* Resumo social: streak, dias, materiais, reflexões, quizzes, ações sociais */}
          <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: "16px 16px 10px", marginBottom: 16, opacity: animateIn ? 1 : 0, transform: animateIn ? "translateY(0)" : "translateY(20px)", transition: "all 0.5s ease 0.05s" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 10 }}>{config.profileStatsTitle || "Seu progresso no Hub"}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
              <div style={{ background: T.statBg, borderRadius: 12, padding: "10px 8px", textAlign: "center", border: `1px solid ${T.statBorder}` }}>
                <span style={{ fontSize: 18 }}>🔥</span>
                <p style={{ fontSize: 16, fontWeight: 800, color: T.gold, margin: "2px 0 0" }}>{streak.count}</p>
                <p style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginTop: 0 }}>{config.profileStatsStreakLabel || "Dias seguidos"}</p>
              </div>
              <div style={{ background: T.statBg, borderRadius: 12, padding: "10px 8px", textAlign: "center", border: `1px solid ${T.statBorder}` }}>
                <span style={{ fontSize: 18 }}>📅</span>
                <p style={{ fontSize: 16, fontWeight: 800, color: T.accent, margin: "2px 0 0" }}>{totalDays}</p>
                <p style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginTop: 0 }}>{config.profileStatsTotalDaysLabel || "Dias no Hub"}</p>
              </div>
              <div style={{ background: T.statBg, borderRadius: 12, padding: "10px 8px", textAlign: "center", border: `1px solid ${T.statBorder}` }}>
                <span style={{ fontSize: 18 }}>📥</span>
                <p style={{ fontSize: 16, fontWeight: 800, color: T.accent, margin: "2px 0 0" }}>{downloaded.length}</p>
                <p style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginTop: 0 }}>{config.profileStatsDownloadsLabel || "Materiais baixados"}</p>
              </div>
              <div style={{ background: T.statBg, borderRadius: 12, padding: "10px 8px", textAlign: "center", border: `1px solid ${T.statBorder}` }}>
                <span style={{ fontSize: 18 }}>📖</span>
                <p style={{ fontSize: 16, fontWeight: 800, color: T.accentDark, margin: "2px 0 0" }}>{reflectionsRead.length}</p>
                <p style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginTop: 0 }}>{config.profileStatsReflectionsLabel || "Reflexões lidas"}</p>
              </div>
              <div style={{ background: T.statBg, borderRadius: 12, padding: "10px 8px", textAlign: "center", border: `1px solid ${T.statBorder}` }}>
                <span style={{ fontSize: 18 }}>🧠</span>
                <p style={{ fontSize: 16, fontWeight: 800, color: T.gold, margin: "2px 0 0" }}>{getCompletedQuizzesCount()}</p>
                <p style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginTop: 0 }}>{config.profileStatsQuizzesLabel || "Quizzes completos"}</p>
              </div>
              <div style={{ background: T.statBg, borderRadius: 12, padding: "10px 8px", textAlign: "center", border: `1px solid ${T.statBorder}` }}>
                <span style={{ fontSize: 18 }}>🤝</span>
                <p style={{ fontSize: 16, fontWeight: 800, color: T.accent, margin: "2px 0 0" }}>{getSocialActionsCount()}</p>
                <p style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginTop: 0 }}>{config.profileStatsSocialLabel || "Ações sociais"}</p>
              </div>
            </div>
          </div>

          {/* Sua foto — upload para aparecer no ranking */}
          <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: "16px 18px", marginBottom: 16, opacity: animateIn ? 1 : 0, transition: "all 0.4s ease" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 10 }}>📷 Sua foto</h3>
            <p style={{ fontSize: 12, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'", marginBottom: 12 }}>Apareça no ranking com sua foto de rosto.</p>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: userAvatarUrl ? "transparent" : T.statBg, border: `2px solid ${T.cardBorder}`, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: T.textFaint }}>{userAvatarUrl ? <img src={userAvatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : userName.charAt(0).toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <input ref={profilePhotoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
                  const file = e.target?.files?.[0]; if (!file || !db.uploadProfilePhoto || !leadId) { if (!leadId) showT("Faça login novamente."); return; } setAvatarUploading(true); try { const url = await db.uploadProfilePhoto(leadId, file); if (url) { await session.updateLead({ avatarUrl: url }); setUserAvatarUrl(url); showT("Foto atualizada!"); } else showT("Erro ao enviar. Tente de novo."); } catch (err) { showT("Erro ao enviar. Tente de novo."); } finally { setAvatarUploading(false); e.target.value = ""; }
                }} />
                <button type="button" disabled={avatarUploading} onClick={() => profilePhotoInputRef.current?.click()} style={{ padding: "8px 14px", borderRadius: 10, background: avatarUploading ? T.statBg : T.accent + "22", color: avatarUploading ? T.textFaint : T.accent, fontSize: 12, fontWeight: 600, border: `1px solid ${avatarUploading ? T.statBorder : T.accent + "44"}`, fontFamily: "'Plus Jakarta Sans'" }}>{avatarUploading ? "Enviando..." : (userAvatarUrl ? "Trocar foto" : "Escolher foto")}</button>
              </div>
            </div>
          </div>

          {/* Active Phase Form */}
          {activePhase && (() => {
            const phase = PHASES.find(p => p.id === activePhase);
            if (!phase) return null;
            return (
              <div style={{ background: theme === "dark" ? "linear-gradient(135deg, #1a1a10, #0d1210)" : "linear-gradient(135deg, #fdf8e8, #fdf0d0)", border: `1px solid ${T.gold}33`, borderRadius: 18, padding: "20px 18px", marginBottom: 16, opacity: animateIn ? 1 : 0, transform: animateIn ? "translateY(0)" : "translateY(20px)", transition: "all 0.5s ease 0.1s" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{phase.icon} {phase.title}</h3>
                  <button type="button" aria-label="Fechar" onClick={() => setActivePhase(null)} style={{ background: "none", color: T.textFaint, fontSize: 18 }}>✕</button>
                </div>
                {phase.questions.map((q, i) => {
                  const val = getPhaseAnswer(phase.id, q.id);
                  return (
                    <div key={q.id} style={{ marginBottom: 14, opacity: animateIn ? 1 : 0, transform: animateIn ? "translateX(0)" : "translateX(-15px)", transition: `all 0.3s ease ${i * 0.08}s` }}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 6, fontFamily: "'Plus Jakarta Sans'", lineHeight: 1.4 }}>{q.label}{q.required === false ? "" : " *"}</label>
                      {q.type === "select" ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {(q.options || []).map(opt => (
                            <button key={opt} onClick={() => setPhaseAnswer(phase.id, q.id, opt)} style={{ padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600, background: val === opt ? T.accent + "22" : T.inputBg, color: val === opt ? T.accent : T.textMuted, border: `1.5px solid ${val === opt ? T.accent : T.inputBorder}`, transition: "all 0.2s", fontFamily: "'Plus Jakarta Sans'" }}>{opt}</button>
                          ))}
                        </div>
                      ) : q.type === "multiselect" ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {(q.options || []).map(opt => {
                            const selected = Array.isArray(val) && val.includes(opt);
                            return <button key={opt} onClick={() => { const arr = Array.isArray(val) ? [...val] : []; if (selected) setPhaseAnswer(phase.id, q.id, arr.filter(v => v !== opt)); else setPhaseAnswer(phase.id, q.id, [...arr, opt]); }} style={{ padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600, background: selected ? T.accent + "22" : T.inputBg, color: selected ? T.accent : T.textMuted, border: `1.5px solid ${selected ? T.accent : T.inputBorder}`, transition: "all 0.2s", fontFamily: "'Plus Jakarta Sans'" }}>{selected ? "✓ " : ""}{opt}</button>;
                          })}
                        </div>
                      ) : q.type === "scale" ? (
                        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                          {[1,2,3,4,5].map(n => (
                            <button key={n} onClick={() => setPhaseAnswer(phase.id, q.id, String(n))} style={{ width: 44, height: 44, borderRadius: 12, fontSize: 16, fontWeight: 700, background: val === String(n) ? T.accent + "22" : T.inputBg, color: val === String(n) ? T.accent : T.textMuted, border: `2px solid ${val === String(n) ? T.accent : T.inputBorder}`, transition: "all 0.2s" }}>{n}</button>
                          ))}
                        </div>
                      ) : (
                        <textarea value={val || ""} onChange={(e) => setPhaseAnswer(phase.id, q.id, e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${val?.trim() ? T.accent + "44" : T.inputBorder}`, background: T.inputBg, color: T.text, fontSize: 13, fontFamily: "'Plus Jakarta Sans'", minHeight: q.type === "textarea" ? 90 : 60, resize: "vertical" }} placeholder="Digite aqui..." />
                      )}
                    </div>
                  );
                })}
                {(() => {
                  const timeLeft = Math.max(0, PHASE_TIMER - phaseTimer);
                  const canSubmit = isPhaseFieldsComplete(activePhase) && timeLeft === 0;
                  return <button onClick={() => { if (timeLeft > 0) return showT(`Aguarde ${timeLeft}s para enviar...`); handlePhaseSubmit(activePhase); }} style={{ width: "100%", padding: "14px", borderRadius: 14, background: canSubmit ? `linear-gradient(135deg, #c49500, #FFD863)` : T.inputBg, color: canSubmit ? "#1a1a12" : T.textFaint, fontSize: 14, fontWeight: 700, marginTop: 4, opacity: canSubmit ? 1 : 0.5, transition: "all 0.3s" }}>{timeLeft > 0 ? `⏳ Aguarde ${timeLeft}s...` : (phase.ctaText || "🎁 Desbloquear prêmio!")}</button>;
                })()}
              </div>
            );
          })()}

          {/* Phase Cards */}
          {!activePhase && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 2 }}>🏆 {config.profileSectionTitle || 'Ganhe créditos'}</h3>
              {PHASES.map((phase, i) => {
                const unlocked = isPhaseUnlocked(phase.id);
                const phaseIdx = PHASES.findIndex(p => p.id === phase.id);
                const canStart = phaseIdx === 0 || isPhaseUnlocked(PHASES[phaseIdx - 1]?.id);
                return (
                  <div key={phase.id} onClick={() => { if (!unlocked && canStart) openPhase(phase.id); }} style={{ background: unlocked ? T.dlBg : canStart ? T.cardBg : T.statBg, border: `1px solid ${unlocked ? T.accent + "44" : canStart ? T.cardBorder : T.statBorder}`, borderRadius: 16, padding: "16px 18px", cursor: unlocked ? "default" : canStart ? "pointer" : "default", opacity: animateIn ? (canStart || unlocked ? 1 : 0.5) : 0, transform: animateIn ? "translateY(0)" : "translateY(15px)", transition: `all 0.4s ease ${i * 0.1}s` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: unlocked ? T.accent + "22" : canStart ? T.gold + "15" : T.statBg, border: `1px solid ${unlocked ? T.accent + "44" : canStart ? T.gold + "33" : T.statBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{unlocked ? "✅" : phase.icon}</div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 700, color: unlocked ? T.accent : canStart ? T.text : T.textFaint }}>{phase.title}</h4>
                        <p style={{ fontSize: 12, color: unlocked ? T.accent : T.textMuted, fontFamily: "'Plus Jakarta Sans'", marginTop: 2 }}>{unlocked ? `✅ ${phase.prize || "Completo!"}` : canStart ? `🎁 Prêmio: ${phase.prize || "Créditos"}` : "🔒 Complete a fase anterior"}</p>
                      </div>
                      {!unlocked && canStart && <span style={{ fontSize: 14, color: T.gold, fontWeight: 700 }}>→</span>}
                    </div>
                    {unlocked && phase.prizeUrl && (
                      <a href={phase.prizeUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ display: "block", width: "100%", padding: "10px", borderRadius: 10, background: "linear-gradient(135deg, #349980, #7DE2C7)", color: "#060a09", fontSize: 13, fontWeight: 700, textAlign: "center", textDecoration: "none", marginTop: 10 }}>📥 Baixar prêmio</a>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Configurações: Tema, Suporte, downloads, Sair */}
          <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: "16px 18px", marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 12 }}>⚙️ Configurações</h3>
            <button type="button" onClick={() => setTheme((t) => t === "dark" ? "light" : "dark")} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "none", border: "none", color: T.text, fontSize: 14, fontFamily: "'Plus Jakarta Sans'", textAlign: "left", cursor: "pointer", borderRadius: 10 }}>{theme === "dark" ? "☀️" : "🌙"} Tema: {theme === "dark" ? "escuro" : "claro"}</button>
            <button type="button" onClick={() => { setShowSupportModal(true); setSupportMessage(""); setSupportType("error"); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "none", border: "none", color: T.text, fontSize: 14, fontFamily: "'Plus Jakarta Sans'", textAlign: "left", cursor: "pointer", borderRadius: 10 }}>💬 Suporte</button>
            <div style={{ padding: "12px 16px", fontSize: 13, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'" }}>📥 {downloaded.length} download{downloaded.length !== 1 ? "s" : ""}</div>
            <button type="button" onClick={() => { session.logout(); setView("linktree"); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "none", border: "none", color: T.dangerBrd, fontSize: 14, fontFamily: "'Plus Jakarta Sans'", textAlign: "left", cursor: "pointer", borderRadius: 10, borderTop: `1px solid ${T.cardBorder}` }}>🚪 Sair</button>
          </div>

          <footer style={{ textAlign: "center", padding: "24px 0 8px" }}><a href={config.instagramUrl} target="_blank" rel="noreferrer" style={{ color: T.textFaint, fontSize: 13, textDecoration: "none", fontFamily: "'Plus Jakarta Sans'" }}>{config.instagramHandle}</a></footer>
        </div>
      {/* Suporte também disponível no perfil */}
      {showSupportModal && (
        <div role="dialog" aria-modal="true" aria-label="Suporte" style={{ position: "fixed", inset: 0, background: T.overlayBg, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setShowSupportModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: T.bg, border: `1px solid ${T.cardBorder}`, borderRadius: 20, padding: 24, maxWidth: 400, width: "100%", maxHeight: "85vh", overflowY: "auto" }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 16 }}>Suporte</h2>
            <p style={{ fontSize: 13, color: T.textMuted, marginBottom: 12, fontFamily: "'Plus Jakarta Sans'" }}>Reporte um erro ou envie uma sugestão de melhoria.</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button type="button" onClick={() => setSupportType("error")} style={{ flex: 1, padding: "10px 14px", borderRadius: 12, background: supportType === "error" ? T.dangerBrd + "22" : T.statBg, border: `1px solid ${supportType === "error" ? T.dangerBrd : T.cardBorder}`, color: supportType === "error" ? T.dangerBrd : T.textMuted, fontSize: 13, fontWeight: 600 }}>Reportar erro</button>
              <button type="button" onClick={() => setSupportType("suggestion")} style={{ flex: 1, padding: "10px 14px", borderRadius: 12, background: supportType === "suggestion" ? T.accent + "22" : T.statBg, border: `1px solid ${supportType === "suggestion" ? T.accent : T.cardBorder}`, color: supportType === "suggestion" ? T.accent : T.textMuted, fontSize: 13, fontWeight: 600 }}>Sugerir melhoria</button>
            </div>
            <textarea value={supportMessage} onChange={(e) => setSupportMessage(e.target.value)} placeholder={supportType === "error" ? "Descreva o que aconteceu ou o erro que encontrou..." : "Conte sua ideia ou sugestão..."} rows={4} style={{ width: "100%", padding: "12px 14px", borderRadius: 12, background: T.inputBg || T.statBg, border: `1px solid ${T.cardBorder}`, color: T.text, fontSize: 14, fontFamily: "'Plus Jakarta Sans'", resize: "vertical", marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" disabled={!supportMessage.trim() || supportSending} onClick={async () => {
                if (!supportMessage.trim() || supportSending) return;
                setSupportSending(true);
                try {
                  const res = await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: supportType, message: supportMessage.trim(), name: userName || "", whatsapp: userWhatsApp || "" }) });
                  const data = res.ok ? await res.json() : await res.json().catch(() => ({}));
                  if (!res.ok) { showT(data.error || "Não foi possível enviar. Tente novamente."); return; }
                  showT("Mensagem enviada! Obrigado pelo retorno.");
                  setShowSupportModal(false);
                  setSupportMessage("");
                } catch (e) { showT("Erro de conexão. Tente novamente."); }
                finally { setSupportSending(false); }
              }} style={{ flex: 1, padding: "12px", borderRadius: 12, background: supportMessage.trim() && !supportSending ? "linear-gradient(135deg, #349980, #7DE2C7)" : T.statBg, color: supportMessage.trim() && !supportSending ? "#060a09" : T.textFaint, fontSize: 14, fontWeight: 700, border: "none", cursor: supportMessage.trim() && !supportSending ? "pointer" : "default" }}>{supportSending ? "Enviando..." : "Enviar"}</button>
              <button type="button" onClick={() => { setShowSupportModal(false); setSupportMessage(""); }} disabled={supportSending} style={{ padding: "12px 18px", borderRadius: 12, background: T.statBg, border: `1px solid ${T.statBorder}`, color: T.textMuted, fontSize: 14, fontWeight: 600 }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
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
      {isOffline && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, padding: "10px 16px", background: T.gold + "22", borderBottom: `1px solid ${T.gold}44`, color: T.text, fontSize: 13, fontFamily: "'Plus Jakarta Sans'", textAlign: "center", zIndex: 50 }} role="status">Você está offline</div>
      )}
      <div style={{ position: "fixed", top: "-25%", right: "-15%", width: 450, height: 450, borderRadius: "50%", background: `radial-gradient(circle, rgba(125,226,199,${T.glowOp}) 0%, transparent 70%)`, animation: "pulse 5s ease-in-out infinite", pointerEvents: "none" }} />
      <div style={{ width: "100%", maxWidth: 480, position: "relative", zIndex: 1, paddingTop: isOffline ? 44 : 0, paddingBottom: 80 }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0", gap: 10, flexWrap: "nowrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: "1 1 auto" }}>
            <div onClick={() => setLogoTaps((t) => t + 1)} style={{ width: 42, height: 42, borderRadius: "50%", background: T.avBg, border: `2px solid ${T.avBrd}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}><InfLogo size={24} /></div>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: userAvatarUrl ? "transparent" : T.statBg, border: `1px solid ${T.cardBorder}`, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: T.textFaint }}>{userAvatarUrl ? <img src={userAvatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : userName.charAt(0).toUpperCase()}</div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{config.hubGreetPrefix} {userName.split(" ")[0]}! {config.hubGreetEmoji}</p>
              <p style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{config.hubSubtitle}</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {creditsEnabled && (
              <div style={{ position: "relative", flexShrink: 0 }}>
                <button type="button" onClick={() => setShowCreditTooltip(t => !t)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 14, background: T.gold + "15", border: `1px solid ${T.gold}44`, flexShrink: 0 }} aria-label={`Você tem ${userCredits} créditos`}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.gold }}>Você tem {userCredits} crédito{userCredits !== 1 ? "s" : ""}</span>
                </button>
                {pendingInstaComments.length > 0 && <div style={{ position: "absolute", top: -2, right: -2, minWidth: 16, height: 16, borderRadius: "50%", background: T.gold, border: `2px solid ${T.bg}`, fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", color: "#1a1a12" }}>{pendingInstaComments.length}</div>}
                {showCreditTooltip && (
                  <div style={{ position: "absolute", top: 44, right: 0, width: 260, background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: 16, zIndex: 99, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", animation: "fadeInUp 0.3s ease" }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 6 }}>{(config.creditsTooltipTitle || "Você tem {n} créditos").replace("{n}", userCredits)}</p>
                    <p style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.5, fontFamily: "'Plus Jakarta Sans'" }}>{config.creditsTooltipDesc || "Use créditos para desbloquear materiais exclusivos."}</p>
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button onClick={() => { setShowCreditTooltip(false); setShowCreditStore(true); }} style={{ flex: 1, padding: "8px", borderRadius: 10, background: `linear-gradient(135deg, ${T.gold}, #FFD863)`, color: "#1a1a12", fontSize: 12, fontWeight: 700, border: "none" }}>{config.creditsTooltipBtn || "Ganhar créditos"}</button>
                      <button type="button" aria-label="Fechar" onClick={() => setShowCreditTooltip(false)} style={{ padding: "8px 12px", borderRadius: 10, background: T.statBg, border: `1px solid ${T.statBorder}`, color: T.textMuted, fontSize: 12, fontWeight: 600 }}>✕</button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {!headerNarrow && (
              <button type="button" onClick={() => setView("linktree")} style={{ width: 34, height: 34, borderRadius: "50%", background: T.statBg, border: `1px solid ${T.statBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }} title="Voltar" aria-label="Voltar">←</button>
            )}
          </div>
        </header>

        {/* Aviso novidade: foto no ranking (uma vez, só para quem não tem foto) — só na aba Início */}
        {hubTab === "home" && config.messagesPhotoAnnounceEnabled !== "false" && profileEnabled && !userAvatarUrl && !photoAnnounceDismissed && (
          <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: "12px 16px", marginBottom: 18, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <p style={{ flex: "1 1 200px", fontSize: 13, color: T.text, fontFamily: "'Plus Jakarta Sans'", margin: 0 }}>{config.photoAnnounceText || "Novidade: adicione sua foto no Perfil e apareça no ranking."}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button type="button" onClick={() => { session.setPhotoAnnounceSeenFlag(); persistUiFlag("ui_photo_announce_seen", true); setView("profile"); }} style={{ padding: "8px 14px", borderRadius: 10, background: "linear-gradient(135deg, #349980, #7DE2C7)", color: "#060a09", fontSize: 12, fontWeight: 700, border: "none", fontFamily: "'Plus Jakarta Sans'" }}>{config.photoAnnounceBtnVer || "Ver"}</button>
              <button type="button" aria-label="Fechar aviso de novidade" onClick={() => { session.setPhotoAnnounceSeenFlag(); persistUiFlag("ui_photo_announce_seen", true); }} style={{ padding: "8px 12px", borderRadius: 10, background: T.statBg, border: `1px solid ${T.statBorder}`, color: T.textMuted, fontSize: 12, fontWeight: 600, fontFamily: "'Plus Jakarta Sans'" }}>{config.photoAnnounceBtnFechar || "Fechar"}</button>
            </div>
          </div>
        )}

        {/* ABA INÍCIO: reflexão + resumo + atalho materiais */}
        {hubTab === "home" && (
          <>
        {/* REFLECTION OF THE DAY */}
        {todayReflection && (
          <div style={{ background: theme === "dark" ? "linear-gradient(135deg, #1a1a10, #0d1210)" : "linear-gradient(135deg, #fffdf5, #fdf8e8)", border: `1px solid ${T.gold}33`, borderRadius: 18, padding: "18px 18px 14px", marginBottom: 18, opacity: animateIn ? 1 : 0, transform: animateIn ? "translateY(0)" : "translateY(20px)", transition: "all 0.5s ease" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>💭</span>
                <p style={{ fontSize: 14, fontWeight: 700, color: T.gold }}>Reflexão do dia</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {reflectionsRead.some(r => r.id === todayReflection.id) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 3, padding: "4px 8px", borderRadius: 10, background: T.accent + "15", border: `1px solid ${T.accent}33` }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: T.accent }}>Lida</span>
                  </div>
                )}
                {streak.count > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 12, background: T.gold + "15", border: `1px solid ${T.gold}33` }}>
                    <span style={{ fontSize: 14 }}>🔥</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.gold }}>{streak.count} dia{streak.count > 1 ? "s" : ""}</span>
                  </div>
                )}
              </div>
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 8, lineHeight: 1.4 }}>{todayReflection.title}</h3>
            <p style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.7, fontFamily: "'Plus Jakarta Sans'", whiteSpace: "pre-line", maxHeight: reflectionExpanded ? "none" : 80, overflow: "hidden", transition: "max-height 0.3s" }}>{todayReflection.body}</p>
            {todayReflection.body.length > 200 && !reflectionExpanded && (
              <button onClick={() => setReflectionExpanded(true)} style={{ background: "none", border: "none", color: T.gold, fontSize: 12, fontWeight: 600, marginTop: 4, fontFamily: "'Plus Jakarta Sans'" }}>Ler mais ↓</button>
            )}
            {todayReflection.actionText && (
              <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 12, background: T.accent + "11", border: `1px solid ${T.accent}22` }}>
                <p style={{ fontSize: 12, color: T.accent, fontWeight: 600, fontFamily: "'Plus Jakarta Sans'" }}>✨ Ação do dia:</p>
                <p style={{ fontSize: 13, color: T.text, marginTop: 4, lineHeight: 1.5, fontFamily: "'Plus Jakarta Sans'" }}>{todayReflection.actionText}</p>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.cardBorder}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>O que achou?</span>
                <button onClick={() => voteReflection(true)} disabled={!!reflectionVote} style={{ padding: "6px 14px", borderRadius: 10, background: reflectionVote === "like" ? T.accent + "22" : T.statBg, border: `1px solid ${reflectionVote === "like" ? T.accent + "44" : T.statBorder}`, fontSize: 14, opacity: reflectionVote && reflectionVote !== "like" ? 0.4 : 1, cursor: reflectionVote ? "default" : "pointer" }}>👍</button>
                <button onClick={() => voteReflection(false)} disabled={!!reflectionVote} style={{ padding: "6px 14px", borderRadius: 10, background: reflectionVote === "dislike" ? "#e8443a22" : T.statBg, border: `1px solid ${reflectionVote === "dislike" ? "#e8443a44" : T.statBorder}`, fontSize: 14, opacity: reflectionVote && reflectionVote !== "dislike" ? 0.4 : 1, cursor: reflectionVote ? "default" : "pointer" }}>👎</button>
              </div>
              {todayReflection.quote && <button onClick={() => setShowShareModal(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 10, background: "linear-gradient(135deg, #349980, #7DE2C7)", border: "none", color: "#060a09", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>📸 Story</button>}
              <button onClick={shareReflectionWhatsApp} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 10, background: "#25D36622", border: "1px solid #25D36644", color: "#25D366", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>📲 WhatsApp</button>
            </div>
          </div>
        )}

        {/* Resumo: streak, créditos, downloads + CTA materiais */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
          <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: "14px 12px", textAlign: "center" }}>
            <span style={{ fontSize: 20 }}>🔥</span>
            <p style={{ fontSize: 18, fontWeight: 800, color: T.gold, margin: "4px 0 2px" }}>{streak.count}</p>
            <p style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>dias seguidos</p>
          </div>
          <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: "14px 12px", textAlign: "center" }}>
            <span style={{ fontSize: 20 }}>🎯</span>
            <p style={{ fontSize: 18, fontWeight: 800, color: T.gold, margin: "4px 0 2px" }}>{userCredits}</p>
            <p style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>créditos</p>
          </div>
          <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: "14px 12px", textAlign: "center" }}>
            <span style={{ fontSize: 20 }}>📥</span>
            <p style={{ fontSize: 18, fontWeight: 800, color: T.accent, margin: "4px 0 2px" }}>{downloaded.length}</p>
            <p style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>{config.progressSuffix}</p>
          </div>
        </div>
        <button type="button" onClick={() => setHubTab("materials")} style={{ width: "100%", padding: "14px", borderRadius: 14, background: "linear-gradient(135deg, #349980, #7DE2C7)", color: "#060a09", fontSize: 15, fontWeight: 700, border: "none", fontFamily: "'Plus Jakarta Sans'", cursor: "pointer", marginBottom: 24 }}>Ver todos os materiais →</button>
          </>
        )}

        {/* ABA MATERIAIS */}
        {hubTab === "materials" && (
        <>
        {/* SEÇÃO DE MATERIAIS — título + progresso + filtros + spotlight + lista (ou estado vazio) */}
        <div style={{ marginBottom: 24, opacity: animateIn ? 1 : 0, transform: animateIn ? "translateY(0)" : "translateY(20px)", transition: "all 0.5s ease" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: T.textMuted, marginBottom: 6, fontFamily: "'Plus Jakarta Sans'" }}>Pilates é vida!</p>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: T.text, marginBottom: 12 }}>{spotlightMat ? "Explore mais materiais" : config.sectionTitle}</h2>
          {activeMats.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 20px", background: T.cardBg, borderRadius: 16, border: `1px solid ${T.cardBorder}` }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>📚</p>
              <p style={{ fontSize: 15, color: T.text, fontWeight: 600, fontFamily: "'Plus Jakarta Sans'", marginBottom: 6 }}>Nenhum material disponível no momento</p>
              <p style={{ fontSize: 13, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'", lineHeight: 1.5 }}>Em breve teremos novidades. Acompanhe nosso Instagram!</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20, alignItems: "center" }}>
                <a href={config.instagramUrl} target="_blank" rel="noreferrer" style={{ padding: "10px 20px", borderRadius: 12, background: T.accent + "22", color: T.accent, fontSize: 13, fontWeight: 600, textDecoration: "none", fontFamily: "'Plus Jakarta Sans'" }}>{config.instagramHandle}</a>
                <button type="button" onClick={() => setView("linktree")} style={{ background: "none", color: T.textFaint, fontSize: 13, fontFamily: "'Plus Jakarta Sans'", fontWeight: 600 }}>Voltar ao início</button>
              </div>
            </div>
          ) : (
            <>
          {/* Barra de progresso — dentro da seção de materiais */}
          <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: "14px 16px", marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: 13, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'" }}>{downloaded.length} de {activeMats.length} {config.progressSuffix}</span><span style={{ fontSize: 13, fontWeight: 700, color: T.accent }}>{Math.round((downloaded.length / Math.max(activeMats.length, 1)) * 100)}%</span></div>
            <div style={{ width: "100%", height: 5, borderRadius: 3, background: T.progressTrack, overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg, #349980, #7DE2C7)", width: `${(downloaded.length / Math.max(activeMats.length, 1)) * 100}%`, transition: "width 0.8s ease" }} /></div>
            <p style={{ fontSize: 11, color: T.textFaint, marginTop: 6, fontFamily: "'Plus Jakarta Sans'" }}>{config.progressHint}</p>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: categories.length > 0 ? 8 : 14 }}>
            <button onClick={() => setShowDownloadedOnly(false)} style={{ padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: !showDownloadedOnly ? T.accent + "22" : T.statBg, color: !showDownloadedOnly ? T.accent : T.textFaint, border: `1px solid ${!showDownloadedOnly ? T.accent + "44" : T.statBorder}` }}>Todos</button>
            <button onClick={() => setShowDownloadedOnly(true)} style={{ padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: showDownloadedOnly ? T.accent + "22" : T.statBg, color: showDownloadedOnly ? T.accent : T.textFaint, border: `1px solid ${showDownloadedOnly ? T.accent + "44" : T.statBorder}` }}>📥 Baixados</button>
          </div>
          {categories.length > 1 && (
            <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none", paddingBottom: 2 }}>
              <button onClick={() => setSelectedCategory(null)} style={{ padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0, background: !selectedCategory ? T.accent + "22" : T.statBg, color: !selectedCategory ? T.accent : T.textFaint, border: `1px solid ${!selectedCategory ? T.accent + "44" : T.statBorder}`, fontFamily: "'Plus Jakarta Sans'" }}>Todas</button>
              {categories.map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)} style={{ padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0, background: selectedCategory === cat ? T.accent + "22" : T.statBg, color: selectedCategory === cat ? T.accent : T.textFaint, border: `1px solid ${selectedCategory === cat ? T.accent + "44" : T.statBorder}`, fontFamily: "'Plus Jakarta Sans'" }}>{cat}</button>
              ))}
            </div>
          )}
          {deepLinkMatId && !spotlightMat && (
            <div style={{ marginBottom: 16, padding: "16px 18px", background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 14 }}>
              <p style={{ fontSize: 14, color: T.text, fontWeight: 600, fontFamily: "'Plus Jakarta Sans'", marginBottom: 6 }}>Material não encontrado</p>
              <p style={{ fontSize: 12, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'", marginBottom: 10 }}>O material deste link não está disponível ou foi removido.</p>
              <button type="button" onClick={() => setDeepLinkMatId(null)} style={{ padding: "8px 14px", borderRadius: 10, background: T.statBg, border: `1px solid ${T.statBorder}`, color: T.text, fontSize: 12, fontWeight: 600, fontFamily: "'Plus Jakarta Sans'" }}>Ok</button>
            </div>
          )}
          {spotlightMat && (
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: T.accent, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>📌 Seu material</h2>
              <MaterialCard ref={spotlightRef} m={spotlightMat} index={0} isSpotlight isNew={newMats.some((nm) => nm.id === spotlightMat.id)}
                downloaded={downloaded} surveyAnswers={surveyAnswers} profileComplete={profileComplete} creditsEnabled={creditsEnabled} userCredits={userCredits}
                animateIn={animateIn} theme={theme} T={T} now={now} config={config}
                onCardClick={handleCardClick} formatCountdown={formatCountdown} isUrgent={isUrgent} getMatDownloads={getMatDownloads} getRecentPerson={getRecentPerson} />
            </div>
          )}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {otherMats.filter(m => !selectedCategory || m.category === selectedCategory).filter(m => !showDownloadedOnly || downloaded.includes(m.id)).map((m, i) => (
            <MaterialCard key={m.id} m={m} index={i + (spotlightMat ? 1 : 0)} isSpotlight={false} isNew={newMats.some((nm) => nm.id === m.id)}
              downloaded={downloaded} surveyAnswers={surveyAnswers} profileComplete={profileComplete} creditsEnabled={creditsEnabled} userCredits={userCredits}
              animateIn={animateIn} theme={theme} T={T} now={now} config={config}
              onCardClick={handleCardClick} formatCountdown={formatCountdown} isUrgent={isUrgent} getMatDownloads={getMatDownloads} getRecentPerson={getRecentPerson} />
          ))}
          {otherMats.filter(m => !selectedCategory || m.category === selectedCategory).filter(m => !showDownloadedOnly || downloaded.includes(m.id)).length === 0 && (showDownloadedOnly || selectedCategory) && (
            <div style={{ textAlign: "center", padding: "24px 16px", background: T.cardBg, borderRadius: 16, border: `1px solid ${T.cardBorder}` }}>
              <p style={{ fontSize: 28, marginBottom: 8 }}>{showDownloadedOnly ? "📭" : "🔍"}</p>
              <p style={{ fontSize: 14, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'" }}>{showDownloadedOnly && selectedCategory ? `Nenhum material baixado em "${selectedCategory}".` : showDownloadedOnly ? "Você ainda não baixou nenhum material." : `Nenhum material em "${selectedCategory}".`}</p>
              <button onClick={() => { setShowDownloadedOnly(false); setSelectedCategory(null); }} style={{ marginTop: 12, padding: "8px 16px", borderRadius: 10, background: T.accent, color: "#060a09", fontSize: 13, fontWeight: 600, border: "none" }}>Ver todos os materiais</button>
            </div>
          )}
        </div>
            </>
          )}
        </div>

        {/* ALERTAS / CTAs — após os materiais */}
        {newMats.length > 0 && (
          <div style={{ background: T.newBg, border: `1px solid ${T.newBorder}`, borderRadius: 14, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🔥</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: T.newText }}>{newMats.length} {newMats.length === 1 ? "novo material" : "novos materiais"}!</p>
              <p style={{ fontSize: 12, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'", marginTop: 2 }}>Adicionado{newMats.length > 1 ? "s" : ""} desde sua última visita</p>
            </div>
            <button onClick={() => setSeenNewIds((p) => [...p, ...newMats.map((m) => m.id)])} style={{ padding: "6px 12px", borderRadius: 8, background: T.newText + "22", color: T.newText, fontSize: 12, fontWeight: 600, border: `1px solid ${T.newText}33` }}>Visto ✓</button>
          </div>
        )}
        {visibleAlerts.includes("instagram") && creditsEnabled && (activeInstaPosts.length > 0 ? (() => {
          if (pendingInstaComments.length > 0) {
            const post = pendingInstaComments[0];
            const amt = post.credits || 1;
            const more = pendingInstaComments.length > 1 ? ` (e mais ${pendingInstaComments.length - 1} post${pendingInstaComments.length > 2 ? "s" : ""})` : "";
            return (
              <div style={{ background: theme === "dark" ? "linear-gradient(135deg, #1a1a10, #0d1210)" : "linear-gradient(135deg, #fdf8e8, #fdf0d0)", border: `1px solid ${T.gold}22`, borderRadius: 14, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22 }}>💬</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: T.gold }}>Faça um comentário no post abaixo e receba +1 crédito grátis!{more}</p>
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <a href={post.url} target="_blank" rel="noreferrer" onClick={(e) => { e.stopPropagation(); setInstaCommentOpenClickedAt(Date.now()); setShowInstaCommentButton(false); }} style={{ fontSize: 12, fontWeight: 600, color: T.accent, textDecoration: "none", padding: "6px 12px", borderRadius: 8, background: T.accent + "15", border: `1px solid ${T.accent}33` }}>Abrir Post e Comentar ↗</a>
                    {showInstaCommentButton && (!commentVerifying ? (
                      <button onClick={(e) => { e.stopPropagation(); const postId = post.id ?? post.url ?? ""; setCommentVerifying(true); setTimeout(async () => { const ok = await earnCredits(amt, `comment_${postId}`); setCommentVerifying(false); if (ok) showT(`+${amt} crédito! Comentário verificado ✅`); }, 3500); }} style={{ fontSize: 12, fontWeight: 600, color: T.gold, padding: "6px 12px", borderRadius: 8, background: T.gold + "15", border: `1px solid ${T.gold}33` }}>Já comentei ✓</button>
                    ) : (
                      <span style={{ fontSize: 12, color: T.accent, fontFamily: "'Plus Jakarta Sans'", animation: "pulse 1s ease-in-out infinite" }}>🔍 Verificando...</span>
                    ))}
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })() : instaPosts.length === 0 ? null : (
          <div style={{ background: theme === "dark" ? "linear-gradient(135deg, #1a1a10, #0d1210)" : "linear-gradient(135deg, #fdf8e8, #fdf0d0)", border: `1px solid ${T.gold}22`, borderRadius: 14, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>💬</span>
            <p style={{ fontSize: 12, color: T.gold, margin: 0 }}>Comente no Instagram: ative o post e preencha a URL em Admin → Gamificação → Posts Instagram.</p>
          </div>
        ))}
        {visibleAlerts.includes("install") && (() => {
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          const isStandalone = typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || !!window.navigator.standalone);
          if (config.messagesInstallBannerEnabled === "false" || !isMobile || isStandalone || installBannerDismissed || installBannerHiddenThisSession) return null;
          const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
          const isAndroid = /Android/i.test(navigator.userAgent);
          const dismiss = (permanent) => { dismissInstallBanner(permanent); if (permanent) persistUiFlag("ui_install_dismissed", true); };
          const triggerInstall = async () => { if (deferredInstallPrompt) { deferredInstallPrompt.prompt(); const { outcome } = await deferredInstallPrompt.userChoice; if (outcome === "accepted") dismiss(true); setDeferredInstallPrompt(null); } };
          const steps = isIOS ? [config.installBannerStepsIos1, config.installBannerStepsIos2, config.installBannerStepsIos3].filter(Boolean) : [config.installBannerStepsAndroid1, config.installBannerStepsAndroid2, config.installBannerStepsAndroid3].filter(Boolean);
          const title = config.installBannerTitle || "Instale na tela inicial — como um app";
          const btnInstall = config.installBannerBtnInstall || "Instalar agora";
          const btnDone = config.installBannerBtnDone || "Já instalei";
          const btnLater = config.installBannerBtnLater || "Agora não";
          return (
            <div style={{ background: theme === "dark" ? "linear-gradient(135deg, #0d1a16, #0a1210)" : "linear-gradient(135deg, #e8f8f2, #d0f0e8)", border: `1px solid ${T.accent}33`, borderRadius: 14, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 10, position: "relative" }}>
              <span style={{ fontSize: 22 }}>📱</span>
              <div style={{ flex: 1, paddingRight: 28 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: T.accent }}>{title}</p>
                {deferredInstallPrompt && isAndroid ? (
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <button onClick={triggerInstall} style={{ fontSize: 12, fontWeight: 600, color: "#060a09", padding: "6px 12px", borderRadius: 8, background: `linear-gradient(135deg, ${T.accent}, #7DE2C7)`, border: "none" }}>{btnInstall}</button>
                    <button onClick={() => dismiss(true)} style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, padding: "6px 12px", borderRadius: 8, background: T.statBg, border: `1px solid ${T.statBorder}` }}>{btnDone}</button>
                    <button onClick={() => dismiss(false)} style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, padding: "6px 12px", borderRadius: 8, background: "transparent", border: "none" }}>{btnLater}</button>
                  </div>
                ) : (
                  <div style={{ marginTop: 8 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: T.accent, marginBottom: 4 }}>{isIOS ? "Safari" : "Chrome"} — 3 passos:</p>
                    <ol style={{ fontSize: 11, color: T.textMuted, margin: 0, paddingLeft: 16, fontFamily: "'Plus Jakarta Sans'", lineHeight: 1.6 }}>{steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button onClick={() => dismiss(true)} style={{ fontSize: 12, fontWeight: 600, color: T.accent, padding: "6px 12px", borderRadius: 8, background: T.accent + "15", border: `1px solid ${T.accent}33` }}>{btnDone}</button>
                      <button onClick={() => dismiss(false)} style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, padding: "6px 12px", borderRadius: 8, background: T.statBg, border: `1px solid ${T.statBorder}` }}>{btnLater}</button>
                    </div>
                  </div>
                )}
              </div>
              <button type="button" aria-label="Fechar e não mostrar de novo" onClick={() => dismiss(true)} style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%", background: T.statBg, border: `1px solid ${T.statBorder}`, color: T.textMuted, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
            </div>
          );
        })()}
        {visibleAlerts.includes("profile") && !userProfile.completed && (
          <div onClick={() => setView("profile")} style={{ background: theme === "dark" ? "linear-gradient(135deg, #1a1a10, #0d1210)" : "linear-gradient(135deg, #fdf8e8, #fdf0d0)", border: `1px solid ${T.gold}22`, borderRadius: 14, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <span style={{ fontSize: 22 }}>🎁</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: T.gold }}>{completedPhases === PHASES.length ? "Todas as fases completas! 🏆" : `${config.profilePromptText || 'Ganhe créditos!'} ${completedPhases}/${PHASES.length} fases`}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <div style={{ flex: 1, height: 4, borderRadius: 2, background: T.progressTrack, overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 2, background: `linear-gradient(90deg, ${T.gold}, #FFD863)`, width: `${(completedPhases / (PHASES.length || 1)) * 100}%`, transition: "width 0.5s" }} /></div>
                <span style={{ fontSize: 11, fontWeight: 600, color: T.gold }}>{completedPhases}/{PHASES.length}</span>
              </div>
            </div>
            <span style={{ fontSize: 12, color: T.gold, fontWeight: 600 }}>→</span>
          </div>
        )}

        </>
        )}

        {/* ABA COMUNIDADE: ranking */}
        {hubTab === "community" && (config.rankingEnabled === "false" ? (
          <div style={{ marginBottom: 24, textAlign: "center", padding: "32px 20px", background: T.cardBg, borderRadius: 16, border: `1px solid ${T.cardBorder}` }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>🏆</p>
            <p style={{ fontSize: 15, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'" }}>Ranking desativado no momento.</p>
          </div>
        ) : (() => {
          const rankLeads = (leaderboard || []).map(l => ({
            name: l.name,
            avatarUrl: l.avatarUrl || "",
            reads: l.reads,
            downloads: l.downloads,
            streak: l.best ?? l.streak,
            totalDays: l.days,
            isMe: l.isMe,
          }));
          const categories = [
            { key: "reads", label: "Reflexões lidas", icon: "📖" },
            { key: "downloads", label: "Downloads", icon: "📥" },
            { key: "streak", label: "Melhor streak", icon: "🔥" },
            { key: "totalDays", label: "Total de dias", icon: "📅" },
          ];
          const isMe = (l) => l.isMe;
          return (
            <div style={{ marginBottom: 24, opacity: animateIn ? 1 : 0, transform: animateIn ? "translateY(0)" : "translateY(20px)", transition: "all 0.5s ease" }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 16 }}>🏆 Ranking</h2>
              {categories.map(cat => {
                const sorted = [...rankLeads].sort((a, b) => b[cat.key] - a[cat.key]).filter(l => l[cat.key] > 0).slice(0, 10);
                if (sorted.length === 0) return null;
                return (
                  <div key={cat.key} style={{ marginBottom: 20 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: T.textMuted, marginBottom: 8 }}>{cat.icon} {cat.label}</p>
                    {sorted.map((l, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, marginBottom: 4, background: isMe(l) ? T.accent + "11" : "transparent", border: isMe(l) ? `1px solid ${T.accent}33` : "1px solid transparent" }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: i < 3 ? T.gold : T.textFaint, width: 24, textAlign: "center" }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i+1}`}</span>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: l.avatarUrl ? "transparent" : T.statBg, border: `1px solid ${T.cardBorder}`, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: T.textFaint }}>{l.avatarUrl ? <img src={l.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (l.name || "?").charAt(0).toUpperCase()}</div>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: isMe(l) ? 700 : 500, color: isMe(l) ? T.accent : T.text, fontFamily: "'Plus Jakarta Sans'" }}>{l.name.split(" ")[0]}{isMe(l) ? " (você)" : ""}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: i < 3 ? T.gold : T.accent }}>{l[cat.key]}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
              {rankLeads.length === 0 && (
                <p style={{ fontSize: 14, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'", textAlign: "center", padding: "24px 0" }}>Ninguém no ranking ainda. Seja o primeiro!</p>
              )}
            </div>
          );
        })())}

        <footer style={{ textAlign: "center", padding: "24px 0 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <a href={config.instagramUrl} target="_blank" rel="noreferrer" style={{ color: T.textFaint, fontSize: 13, textDecoration: "none", fontFamily: "'Plus Jakarta Sans'" }}>{config.instagramHandle}</a>
          <button type="button" onClick={() => setShowHowWorksModal(true)} style={{ background: "none", border: "none", color: T.textFaint, fontSize: 12, fontFamily: "'Plus Jakarta Sans'", textDecoration: "underline", cursor: "pointer", padding: 0 }}>{config.howWorksFooterLink || "Como funciona?"}</button>
        </footer>

      {/* Bottom navigation */}
      <nav role="navigation" aria-label="Menu principal" style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: T.cardBg, borderTop: `1px solid ${T.cardBorder}`, display: "flex", justifyContent: "space-around", padding: "10px 8px 12px", paddingBottom: "max(12px, env(safe-area-inset-bottom))", zIndex: 90, boxShadow: "0 -4px 20px rgba(0,0,0,0.08)" }}>
        <button type="button" onClick={() => setHubTab("home")} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", color: hubTab === "home" ? T.accent : T.textFaint, fontSize: 11, fontWeight: 600, fontFamily: "'Plus Jakarta Sans'", cursor: "pointer", padding: "6px 12px" }} aria-current={hubTab === "home" ? "page" : undefined}><span style={{ fontSize: 20 }}>🏠</span>Início</button>
        <button type="button" onClick={() => setHubTab("materials")} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", color: hubTab === "materials" ? T.accent : T.textFaint, fontSize: 11, fontWeight: 600, fontFamily: "'Plus Jakarta Sans'", cursor: "pointer", padding: "6px 12px" }} aria-current={hubTab === "materials" ? "page" : undefined}><span style={{ fontSize: 20 }}>📚</span>Materiais</button>
        <button type="button" onClick={() => setHubTab("community")} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", color: hubTab === "community" ? T.accent : T.textFaint, fontSize: 11, fontWeight: 600, fontFamily: "'Plus Jakarta Sans'", cursor: "pointer", padding: "6px 12px" }} aria-current={hubTab === "community" ? "page" : undefined} disabled={config.rankingEnabled === "false"}><span style={{ fontSize: 20 }}>🏆</span>Comunidade</button>
        <button type="button" onClick={() => setView("profile")} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", color: T.textFaint, fontSize: 11, fontWeight: 600, fontFamily: "'Plus Jakarta Sans'", cursor: "pointer", padding: "6px 12px", position: "relative" }}><span style={{ fontSize: 20 }}>👤</span>Perfil{!profileComplete && <span style={{ position: "absolute", top: 4, right: 4, width: 6, height: 6, borderRadius: "50%", background: T.gold }} />}</button>
      </nav>
      </div>

      {/* Modal Como funciona? */}
      {showHowWorksModal && (() => {
        const n = String(parseInt(config.creditsInitial) || 3);
        const step2Desc = (config.howWorksStep2Desc || "Alguns materiais pedem créditos. Você já ganhou {n} ao se cadastrar!").replace(/\{n\}/g, n);
        const closeHowWorks = () => { setShowHowWorksModal(false); persistUiFlag("ui_howworks_seen", true); };
        return (
        <div role="dialog" aria-modal="true" aria-label="Como funciona" style={{ position: "fixed", inset: 0, background: T.overlayBg, backdropFilter: "blur(8px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={closeHowWorks}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: theme === "dark" ? "linear-gradient(135deg, #0d1a18, #0d1210)" : "linear-gradient(135deg, #f0faf6, #e8f5f0)", border: `1px solid ${T.accent}22`, borderRadius: 20, padding: "24px 22px", maxWidth: 400, width: "100%", position: "relative", animation: "fadeInUp 0.3s ease" }}>
            <button type="button" aria-label="Fechar" onClick={closeHowWorks} style={{ position: "absolute", top: 12, right: 16, background: "none", color: T.textFaint, fontSize: 18, border: "none", cursor: "pointer" }}>✕</button>
            <p style={{ fontSize: 16, fontWeight: 700, color: T.accent, marginBottom: 14 }}>{config.howWorksTitle || "💡 Como funciona?"}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}><span style={{ fontSize: 18, minWidth: 26 }}>📚</span><p style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.5, fontFamily: "'Plus Jakarta Sans'" }}><b style={{ color: T.text }}>{config.howWorksStep1Title || "Materiais gratuitos"}</b> — {config.howWorksStep1Desc || "Baixe e-books, guias e templates feitos pra você crescer no Pilates."}</p></div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}><span style={{ fontSize: 18, minWidth: 26 }}>🎯</span><p style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.5, fontFamily: "'Plus Jakarta Sans'" }}><b style={{ color: T.text }}>{config.howWorksStep2Title || "Créditos"}</b> — {step2Desc}</p></div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}><span style={{ fontSize: 18, minWidth: 26 }}>⭐</span><p style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.5, fontFamily: "'Plus Jakarta Sans'" }}><b style={{ color: T.text }}>{config.howWorksStep3Title || "Ganhe mais"}</b> — {config.howWorksStep3Desc || "Complete seu perfil ou indique amigas para ganhar créditos extras."}</p></div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Download Modal */}
      {selectedMaterial && (() => {
        const sm = selectedMaterial;
        const f = sm.funnel;
        const alreadyDl = downloaded.includes(sm.id);
        const fQuestions = f?.questions || [];
        const fCta = f?.cta;
        const allFunnelAnswered = fQuestions.every((_, i) => funnelAnswers[i] !== undefined && funnelAnswers[i] !== "");

        return (
        <div role="dialog" aria-modal="true" aria-label="Detalhes do material" style={{ position: "fixed", inset: 0, background: T.overlayBg, backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100, padding: 16 }} onClick={() => setSelectedMaterial(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: "22px 22px 14px 14px", padding: "30px 22px 22px", maxWidth: 400, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", animation: "slideUp 0.3s ease", position: "relative", maxHeight: "85vh", overflowY: "auto" }}>
            <button type="button" aria-label="Fechar" onClick={() => setSelectedMaterial(null)} style={{ position: "absolute", top: 12, right: 16, background: "none", color: T.textFaint, fontSize: 18 }}>✕</button>

            {/* STEP: QUESTIONS (pre-download) */}
            {funnelStep === "questions" && (
              <>
                <div style={{ width: 76, height: 76, borderRadius: 20, background: T.matIcon, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}><span style={{ fontSize: 48 }}>{sm.icon}</span></div>
                <h2 style={{ fontSize: 19, fontWeight: 700, color: T.text, textAlign: "center" }}>{sm.title}</h2>
                <p style={{ fontSize: 12, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'", textAlign: "center", marginTop: 4, marginBottom: 14 }}>Responda rapidinho para acessar o material:</p>
                {fQuestions.map((fq, fi) => (
                  <div key={fi} style={{ width: "100%", marginBottom: 10 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.textMuted, marginBottom: 5, fontFamily: "'Plus Jakarta Sans'" }}>{fq.question}</label>
                    {fq.type === "choice" ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {(fq.options || []).map((opt, oi) => (
                          <button key={oi} onClick={() => setFunnelAnswers(p => ({ ...p, [fi]: opt }))} style={{ padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: funnelAnswers[fi] === opt ? 700 : 500, fontFamily: "'Plus Jakarta Sans'", background: funnelAnswers[fi] === opt ? T.accent + "22" : T.inputBg, color: funnelAnswers[fi] === opt ? T.accent : T.text, border: `1px solid ${funnelAnswers[fi] === opt ? T.accent + "66" : T.inputBorder}` }}>{opt}</button>
                        ))}
                      </div>
                    ) : (
                      <input value={funnelAnswers[fi] || ""} onChange={(e) => setFunnelAnswers(p => ({ ...p, [fi]: e.target.value }))} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: T.inputBg, border: `1px solid ${T.inputBorder}`, color: T.text, fontSize: 13, fontFamily: "'Plus Jakarta Sans'" }} placeholder={fq.placeholder || "Sua resposta"} />
                    )}
                  </div>
                ))}
                <button disabled={!allFunnelAnswered} onClick={() => setFunnelStep("download")} style={{ width: "100%", padding: 14, borderRadius: 14, background: allFunnelAnswered ? "linear-gradient(135deg, #349980, #7DE2C7)" : T.inputBg, color: allFunnelAnswered ? "#060a09" : T.textFaint, fontSize: 15, fontWeight: 700, marginTop: 4, opacity: allFunnelAnswered ? 1 : 0.5 }}>Continuar →</button>
              </>
            )}

            {/* STEP: DOWNLOAD */}
            {funnelStep === "download" && (
              <>
                <div style={{ width: 76, height: 76, borderRadius: 20, background: T.matIcon, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}><span style={{ fontSize: 48 }}>{sm.icon}</span></div>
                <h2 style={{ fontSize: 19, fontWeight: 700, color: T.text, textAlign: "center" }}>{sm.title}</h2>
                <p style={{ fontSize: 13, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'", lineHeight: 1.6, textAlign: "center", marginTop: 6 }}>{sm.description}</p>
                <span style={{ fontSize: 11, color: T.textFaint, marginTop: 4, marginBottom: 14, fontFamily: "'Plus Jakarta Sans'" }}>{sm.date}</span>
                {alreadyDl && <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 10, background: T.dlBg, border: `1px solid ${T.dlBorder}`, color: T.accent, fontSize: 13, fontFamily: "'Plus Jakarta Sans'", marginBottom: 8, width: "100%" }}><span>✅</span><span>Você já baixou este material</span></div>}
                {creditsEnabled && (sm.creditCost || 0) > 0 && !alreadyDl && <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, background: T.gold + "12", border: `1px solid ${T.gold}33`, color: T.gold, fontSize: 12, fontFamily: "'Plus Jakarta Sans'", marginBottom: 8, width: "100%" }}>🎯 Este material custa {sm.creditCost} crédito{sm.creditCost > 1 ? "s" : ""} (você tem {userCredits})</div>}
                {sm.downloadUrl ? (
                  <a href={sm.downloadUrl} target="_blank" rel="noreferrer" onClick={(e) => { e.preventDefault(); handleDownload(sm); }} style={{ display: "block", width: "100%", padding: "14px", borderRadius: 14, background: downloadingMatId === sm.id ? T.inputBg : "linear-gradient(135deg, #349980, #7DE2C7)", color: "#060a09", fontSize: 15, fontWeight: 700, boxShadow: "0 4px 20px #34998033", marginTop: 6, textAlign: "center", textDecoration: "none", pointerEvents: downloadingMatId === sm.id ? "none" : "auto" }} aria-busy={downloadingMatId === sm.id}>{downloadingMatId === sm.id ? "⏳ Aguarde..." : (alreadyDl ? "📥 Acessar novamente" : "📥 Acessar material")}</a>
                ) : (
                  <button type="button" onClick={() => handleDownload(sm)} disabled={downloadingMatId === sm.id} style={{ width: "100%", padding: "14px", borderRadius: 14, background: downloadingMatId === sm.id ? T.inputBg : "linear-gradient(135deg, #349980, #7DE2C7)", color: "#060a09", fontSize: 15, fontWeight: 700, boxShadow: "0 4px 20px #34998033", marginTop: 6 }} aria-busy={downloadingMatId === sm.id}>{downloadingMatId === sm.id ? "⏳ Aguarde..." : (alreadyDl ? "📥 Baixar novamente" : "📥 Baixar material")}</button>
                )}
              </>
            )}

            {/* STEP: CTA (post-download) */}
            {funnelStep === "cta" && fCta && (
              <>
                <div style={{ width: 76, height: 76, borderRadius: 20, background: "linear-gradient(135deg, #c4950022, #FFD86322)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}><span style={{ fontSize: 48 }}>{fCta.icon || "🚀"}</span></div>
                <h2 style={{ fontSize: 19, fontWeight: 700, color: T.text, textAlign: "center" }}>{fCta.title || "Próximo passo"}</h2>
                <p style={{ fontSize: 13, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'", lineHeight: 1.6, textAlign: "center", marginTop: 6, marginBottom: 14 }}>{fCta.description || ""}</p>
                <a href={fCta.url} target="_blank" rel="noreferrer" style={{ display: "block", width: "100%", padding: "14px", borderRadius: 14, background: "linear-gradient(135deg, #c49500, #FFD863)", color: "#1a1a12", fontSize: 15, fontWeight: 700, boxShadow: "0 4px 20px #c4950033", textAlign: "center", textDecoration: "none" }}>{fCta.buttonText || "Quero saber mais →"}</a>
                <button onClick={() => setSelectedMaterial(null)} style={{ width: "100%", padding: 12, borderRadius: 12, background: T.statBg, border: `1px solid ${T.statBorder}`, color: T.textFaint, fontSize: 13, fontWeight: 600, marginTop: 8 }}>Fechar</button>
              </>
            )}
          </div>
        </div>
        );
      })()}

      {/* Unlock Modal */}
      {unlockTarget && (
        <div role="dialog" aria-modal="true" aria-label="Desbloquear material" style={{ position: "fixed", inset: 0, background: T.overlayBg, backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100, padding: 16 }} onClick={() => { setUnlockTarget(null); setRefName(""); setRefWA(""); }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: "22px 22px 14px 14px", padding: "30px 22px 22px", maxWidth: 400, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", animation: "slideUp 0.3s ease", position: "relative", maxHeight: "85vh", overflowY: "auto" }}>
            <button type="button" aria-label="Fechar" onClick={() => { setUnlockTarget(null); setRefName(""); setRefWA(""); }} style={{ position: "absolute", top: 12, right: 16, background: "none", color: T.textFaint, fontSize: 18 }}>✕</button>
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
            <button type="button" aria-label="Fechar" onClick={() => setCurrentSurvey(null)} style={{ position: "absolute", top: 14, right: 14, background: "none", color: T.textFaint, fontSize: 18 }}>✕</button>
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
                    const ok = await db.updateLead(lead.id, { surveyResponses: sr, downloads: [...new Set([...(lead.downloads || []), currentSurvey.id])] });
                    if (!ok) { showT("Respostas não salvas. Tente novamente."); return; }
                  }
                  selectMat(currentSurvey);
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

      {/* CREDIT STORE MODAL */}
      {showCreditStore && (
        <div role="dialog" aria-modal="true" aria-label="Ganhar créditos" style={{ position: "fixed", inset: 0, background: T.overlayBg, zIndex: 150, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setShowCreditStore(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: T.bg, border: `1px solid ${T.cardBorder}`, borderRadius: 20, padding: 24, maxWidth: 400, width: "100%", maxHeight: "85vh", overflowY: "auto", animation: "fadeInUp 0.3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: T.text }}>{config.creditsStoreTitle || "Ganhe Créditos"}</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: T.gold }}>Você tem {userCredits} crédito{userCredits !== 1 ? "s" : ""}</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Profile phases */}
              {[1, 2, 3].map(p => {
                const done = userCreditsEarned[`phase${p}`];
                const phaseEnabled = config[`phase${p}Enabled`] !== "false";
                if (!phaseEnabled) return null;
                const amt = parseInt(config[`phase${p}Credits`]) || 2;
                return (
                  <div key={p} onClick={() => { if (!done) { setShowCreditStore(false); setView("profile"); setActivePhase(p); } }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 12, background: done ? T.successBg : T.cardBg, border: `1px solid ${done ? T.accent + "44" : T.cardBorder}`, cursor: done ? "default" : "pointer", opacity: done ? 0.6 : 1 }}>
                    <span style={{ fontSize: 24 }}>{done ? "✅" : config[`phase${p}Icon`] || "📋"}</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: T.text, display: "block" }}>{config[`phase${p}Title`] || `Fase ${p}`}</span>
                      <span style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>{done ? "Já completado" : (config.creditsStorePhaseSubtitle || "Responda sobre você")}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: T.gold }}>+{amt}</span>
                  </div>
                );
              })}

              {/* Quizzes */}
              {quizzes.filter(q => q.active !== false).map(q => {
                const done = userCreditsEarned[`quiz_${q.id}`];
                const failTs = userCreditsEarned[`quiz_${q.id}_fail`];
                const canRetry = !failTs || (Date.now() - failTs > 86400000);
                const amt = q.credits || 1;
                return (
                  <div key={q.id} onClick={() => { if (!done && canRetry) { setShowCreditStore(false); setShowQuiz(q); setQuizAnswers({}); setQuizSubmitted(false); } }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 12, background: done ? T.successBg : T.cardBg, border: `1px solid ${done ? T.accent + "44" : T.cardBorder}`, cursor: done || !canRetry ? "default" : "pointer", opacity: done || !canRetry ? 0.6 : 1 }}>
                    <span style={{ fontSize: 24 }}>{done ? "✅" : "🧠"}</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: T.text, display: "block" }}>{q.title || "Quiz"}</span>
                      <span style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>{done ? "Já respondido" : !canRetry ? "Tente novamente amanhã" : "Acerte as 3 para ganhar"}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: T.gold }}>+{amt}</span>
                  </div>
                );
              })}

              {/* Instagram Comments — só novos posts (já ganhou não aparece) */}
              {(() => {
                const activePosts = instaPosts.filter(p => p.active !== false);
                const pendingPosts = activePosts.filter(post => !userCreditsEarned[`comment_${post.id}`]);
                const allDone = activePosts.length > 0 && pendingPosts.length === 0;
                return (
                  <>
                    {pendingPosts.map(post => {
                      const amt = post.credits || 1;
                      return (
                        <div key={post.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 12, background: T.cardBg, border: `1px solid ${T.cardBorder}` }}>
                          <span style={{ fontSize: 24 }}>💬</span>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: T.text, display: "block" }}>{post.title || "Comentar no Instagram"}</span>
                            <span style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>{post.description || "Comente no post e volte aqui"}</span>
                          </div>
                          {!commentVerifying && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                              <a href={post.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ fontSize: 11, fontWeight: 600, color: T.accent, textDecoration: "none", padding: "4px 10px", borderRadius: 6, background: T.accent + "15", textAlign: "center" }}>Abrir post ↗</a>
                              <button onClick={(e) => { e.stopPropagation(); setCommentVerifying(true); setTimeout(async () => { const ok = await earnCredits(amt, `comment_${post.id}`); setCommentVerifying(false); if (ok) showT(`+${amt} crédito! Comentário verificado ✅`); }, 3500); }} style={{ fontSize: 11, fontWeight: 600, color: T.gold, padding: "4px 10px", borderRadius: 6, background: T.gold + "15" }}>Comentei ✓</button>
                            </div>
                          )}
                          {commentVerifying && <span style={{ fontSize: 11, color: T.accent, fontFamily: "'Plus Jakarta Sans'", animation: "pulse 1s ease-in-out infinite" }}>🔍 Verificando...</span>}
                          <span style={{ fontSize: 13, fontWeight: 800, color: T.gold, marginLeft: 4 }}>+{amt}</span>
                        </div>
                      );
                    })}
                    {allDone && (
                      <div style={{ padding: "10px 16px", borderRadius: 12, background: T.successBg, border: `1px solid ${T.accent}33` }}>
                        <span style={{ fontSize: 12, color: T.accent, fontFamily: "'Plus Jakarta Sans'" }}>✅ Você já ganhou créditos por todos os posts disponíveis.</span>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Referral via WhatsApp */}
              {(() => {
                const amt = parseInt(config.creditsReferral) || 2;
                const refLink = config.baseUrl || "https://rafael.grupovoll.com.br";
                const msg = (config.creditsReferralMsg || "Confira: {link}").replace("{link}", refLink);
                const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
                const alreadyEarned = !!userCreditsEarned["referral_share"];
                const handleReferralSend = () => {
                  window.open(waUrl, "_blank");
                  setReferralVerifying(true);
                  setTimeout(async () => {
                    await earnCredits(amt, "referral_share");
                    showT(`+${amt} créditos! Indicação registrada ✅`);
                    setReferralVerifying(false);
                  }, 2500);
                };
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 12, background: T.cardBg, border: `1px solid ${T.cardBorder}` }}>
                    <span style={{ fontSize: 24 }}>🔗</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: T.text, display: "block" }}>{config.creditsStoreReferralTitle || "Indicar amigo"}</span>
                      <span style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>{config.creditsStoreReferralSubtitle || "Envie pelo WhatsApp"}</span>
                    </div>
                    {alreadyEarned ? (
                      <span style={{ fontSize: 11, fontWeight: 600, color: T.accent, padding: "6px 12px", borderRadius: 8, background: T.successBg, border: `1px solid ${T.accent}33` }}>Já verificado ✓</span>
                    ) : referralVerifying ? (
                      <span style={{ fontSize: 11, color: T.accent, fontFamily: "'Plus Jakarta Sans'", padding: "6px 12px", animation: "pulse 1s ease-in-out infinite" }}>Verificando envio...</span>
                    ) : (
                      <button type="button" onClick={handleReferralSend} style={{ fontSize: 11, fontWeight: 600, color: "#25D366", padding: "6px 12px", borderRadius: 8, background: "#25D36615", border: "1px solid #25D36644", cursor: "pointer" }}>Enviar 📲</button>
                    )}
                    <span style={{ fontSize: 13, fontWeight: 800, color: T.gold }}>+{amt}</span>
                  </div>
                );
              })()}
            </div>

            <button onClick={() => setShowCreditStore(false)} style={{ width: "100%", padding: 12, borderRadius: 12, background: T.statBg, border: `1px solid ${T.statBorder}`, color: T.textFaint, fontSize: 13, fontWeight: 600, marginTop: 14 }}>{config.creditsStoreCloseBtn || "Fechar"}</button>
          </div>
        </div>
      )}

      {/* QUIZ MODAL */}
      {showQuiz && (() => {
        const q = showQuiz;
        const questions = q.questions || [];
        const allAnswered = questions.every((_, i) => quizAnswers[i] !== undefined);
        const allCorrect = questions.every((qq, i) => quizAnswers[i] === qq.correct);
        const amt = q.credits || 1;
        return (
          <div style={{ position: "fixed", inset: 0, background: T.overlayBg, zIndex: 160, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setShowQuiz(false)}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: T.bg, border: `1px solid ${T.cardBorder}`, borderRadius: 20, padding: 24, maxWidth: 400, width: "100%", maxHeight: "85vh", overflowY: "auto", animation: "fadeInUp 0.3s ease" }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 4 }}>🧠 {q.title || "Quiz"}</h2>
              <p style={{ fontSize: 12, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginBottom: 16 }}>Acerte as 3 para ganhar +{amt} crédito</p>

              {questions.map((qq, qi) => (
                <div key={qi} style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 8 }}>{qi + 1}. {qq.question}</p>
                  {(qq.options || []).map((opt, oi) => {
                    const selected = quizAnswers[qi] === oi;
                    const isCorrect = qq.correct === oi;
                    const showRes = quizSubmitted;
                    return (
                      <button key={oi} onClick={() => { if (!quizSubmitted) setQuizAnswers(p => ({ ...p, [qi]: oi })); }} style={{
                        display: "block", width: "100%", padding: "10px 14px", borderRadius: 10, marginBottom: 4, textAlign: "left",
                        fontSize: 12, fontWeight: selected ? 700 : 500, fontFamily: "'Plus Jakarta Sans'",
                        background: showRes ? (isCorrect ? T.successBg : (selected && !isCorrect ? T.dangerBg : T.statBg)) : (selected ? T.accent + "22" : T.statBg),
                        border: `1px solid ${showRes ? (isCorrect ? T.accent + "66" : (selected && !isCorrect ? T.dangerBrd : T.statBorder)) : (selected ? T.accent + "66" : T.statBorder)}`,
                        color: T.text,
                      }}>{showRes && isCorrect ? "✅ " : showRes && selected && !isCorrect ? "❌ " : ""}{opt}</button>
                    );
                  })}
                </div>
              ))}

              {!quizSubmitted ? (
                <button disabled={!allAnswered} onClick={async () => {
                  setQuizSubmitted(true);
                  if (allCorrect) {
                    await earnCredits(amt, `quiz_${q.id}`);
                    showT(`🎉 Parabéns! +${amt} crédito!`);
                  } else {
                    await persistUiFlag(`quiz_${q.id}_fail`, Date.now());
                    showT("Não foi dessa vez. Tente novamente amanhã! 💪");
                  }
                }} style={{ width: "100%", padding: 14, borderRadius: 14, background: allAnswered ? "linear-gradient(135deg, #c49500, #FFD863)" : T.statBg, color: allAnswered ? "#1a1a12" : T.textFaint, fontSize: 14, fontWeight: 700, marginTop: 4, opacity: allAnswered ? 1 : 0.5 }}>Verificar respostas</button>
              ) : (
                <button onClick={() => setShowQuiz(false)} style={{ width: "100%", padding: 14, borderRadius: 14, background: allCorrect ? "linear-gradient(135deg, #349980, #7DE2C7)" : T.statBg, color: allCorrect ? "#060a09" : T.textFaint, fontSize: 14, fontWeight: 700, marginTop: 4 }}>{allCorrect ? "🎉 Fechar" : "Fechar"}</button>
              )}
            </div>
          </div>
        );
      })()}

      {/* GAMIFICATION CELEBRATION POPUP */}
      {gamificationPopup && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10002, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={dismissPopup}>
          <div style={{ position: "absolute", inset: 0, background: "#000000cc", backdropFilter: "blur(8px)" }} />
          <div onClick={e => e.stopPropagation()} style={{ position: "relative", width: "100%", maxWidth: 360, background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 24, padding: "40px 24px 28px", display: "flex", flexDirection: "column", alignItems: "center", animation: "fadeInUp 0.4s ease", textAlign: "center" }}>
            <div style={{ width: 96, height: 96, borderRadius: "50%", background: gamificationPopup.type === "streak" ? `linear-gradient(135deg, #FF6B3522, #FFD86322)` : `linear-gradient(135deg, ${T.gold}22, ${T.accent}22)`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, animation: "pulse 1.5s ease-in-out infinite" }}><span style={{ fontSize: 52 }}>{gamificationPopup.icon}</span></div>
            {gamificationPopup.type === "streak" && (
              <>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: T.text, marginBottom: 4 }}>{gamificationPopup.streakCount} dias seguidos!</h2>
                <p style={{ fontSize: 14, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'", marginBottom: 16 }}>{gamificationPopup.title}</p>
              </>
            )}
            {gamificationPopup.type === "milestone" && (
              <>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: T.text, marginBottom: 4 }}>{gamificationPopup.title}</h2>
                <p style={{ fontSize: 14, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'", marginBottom: 16 }}>{gamificationPopup.message}</p>
              </>
            )}
            {gamificationPopup.credits > 0 && (
              <div style={{ background: T.gold + "11", border: `1px solid ${T.gold}33`, borderRadius: 16, padding: "14px 24px", marginBottom: 16 }}>
                <p style={{ fontSize: 28, fontWeight: 800, color: T.gold }}>+{gamificationPopup.credits}</p>
                <p style={{ fontSize: 11, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'", marginTop: 2 }}>credito{gamificationPopup.credits > 1 ? "s" : ""}</p>
              </div>
            )}
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>{"🎉🎊✨🌟🔥".split("").map((e, i) => <span key={i} style={{ fontSize: 20, animation: `pulse ${1 + i * 0.2}s ease-in-out infinite` }}>{e}</span>)}</div>
            <button onClick={dismissPopup} style={{ width: "100%", padding: "13px", borderRadius: 14, background: `linear-gradient(135deg, ${T.gold}, #FFD863)`, color: "#1a1a12", fontSize: 14, fontWeight: 700 }}>{gamificationQueue.length > 0 ? "Proximo" : "Continuar"}</button>
          </div>
        </div>
      )}

      {/* LEADERBOARD MODAL */}
      {showLeaderboard && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10001, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setShowLeaderboard(false)}>
          <div style={{ position: "absolute", inset: 0, background: "#000000bb", backdropFilter: "blur(6px)" }} />
          <div onClick={e => e.stopPropagation()} style={{ position: "relative", width: "100%", maxWidth: 400, maxHeight: "80vh", overflowY: "auto", background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 24, padding: "28px 20px", animation: "fadeInUp 0.4s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: T.text }}>🏆 Ranking</h2>
              <button type="button" aria-label="Fechar" onClick={() => setShowLeaderboard(false)} style={{ background: "none", color: T.textFaint, fontSize: 18 }}>✕</button>
            </div>
            {(() => {
              const rankLeads = (leaderboard || []).map(l => ({
                name: l.name,
                avatarUrl: l.avatarUrl || "",
                reads: l.reads,
                downloads: l.downloads,
                streak: l.best ?? l.streak,
                totalDays: l.days,
                isMe: l.isMe,
              }));
              const categories = [
                { key: "reads", label: "Reflexoes lidas", icon: "📖" },
                { key: "downloads", label: "Downloads", icon: "📥" },
                { key: "streak", label: "Melhor streak", icon: "🔥" },
                { key: "totalDays", label: "Total de dias", icon: "📅" },
              ];
              const isMe = (l) => l.isMe;
              return categories.map(cat => {
                const sorted = [...rankLeads].sort((a, b) => b[cat.key] - a[cat.key]).filter(l => l[cat.key] > 0).slice(0, 10);
                if (sorted.length === 0) return null;
                return (
                  <div key={cat.key} style={{ marginBottom: 20 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: T.textMuted, marginBottom: 8 }}>{cat.icon} {cat.label}</p>
                    {sorted.map((l, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, marginBottom: 4, background: isMe(l) ? T.accent + "11" : "transparent", border: isMe(l) ? `1px solid ${T.accent}33` : "1px solid transparent" }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: i < 3 ? T.gold : T.textFaint, width: 24, textAlign: "center" }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i+1}`}</span>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: l.avatarUrl ? "transparent" : T.statBg, border: `1px solid ${T.cardBorder}`, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: T.textFaint }}>{l.avatarUrl ? <img src={l.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (l.name || "?").charAt(0).toUpperCase()}</div>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: isMe(l) ? 700 : 500, color: isMe(l) ? T.accent : T.text, fontFamily: "'Plus Jakarta Sans'" }}>{l.name.split(" ")[0]}{isMe(l) ? " (voce)" : ""}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: i < 3 ? T.gold : T.accent }}>{l[cat.key]}</span>
                      </div>
                    ))}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* PHASE REWARD POPUP */}
      {phaseReward && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10001, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setPhaseReward(null)}>
          <div style={{ position: "absolute", inset: 0, background: "#000000bb", backdropFilter: "blur(6px)" }} />
          <div onClick={e => e.stopPropagation()} style={{ position: "relative", width: "100%", maxWidth: 360, background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 24, padding: "36px 24px 28px", display: "flex", flexDirection: "column", alignItems: "center", animation: "fadeInUp 0.4s ease", textAlign: "center" }}>
            <div style={{ width: 88, height: 88, borderRadius: "50%", background: `linear-gradient(135deg, ${T.gold}22, ${T.gold}08)`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, animation: "pulse 2s ease-in-out infinite" }}><span style={{ fontSize: 48 }}>🎉</span></div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 6 }}>Fase completa!</h2>
            <p style={{ fontSize: 15, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'", marginBottom: 20 }}>{phaseReward.icon} {phaseReward.title}</p>
            <div style={{ display: "flex", gap: 12, marginBottom: 20, width: "100%" }}>
              {phaseReward.credits > 0 && (
                <div style={{ flex: 1, background: T.gold + "11", border: `1px solid ${T.gold}33`, borderRadius: 16, padding: "16px 12px" }}>
                  <p style={{ fontSize: 28, fontWeight: 800, color: T.gold }}>+{phaseReward.credits}</p>
                  <p style={{ fontSize: 11, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'", marginTop: 4 }}>crédito{phaseReward.credits > 1 ? "s" : ""}</p>
                </div>
              )}
              {phaseReward.prize && (
                <div style={{ flex: 1, background: T.accent + "11", border: `1px solid ${T.accent}33`, borderRadius: 16, padding: "16px 12px" }}>
                  <p style={{ fontSize: 20 }}>🎁</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: T.accent, fontFamily: "'Plus Jakarta Sans'", marginTop: 4 }}>{phaseReward.prize}</p>
                </div>
              )}
            </div>
            {phaseReward.prizeUrl && (
              <a href={phaseReward.prizeUrl} target="_blank" rel="noreferrer" style={{ width: "100%", padding: "14px", borderRadius: 14, background: "linear-gradient(135deg, #349980, #7DE2C7)", color: "#060a09", fontSize: 14, fontWeight: 700, textAlign: "center", textDecoration: "none", display: "block", marginBottom: 10 }}>📥 Acessar prêmio</a>
            )}
            <button onClick={() => setPhaseReward(null)} style={{ width: "100%", padding: "13px", borderRadius: 14, background: T.statBg, border: `1px solid ${T.statBorder}`, color: T.text, fontSize: 14, fontWeight: 600 }}>Continuar</button>
          </div>
        </div>
      )}

      {/* EMAIL POPUP: +2 créditos (só para lead sem email) */}
      {showEmailPopup && (() => {
        const dismissEmailPopup = () => { setShowEmailPopup(false); sessionStorage.setItem("vollhub_email_popup_dismissed", "1"); persistUiFlag("ui_email_dismissed_at", Date.now()); };
        return (
        <div style={{ position: "fixed", inset: 0, zIndex: 10001, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={dismissEmailPopup}>
          <div style={{ position: "absolute", inset: 0, background: "#000000bb", backdropFilter: "blur(6px)" }} />
          <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="email-popup-title" style={{ position: "relative", width: "100%", maxWidth: 360, background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 24, padding: "36px 24px 28px", display: "flex", flexDirection: "column", alignItems: "center", animation: "fadeInUp 0.4s ease", textAlign: "center" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: `linear-gradient(135deg, ${T.gold}22, ${T.gold}08)`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}><span style={{ fontSize: 36 }}>✉️</span></div>
            <h2 id="email-popup-title" style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 12, fontFamily: "'Plus Jakarta Sans'" }}>{config.emailPopupTitle || "Informe agora o seu email e receba +2 créditos"}</h2>
            <input type="email" value={emailPopupValue} onChange={e => setEmailPopupValue(e.target.value)} placeholder="seu@email.com" required style={{ width: "100%", padding: "14px 16px", borderRadius: 14, border: `1px solid ${T.cardBorder}`, background: T.bg, color: T.text, fontSize: 15, marginBottom: 16, fontFamily: "'Plus Jakarta Sans'" }} />
            <div style={{ display: "flex", gap: 10, width: "100%" }}>
              <button
                disabled={emailPopupSaving}
                onClick={async () => {
                  const email = emailPopupValue.trim();
                  if (!email || !email.includes("@")) { showT("Informe um e-mail válido."); return; }
                  if (!emailPopupLeadId) {
                    showT("Erro ao carregar. Recarregue a página.");
                    setShowEmailPopup(false);
                    sessionStorage.setItem("vollhub_email_popup_dismissed", "1");
                    return;
                  }
                  setEmailPopupSaving(true);
                  try {
                    const ok = await db.updateLead(emailPopupLeadId, { email });
                    if (!ok) {
                      showT("Não foi possível salvar. Tente de novo.");
                      setShowEmailPopup(false);
                      sessionStorage.setItem("vollhub_email_popup_dismissed", "1");
                      return;
                    }
                    await earnCredits(2, "email");
                    setShowEmailPopup(false);
                    setEmailPopupValue("");
                    setEmailPopupLeadId(null);
                    showT("+2 créditos! E-mail salvo ✅");
                  } catch (e) {
                    console.error("Email popup error:", e);
                    showT("Ocorreu um erro. Tente de novo.");
                    setShowEmailPopup(false);
                    sessionStorage.setItem("vollhub_email_popup_dismissed", "1");
                  } finally {
                    setEmailPopupSaving(false);
                  }
                }}
                style={{ flex: 1, padding: "14px", borderRadius: 14, background: emailPopupSaving ? T.statBg : "linear-gradient(135deg, #349980, #7DE2C7)", color: "#060a09", fontSize: 14, fontWeight: 700, border: "none", cursor: emailPopupSaving ? "wait" : "pointer" }}
              >
                {emailPopupSaving ? "Salvando..." : (config.emailPopupBtnSubmit || "Receber créditos")}
              </button>
              <button disabled={emailPopupSaving} onClick={dismissEmailPopup} style={{ padding: "14px 18px", borderRadius: 14, background: T.statBg, border: `1px solid ${T.statBorder}`, color: T.textMuted, fontSize: 14, fontWeight: 600 }}>{config.emailPopupBtnDismiss || "Agora não"}</button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* SUPPORT MODAL: reportar erro ou sugerir melhoria */}
      {showSupportModal && (
        <div role="dialog" aria-modal="true" aria-label="Suporte" style={{ position: "fixed", inset: 0, background: T.overlayBg, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setShowSupportModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: T.bg, border: `1px solid ${T.cardBorder}`, borderRadius: 20, padding: 24, maxWidth: 400, width: "100%", maxHeight: "85vh", overflowY: "auto" }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 16 }}>Suporte</h2>
            <p style={{ fontSize: 13, color: T.textMuted, marginBottom: 12, fontFamily: "'Plus Jakarta Sans'" }}>Reporte um erro ou envie uma sugestão de melhoria.</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button type="button" onClick={() => setSupportType("error")} style={{ flex: 1, padding: "10px 14px", borderRadius: 12, background: supportType === "error" ? T.dangerBrd + "22" : T.statBg, border: `1px solid ${supportType === "error" ? T.dangerBrd : T.cardBorder}`, color: supportType === "error" ? T.dangerBrd : T.textMuted, fontSize: 13, fontWeight: 600 }}>Reportar erro</button>
              <button type="button" onClick={() => setSupportType("suggestion")} style={{ flex: 1, padding: "10px 14px", borderRadius: 12, background: supportType === "suggestion" ? T.accent + "22" : T.statBg, border: `1px solid ${supportType === "suggestion" ? T.accent : T.cardBorder}`, color: supportType === "suggestion" ? T.accent : T.textMuted, fontSize: 13, fontWeight: 600 }}>Sugerir melhoria</button>
            </div>
            <textarea value={supportMessage} onChange={(e) => setSupportMessage(e.target.value)} placeholder={supportType === "error" ? "Descreva o que aconteceu ou o erro que encontrou..." : "Conte sua ideia ou sugestão..."} rows={4} style={{ width: "100%", padding: "12px 14px", borderRadius: 12, background: T.inputBg || T.statBg, border: `1px solid ${T.cardBorder}`, color: T.text, fontSize: 14, fontFamily: "'Plus Jakarta Sans'", resize: "vertical", marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" disabled={!supportMessage.trim() || supportSending} onClick={async () => {
                if (!supportMessage.trim() || supportSending) return;
                setSupportSending(true);
                try {
                  const res = await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: supportType, message: supportMessage.trim(), name: userName || "", whatsapp: userWhatsApp || "" }) });
                  const data = res.ok ? await res.json() : await res.json().catch(() => ({}));
                  if (!res.ok) { showT(data.error || "Não foi possível enviar. Tente novamente."); return; }
                  showT("Mensagem enviada! Obrigado pelo retorno.");
                  setShowSupportModal(false);
                  setSupportMessage("");
                } catch (e) { showT("Erro de conexão. Tente novamente."); }
                finally { setSupportSending(false); }
              }} style={{ flex: 1, padding: "12px", borderRadius: 12, background: supportMessage.trim() && !supportSending ? "linear-gradient(135deg, #349980, #7DE2C7)" : T.statBg, color: supportMessage.trim() && !supportSending ? "#060a09" : T.textFaint, fontSize: 14, fontWeight: 700, border: "none", cursor: supportMessage.trim() && !supportSending ? "pointer" : "default" }}>{supportSending ? "Enviando..." : "Enviar"}</button>
              <button type="button" onClick={() => { setShowSupportModal(false); setSupportMessage(""); }} disabled={supportSending} style={{ padding: "12px 18px", borderRadius: 12, background: T.statBg, border: `1px solid ${T.statBorder}`, color: T.textMuted, fontSize: 14, fontWeight: 600 }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* SHARE REFLECTION MODAL */}
      {showShareModal && todayReflection?.quote && (
        <div role="dialog" aria-modal="true" aria-label="Compartilhar reflexão" style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setShowShareModal(false)}>
          <div style={{ position: "absolute", inset: 0, background: "#000000aa", backdropFilter: "blur(4px)" }} />
          <div onClick={e => e.stopPropagation()} style={{ position: "relative", width: "100%", maxWidth: 480, background: theme === "dark" ? "#1a1e1c" : "#fff", borderRadius: "24px 24px 0 0", padding: "20px 16px 30px", animation: "slideUp 0.3s ease" }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: T.textFaint + "44", margin: "0 auto 16px" }} />
            <p style={{ fontSize: 16, fontWeight: 700, color: T.text, textAlign: "center", marginBottom: 4 }}>Compartilhar reflexão</p>
            <p style={{ fontSize: 12, color: T.textFaint, textAlign: "center", marginBottom: 16 }}>Escolha um estilo para o seu Story</p>

            {/* Style selector */}
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12, marginBottom: 16, WebkitOverflowScrolling: "touch" }}>
              {reflectionStyles.map((s, i) => (
                <button key={i} onClick={() => setShareSelectedStyle(i)} style={{ flex: "0 0 auto", padding: "10px 16px", borderRadius: 12, background: shareSelectedStyle === i ? T.accent + "22" : T.statBg, border: `2px solid ${shareSelectedStyle === i ? T.accent : T.statBorder}`, color: shareSelectedStyle === i ? T.accent : T.textMuted, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", transition: "all 0.2s" }}>
                  {s.emoji} {s.name}
                </button>
              ))}
            </div>

            {/* Preview */}
            <div style={{ borderRadius: 14, overflow: "hidden", marginBottom: 16, border: `1px solid ${T.cardBorder}`, maxHeight: 360, display: "flex", justifyContent: "center", background: "#111" }}>
              <img src={getPreviewDataUrl(shareSelectedStyle, todayReflection.quote, config.instagramHandle || "@rafael.voll")} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 10 }} />
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" aria-busy={shareGenerating} disabled={shareGenerating} onClick={() => generateShareImage(shareSelectedStyle)} style={{ flex: 1, padding: "14px", borderRadius: 14, background: shareGenerating ? T.statBg : "linear-gradient(135deg, #349980, #7DE2C7)", border: "none", color: "#060a09", fontSize: 14, fontWeight: 700, cursor: shareGenerating ? "wait" : "pointer" }}>
                {shareGenerating ? "Gerando..." : "📸 Compartilhar no Instagram"}
              </button>
              <button onClick={() => { setShowShareModal(false); shareReflectionWhatsApp(); }} style={{ padding: "14px 18px", borderRadius: 14, background: "#25D36622", border: "1px solid #25D36644", color: "#25D366", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>📲</button>
            </div>
          </div>
        </div>
      )}

      {/* ONBOARDING MODAL */}
      {showOnboarding && (() => {
        const name = (userName || "").split(" ")[0] || "";
        const n = String(parseInt(config.creditsInitial) || 3);
        const welcomeTitle = (config.onboardingWelcomeTitle || "Bem-vinda, {name}!").replace(/\{name\}/g, name);
        const creditsDesc = (config.onboardingCreditsDesc || "Alguns materiais especiais precisam de créditos pra desbloquear. Você já ganhou {n} créditos ao se cadastrar!").replace(/\{n\}/g, n);
        return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}>
          <div style={{ background: T.cardBg, borderRadius: 24, padding: "32px 24px", maxWidth: 360, width: "100%", textAlign: "center", animation: "fadeInUp 0.4s ease", border: `1px solid ${T.cardBorder}` }}>
            {onboardingStep === 0 && (<>
              <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 8 }}>{welcomeTitle}</h2>
              <p style={{ fontSize: 14, color: T.textMuted, lineHeight: 1.6, fontFamily: "'Plus Jakarta Sans'" }}>{config.onboardingWelcomeDesc || "Aqui você encontra materiais gratuitos pra turbinar sua carreira no Pilates: e-books, guias, templates e mais."}</p>
            </>)}
            {onboardingStep === 1 && (<>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 8 }}>{config.onboardingCreditsTitle || "Créditos"}</h2>
              <p style={{ fontSize: 14, color: T.textMuted, lineHeight: 1.6, fontFamily: "'Plus Jakarta Sans'" }}>{creditsDesc}</p>
            </>)}
            {onboardingStep === 2 && (<>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⭐</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 8 }}>{config.onboardingGanheTitle || "Ganhe mais créditos"}</h2>
              <p style={{ fontSize: 14, color: T.textMuted, lineHeight: 1.6, fontFamily: "'Plus Jakarta Sans'" }}>{config.onboardingGanheDesc || "Complete as fases do seu perfil ou indique amigas para ganhar créditos extras e desbloquear tudo!"}</p>
            </>)}
            <div style={{ display: "flex", gap: 6, justifyContent: "center", margin: "20px 0 16px" }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: 4, background: i === onboardingStep ? T.accent : T.statBg, border: `1px solid ${i === onboardingStep ? T.accent : T.statBorder}`, transition: "all 0.3s" }} />)}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              {onboardingStep > 0 && <button onClick={() => setOnboardingStep(s => s - 1)} style={{ padding: "10px 20px", borderRadius: 12, background: T.statBg, border: `1px solid ${T.statBorder}`, color: T.textMuted, fontSize: 14, fontWeight: 600 }}>← Voltar</button>}
              {onboardingStep < 2 ? (
                <button onClick={() => setOnboardingStep(s => s + 1)} style={{ padding: "10px 24px", borderRadius: 12, background: "linear-gradient(135deg, #349980, #7DE2C7)", color: "#060a09", fontSize: 14, fontWeight: 700, border: "none" }}>{config.onboardingNextBtn || "Próximo →"}</button>
              ) : (
                <button onClick={() => { setShowOnboarding(false); session.setOnboardingDoneFlag(); persistUiFlag("ui_onboarding_done", true); }} style={{ padding: "10px 24px", borderRadius: 12, background: "linear-gradient(135deg, #349980, #7DE2C7)", color: "#060a09", fontSize: 14, fontWeight: 700, border: "none" }}>{config.onboardingStartBtn || "Começar! 🚀"}</button>
              )}
            </div>
            <button onClick={() => { setShowOnboarding(false); session.setOnboardingDoneFlag(); persistUiFlag("ui_onboarding_done", true); }} style={{ background: "none", color: T.textFaint, fontSize: 12, marginTop: 12, border: "none", fontFamily: "'Plus Jakarta Sans'" }}>{config.onboardingSkipBtn || "Pular"}</button>
          </div>
        </div>
        );
      })()}

      <Toast />
    </div>
  );
}
