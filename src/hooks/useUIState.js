import { useState, useEffect, useCallback } from "react";

export function useUIState() {
  const [animateIn, setAnimateIn] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [showCreditTooltip, setShowCreditTooltip] = useState(false);
  const [showCreditStore, setShowCreditStore] = useState(false);
  const [phaseReward, setPhaseReward] = useState(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [commentVerifying, setCommentVerifying] = useState(false);
  const [instaCommentOpenClickedAt, setInstaCommentOpenClickedAt] = useState(0);
  const [showInstaCommentButton, setShowInstaCommentButton] = useState(false);
  const [reflectionVote, setReflectionVote] = useState(null);
  const [reflectionExpanded, setReflectionExpanded] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareSelectedStyle, setShareSelectedStyle] = useState(0);
  const [shareGenerating, setShareGenerating] = useState(false);
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportType, setSupportType] = useState("error");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportSending, setSupportSending] = useState(false);
  const [showHowWorksModal, setShowHowWorksModal] = useState(false);
  const [headerNarrow, setHeaderNarrow] = useState(typeof window !== "undefined" && window.innerWidth < 380);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showEmailPopup, setShowEmailPopup] = useState(false);
  const [emailPopupLeadId, setEmailPopupLeadId] = useState(null);
  const [emailPopupValue, setEmailPopupValue] = useState("");
  const [emailPopupSaving, setEmailPopupSaving] = useState(false);
  const [installBannerDismissed, setInstallBannerDismissed] = useState(() => !!localStorage.getItem("vollhub_install_dismissed"));
  const [installBannerHiddenThisSession, setInstallBannerHiddenThisSession] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [referralVerifying, setReferralVerifying] = useState(false);
  const [logoTaps, setLogoTaps] = useState(0);

  // Offline detection
  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, []);

  // PWA install prompt capture
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setDeferredInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Narrow header detection
  useEffect(() => {
    const check = () => setHeaderNarrow(window.innerWidth < 380);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const dismissInstallBanner = useCallback((permanent) => {
    if (permanent) { setInstallBannerDismissed(true); localStorage.setItem("vollhub_install_dismissed", "1"); }
    else setInstallBannerHiddenThisSession(true);
  }, []);

  return {
    animateIn, setAnimateIn,
    showOnboarding, setShowOnboarding, onboardingStep, setOnboardingStep,
    showCreditTooltip, setShowCreditTooltip,
    showCreditStore, setShowCreditStore,
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
  };
}
