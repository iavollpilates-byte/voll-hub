import { useState, useMemo, useCallback, useRef } from "react";

export function useMaterialsHub(materials, downloaded, config) {
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [unlockTarget, setUnlockTarget] = useState(null);
  const [downloadingMatId, setDownloadingMatId] = useState(null);
  const [deepLinkMatId, setDeepLinkMatId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showDownloadedOnly, setShowDownloadedOnly] = useState(false);
  const [previewImgIdx, setPreviewImgIdx] = useState(0);
  const [funnelStep, setFunnelStep] = useState("download");
  const [funnelAnswers, setFunnelAnswers] = useState({});
  const [lastVisitTs] = useState(Date.now());
  const [seenNewIds, setSeenNewIds] = useState([]);
  const spotlightRef = useRef(null);

  const setUnlock = useCallback((m) => { setUnlockTarget(m); setPreviewImgIdx(0); }, []);

  const selectMat = useCallback((m) => {
    if (!m) { setSelectedMaterial(null); return; }
    const f = m.funnel;
    const alreadyDl = downloaded.includes(m.id);
    const hasQuestions = f?.questions?.length > 0 && !alreadyDl;
    setFunnelAnswers({});
    setFunnelStep(hasQuestions ? "questions" : "download");
    setSelectedMaterial(m);
  }, [downloaded]);

  const markNewAsSeen = useCallback((id) => { setSeenNewIds((p) => p.includes(id) ? p : [...p, id]); }, []);

  const activeMats = useMemo(() => materials.filter((m) => m.active), [materials]);
  const newMats = useMemo(() => activeMats.filter((m) => m.createdAt > lastVisitTs && !seenNewIds.includes(m.id)), [activeMats, lastVisitTs, seenNewIds]);
  const lockedMats = useMemo(() => activeMats.filter((m) => m.unlockType !== "free"), [activeMats]);

  const categories = useMemo(() => {
    const cats = [...new Set(activeMats.map(m => m.category).filter(Boolean))];
    return cats.sort((a, b) => a.localeCompare(b));
  }, [activeMats]);

  const spotlightMat = useMemo(() => deepLinkMatId ? activeMats.find((m) => m.id === deepLinkMatId) : null, [deepLinkMatId, activeMats]);
  const otherMats = useMemo(() => spotlightMat ? activeMats.filter((m) => m.id !== spotlightMat.id) : activeMats, [spotlightMat, activeMats]);

  const dlCount = downloaded.length;
  const bannerContent = useMemo(() => {
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
  }, [config.bannerPersonalized, config.ctaBannerTitle, config.ctaBannerDesc, config.ctaBannerBtn, dlCount, activeMats, lockedMats]);

  return {
    selectedMaterial, setSelectedMaterial,
    unlockTarget, setUnlockTarget, setUnlock,
    downloadingMatId, setDownloadingMatId,
    deepLinkMatId, setDeepLinkMatId,
    selectedCategory, setSelectedCategory,
    showDownloadedOnly, setShowDownloadedOnly,
    previewImgIdx, setPreviewImgIdx,
    funnelStep, setFunnelStep,
    funnelAnswers, setFunnelAnswers,
    seenNewIds, setSeenNewIds,
    spotlightRef,
    selectMat, markNewAsSeen,
    activeMats, newMats, lockedMats,
    categories, spotlightMat, otherMats,
    dlCount, bannerContent,
  };
}
