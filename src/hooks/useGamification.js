import { useState, useCallback } from "react";

export function useGamification(session, db, config) {
  const [gamificationPopup, setGamificationPopup] = useState(null);
  const [gamificationQueue, setGamificationQueue] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const { setStreak, setTotalDays, setMilestonesAchieved, setReflectionsRead, earnCredits } = session;

  const getStreakRules = useCallback(() => {
    const def = [{ every: 5, credits: 1, message: "dias seguidos! +1 credito" }, { at: 30, credits: 3, message: "1 mes de dedicacao! +3 creditos" }];
    const raw = config.streakRules;
    if (raw != null && typeof raw === "object") return Array.isArray(raw) ? raw : def;
    if (typeof raw !== "string") return def;
    try { return JSON.parse(raw); } catch (e) { return def; }
  }, [config.streakRules]);

  const getMilestones = useCallback(() => {
    const def = [{ days: 10, title: "10 dias!", message: "Voce e incrivel! Continue assim!", credits: 0 }, { days: 20, title: "20 dias!", message: "Dedicacao de verdade!", credits: 1 }, { days: 30, title: "1 mes!", message: "Que comprometimento!", credits: 2 }, { days: 50, title: "50 dias!", message: "Voce e referencia!", credits: 3 }, { days: 100, title: "100 dias!", message: "Lendario! Poucos chegam aqui!", credits: 5 }];
    const raw = config.milestones;
    if (raw != null && typeof raw === "object") return Array.isArray(raw) ? raw : def;
    if (typeof raw !== "string") return def;
    try { return JSON.parse(raw); } catch (e) { return def; }
  }, [config.milestones]);

  const showNextPopup = useCallback((queue) => {
    if (queue.length === 0) return;
    setGamificationPopup(queue[0]);
    setGamificationQueue(queue.slice(1));
  }, []);

  const dismissPopup = useCallback(() => {
    setGamificationQueue((q) => {
      if (q.length > 0) setTimeout(() => showNextPopup(q), 400);
      return q;
    });
    setGamificationPopup(null);
  }, [showNextPopup]);

  const processGamification = useCallback(async (lead) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const popups = [];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const oldStreak = { count: lead.streakCount || 0, lastDate: lead.streakLastDate || "", best: lead.streakBest || 0 };
    let oldTotalDays = lead.totalDays || 0;

    if (oldStreak.lastDate === todayStr) {
      setStreak(oldStreak);
      setTotalDays(oldTotalDays);
      setMilestonesAchieved(lead.milestonesAchieved || []);
      setReflectionsRead(lead.reflectionsRead || []);
      return;
    }

    let newCount = oldStreak.lastDate === yesterday ? oldStreak.count + 1 : 1;
    let newBest = Math.max(oldStreak.best, newCount);
    let newTotalDays = oldTotalDays + 1;
    const newStreak = { count: newCount, lastDate: todayStr, best: newBest };
    setStreak(newStreak);
    setTotalDays(newTotalDays);

    const streakRules = getStreakRules();
    for (const rule of streakRules) {
      if (rule.every && newCount > 0 && newCount % rule.every === 0) {
        if (rule.credits > 0) await earnCredits(rule.credits, `streak_${newCount}`);
        popups.push({ type: "streak", icon: "🔥", title: `${newCount} ${rule.message || "dias seguidos!"}`, credits: rule.credits || 0, streakCount: newCount });
      }
      if (rule.at && newCount === rule.at) {
        if (rule.credits > 0) await earnCredits(rule.credits, `streak_at_${rule.at}`);
        popups.push({ type: "streak", icon: "🎉", title: `${rule.message || rule.at + " dias!"}`, credits: rule.credits || 0, streakCount: newCount });
      }
    }

    const milestones = getMilestones();
    const achieved = [...(lead.milestonesAchieved || [])];
    for (const m of milestones) {
      if (newTotalDays >= m.days && !achieved.includes(m.days)) {
        achieved.push(m.days);
        if (m.credits > 0) await earnCredits(m.credits, `milestone_${m.days}`);
        popups.push({ type: "milestone", icon: "🏆", title: m.title, message: m.message, credits: m.credits || 0, days: m.days });
      }
    }
    setMilestonesAchieved(achieved);

    await db.updateLead(lead.id, { streakCount: newCount, streakLastDate: todayStr, streakBest: newBest, totalDays: newTotalDays, milestonesAchieved: achieved });

    if (popups.length > 0) { setGamificationPopup(popups[0]); setGamificationQueue(popups.slice(1)); }
  }, [setStreak, setTotalDays, setMilestonesAchieved, setReflectionsRead, earnCredits, getStreakRules, getMilestones, db]);

  return {
    gamificationPopup, gamificationQueue, showLeaderboard,
    setShowLeaderboard,
    processGamification, dismissPopup,
    getStreakRules, getMilestones,
  };
}
