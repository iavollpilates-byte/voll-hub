import { useState, useMemo, useCallback, useRef } from "react";

export function useProfilePhases(dbPhases, phaseResponses, setPhaseResponses, config) {
  const [activePhase, setActivePhase] = useState(null);
  const [phaseStartTime, setPhaseStartTime] = useState(null);
  const [phaseTimer, setPhaseTimer] = useState(0);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const profilePhotoInputRef = useRef(null);

  const openPhase = useCallback((id) => { setActivePhase(id); setPhaseStartTime(Date.now()); setPhaseTimer(0); }, []);
  const PHASES = useMemo(() => (dbPhases || []).filter(p => p.active), [dbPhases]);

  const getPhaseAnswer = useCallback((phaseId, qId) => (phaseResponses[String(phaseId)] || {})[qId] || "", [phaseResponses]);
  const setPhaseAnswer = useCallback((phaseId, qId, val) => setPhaseResponses(prev => ({ ...prev, [String(phaseId)]: { ...(prev[String(phaseId)] || {}), [qId]: val } })), [setPhaseResponses]);

  const isPhaseFieldsComplete = useCallback((phaseId) => {
    const phase = PHASES.find(p => p.id === phaseId);
    if (!phase) return false;
    return phase.questions.every(q => {
      if (q.required === false) return true;
      const val = getPhaseAnswer(phaseId, q.id);
      if (Array.isArray(val)) return val.length > 0;
      return typeof val === "string" ? val.trim().length > 0 : !!val;
    });
  }, [PHASES, getPhaseAnswer]);

  const isPhaseUnlocked = useCallback((phaseId) => !!(phaseResponses[String(phaseId)]?.completed_at), [phaseResponses]);
  const completedPhases = useMemo(() => PHASES.filter(p => isPhaseUnlocked(p.id)).length, [PHASES, isPhaseUnlocked]);
  const profileEnabled = config.profileEnabled !== "false";
  const profileComplete = useMemo(() => PHASES.length > 0 && completedPhases === PHASES.length, [PHASES, completedPhases]);

  return {
    activePhase, setActivePhase,
    phaseStartTime, phaseTimer, setPhaseTimer,
    avatarUploading, setAvatarUploading,
    profilePhotoInputRef,
    openPhase,
    PHASES,
    getPhaseAnswer, setPhaseAnswer,
    isPhaseFieldsComplete, isPhaseUnlocked,
    completedPhases, profileEnabled, profileComplete,
  };
}
