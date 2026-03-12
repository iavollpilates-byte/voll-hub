import { useState, useMemo, useCallback, useEffect } from "react";
import { ICON_LIBRARY, PERM_LABELS } from "../constants";
import { getUnlockLabel, getCSS, formatCountdown as fmtCountdown } from "../utils";
import { drawReflectionCanvas } from "../canvasUtils";
import AdminMaterials from "./admin/AdminMaterials";
import AdminLog from "./admin/AdminLog";
import AdminEstudantes from "./admin/AdminEstudantes";

// Contrato das flags ui_* em creditsEarned (mensagens/onboarding) — alinhado ao CMS
const UI_FLAGS_REGISTRY = [
  { id: "onboarding", flagKey: "ui_onboarding_done", label: "Onboarding concluído", type: "flag" },
  { id: "howWorks", flagKey: "ui_howworks_seen", label: "Já viu Como funciona", type: "flag" },
  { id: "emailSaved", label: "Tem e-mail salvo", type: "email" },
  { id: "photoAnnounce", flagKey: "ui_photo_announce_seen", label: "Já viu banner Foto no ranking", type: "flag" },
  { id: "installDismissed", flagKey: "ui_install_dismissed", label: "Instalação dispensada", type: "flag" },
  { id: "emailPopupDismissed7d", flagKey: "ui_email_dismissed_at", label: "Popup e-mail ignorado (7 dias)", type: "email_dismissed_7d" },
];

function countUiFlag(leads, flagKey) {
  return leads.filter((l) => !!(l.creditsEarned || {})[flagKey]).length;
}
function countUiEmailRecentlyDismissed(leads, days = 7) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return leads.filter((l) => {
    const ts = (l.creditsEarned || {}).ui_email_dismissed_at;
    return typeof ts === "number" && ts >= cutoff;
  }).length;
}
function countLeadsWithEmail(leads) {
  return leads.filter((l) => (l.email || "").trim() !== "").length;
}

export default function AdminPanel({
  db, config, T, theme, setTheme, setView,
  currentAdmin, setCurrentAdmin, isMaster, can,
  showT, animateIn, Toast,
  materials, leads, adminUsers, dbReflections, dbPhases,
  bioLinks, saveBioLinks,
  activeMats, totalDl, getMatDownloads, getRecentPerson,
  creditsEnabled, todayStr,
  getStreakRules, getMilestones, getQuizzes, getInstaPosts,
  generateAndUploadAllStyles
}) {
  const formatCountdown = (target) => fmtCountdown(target, Date.now());

  // ─── LOCAL STATE ───
  const [adminTab, setAdminTab] = useState(() => {
    if (currentAdmin?.permissions?.materials_view) return "materials";
    if (currentAdmin?.permissions?.leads_view) return "leads";
    return "textos";
  });
  const [editId, setEditId] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newMat, setNewMat] = useState({ title: "", description: "", category: "", icon: "📄", date: "", unlockType: "free", socialMethod: null, surveyQuestions: [], downloadUrl: "", expiresAt: null, limitQty: null, limitUsed: 0, isFlash: false, flashUntil: null, previewBullets: [], previewImages: [], creditCost: 0 });
  const [showIconPicker, setShowIconPicker] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [showNewUser, setShowNewUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", pin: "", permissions: { materials_view: true, materials_edit: false, leads_view: true, leads_export: false, leads_whatsapp: false, textos_edit: false, estudantes_view: false, estudantes_edit: false, diagnostico_edit: false, users_manage: false } });
  const [editUserId, setEditUserId] = useState(null);
  const [searchLead, setSearchLead] = useState("");
  const [leadFilter, setLeadFilter] = useState("all");
  const [atuaPilatesFilter, setAtuaPilatesFilter] = useState("");
  const [showBulkWA, setShowBulkWA] = useState(false);
  const [bulkMsg, setBulkMsg] = useState("Olá {nome}! 👋 Temos novos materiais exclusivos no VOLL Pilates Hub. Acesse agora!");
  const [bulkWAIndex, setBulkWAIndex] = useState(-1);
  const [bulkWASent, setBulkWASent] = useState([]);
  const [bulkWAListOverride, setBulkWAListOverride] = useState(null);
  const [activityLog, setActivityLog] = useState([]);
  const [linkCopied, setLinkCopied] = useState(null);
  const [adminRefEdit, setAdminRefEdit] = useState(null);
  const [adminRefGenPrompt, setAdminRefGenPrompt] = useState("");
  const [adminRefGenResult, setAdminRefGenResult] = useState("");
  const [adminRefGenLoading, setAdminRefGenLoading] = useState(false);
  const [refImagePreview, setRefImagePreview] = useState(null);
  const [savingReflection, setSavingReflection] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});
  const [searchReflection, setSearchReflection] = useState("");
  const [searchQuiz, setSearchQuiz] = useState("");
  const toggleSection = (key) => setCollapsedSections(p => ({ ...p, [key]: !p[key] }));

  useEffect(() => { if (adminTab === "support" && db.loadSupportRequests) db.loadSupportRequests(); }, [adminTab]);

  // ─── LOCAL FUNCTIONS ───
  const addLog = (action) => {
    const entry = { who: currentAdmin?.name || "?", action, time: new Date().toLocaleString("pt-BR") };
    setActivityLog((p) => [entry, ...p].slice(0, 100));
  };

  const updCfg = (k, v) => { db.updateConfig(k, v); addLog(`Editou config: ${k}`); };
  const updMat = (id, k, v) => { const mat = materials.find(m => m.id === id); db.updateMaterial(id, { [k]: v }); addLog(`Editou material "${mat?.title || id}": ${k}`); };
  const deleteMat = async (id) => { const ok = await db.deleteMaterial(id); setConfirmDeleteId(null); setEditId(null); if (ok) showT("Excluído! 🗑️"); else showT("Erro ao excluir. Tente novamente."); };

  const addMat = async () => {
    if (!newMat.title.trim()) return showT("Preencha o título!");
    const today = new Date(); const d = `${String(today.getDate()).padStart(2, "0")} ${["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][today.getMonth()]} ${today.getFullYear()}`;
    const created = await db.addMaterial({ ...newMat, date: newMat.date || d, active: true });
    if (!created) { showT("Erro ao criar material. Tente novamente."); return; }
    addLog(`Criou material "${newMat.title}"`);
    setNewMat({ title: "", description: "", category: "", icon: "📄", date: "", unlockType: "free", socialMethod: null, surveyQuestions: [], downloadUrl: "", expiresAt: null, limitQty: null, limitUsed: 0, isFlash: false, flashUntil: null, previewBullets: [], previewImages: [] }); setShowNewForm(false); showT("Criado! ✅");
  };

  const copyLink = (id) => {
    const url = `${config.baseUrl}/?m=${id}`;
    navigator.clipboard?.writeText(url).then(() => { setLinkCopied(id); setTimeout(() => setLinkCopied(null), 2000); showT("Link copiado! 📋"); }).catch(() => { showT(url); });
  };

  // ─── LEAD SEGMENTATION ───
  const getLeadSegment = useCallback((l) => {
    if (l.downloads.length >= 3) return "hot";
    if (l.downloads.length >= 1) return "warm";
    return "cold";
  }, []);
  const segmentedLeads = useMemo(() => leads.filter((l) => {
    const matchSearch = l.name.toLowerCase().includes(searchLead.toLowerCase()) || l.whatsapp.includes(searchLead);
    if (!matchSearch) return false;
    if (atuaPilatesFilter !== "" && l.atuaPilates !== atuaPilatesFilter) return false;
    if (leadFilter === "all") return true;
    if (leadFilter === "referral") return l.source === "referral";
    return getLeadSegment(l) === leadFilter;
  }), [leads, searchLead, leadFilter, atuaPilatesFilter, getLeadSegment]);
  const segmentCounts = useMemo(() => ({
    all: leads.length,
    hot: leads.filter((l) => getLeadSegment(l) === "hot").length,
    warm: leads.filter((l) => getLeadSegment(l) === "warm").length,
    cold: leads.filter((l) => getLeadSegment(l) === "cold").length,
    referral: leads.filter((l) => l.source === "referral").length
  }), [leads, getLeadSegment]);

  const atuaPilatesOptions = useMemo(() =>
    [...new Set(leads.map(l => l.atuaPilates).filter(Boolean))].sort(),
    [leads]
  );

  const dlCountByMat = useMemo(() => {
    const map = {};
    leads.forEach(l => (l.downloads || []).forEach(id => { map[id] = (map[id] || 0) + 1; }));
    return map;
  }, [leads]);

  // ─── WHATSAPP HELPERS ───
  const waNumber = (wa) => { const d = (wa || "").replace(/\D/g, ""); return d.length === 11 ? "55" + d : d; };
  const openWA = (l, msg) => { const text = (msg || bulkMsg).replace("{nome}", l.name.split(" ")[0]); window.open(`https://wa.me/${waNumber(l.whatsapp)}?text=${encodeURIComponent(text)}`, "_blank"); };
  const exportCSV = (leadsArr) => {
    const matCols = materials.filter((m) => m.active).map((m) => m.title);
    const surveyMats = materials.filter((m) => m.active && m.unlockType === "survey" && m.surveyQuestions?.length);
    const surveyColHeaders = [];
    const surveyColKeys = [];
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

  // ─── STYLE OBJECTS (compact dashboard) ───
  const inp = { width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.inputBorder}`, background: T.inputBg, color: T.text, fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif", transition: "all 0.2s", minHeight: 36, boxSizing: "border-box" };
  const sInp = { ...inp, padding: "6px 10px", fontSize: 12, minHeight: 34 };
  const sectionHeaderStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", padding: "10px 12px", borderRadius: 10, background: T.statBg, border: `1px solid ${T.statBorder}`, marginBottom: 2, userSelect: "none" };

  // ─── ICON PICKER ───
  const IconPicker = useMemo(() => function ICP({ onSelect, onClose }) { return (
    <div style={{ position: "fixed", inset: 0, background: T.overlayBg, backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 150, padding: 12 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 20, padding: "24px 20px", maxWidth: 360, width: "100%", maxHeight: "75vh", overflowY: "auto", animation: "fadeInUp 0.3s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><h3 style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Escolha um ícone</h3><button onClick={onClose} style={{ background: "none", color: T.textFaint, fontSize: 16 }}>✕</button></div>
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
      {/* Credit cost */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
        <span style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>🎯 Custo em créditos:</span>
        {[0, 1, 2, 3].map(c => (<button key={c} onClick={() => onChange("creditCost", c)} style={{ padding: "4px 10px", borderRadius: 7, fontSize: 11, fontWeight: 600, background: (mat.creditCost ?? 1) === c ? T.gold + "22" : T.inputBg, color: (mat.creditCost ?? 1) === c ? T.gold : T.textFaint, border: `1px solid ${(mat.creditCost ?? 1) === c ? T.gold + "44" : T.inputBorder}` }}>{c === 0 ? "Grátis" : c}</button>))}
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

      {/* ─── FUNNEL (qualificação + CTA) ─── */}
      <div style={{ paddingTop: 8, borderTop: `1px solid ${T.cardBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: "#e8443a", textTransform: "uppercase", letterSpacing: 1, fontFamily: "'Plus Jakarta Sans'" }}>⚡ Funil de qualificação</label>
          <button onClick={() => onChange("funnel", mat.funnel ? null : { questions: [], cta: null })} style={{ padding: "3px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: mat.funnel ? "#e8443a22" : T.inputBg, color: mat.funnel ? "#e8443a" : T.textFaint, border: `1px solid ${mat.funnel ? "#e8443a44" : T.inputBorder}` }}>{mat.funnel ? "✅ Ativo" : "Desativado"}</button>
        </div>
        {mat.funnel && (() => {
          const funnel = mat.funnel;
          const updateFunnel = (key, val) => onChange("funnel", { ...funnel, [key]: val });
          const fqs = funnel.questions || [];
          const addFQ = () => updateFunnel("questions", [...fqs, { question: "", type: "choice", options: ["Sim", "Não"], placeholder: "" }]);
          const updFQ = (i, k, v) => updateFunnel("questions", fqs.map((q, j) => j === i ? { ...q, [k]: v } : q));
          const rmFQ = (i) => updateFunnel("questions", fqs.filter((_, j) => j !== i));
          const cta = funnel.cta || {};
          const updateCta = (k, v) => updateFunnel("cta", { ...cta, [k]: v });
          return (
            <>
              <p style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginBottom: 6 }}>📋 Perguntas pré-download (aparece antes de liberar)</p>
              {fqs.map((fq, fi) => (
                <div key={fi} style={{ background: T.statBg, border: `1px solid ${T.statBorder}`, borderRadius: 8, padding: 8, marginBottom: 4 }}>
                  <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 4 }}>
                    <input value={fq.question} onChange={(e) => updFQ(fi, "question", e.target.value)} style={{ ...sInp, flex: 1 }} placeholder="Pergunta" />
                    <button onClick={() => updFQ(fi, "type", fq.type === "choice" ? "text" : "choice")} style={{ padding: "3px 6px", borderRadius: 5, fontSize: 9, background: T.inputBg, color: T.textFaint, border: `1px solid ${T.inputBorder}` }}>{fq.type === "choice" ? "Opções" : "Texto"}</button>
                    <button onClick={() => rmFQ(fi)} style={{ padding: "3px 6px", borderRadius: 5, fontSize: 10, background: T.dangerBg, color: T.dangerTxt, border: `1px solid ${T.dangerBrd}` }}>✕</button>
                  </div>
                  {fq.type === "choice" && (
                    <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                      {(fq.options || []).map((opt, oi) => (
                        <input key={oi} value={opt} onChange={(e) => { const newOpts = [...(fq.options || [])]; newOpts[oi] = e.target.value; updFQ(fi, "options", newOpts); }} style={{ ...sInp, width: 80, fontSize: 10 }} />
                      ))}
                      <button onClick={() => updFQ(fi, "options", [...(fq.options || []), ""])} style={{ padding: "2px 6px", fontSize: 10, color: T.accent, background: "none" }}>+</button>
                    </div>
                  )}
                  {fq.type === "text" && <input value={fq.placeholder || ""} onChange={(e) => updFQ(fi, "placeholder", e.target.value)} style={{ ...sInp, fontSize: 10, width: "100%" }} placeholder="Placeholder (ex: Sua cidade)" />}
                </div>
              ))}
              {fqs.length < 5 && <button onClick={addFQ} style={{ width: "100%", padding: "5px", borderRadius: 7, background: "#e8443a11", border: "1px dashed #e8443a33", color: "#e8443a", fontSize: 10, fontWeight: 600, marginTop: 2, marginBottom: 8 }}>+ Adicionar pergunta</button>}

              <p style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginTop: 4, marginBottom: 6 }}>🚀 CTA pós-download (aparece depois de baixar)</p>
              <div style={{ background: T.statBg, border: `1px solid ${T.statBorder}`, borderRadius: 8, padding: 8 }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                  <input value={cta.icon || ""} onChange={(e) => updateCta("icon", e.target.value)} style={{ ...sInp, width: 40, textAlign: "center" }} placeholder="🚀" />
                  <input value={cta.title || ""} onChange={(e) => updateCta("title", e.target.value)} style={{ ...sInp, flex: 1 }} placeholder="Título do CTA" />
                </div>
                <input value={cta.description || ""} onChange={(e) => updateCta("description", e.target.value)} style={{ ...sInp, width: "100%", marginBottom: 4 }} placeholder="Descrição (ex: Quer ajuda profissional?)" />
                <div style={{ display: "flex", gap: 4 }}>
                  <input value={cta.buttonText || ""} onChange={(e) => updateCta("buttonText", e.target.value)} style={{ ...sInp, width: 140 }} placeholder="Texto do botão" />
                  <input value={cta.url || ""} onChange={(e) => updateCta("url", e.target.value)} style={{ ...sInp, flex: 1 }} placeholder="URL (link ou WhatsApp)" />
                </div>
              </div>
              <p style={{ fontSize: 9, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginTop: 4 }}>💡 Se URL vazio, o CTA não aparece. Use https://wa.me/55... para WhatsApp.</p>
            </>
          );
        })()}
      </div>
    </div>
  );}, [T, sInp]);

  // ─── CMS FIELD ───
  const CmsField = ({ label, ck, multi, hint }) => (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.textMuted, marginBottom: 4, fontFamily: "'Plus Jakarta Sans'" }}>{label}</label>
      {multi
        ? <textarea defaultValue={config[ck] || ""} onBlur={(e) => updCfg(ck, e.target.value)} key={"cms-" + ck + "-" + String(config[ck] || "").slice(0,10)} style={{ ...inp, minHeight: 50, resize: "vertical", padding: "10px 12px", fontSize: 13 }} />
        : <input defaultValue={config[ck] || ""} onBlur={(e) => updCfg(ck, e.target.value)} key={"cms-" + ck + "-" + String(config[ck] || "").slice(0,10)} style={{ ...inp, padding: "10px 12px", fontSize: 13 }} />
      }
      {hint && <p style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginTop: 3, lineHeight: 1.3 }}>{hint}</p>}
    </div>
  );

  const CmsGroup = ({ label, children, cols = 2 }) => (
    <div style={{ marginBottom: 14 }}>
      {label && <p style={{ fontSize: 10, fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, fontFamily: "'Plus Jakarta Sans'" }}>{label}</p>}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "4px 12px" }}>{children}</div>
    </div>
  );

  const CmsFullField = ({ label, ck, multi, hint }) => (
    <div style={{ gridColumn: "1 / -1" }}><CmsField label={label} ck={ck} multi={multi} hint={hint} /></div>
  );

  // ─── Nav items (permission-based), agrupados ───
  const navGroups = [
    {
      title: "Conteúdo",
      items: [
        can("materials_view") && ["materials", "📄", "Materiais"],
        can("textos_edit") && ["bio", "🔗", "Linktree"],
        can("textos_edit") && ["textos", "✏️", "Textos"],
        can("textos_edit") && ["reflections", "💭", "Reflexões"],
        can("textos_edit") && ["quizzes", "🧠", "Quizzes"],
      ].filter(Boolean),
    },
    {
      title: "Pessoas",
      items: [
        can("leads_view") && ["leads", "👥", "Leads"],
        can("leads_view") && ["insights", "📊", "Insights"],
        can("leads_view") && ["support", "💬", "Suporte"],
        isMaster && ["users", "👑", "Usuários"],
      ].filter(Boolean),
    },
    {
      title: "Estudantes",
      items: [
        (can("estudantes_view") || isMaster) && ["estudantes", "🎓", "Estudantes"],
      ].filter(Boolean),
    },
    {
      title: "Sistema",
      items: [
        can("textos_edit") && ["gamification", "🎮", "Gamificação"],
        isMaster && ["log", "📜", "Log"],
      ].filter(Boolean),
    },
  ];

  // ═══════════════════════════════════════
  // RETURN — full-width layout: sidebar + main
  // ═══════════════════════════════════════
  return (
    <div className="admin-layout-root" style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "220px 1fr", fontFamily: "'Outfit'", background: T.bg, position: "relative", overflow: "hidden" }}>
      <style>{getCSS(T)}</style>
      <style>{`
        .admin-layout-root { display: grid; grid-template-columns: 220px 1fr; }
        .admin-sidebar-toggle { display: none; }
        @media (max-width: 900px) {
          .admin-layout-root { grid-template-columns: 1fr !important; grid-template-rows: auto 1fr; }
          .admin-sidebar { position: fixed !important; top: 0; left: 0; bottom: 0; width: 220px !important; z-index: 200; transform: translateX(-100%); transition: transform 0.3s ease; }
          .admin-sidebar.open { transform: translateX(0); }
          .admin-sidebar-toggle { display: flex !important; }
          .admin-sidebar-overlay { display: block; position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 199; }
          .admin-stats { grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)) !important; }
        }
      `}</style>

      {/* SIDEBAR — compact */}
      {sidebarOpen && <div className="admin-sidebar-overlay" style={{ display: "none" }} onClick={() => setSidebarOpen(false)} />}
      <aside className={`admin-sidebar${sidebarOpen ? " open" : ""}`} style={{ width: 220, minHeight: "100vh", display: "flex", flexDirection: "column", background: T.cardBg, borderRight: `1px solid ${T.cardBorder}`, padding: "12px 10px", flexShrink: 0 }}>
        <div style={{ marginBottom: 8 }}>
          <h1 style={{ fontSize: 15, fontWeight: 800, color: T.text }}>Painel Admin</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
            <span style={{ fontSize: 11, color: T.accent, fontFamily: "'Plus Jakarta Sans'", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentAdmin?.name}</span>
            <span style={{ fontSize: 9, padding: "2px 5px", borderRadius: 4, background: isMaster ? T.gold + "22" : T.accent + "22", color: isMaster ? T.gold : T.accent, fontWeight: 700, fontFamily: "'Plus Jakarta Sans'", textTransform: "uppercase", letterSpacing: 0.5, flexShrink: 0 }}>{isMaster ? "👑" : "ADM"}</span>
          </div>
        </div>
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          {navGroups.map((group) => (
            group.items.length > 0 && (
              <div key={group.title} style={{ marginTop: group.title === "Conteúdo" ? 0 : 12 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: T.textFaint, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, paddingLeft: 10, fontFamily: "'Plus Jakarta Sans'" }}>{group.title}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {group.items.map(([t, icon, label]) => (
                    <button key={t} onClick={() => { setAdminTab(t); setSidebarOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: adminTab === t ? T.tabActiveBg : "transparent", color: adminTab === t ? (t === "users" ? T.gold : T.accent) : T.textFaint, fontSize: 12, fontWeight: 600, transition: "all 0.2s", border: adminTab === t ? `1px solid ${T.statBorder}` : "1px solid transparent", textAlign: "left" }}>
                      <span style={{ fontSize: 18 }}>{icon}</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )
          ))}
        </nav>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 10, borderTop: `1px solid ${T.cardBorder}` }}>
          <button onClick={() => { db.reload(); showT("Dados atualizados! 🔄"); }} style={{ width: "100%", padding: "6px 10px", borderRadius: 8, background: T.statBg, border: `1px solid ${T.statBorder}`, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}><span>🔄</span> Atualizar</button>
          <button onClick={() => setTheme((t) => t === "dark" ? "light" : "dark")} style={{ width: "100%", padding: "6px 10px", borderRadius: 8, background: T.statBg, border: `1px solid ${T.statBorder}`, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 14 }}>{theme === "dark" ? "☀️" : "🌙"}</span> Tema</button>
          <button onClick={() => setView("hub")} style={{ width: "100%", padding: "6px 10px", borderRadius: 8, background: T.statBg, border: `1px solid ${T.statBorder}`, color: T.accent, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 14 }}>👁</span> Preview</button>
          <button onClick={() => { setView("linktree"); setCurrentAdmin(null); db.setAdminToken(null); }} style={{ width: "100%", padding: "6px 10px", borderRadius: 8, background: T.dangerBg, border: `1px solid ${T.dangerBrd}`, color: T.dangerTxt, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 14 }}>🚪</span> Sair</button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ display: "flex", flexDirection: "column", minWidth: 0, overflow: "auto" }}>
        <div style={{ padding: "12px 16px 10px", borderBottom: `1px solid ${T.cardBorder}` }}>
          <button className="admin-sidebar-toggle" type="button" onClick={() => setSidebarOpen(true)} style={{ display: "none", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, background: T.statBg, border: `1px solid ${T.statBorder}`, color: T.text, fontSize: 13, fontWeight: 600, marginBottom: 10, fontFamily: "'Plus Jakarta Sans'" }} aria-label="Abrir menu"><span style={{ fontSize: 16 }}>☰</span> Menu</button>
          <div className="admin-stats" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
            {[{ l: "Acessos", sub: "Aberturas da página", v: parseInt(config.pageViews) || 0, i: "👁", c: T.accent }, { l: "Leads", v: leads.length, i: "👥", c: T.accent }, { l: "Downloads", v: totalDl, i: "📥", c: T.accentDark }, { l: "Materiais", v: activeMats.length, i: "📄", c: T.gold }, { l: "Indicações", v: segmentCounts.referral, i: "🔗", c: T.accent }].map((st, i) => (
              <div key={i} title={st.sub} style={{ background: T.statBg, border: `1px solid ${T.statBorder}`, borderRadius: 10, padding: "10px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, opacity: animateIn ? 1 : 0, transform: animateIn ? "translateY(0)" : "translateY(20px)", transition: `all 0.4s ease ${i * 0.08}s` }}>
                <span style={{ fontSize: 16 }}>{st.i}</span><span style={{ fontSize: 20, fontWeight: 800, color: st.c }}>{typeof st.v === "number" ? st.v.toLocaleString("pt-BR") : st.v}</span><span style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>{st.l}</span>{st.sub && <span style={{ fontSize: 9, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>{st.sub}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Tab content — full width, compact padding */}
        <div style={{ flex: 1, padding: "12px 16px 24px", overflow: "auto", width: "100%", maxWidth: "100%" }}>

        {/* MATERIALS */}
        {adminTab === "materials" && (
          <AdminMaterials
            materials={materials}
            config={config}
            T={T}
            can={can}
            showT={showT}
            animateIn={animateIn}
            editId={editId}
            setEditId={setEditId}
            showNewForm={showNewForm}
            setShowNewForm={setShowNewForm}
            newMat={newMat}
            setNewMat={setNewMat}
            addMat={addMat}
            updMat={updMat}
            deleteMat={deleteMat}
            copyLink={copyLink}
            linkCopied={linkCopied}
            confirmDeleteId={confirmDeleteId}
            setConfirmDeleteId={setConfirmDeleteId}
            dlCountByMat={dlCountByMat}
            UnlockEditor={UnlockEditor}
            setShowIconPicker={setShowIconPicker}
            sInp={sInp}
          />
        )}

        {/* LEADS */}
        {adminTab === "leads" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input style={{ ...inp, flex: "1 1 200px" }} placeholder="🔍 Buscar por nome ou WhatsApp..." value={searchLead} onChange={(e) => setSearchLead(e.target.value)} key="lead-search" />
              <div style={{ minWidth: 160 }}>
                <label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", display: "block", marginBottom: 2 }}>Atua c/ Pilates</label>
                <select value={atuaPilatesFilter} onChange={(e) => setAtuaPilatesFilter(e.target.value)} style={{ ...inp, padding: "6px 10px", minHeight: 36 }}>
                  <option value="">Todos</option>
                  {atuaPilatesOptions.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {can("leads_export") && <button onClick={() => exportCSV(segmentedLeads)} style={{ padding: "6px 12px", borderRadius: 8, background: T.statBg, border: `1px solid ${T.statBorder}`, color: T.accent, fontSize: 12, fontWeight: 600, flex: 1 }}>📊 Exportar CSV</button>}
              {can("leads_export") && <button onClick={() => copyAllNumbers(segmentedLeads)} style={{ padding: "6px 12px", borderRadius: 8, background: T.statBg, border: `1px solid ${T.statBorder}`, color: T.accent, fontSize: 12, fontWeight: 600, flex: 1 }}>📋 Copiar números</button>}
              {can("leads_whatsapp") && <button onClick={() => setShowBulkWA(true)} style={{ padding: "6px 12px", borderRadius: 8, background: "#25D36622", border: "1px solid #25D36644", color: "#25D366", fontSize: 12, fontWeight: 600, flex: 1 }}>💬 Enviar em massa</button>}
            </div>
            <div style={{ display: "flex", gap: 2, padding: 2, background: T.tabBg, borderRadius: 8, border: `1px solid ${T.tabBorder}` }}>
              {[["all", "Todos", T.text], ["hot", "🔥 Quentes", T.gold], ["warm", "Engajados", T.accent], ["cold", "❄️ Frios", T.textFaint], ["referral", "🔗 Indicados", T.accent]].map(([k, lbl, clr]) => (
                <button key={k} onClick={() => setLeadFilter(k)} style={{ flex: 1, padding: "5px 2px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: leadFilter === k ? T.tabActiveBg : "transparent", color: leadFilter === k ? clr : T.textFaint, border: leadFilter === k ? `1px solid ${T.statBorder}` : "1px solid transparent", transition: "all 0.2s", position: "relative" }}>
                  {lbl}
                  <span style={{ display: "block", fontSize: 9, fontWeight: 400, color: T.textFaint, marginTop: 0 }}>{segmentCounts[k]}</span>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, padding: "4px 8px", flexWrap: "wrap" }}>
              {[["🔥 Quentes", "3+ downloads", T.gold], ["Engajados", "1-2 downloads", T.accent], ["❄️ Frios", "0 downloads", T.textFaint]].map(([l, d, c]) => (
                <span key={l} style={{ fontSize: 10, color: c, fontFamily: "'Plus Jakarta Sans'" }}>{l}: <span style={{ color: T.textFaint }}>{d}</span></span>
              ))}
            </div>

            {/* Profile Phase Stats */}
            {(dbPhases || []).length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(dbPhases || []).map(phase => {
                  const count = leads.filter(l => l.phaseResponses?.[String(phase.id)]?.completed_at).length;
                  return (
                    <div key={phase.id} style={{ flex: 1, minWidth: 70, background: T.statBg, border: `1px solid ${T.statBorder}`, borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
                      <span style={{ display: "block", fontSize: 18, fontWeight: 800, color: T.gold }}>{count}</span>
                      <span style={{ fontSize: 9, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'" }}>{phase.icon} {phase.title.slice(0, 15)}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ overflowX: "auto", borderRadius: 10, border: `1px solid ${T.statBorder}`, background: T.statBg }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "'Plus Jakarta Sans'" }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${T.cardBorder}` }}>
                    {["Nome", "WhatsApp", "Seg.", "Downloads", "Visitas", "Última", ""].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: T.textMuted, fontWeight: 700, fontSize: 11, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {segmentedLeads.map((l) => {
                    const seg = getLeadSegment(l);
                    const segColor = seg === "hot" ? T.gold : seg === "warm" ? T.accent : T.textFaint;
                    return (
                      <tr key={l.id} style={{ borderBottom: `1px solid ${T.cardBorder}`, borderLeft: `3px solid ${segColor}` }}>
                        <td style={{ padding: "8px 10px", color: T.text, fontWeight: 600, whiteSpace: "nowrap", fontSize: 13 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 26, height: 26, borderRadius: "50%", background: `linear-gradient(135deg, ${segColor}, ${segColor}88)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#060a09", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{l.name.charAt(0)}</div>
                            <div>
                              <span>{l.name}</span>
                              {(l.email || "").trim() && <p style={{ fontSize: 10, color: T.textFaint, margin: 0 }}>✉️ {l.email}</p>}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "8px 10px", color: T.textMuted, fontSize: 12 }}>{l.whatsapp}</td>
                        <td style={{ padding: "8px 10px" }}>
                          <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 5, background: segColor + "22", color: segColor, fontWeight: 700 }}>
                            {seg === "hot" ? "🔥" : seg === "warm" ? "⚡" : "❄️"} {seg.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: "8px 10px", color: T.text, fontWeight: 700 }}>
                          {l.downloads.length}
                          {l.downloads.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginTop: 2 }}>
                              {l.downloads.slice(0, 3).map((d) => { const mt = materials.find((mm) => mm.id === d); return mt ? <span key={d} style={{ fontSize: 9, padding: "1px 4px", borderRadius: 4, background: T.successBg, color: T.textMuted }}>{mt.icon} {mt.title.slice(0,12)}</span> : null; })}
                              {l.downloads.length > 3 && <span style={{ fontSize: 9, color: T.textFaint }}>+{l.downloads.length - 3}</span>}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "8px 10px", color: T.textMuted, textAlign: "center" }}>{l.visits}</td>
                        <td style={{ padding: "8px 10px", color: T.textFaint, fontSize: 11 }}>{l.lastVisit}</td>
                        <td style={{ padding: "8px 10px" }}>
                          <div style={{ display: "flex", gap: 4 }}>
                            {l.source === "referral" && <span style={{ fontSize: 10, padding: "2px 5px", borderRadius: 5, background: T.successBg, color: T.accent }}>🔗</span>}
                            {can("leads_whatsapp") && <button onClick={(e) => { e.stopPropagation(); openWA(l); }} style={{ width: 28, height: 28, borderRadius: 6, background: "#25D36622", border: "1px solid #25D36644", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }} title="Enviar WhatsApp">💬</button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p style={{ color: T.textFaint, fontSize: 11, textAlign: "center", marginTop: 6, fontFamily: "'Plus Jakarta Sans'" }}>{segmentedLeads.length} de {leads.length} lead{leads.length !== 1 && "s"}</p>
          </div>
        )}

        {/* BULK WHATSAPP MODAL */}
        {showBulkWA && (() => {
          const bulkList = bulkWAListOverride || segmentedLeads;
          const sending = bulkWAIndex >= 0;
          const currentLead = sending ? bulkList[bulkWAIndex] : null;
          const total = bulkList.length;
          const sentCount = bulkWASent.length;
          const progress = total > 0 ? (sentCount / total) * 100 : 0;
          const startSending = () => { setBulkWAIndex(0); setBulkWASent([]); };
          const sendCurrent = () => { if (!currentLead) return; openWA(currentLead, bulkMsg); setBulkWASent(p => [...p, currentLead.id]); };
          const goNext = () => { if (bulkWAIndex < total - 1) setBulkWAIndex(p => p + 1); else { setBulkWAIndex(-1); showT(`✅ ${sentCount} mensagens enviadas!`); } };
          const closeBulk = () => { setShowBulkWA(false); setBulkWAIndex(-1); setBulkWASent([]); setBulkWAListOverride(null); };
          return (
            <div style={{ position: "fixed", inset: 0, background: T.overlayBg, backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 150, padding: 12 }} onClick={closeBulk}>
              <div onClick={(e) => e.stopPropagation()} style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 12, padding: "14px 16px", maxWidth: 420, width: "100%", display: "flex", flexDirection: "column", gap: 10, animation: "fadeInUp 0.3s ease", maxHeight: "85vh", overflowY: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text }}>💬 Envio Sequencial</h3>
                  <button onClick={closeBulk} style={{ background: "none", color: T.textFaint, fontSize: 16 }}>✕</button>
                </div>
                {!sending ? (<>
                  <div style={{ padding: "10px 12px", borderRadius: 10, background: T.inputBg, border: `1px solid ${T.inputBorder}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Destinatários</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.accent }}>{total} leads</span>
                    </div>
                    <p style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Filtro: <span style={{ color: T.accent, fontWeight: 600 }}>{bulkWAListOverride ? "Não atuam c/ Pilates" : leadFilter === "all" ? "Todos" : leadFilter === "hot" ? "🔥 Quentes" : leadFilter === "warm" ? "Engajados" : leadFilter === "cold" ? "❄️ Frios" : "🔗 Indicados"}</span></p>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.textMuted, marginBottom: 4, fontFamily: "'Plus Jakarta Sans'" }}>Mensagem <span style={{ fontWeight: 400, color: T.textFaint }}>( use {"\"{nome}\""} )</span></label>
                    <textarea defaultValue={bulkMsg} onBlur={(e) => setBulkMsg(e.target.value)} key="bulk-msg" style={{ ...inp, minHeight: 72, resize: "vertical" }} />
                  </div>
                  <div style={{ padding: "8px 12px", borderRadius: 8, background: T.statBg, border: `1px solid ${T.statBorder}` }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, marginBottom: 4, fontFamily: "'Plus Jakarta Sans'" }}>Preview:</p>
                    <p style={{ fontSize: 13, color: T.text, fontFamily: "'Plus Jakarta Sans'", lineHeight: 1.5 }}>{bulkMsg.replace("{nome}", bulkList[0]?.name.split(" ")[0] || "Nome")}</p>
                  </div>
                  <button onClick={startSending} style={{ padding: "10px 12px", borderRadius: 10, background: "#25D366", color: "#fff", fontSize: 13, fontWeight: 700 }}>💬 Iniciar envio ({total} leads)</button>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { copyAllNumbers(bulkList); closeBulk(); }} style={{ flex: 1, padding: "10px", borderRadius: 10, background: T.statBg, border: `1px solid ${T.statBorder}`, color: T.accent, fontSize: 12, fontWeight: 600 }}>📋 Copiar números</button>
                    <button onClick={() => { exportCSV(bulkList); closeBulk(); }} style={{ flex: 1, padding: "10px", borderRadius: 10, background: T.statBg, border: `1px solid ${T.statBorder}`, color: T.accent, fontSize: 12, fontWeight: 600 }}>📊 Exportar CSV</button>
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
                    <div style={{ padding: "12px", borderRadius: 10, background: T.statBg, border: `1px solid ${T.statBorder}`, textAlign: "center" }}>
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
                    <button onClick={sendCurrent} style={{ padding: "10px 12px", borderRadius: 10, background: "#25D366", color: "#fff", fontSize: 13, fontWeight: 700 }}>💬 Abrir WhatsApp de {currentLead?.name.split(" ")[0]}</button>
                  ) : (
                    <div style={{ padding: "8px 12px", borderRadius: 8, background: T.dlBg, border: `1px solid ${T.accent}44`, textAlign: "center" }}>
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

          const getProfileBreakdownCompiled = () => {
            const leadsWithProfile = leads.filter(l =>
              (l.grau || l.formacao || l.atuaPilates || l.temStudio) ||
              (l.phaseResponses && Object.keys(l.phaseResponses).some(pid => l.phaseResponses[pid]?.completed_at))
            );
            if (leadsWithProfile.length === 0) return [];
            const fields = [
              { key: "grau", label: "Grau" },
              { key: "formacao", label: "Formação" },
              { key: "atuaPilates", label: "Atua c/ Pilates" },
              { key: "temStudio", label: "Tem Studio" },
            ];
            return fields.map(f => {
              const vals = {};
              leadsWithProfile.forEach(l => { const v = l[f.key]; if (v) vals[v] = (vals[v] || 0) + 1; });
              const entries = Object.entries(vals).sort((a, b) => b[1] - a[1]);
              return { ...f, entries, total: leadsWithProfile.length };
            }).filter(f => f.entries.length > 0);
          };

          const pageViews = parseInt(config.pageViews) || 0;
          const registeredLeads = leads.length;
          const leadsWithDl = leads.filter(l => (l.downloads || []).length > 0).length;
          const leadsPhase1 = leads.filter(l => Object.values(l.phaseResponses || {}).some(r => r.completed_at)).length;
          const regRate = pageViews > 0 ? ((registeredLeads / pageViews) * 100).toFixed(1) : "—";
          const dlRate = registeredLeads > 0 ? ((leadsWithDl / registeredLeads) * 100).toFixed(1) : "—";

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Funnel */}
              <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 8 }}>🔄 Funil de Conversão</h3>
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

              {/* Mensagens & Onboarding — métricas de flags ui_* em creditsEarned */}
              <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 8 }}>📢 Mensagens & Onboarding</h3>
                <p style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginBottom: 10 }}>Quantos leads já passaram por cada mensagem ou modal.</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
                  {UI_FLAGS_REGISTRY.map((item) => {
                    const total = leads.length;
                    let count;
                    if (item.type === "flag") count = countUiFlag(leads, item.flagKey);
                    else if (item.type === "email") count = countLeadsWithEmail(leads);
                    else if (item.type === "email_dismissed_7d") count = countUiEmailRecentlyDismissed(leads, 7);
                    else count = 0;
                    const pct = total > 0 ? ((count / total) * 100).toFixed(0) : 0;
                    const is7d = item.type === "email_dismissed_7d";
                    return (
                      <div key={item.id} title={is7d ? `${count} lead(s) dispensaram popup de e-mail nos últimos 7 dias` : `${item.label}: ${count} de ${total} leads`} style={{ background: T.statBg, border: `1px solid ${T.statBorder}`, borderRadius: 10, padding: "10px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <span style={{ fontSize: 18 }}>{item.type === "email" ? "✉️" : item.type === "email_dismissed_7d" ? "📭" : "✓"}</span>
                        <span style={{ fontSize: 18, fontWeight: 800, color: T.accent }}>{count}</span>
                        <span style={{ fontSize: 9, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", textAlign: "center", lineHeight: 1.2 }}>{item.label}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: T.textMuted }}>{is7d ? "últimos 7 dias" : `de ${total} leads · ${pct}%`}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Leads por dia + Dia da semana com mais cadastros */}
              {(() => {
                const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
                const leadsWithDate = leads.filter(l => l.createdAt);
                const toDateKey = (iso) => {
                  if (!iso) return null;
                  const d = new Date(iso);
                  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
                };
                const lastDays = 30;
                const today = new Date();
                const dayCounts = {};
                for (let i = lastDays - 1; i >= 0; i--) {
                  const d = new Date(today);
                  d.setDate(d.getDate() - i);
                  dayCounts[d.toISOString().slice(0, 10)] = 0;
                }
                leadsWithDate.forEach(l => {
                  const key = toDateKey(l.createdAt);
                  if (key && dayCounts[key] !== undefined) dayCounts[key]++;
                });
                const dayOfWeekCounts = { Dom: 0, Seg: 0, Ter: 0, Qua: 0, Qui: 0, Sex: 0, Sáb: 0 };
                leadsWithDate.forEach(l => {
                  const d = new Date(l.createdAt);
                  if (!isNaN(d.getTime())) dayOfWeekCounts[DAY_NAMES[d.getDay()]]++;
                });
                const sortedWeekDays = Object.entries(dayOfWeekCounts).sort((a, b) => b[1] - a[1]);
                const maxDay = Math.max(...Object.values(dayCounts), 1);
                const sortedDates = Object.entries(dayCounts).sort((a, b) => a[0].localeCompare(b[0]));
                return (
                  <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: 12 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 8 }}>📅 Leads por dia (últimos 30 dias)</h3>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 80, marginBottom: 12 }}>
                      {sortedDates.map(([date, count]) => {
                        const pct = (count / maxDay) * 100;
                        const label = new Date(date + "Z").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
                        return (
                          <div key={date} title={`${label}: ${count} lead(s)`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0 }}>
                            <div style={{ width: "100%", height: 60, background: T.progressTrack, borderRadius: 4, overflow: "hidden", display: "flex", alignItems: "flex-end" }}>
                              <div style={{ width: "100%", height: pct + "%", minHeight: count > 0 ? 4 : 0, background: "linear-gradient(180deg, #349980, #7DE2C7)", borderRadius: 2, transition: "height 0.3s" }} />
                            </div>
                            <span style={{ fontSize: 8, color: T.textFaint, marginTop: 4, fontFamily: "'Plus Jakarta Sans'" }}>{label}</span>
                          </div>
                        );
                      })}
                    </div>
                    <h4 style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, marginBottom: 6, fontFamily: "'Plus Jakarta Sans'" }}>Dia da semana com mais cadastros</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {sortedWeekDays.map(([day, count], i) => (
                        <div key={day} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: i < 3 ? T.gold : T.textFaint, width: 28 }}>{day}</span>
                          <div style={{ flex: 1, height: 20, borderRadius: 4, background: T.progressTrack, overflow: "hidden", position: "relative" }}>
                            <div style={{ height: "100%", width: `${sortedWeekDays[0][1] > 0 ? (count / sortedWeekDays[0][1]) * 100 : 0}%`, borderRadius: 4, background: i === 0 ? `linear-gradient(90deg, ${T.gold}, #FFD863)` : `linear-gradient(90deg, ${T.accent}, #7DE2C7)`, transition: "width 0.3s" }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: T.accent, width: 36, textAlign: "right" }}>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Dias com mais atividade (leads atualizados por dia) */}
              {(() => {
                const leadsWithUpdated = leads.filter(l => l.updatedAt);
                const toDateKey = (iso) => {
                  if (!iso) return null;
                  const d = new Date(iso);
                  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
                };
                const activityByDay = {};
                leadsWithUpdated.forEach(l => {
                  const key = toDateKey(l.updatedAt);
                  if (key) activityByDay[key] = (activityByDay[key] || 0) + 1;
                });
                const sortedActivity = Object.entries(activityByDay).sort((a, b) => b[1] - a[1]).slice(0, 14);
                if (sortedActivity.length === 0) return null;
                const topActivity = sortedActivity[0][1];
                return (
                  <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: 12 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>📈 Dias com mais atividade</h3>
                    <p style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginBottom: 8 }}>Dias em que mais leads foram atualizados (login ou ação no app)</p>
                    {sortedActivity.map(([date, count], i) => {
                      const barW = topActivity > 0 ? (count / topActivity) * 100 : 0;
                      const label = new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
                      return (
                        <div key={date} style={{ marginBottom: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: i < 3 ? T.gold : T.textFaint, width: 18 }}>#{i + 1}</span>
                            <span style={{ flex: 1, fontSize: 11, color: T.text, fontFamily: "'Plus Jakarta Sans'" }}>{label}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: T.accent }}>{count} lead{count !== 1 ? "s" : ""}</span>
                          </div>
                          <div style={{ height: 4, borderRadius: 2, background: T.progressTrack, overflow: "hidden", marginLeft: 26 }}>
                            <div style={{ height: "100%", borderRadius: 2, background: i === 0 ? `linear-gradient(90deg, ${T.gold}, #FFD863)` : `linear-gradient(90deg, ${T.accent}, #7DE2C7)`, width: `${barW}%`, transition: "width 0.3s" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Bio Link Clicks */}
              {(() => {
                const linksWithClicks = bioLinks.filter(l => l.active && (l.clicks || 0) > 0).sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
                const totalClicks = bioLinks.reduce((s, l) => s + (l.clicks || 0), 0);
                const topClicks = linksWithClicks[0]?.clicks || 1;
                if (totalClicks === 0) return null;
                return (
                  <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: 12 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>🔗 Cliques nos Links</h3>
                    <p style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginBottom: 8 }}>Total: {totalClicks} cliques</p>
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
              <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 8 }}>🏆 Ranking de Downloads</h3>
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

              {/* Reflexões mais curtidas */}
              {(() => {
                const refsSorted = [...(dbReflections || [])].sort((a, b) => (b.likes || 0) - (a.likes || 0));
                const topRef = refsSorted[0];
                if (refsSorted.length === 0) return null;
                return (
                  <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: 12 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 8 }}>💭 Reflexões mais curtidas</h3>
                    {refsSorted.map((r, i) => {
                      const barW = topRef && (topRef.likes || 0) > 0 ? ((r.likes || 0) / topRef.likes) * 100 : 0;
                      const dateLabel = r.publishDate ? new Date(r.publishDate + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
                      return (
                        <div key={r.id} style={{ marginBottom: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: i < 3 ? T.gold : T.textFaint, width: 18 }}>#{i + 1}</span>
                            <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: T.text, fontFamily: "'Plus Jakarta Sans'", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</span>
                            <span style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", flexShrink: 0 }}>{dateLabel}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: T.accent }} title="Curtidas">👍 {r.likes || 0}</span>
                            <span style={{ fontSize: 11, color: T.textFaint }}>👎 {r.dislikes || 0}</span>
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

              {/* Categorias */}
              {catStats.length > 0 && (
                <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: 12 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 8 }}>📂 Performance por Categoria</h3>
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
                if (instaMatsSorted.length === 0) return <div style={{ background: T.statBg, border: `1px solid ${T.statBorder}`, borderRadius: 10, padding: 12, textAlign: "center" }}><p style={{ fontSize: 13, color: T.textFaint }}>📸 Nenhum post do Instagram cadastrado ainda.</p><p style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginTop: 4 }}>Adicione o link do post e as métricas em cada material.</p></div>;
                return (
                  <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: 12 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 8 }}>📸 Instagram vs Downloads</h3>
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

              {/* Gamification Overview */}
              <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 8 }}>🎮 Gamificacao</h3>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  {[
                    ["🔥", leads.filter(l => (l.streakCount || 0) > 0).length, "streaks ativos"],
                    ["📖", leads.reduce((s, l) => s + (l.reflectionsRead || []).length, 0), "leituras total"],
                    ["🏆", leads.reduce((b, l) => Math.max(b, l.streakBest || 0), 0), "melhor streak"],
                    ["📅", leads.reduce((b, l) => Math.max(b, l.totalDays || 0), 0), "max dias"],
                  ].map(([ic, val, lbl], i) => (
                    <div key={i} style={{ flex: 1, background: T.statBg, border: `1px solid ${T.statBorder}`, borderRadius: 10, padding: "8px 4px", textAlign: "center" }}>
                      <span style={{ fontSize: 12 }}>{ic}</span>
                      <span style={{ display: "block", fontSize: 18, fontWeight: 800, color: T.accent, marginTop: 2 }}>{val}</span>
                      <span style={{ fontSize: 8, color: T.textFaint }}>{lbl}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Perfil geral (todos que responderam) — visão compilada */}
              {(() => {
                const compiled = getProfileBreakdownCompiled();
                if (compiled.length === 0) return null;
                return (
                  <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: 12 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 10 }}>📋 Perfil geral (todos que responderam)</h3>
                    <p style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginBottom: 10 }}>Respostas de perfil agregadas de todos os leads que têm pelo menos uma resposta (grau, formação, atua c/ Pilates ou tem studio).</p>
                    {compiled.map(f => (
                      <div key={f.key} style={{ marginBottom: 12 }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, marginBottom: 4, fontFamily: "'Plus Jakarta Sans'" }}>{f.label} (n={f.total})</p>
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
              })()}

              {/* Para conversão — não atuam com Pilates */}
              {(() => {
                const NAO_ATUA_VALUES = ["não", "não atuo", "ainda não", "nao"];
                const norm = (v) => (v || "").trim().toLowerCase();
                const leadsNaoAtuam = leads.filter(l => NAO_ATUA_VALUES.includes(norm(l.atuaPilates)));
                return (
                  <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: 12 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 6 }}>🎯 Para conversão — não atuam com Pilates</h3>
                    <p style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginBottom: 10 }}>Leads que responderam que não atuam com Pilates (ex.: &quot;Não&quot;, &quot;Não atuo&quot;, &quot;Ainda não&quot;). Use para conversão ou curso.</p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                      {can("leads_export") && <button onClick={() => exportCSV(leadsNaoAtuam)} style={{ padding: "6px 12px", borderRadius: 8, background: T.statBg, border: `1px solid ${T.statBorder}`, color: T.accent, fontSize: 12, fontWeight: 600 }}>📊 Exportar CSV</button>}
                      {can("leads_export") && <button onClick={() => copyAllNumbers(leadsNaoAtuam)} style={{ padding: "6px 12px", borderRadius: 8, background: T.statBg, border: `1px solid ${T.statBorder}`, color: T.accent, fontSize: 12, fontWeight: 600 }}>📋 Copiar números</button>}
                      {can("leads_whatsapp") && leadsNaoAtuam.length > 0 && <button onClick={() => { setBulkWAListOverride(leadsNaoAtuam); setShowBulkWA(true); }} style={{ padding: "6px 12px", borderRadius: 8, background: "#25D36622", border: "1px solid #25D36644", color: "#25D366", fontSize: 12, fontWeight: 600 }}>💬 Enviar em massa</button>}
                    </div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: T.accent, marginBottom: 8 }}>{leadsNaoAtuam.length} lead{leadsNaoAtuam.length !== 1 ? "s" : ""}</p>
                    <div style={{ maxHeight: 220, overflowY: "auto", border: `1px solid ${T.inputBorder}`, borderRadius: 8, background: T.inputBg }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'Plus Jakarta Sans'" }}>
                        <thead>
                          <tr style={{ borderBottom: `2px solid ${T.cardBorder}` }}>
                            <th style={{ textAlign: "left", padding: "6px 8px", color: T.textMuted, fontWeight: 700, fontSize: 10 }}>Nome</th>
                            <th style={{ textAlign: "left", padding: "6px 8px", color: T.textMuted, fontWeight: 700, fontSize: 10 }}>WhatsApp</th>
                            <th style={{ padding: "6px 8px", width: 40 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {leadsNaoAtuam.map((l) => (
                            <tr key={l.id} style={{ borderBottom: `1px solid ${T.cardBorder}` }}>
                              <td style={{ padding: "6px 8px", color: T.text, fontWeight: 600 }}>{l.name}</td>
                              <td style={{ padding: "6px 8px", color: T.textMuted }}>{l.whatsapp}</td>
                              <td style={{ padding: "6px 8px" }}>{can("leads_whatsapp") && <button onClick={(e) => { e.stopPropagation(); openWA(l); }} style={{ width: 28, height: 28, borderRadius: 6, background: "#25D36622", border: "1px solid #25D36644", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }} title="WhatsApp">💬</button>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* Profile cross-data for top 3 materials */}
              {matDlCounts.slice(0, 3).filter(m => m.dlCount > 0).map(m => {
                const breakdown = getProfileBreakdown(m.id);
                if (breakdown.length === 0) return null;
                return (
                  <div key={m.id} style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: 12 }}>
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
              <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 8 }}>👤 Meu Perfil</h3>
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
              <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: 12 }}>
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
                        <button onClick={() => updateLink(link.id, "active", !link.active)} title={link.active ? "Ocultar link" : "Mostrar link"} style={{ width: 28, height: 28, borderRadius: 6, background: link.active ? T.accent + "22" : T.dangerBg, border: `1px solid ${link.active ? T.accent + "44" : T.dangerBrd}`, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>{link.active ? "👁" : "🚫"}</button>
                        <button onClick={() => { saveBioLinks(bioLinks.filter(l => l.id !== link.id)); showT("Link removido"); }} title="Remover link" style={{ width: 28, height: 28, borderRadius: 6, background: T.dangerBg, border: `1px solid ${T.dangerBrd}`, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>🗑</button>
                      </div>
                    </div>
                    {/* Fields */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", display: "block", marginBottom: 2 }}>Título</label><input value={link.title} onChange={(e) => updateLink(link.id, "title", e.target.value)} style={linkInp} /></div>
                      <div><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", display: "block", marginBottom: 2 }}>Subtítulo</label><input value={link.subtitle || ""} onChange={(e) => updateLink(link.id, "subtitle", e.target.value)} style={linkInp} placeholder="Descrição curta" /></div>
                      <div><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", display: "block", marginBottom: 2 }}>URL destino</label><input value={link.url} onChange={(e) => updateLink(link.id, "url", e.target.value)} style={linkInp} placeholder="https://... ou _hub" /></div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <div style={{ width: 70 }}><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", display: "block", marginBottom: 2 }}>Ícone</label><input value={link.icon || ""} onChange={(e) => updateLink(link.id, "icon", e.target.value)} style={{ ...linkInp, width: 60 }} /></div>
                        <div style={{ flex: 1 }}><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", display: "block", marginBottom: 2 }}>URL da imagem <span style={{ color: T.textFaint }}>(opcional)</span></label><input value={link.imageUrl || ""} onChange={(e) => updateLink(link.id, "imageUrl", e.target.value)} style={linkInp} placeholder="https://..." /></div>
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <button onClick={() => updateLink(link.id, "highlight", !link.highlight)} style={{ padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: link.highlight ? `${T.gold}22` : T.inputBg, border: `1px solid ${link.highlight ? T.gold : T.inputBorder}`, color: link.highlight ? T.gold : T.textFaint }}>{link.highlight ? "⭐ Destaque ON" : "☆ Destaque"}</button>
                        {link.highlight && <input value={link.badge || ""} onChange={(e) => updateLink(link.id, "badge", e.target.value)} style={{ ...linkInp, width: 120 }} placeholder="Badge (ex: 🔥 NOVO)" />}
                        {link.highlight && <input value={link.color || ""} onChange={(e) => updateLink(link.id, "color", e.target.value)} style={{ ...linkInp, width: 140 }} placeholder="Gradiente (CSS)" />}
                      </div>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>

            {/* ─── TELA INICIAL ─── */}
            <div>
              <div onClick={() => toggleSection("telaInicial")} style={sectionHeaderStyle}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>🏠 Tela Inicial</h3>
                <span style={{ fontSize: 14, color: T.textFaint, transition: "transform 0.2s", transform: collapsedSections.telaInicial ? "rotate(0deg)" : "rotate(180deg)" }}>▼</span>
              </div>
              {!collapsedSections.telaInicial && (
                <div style={{ background: T.statBg, border: `1px solid ${T.statBorder}`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: 12 }}>
                  <CmsGroup label="Marca">
                    <CmsField label="Nome da marca" ck="brandName" />
                    <CmsField label="Subtítulo" ck="brandTag" />
                  </CmsGroup>
                  <CmsGroup label="Texto principal" cols={1}>
                    <CmsField label="Texto principal" ck="landingSubtitle" multi hint="Texto abaixo da marca na tela de cadastro" />
                  </CmsGroup>
                  <CmsGroup label="Estatísticas">
                    <CmsField label="Stat 1 — Label" ck="landingStat1Label" hint="Ex: Materiais" />
                    <CmsField label="Stat 2 — Valor" ck="landingStat2" hint="Ex: Grátis" />
                    <CmsField label="Stat 2 — Label" ck="landingStat2Label" hint="Ex: Para começar" />
                    <CmsField label="Stat 3 — Valor" ck="landingStat3" hint="Ex: 100%" />
                    <CmsField label="Stat 3 — Label" ck="landingStat3Label" hint="Ex: Prático" />
                  </CmsGroup>
                  <CmsGroup label="Formulário de cadastro">
                    <CmsField label="Label nome" ck="nameLabel" />
                    <CmsField label="Placeholder nome" ck="namePlaceholder" />
                    <CmsField label="Label WhatsApp" ck="whatsLabel" />
                    <CmsField label="Placeholder WhatsApp" ck="whatsPlaceholder" />
                  </CmsGroup>
                  <CmsGroup label="Ação">
                    <CmsField label="Botão CTA" ck="ctaText" hint="Ex: Acessar materiais →" />
                    <CmsField label="Texto de segurança" ck="safeText" hint="Ex: 🔒 Seus dados estão seguros." />
                  </CmsGroup>
                </div>
              )}
            </div>

            {/* ─── HUB ─── */}
            <div>
              <div onClick={() => toggleSection("hub")} style={sectionHeaderStyle}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>📱 Hub</h3>
                <span style={{ fontSize: 14, color: T.textFaint, transition: "transform 0.2s", transform: collapsedSections.hub ? "rotate(0deg)" : "rotate(180deg)" }}>▼</span>
              </div>
              {!collapsedSections.hub && (
                <div style={{ background: T.statBg, border: `1px solid ${T.statBorder}`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: 12 }}>
                  <CmsGroup label="Saudação" cols={3}>
                    <CmsField label="Prefixo" ck="hubGreetPrefix" hint="Ex: Olá," />
                    <CmsField label="Emoji" ck="hubGreetEmoji" hint="Ex: 👋" />
                    <CmsField label="Subtítulo" ck="hubSubtitle" hint="Ex: VOLL Pilates Hub" />
                  </CmsGroup>
                  <CmsGroup label="Seção de materiais">
                    <CmsField label="Título da seção" ck="sectionTitle" hint="Ex: Materiais disponíveis" />
                    <CmsField label="Sufixo progresso" ck="progressSuffix" hint="Ex: materiais baixados" />
                    <CmsFullField label="Dica de progresso" ck="progressHint" hint="Texto embaixo da barra de progresso" />
                  </CmsGroup>
                  <CmsGroup label="Perfil">
                    <CmsField label="Texto perfil (hub)" ck="profilePromptText" hint="Ex: Ganhe créditos!" />
                    <CmsField label="Título perfil (tela)" ck="profileSectionTitle" hint="Ex: Ganhe créditos" />
                  </CmsGroup>
                  <CmsGroup label="Status social (Perfil)">
                    <CmsField label="Título bloco de progresso" ck="profileStatsTitle" hint="Ex: Seu progresso no Hub" />
                    <CmsField label="Label dias seguidos" ck="profileStatsStreakLabel" hint="Ex: Dias seguidos" />
                    <CmsField label="Label dias no Hub" ck="profileStatsTotalDaysLabel" hint="Ex: Dias no Hub" />
                    <CmsField label="Label materiais baixados" ck="profileStatsDownloadsLabel" hint="Ex: Materiais baixados" />
                    <CmsField label="Label reflexões lidas" ck="profileStatsReflectionsLabel" hint="Ex: Reflexões lidas" />
                    <CmsField label="Label quizzes completos" ck="profileStatsQuizzesLabel" hint="Ex: Quizzes completos" />
                    <CmsField label="Label ações sociais" ck="profileStatsSocialLabel" hint="Ex: Ações sociais" />
                  </CmsGroup>
                </div>
              )}
            </div>

            {/* ─── MODAIS ─── */}
            <div>
              <div onClick={() => toggleSection("modais")} style={sectionHeaderStyle}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>🔓 Modais</h3>
                <span style={{ fontSize: 14, color: T.textFaint, transition: "transform 0.2s", transform: collapsedSections.modais ? "rotate(0deg)" : "rotate(180deg)" }}>▼</span>
              </div>
              {!collapsedSections.modais && (
                <div style={{ background: T.statBg, border: `1px solid ${T.statBorder}`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: 12 }}>
                  <CmsGroup label="Indicação (share)">
                    <CmsField label="Título" ck="shareModalTitle" />
                    <CmsFullField label="Descrição" ck="shareModalDesc" multi />
                  </CmsGroup>
                  <CmsGroup label="Comentário Instagram">
                    <CmsField label="Título" ck="commentModalTitle" />
                    <CmsFullField label="Descrição" ck="commentModalDesc" multi />
                  </CmsGroup>
                  <CmsGroup label="Pesquisa" cols={1}>
                    <CmsField label="Título pesquisa" ck="surveyModalTitle" />
                  </CmsGroup>
                </div>
              )}
            </div>

            {/* ─── LINKS ─── */}
            <div>
              <div onClick={() => toggleSection("links")} style={sectionHeaderStyle}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>🔗 Links</h3>
                <span style={{ fontSize: 14, color: T.textFaint, transition: "transform 0.2s", transform: collapsedSections.links ? "rotate(0deg)" : "rotate(180deg)" }}>▼</span>
              </div>
              {!collapsedSections.links && (
                <div style={{ background: T.statBg, border: `1px solid ${T.statBorder}`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: 12 }}>
                  <CmsGroup cols={2}>
                    <CmsField label="URL Instagram" ck="instagramUrl" hint="Ex: https://instagram.com/seu.perfil" />
                    <CmsField label="Handle" ck="instagramHandle" hint="Ex: @rafael.voll" />
                    <CmsField label="URL base do app" ck="baseUrl" hint="URL usada nos links de compartilhamento" />
                    <CmsField label="URL da logo (imagem)" ck="logoUrl" hint="Deixe vazio para usar o logo padrão" />
                  </CmsGroup>
                </div>
              )}
            </div>

            {/* ─── MENSAGENS E AVISOS ─── */}
            <div>
              <div onClick={() => toggleSection("mensagens")} style={sectionHeaderStyle}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>📢 Mensagens e avisos</h3>
                <span style={{ fontSize: 14, color: T.textFaint, transition: "transform 0.2s", transform: collapsedSections.mensagens ? "rotate(0deg)" : "rotate(180deg)" }}>▼</span>
              </div>
              {!collapsedSections.mensagens && (
                <div style={{ background: T.statBg, border: `1px solid ${T.statBorder}`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  <p style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", margin: 0 }}>Popups, modais e banners exibidos ao usuário. Cada bloco mostra a regra de quando aparece.</p>

                  {/* Popup e-mail */}
                  <div style={{ background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 10, padding: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: T.accent, margin: 0 }}>✉️ Popup e-mail (+2 créditos)</h4>
                      <button onClick={() => updCfg("messagesEmailPopupEnabled", config.messagesEmailPopupEnabled === "false" ? "true" : "false")} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: config.messagesEmailPopupEnabled !== "false" ? T.accent + "22" : T.dangerBg, color: config.messagesEmailPopupEnabled !== "false" ? T.accent : T.dangerTxt, border: `1px solid ${config.messagesEmailPopupEnabled !== "false" ? T.accent + "44" : T.dangerBrd}` }}>{config.messagesEmailPopupEnabled !== "false" ? "Ativo" : "Desativado"}</button>
                    </div>
                    <p style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginBottom: 10, lineHeight: 1.4 }}>No hub, lead sem e-mail, não dispensou nesta sessão.</p>
                    <CmsGroup cols={1}>
                      <CmsField label="Título do popup" ck="emailPopupTitle" />
                    </CmsGroup>
                    <CmsGroup cols={2}>
                      <CmsField label="Botão principal" ck="emailPopupBtnSubmit" />
                      <CmsField label="Botão dispensar" ck="emailPopupBtnDismiss" />
                    </CmsGroup>
                  </div>

                  {/* Modal Como funciona? */}
                  <div style={{ background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 10, padding: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: T.accent, margin: 0 }}>💡 Modal &quot;Como funciona?&quot;</h4>
                      <button onClick={() => updCfg("messagesHowWorksAutoShow", config.messagesHowWorksAutoShow === "false" ? "true" : "false")} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: config.messagesHowWorksAutoShow !== "false" ? T.accent + "22" : T.dangerBg, color: config.messagesHowWorksAutoShow !== "false" ? T.accent : T.dangerTxt, border: `1px solid ${config.messagesHowWorksAutoShow !== "false" ? T.accent + "44" : T.dangerBrd}` }}>{config.messagesHowWorksAutoShow !== "false" ? "Auto 1ª vez" : "Só manual"}</button>
                    </div>
                    <p style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginBottom: 10, lineHeight: 1.4 }}>Abre na 1ª vez no hub e sempre pelo link no footer. Use {"{n}"} para créditos iniciais.</p>
                    <CmsGroup cols={2}>
                      <CmsField label="Link no footer" ck="howWorksFooterLink" />
                      <CmsField label="Título do modal" ck="howWorksTitle" />
                    </CmsGroup>
                    <CmsGroup label="Passo 1">
                      <CmsField label="Título" ck="howWorksStep1Title" />
                      <CmsFullField label="Descrição" ck="howWorksStep1Desc" multi />
                    </CmsGroup>
                    <CmsGroup label="Passo 2">
                      <CmsField label="Título" ck="howWorksStep2Title" />
                      <CmsFullField label="Descrição" ck="howWorksStep2Desc" multi hint="Use {n} para créditos iniciais" />
                    </CmsGroup>
                    <CmsGroup label="Passo 3">
                      <CmsField label="Título" ck="howWorksStep3Title" />
                      <CmsFullField label="Descrição" ck="howWorksStep3Desc" multi />
                    </CmsGroup>
                  </div>

                  {/* Onboarding */}
                  <div style={{ background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 10, padding: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: T.accent, margin: 0 }}>👋 Onboarding (3 telas)</h4>
                      <button onClick={() => updCfg("messagesOnboardingEnabled", config.messagesOnboardingEnabled === "false" ? "true" : "false")} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: config.messagesOnboardingEnabled !== "false" ? T.accent + "22" : T.dangerBg, color: config.messagesOnboardingEnabled !== "false" ? T.accent : T.dangerTxt, border: `1px solid ${config.messagesOnboardingEnabled !== "false" ? T.accent + "44" : T.dangerBrd}` }}>{config.messagesOnboardingEnabled !== "false" ? "Ativo" : "Desativado"}</button>
                    </div>
                    <p style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginBottom: 10, lineHeight: 1.4 }}>Só para usuário novo, uma vez. Use {"{name}"} no título e {"{n}"} para créditos.</p>
                    <CmsGroup label="Tela 1 — Boas-vindas">
                      <CmsField label="Título" ck="onboardingWelcomeTitle" hint="Use {name} para o nome" />
                      <CmsFullField label="Descrição" ck="onboardingWelcomeDesc" multi />
                    </CmsGroup>
                    <CmsGroup label="Tela 2 — Créditos">
                      <CmsField label="Título" ck="onboardingCreditsTitle" />
                      <CmsFullField label="Descrição" ck="onboardingCreditsDesc" multi hint="Use {n} para créditos iniciais" />
                    </CmsGroup>
                    <CmsGroup label="Tela 3 — Ganhe mais">
                      <CmsField label="Título" ck="onboardingGanheTitle" />
                      <CmsFullField label="Descrição" ck="onboardingGanheDesc" multi />
                    </CmsGroup>
                    <CmsGroup label="Botões" cols={3}>
                      <CmsField label="Próximo" ck="onboardingNextBtn" />
                      <CmsField label="Começar" ck="onboardingStartBtn" />
                      <CmsField label="Pular" ck="onboardingSkipBtn" />
                    </CmsGroup>
                  </div>

                  {/* Banner instalar app */}
                  <div style={{ background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 10, padding: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: T.accent, margin: 0 }}>📱 Banner &quot;Instale na tela inicial&quot;</h4>
                      <button onClick={() => updCfg("messagesInstallBannerEnabled", config.messagesInstallBannerEnabled === "false" ? "true" : "false")} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: config.messagesInstallBannerEnabled !== "false" ? T.accent + "22" : T.dangerBg, color: config.messagesInstallBannerEnabled !== "false" ? T.accent : T.dangerTxt, border: `1px solid ${config.messagesInstallBannerEnabled !== "false" ? T.accent + "44" : T.dangerBrd}` }}>{config.messagesInstallBannerEnabled !== "false" ? "Ativo" : "Desativado"}</button>
                    </div>
                    <p style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginBottom: 10, lineHeight: 1.4 }}>Só em mobile, se não PWA. Máx 2 alertas no hub (instalar → Instagram → perfil).</p>
                    <CmsGroup cols={1}>
                      <CmsField label="Título do banner" ck="installBannerTitle" />
                    </CmsGroup>
                    <CmsGroup label="Passos iOS (Safari)" cols={3}>
                      <CmsField label="Passo 1" ck="installBannerStepsIos1" />
                      <CmsField label="Passo 2" ck="installBannerStepsIos2" />
                      <CmsField label="Passo 3" ck="installBannerStepsIos3" />
                    </CmsGroup>
                    <CmsGroup label="Passos Android (Chrome)" cols={3}>
                      <CmsField label="Passo 1" ck="installBannerStepsAndroid1" />
                      <CmsField label="Passo 2" ck="installBannerStepsAndroid2" />
                      <CmsField label="Passo 3" ck="installBannerStepsAndroid3" />
                    </CmsGroup>
                    <CmsGroup label="Botões" cols={3}>
                      <CmsField label="Instalar" ck="installBannerBtnInstall" />
                      <CmsField label="Já instalei" ck="installBannerBtnDone" />
                      <CmsField label="Agora não" ck="installBannerBtnLater" />
                    </CmsGroup>
                  </div>

                  {/* Banner foto ranking */}
                  <div style={{ background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 10, padding: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: T.accent, margin: 0 }}>📷 Banner &quot;Foto no ranking&quot;</h4>
                      <button onClick={() => updCfg("messagesPhotoAnnounceEnabled", config.messagesPhotoAnnounceEnabled === "false" ? "true" : "false")} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: config.messagesPhotoAnnounceEnabled !== "false" ? T.accent + "22" : T.dangerBg, color: config.messagesPhotoAnnounceEnabled !== "false" ? T.accent : T.dangerTxt, border: `1px solid ${config.messagesPhotoAnnounceEnabled !== "false" ? T.accent + "44" : T.dangerBrd}` }}>{config.messagesPhotoAnnounceEnabled !== "false" ? "Ativo" : "Desativado"}</button>
                    </div>
                    <p style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginBottom: 10, lineHeight: 1.4 }}>Perfil ativo, sem foto, não dispensou. Some ao clicar Ver ou Fechar.</p>
                    <CmsGroup cols={1}>
                      <CmsField label="Texto do aviso" ck="photoAnnounceText" multi />
                    </CmsGroup>
                    <CmsGroup cols={2}>
                      <CmsField label="Botão Ver" ck="photoAnnounceBtnVer" />
                      <CmsField label="Botão Fechar" ck="photoAnnounceBtnFechar" />
                    </CmsGroup>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* GAMIFICATION CMS */}
        {adminTab === "gamification" && (() => {
          const streakRules = getStreakRules();
          const milestones = getMilestones();
          const saveStreakRules = (rules) => db.updateConfig("streakRules", JSON.stringify(rules));
          const saveMilestones = (ms) => db.updateConfig("milestones", JSON.stringify(ms));
          const gInp = { padding: "10px 12px", borderRadius: 8, border: `1px solid ${T.inputBorder}`, background: T.inputBg, color: T.text, fontSize: 13, fontFamily: "'Plus Jakarta Sans'", width: "100%" };
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

              {/* ─── PROFILE / PHASE BUILDER (moved from Textos) ─── */}
              <div>
                <div onClick={() => toggleSection("phases")} style={sectionHeaderStyle}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>📋 Fases do Perfil ({(dbPhases || []).length})</h3>
                  <span style={{ fontSize: 14, color: T.textFaint, transition: "transform 0.2s", transform: collapsedSections.phases ? "rotate(0deg)" : "rotate(180deg)" }}>▼</span>
                </div>
                {!collapsedSections.phases && (
                  <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: 12 }}>
                    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                      <button onClick={() => updCfg("profileEnabled", config.profileEnabled === "false" ? "true" : "false")} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: config.profileEnabled !== "false" ? T.accent + "22" : T.dangerBg, color: config.profileEnabled !== "false" ? T.accent : T.dangerTxt, border: `1px solid ${config.profileEnabled !== "false" ? T.accent + "44" : T.dangerBrd}` }}>{config.profileEnabled !== "false" ? "✅ Ativo" : "🚫 Oculto"}</button>
                      <button onClick={async () => { const p = await db.addPhase({ title: `Fase ${(dbPhases || []).length + 1}`, icon: "📋", credits: 2, sortOrder: (dbPhases || []).length, questions: [{ id: "q1", label: "Pergunta 1", type: "text", required: true, options: [] }] }); if (p) showT("Fase criada!"); else showT("Erro ao criar fase. Tente novamente."); }} style={{ padding: "6px 14px", borderRadius: 8, background: T.accent + "22", color: T.accent, fontSize: 12, fontWeight: 600, border: `1px solid ${T.accent}44` }}>＋ Nova fase</button>
                    </div>
                    {(dbPhases || []).map((phase, pi) => (
                      <div key={phase.id} style={{ background: T.inputBg, border: `1px solid ${phase.active ? T.accent + "33" : T.inputBorder}`, borderRadius: 10, padding: 14, marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: T.gold }}>{phase.icon} {phase.title}</p>
                          <div style={{ display: "flex", gap: 4 }}>
                            {pi > 0 && <button onClick={() => { const prev = dbPhases[pi - 1]; db.updatePhase(phase.id, { sortOrder: prev.sortOrder }); db.updatePhase(prev.id, { sortOrder: phase.sortOrder }); }} style={{ padding: "5px 9px", borderRadius: 6, fontSize: 11, background: T.statBg, color: T.textFaint, border: `1px solid ${T.statBorder}` }}>↑</button>}
                            {pi < dbPhases.length - 1 && <button onClick={() => { const next = dbPhases[pi + 1]; db.updatePhase(phase.id, { sortOrder: next.sortOrder }); db.updatePhase(next.id, { sortOrder: phase.sortOrder }); }} style={{ padding: "5px 9px", borderRadius: 6, fontSize: 11, background: T.statBg, color: T.textFaint, border: `1px solid ${T.statBorder}` }}>↓</button>}
                            <button onClick={() => db.updatePhase(phase.id, { active: !phase.active })} style={{ padding: "5px 11px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: phase.active ? T.accent + "22" : T.dangerBg, color: phase.active ? T.accent : T.dangerTxt, border: `1px solid ${phase.active ? T.accent + "44" : T.dangerBrd}` }}>{phase.active ? "✅" : "👁"}</button>
                            <button onClick={async () => { if (confirm("Excluir esta fase?")) { const ok = await db.deletePhase(phase.id); if (ok) showT("Fase removida!"); else showT("Erro ao excluir fase. Tente novamente."); } }} style={{ padding: "5px 9px", borderRadius: 6, fontSize: 11, background: T.dangerBg, color: T.dangerTxt, border: `1px solid ${T.dangerBrd}` }}>🗑</button>
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                          <div><label style={{ fontSize: 12, color: T.textFaint }}>Título</label><input defaultValue={phase.title} onBlur={(e) => db.updatePhase(phase.id, { title: e.target.value })} key={"pt-" + phase.id} style={inp} /></div>
                          <div><label style={{ fontSize: 12, color: T.textFaint }}>Ícone</label><input defaultValue={phase.icon} onBlur={(e) => db.updatePhase(phase.id, { icon: e.target.value })} key={"pi-" + phase.id} style={inp} /></div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                          <div><label style={{ fontSize: 12, color: T.textFaint }}>Prêmio</label><input defaultValue={phase.prize} onBlur={(e) => db.updatePhase(phase.id, { prize: e.target.value })} key={"pp-" + phase.id} style={inp} /></div>
                          <div><label style={{ fontSize: 12, color: T.textFaint }}>Créditos</label><input type="number" defaultValue={phase.credits} onBlur={(e) => db.updatePhase(phase.id, { credits: parseInt(e.target.value) || 2 })} key={"pc-" + phase.id} style={inp} /></div>
                        </div>
                        <div style={{ marginBottom: 8 }}><label style={{ fontSize: 12, color: T.textFaint }}>Link do prêmio</label><input defaultValue={phase.prizeUrl} onBlur={(e) => db.updatePhase(phase.id, { prizeUrl: e.target.value })} key={"pu-" + phase.id} style={inp} placeholder="https://..." /></div>
                        <div style={{ marginBottom: 8 }}><label style={{ fontSize: 12, color: T.textFaint }}>Texto do botão (CTA)</label><input defaultValue={phase.ctaText || ""} onBlur={(e) => db.updatePhase(phase.id, { ctaText: e.target.value })} key={"pct-" + phase.id} style={inp} placeholder="🎁 Desbloquear prêmio!" /></div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, marginBottom: 8 }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: T.textMuted }}>Perguntas ({phase.questions.length})</p>
                          <button onClick={() => { const qs = [...phase.questions, { id: `q${Date.now()}`, label: "", type: "text", required: true, options: [] }]; db.updatePhase(phase.id, { questions: qs }); }} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, background: T.accent + "22", color: T.accent, border: `1px solid ${T.accent}44`, fontWeight: 600 }}>＋</button>
                        </div>
                        {phase.questions.map((q, qi) => (
                          <div key={q.id} style={{ background: T.statBg, borderRadius: 8, padding: 10, marginBottom: 6, border: `1px solid ${T.statBorder}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                              <p style={{ fontSize: 11, fontWeight: 700, color: T.textFaint }}>Pergunta {qi + 1}</p>
                              <div style={{ display: "flex", gap: 3 }}>
                                {qi > 0 && <button onClick={() => { const qs = [...phase.questions]; [qs[qi], qs[qi-1]] = [qs[qi-1], qs[qi]]; db.updatePhase(phase.id, { questions: qs }); }} style={{ padding: "3px 7px", borderRadius: 4, fontSize: 10, background: T.inputBg, color: T.textFaint, border: `1px solid ${T.inputBorder}` }}>↑</button>}
                                {qi < phase.questions.length - 1 && <button onClick={() => { const qs = [...phase.questions]; [qs[qi], qs[qi+1]] = [qs[qi+1], qs[qi]]; db.updatePhase(phase.id, { questions: qs }); }} style={{ padding: "3px 7px", borderRadius: 4, fontSize: 10, background: T.inputBg, color: T.textFaint, border: `1px solid ${T.inputBorder}` }}>↓</button>}
                                <button onClick={() => { const qs = phase.questions.filter((_, i) => i !== qi); db.updatePhase(phase.id, { questions: qs }); }} style={{ padding: "3px 7px", borderRadius: 4, fontSize: 10, background: T.dangerBg, color: T.dangerTxt, border: `1px solid ${T.dangerBrd}` }}>✕</button>
                              </div>
                            </div>
                            <div style={{ marginBottom: 6 }}><label style={{ fontSize: 11, color: T.textFaint }}>Texto da pergunta</label><input defaultValue={q.label} onBlur={(e) => { const qs = [...phase.questions]; qs[qi] = { ...qs[qi], label: e.target.value }; db.updatePhase(phase.id, { questions: qs }); }} key={"ql-" + q.id} style={{ ...inp, fontSize: 13 }} /></div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
                              <div><label style={{ fontSize: 11, color: T.textFaint }}>Tipo</label>
                                <select defaultValue={q.type} onChange={(e) => { const qs = [...phase.questions]; qs[qi] = { ...qs[qi], type: e.target.value }; db.updatePhase(phase.id, { questions: qs }); }} key={"qt-" + q.id} style={{ ...inp, fontSize: 12 }}>
                                  <option value="text">Texto curto</option>
                                  <option value="textarea">Texto longo</option>
                                  <option value="select">Seleção única</option>
                                  <option value="multiselect">Múltipla escolha</option>
                                  <option value="scale">Escala 1-5</option>
                                </select>
                              </div>
                              <div><label style={{ fontSize: 11, color: T.textFaint }}>Obrigatória</label>
                                <select defaultValue={q.required !== false ? "true" : "false"} onChange={(e) => { const qs = [...phase.questions]; qs[qi] = { ...qs[qi], required: e.target.value === "true" }; db.updatePhase(phase.id, { questions: qs }); }} style={{ ...inp, fontSize: 12 }}>
                                  <option value="true">Sim</option>
                                  <option value="false">Não</option>
                                </select>
                              </div>
                            </div>
                            {(q.type === "select" || q.type === "multiselect") && (
                              <div><label style={{ fontSize: 11, color: T.textFaint }}>Opções (separar com |)</label><input defaultValue={(q.options || []).join(" | ")} onBlur={(e) => { const qs = [...phase.questions]; qs[qi] = { ...qs[qi], options: e.target.value.split("|").map(s => s.trim()).filter(Boolean) }; db.updatePhase(phase.id, { questions: qs }); }} key={"qo-" + q.id} style={{ ...inp, fontSize: 12 }} placeholder="Opção 1 | Opção 2 | Opção 3" /></div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ─── SOCIAL PROOF (moved from Textos) ─── */}
              <div>
                <div onClick={() => toggleSection("socialProof")} style={sectionHeaderStyle}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>👥 Prova Social</h3>
                  <span style={{ fontSize: 14, color: T.textFaint, transition: "transform 0.2s", transform: collapsedSections.socialProof ? "rotate(0deg)" : "rotate(180deg)" }}>▼</span>
                </div>
                {!collapsedSections.socialProof && (
                  <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: 12 }}>
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.textMuted, marginBottom: 6, fontFamily: "'Plus Jakarta Sans'" }}>Modo de exibição</label>
                      <div style={{ display: "flex", gap: 4 }}>
                        {[["downloads", "📥 Downloads"], ["recent", "👤 Atividade"], ["both", "📥+👤 Ambos"], ["off", "🚫 Desligado"]].map(([k, l]) => (
                          <button key={k} onClick={() => updCfg("socialProofMode", k)} style={{ flex: 1, padding: "8px 4px", borderRadius: 9, fontSize: 12, fontWeight: 600, background: config.socialProofMode === k ? T.accent + "22" : T.inputBg, color: config.socialProofMode === k ? T.accent : T.textFaint, border: `1px solid ${config.socialProofMode === k ? T.accent + "44" : T.inputBorder}`, transition: "all 0.2s" }}>{l}</button>
                        ))}
                      </div>
                    </div>
                    {config.socialProofMode !== "off" && (
                      <>
                        {(config.socialProofMode === "downloads" || config.socialProofMode === "both") && (
                          <div style={{ marginBottom: 10 }}>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.textMuted, marginBottom: 4, fontFamily: "'Plus Jakarta Sans'" }}>Boost de downloads <span style={{ fontWeight: 400, color: T.textFaint }}>(somado ao real)</span></label>
                            <input type="number" defaultValue={config.socialProofBoost} onBlur={(e) => updCfg("socialProofBoost", parseInt(e.target.value) || 0)} key={"spb-" + config.socialProofBoost} style={inp} placeholder="150" />
                            <p style={{ fontSize: 11, color: T.textFaint, marginTop: 4, fontFamily: "'Plus Jakarta Sans'" }}>Número base somado aos downloads reais de cada material.</p>
                          </div>
                        )}
                        {(config.socialProofMode === "recent" || config.socialProofMode === "both") && (
                          <>
                            <div style={{ marginBottom: 10 }}>
                              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.textMuted, marginBottom: 4, fontFamily: "'Plus Jakarta Sans'" }}>Nomes simulados <span style={{ fontWeight: 400, color: T.textFaint }}>(separados por vírgula)</span></label>
                              <textarea defaultValue={Array.isArray(config.socialProofNames) ? config.socialProofNames.join(", ") : (config.socialProofNames || "")} onBlur={(e) => updCfg("socialProofNames", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} key={"spn"} style={{ ...inp, minHeight: 45, resize: "vertical" }} placeholder="Maria, João, Ana, Pedro..." />
                            </div>
                            <div style={{ marginBottom: 10 }}>
                              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.textMuted, marginBottom: 4, fontFamily: "'Plus Jakarta Sans'" }}>Tempos (minutos) <span style={{ fontWeight: 400, color: T.textFaint }}>(separados por vírgula)</span></label>
                              <textarea defaultValue={Array.isArray(config.socialProofMinutes) ? config.socialProofMinutes.join(", ") : (config.socialProofMinutes || "")} onBlur={(e) => updCfg("socialProofMinutes", e.target.value.split(",").map((s) => parseInt(s.trim())).filter(Boolean))} key={"spm"} style={{ ...inp, minHeight: 45, resize: "vertical" }} placeholder="3, 12, 25, 47, 68..." />
                              <p style={{ fontSize: 11, color: T.textFaint, marginTop: 4, fontFamily: "'Plus Jakarta Sans'" }}>Cada material usa um par nome+tempo.</p>
                            </div>
                          </>
                        )}
                        <div style={{ padding: "10px 14px", borderRadius: 10, background: T.inputBg, border: `1px solid ${T.inputBorder}`, marginTop: 4 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, marginBottom: 6, fontFamily: "'Plus Jakarta Sans'" }}>Preview:</p>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {(config.socialProofMode === "downloads" || config.socialProofMode === "both") && <span style={{ fontSize: 12, color: T.text, fontFamily: "'Plus Jakarta Sans'" }}>📥 {getMatDownloads(1)} downloads</span>}
                            {config.socialProofMode === "both" && <span style={{ color: T.progressTrack }}>·</span>}
                            {(config.socialProofMode === "recent" || config.socialProofMode === "both") && <span style={{ fontSize: 12, color: T.text, fontFamily: "'Plus Jakarta Sans'", fontStyle: "italic" }}>{getRecentPerson(1)}</span>}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* ─── DYNAMIC BANNER (moved from Textos) ─── */}
              <div>
                <div onClick={() => toggleSection("banner")} style={sectionHeaderStyle}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>🎯 Banner Dinâmico</h3>
                  <span style={{ fontSize: 14, color: T.textFaint, transition: "transform 0.2s", transform: collapsedSections.banner ? "rotate(0deg)" : "rotate(180deg)" }}>▼</span>
                </div>
                {!collapsedSections.banner && (() => {
                  // Config vem do DB como string; "false" é truthy em JS — comparar explicitamente com "true"
                  const isBannerPersonalized = config.bannerPersonalized === true || config.bannerPersonalized === "true";
                  return (
                  <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: 12 }}>
                    <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                      <button onClick={() => updCfg("bannerPersonalized", "true")} style={{ flex: 1, padding: "10px 8px", borderRadius: 9, fontSize: 12, fontWeight: 600, background: isBannerPersonalized ? T.accent + "22" : T.inputBg, color: isBannerPersonalized ? T.accent : T.textFaint, border: `1px solid ${isBannerPersonalized ? T.accent + "44" : T.inputBorder}` }}>🎯 Personalizado</button>
                      <button onClick={() => updCfg("bannerPersonalized", "false")} style={{ flex: 1, padding: "10px 8px", borderRadius: 9, fontSize: 12, fontWeight: 600, background: !isBannerPersonalized ? T.accent + "22" : T.inputBg, color: !isBannerPersonalized ? T.accent : T.textFaint, border: `1px solid ${!isBannerPersonalized ? T.accent + "44" : T.inputBorder}` }}>✏️ Fixo (manual)</button>
                    </div>
                    {isBannerPersonalized ? (
                      <>
                        <div style={{ padding: "12px 14px", borderRadius: 10, background: T.inputBg, border: `1px solid ${T.inputBorder}`, marginBottom: 10 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: T.accent, marginBottom: 8, fontFamily: "'Plus Jakarta Sans'" }}>Regras automáticas:</p>
                          {[
                            ["🚀", "0 downloads", "\"Comece sua jornada! X materiais esperando...\""],
                            ["💪", "1-2 downloads", "\"X de Y baixados! Continue explorando...\""],
                            ["🔓", "2+ downloads + materiais travados", "\"Já aproveitou X materiais. Desbloqueie os Y restantes por R$Z\""],
                            ["🏆", "Todos baixados", "\"Você é fera! Fique ligado...\""],
                          ].map(([ico, cond, txt], i) => (
                            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
                              <span style={{ fontSize: 14, flexShrink: 0 }}>{ico}</span>
                              <div>
                                <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: "'Plus Jakarta Sans'" }}>{cond}</span>
                                <p style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginTop: 1 }}>{txt}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div style={{ padding: "10px 12px", borderRadius: 8, background: T.accent + "11", border: `1px solid ${T.accent}22` }}>
                          <p style={{ fontSize: 12, color: T.accent, fontFamily: "'Plus Jakarta Sans'" }}>💡 O banner adapta automaticamente a mensagem.</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <CmsField label="Banner título" ck="ctaBannerTitle" />
                        <CmsField label="Banner descrição" ck="ctaBannerDesc" />
                        <CmsField label="Banner etiqueta (ex: Curso completo)" ck="ctaBannerBadge" />
                        <CmsField label="Banner botão" ck="ctaBannerBtn" />
                        <CmsField label="Banner link (curso)" ck="bannerAllAccessLink" />
                      </>
                    )}
                  </div>
                  );
                })()}
              </div>

              {/* Streak Rewards */}
              <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text }}>🔥 Regras de Streak</h3>
                  <button onClick={() => saveStreakRules([...streakRules, { every: 5, credits: 1, message: "dias seguidos!" }])} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: T.accent + "22", color: T.accent, border: `1px solid ${T.accent}44` }}>+ Regra</button>
                </div>
                <p style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginBottom: 10 }}>Use "a cada" para repetir (5, 10, 15...) ou "no dia" para um marco unico.</p>
                {streakRules.map((rule, i) => (
                  <div key={"sr-" + i + "-" + streakRules.length} style={{ background: T.statBg, border: `1px solid ${T.statBorder}`, borderRadius: 10, padding: 10, marginBottom: 6 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                      <select defaultValue={rule.every ? "every" : "at"} onChange={(e) => { const nr = [...streakRules]; if (e.target.value === "every") { nr[i] = { every: rule.every || rule.at || 5, credits: rule.credits, message: rule.message }; } else { nr[i] = { at: rule.at || rule.every || 30, credits: rule.credits, message: rule.message }; } saveStreakRules(nr); }} style={{ ...inp, width: 100 }}>
                        <option value="every">A cada</option>
                        <option value="at">No dia</option>
                      </select>
                      <input type="number" defaultValue={rule.every || rule.at || 5} onBlur={(e) => { const nr = [...streakRules]; const val = parseInt(e.target.value) || 1; nr[i] = rule.every ? { ...rule, every: val } : { ...rule, at: val }; saveStreakRules(nr); }} style={{ ...inp, width: 60 }} />
                      <span style={{ fontSize: 11, color: T.textFaint, whiteSpace: "nowrap" }}>dias =</span>
                      <input type="number" defaultValue={rule.credits || 0} onBlur={(e) => { const nr = [...streakRules]; nr[i] = { ...rule, credits: parseInt(e.target.value) || 0 }; saveStreakRules(nr); }} style={{ ...inp, width: 50 }} />
                      <span style={{ fontSize: 11, color: T.textFaint }}>cr.</span>
                      <button onClick={() => saveStreakRules(streakRules.filter((_, j) => j !== i))} style={{ padding: "4px 8px", borderRadius: 6, fontSize: 10, background: T.dangerBg, color: T.dangerTxt, border: `1px solid ${T.dangerBrd}` }}>✕</button>
                    </div>
                    <input defaultValue={rule.message || ""} onBlur={(e) => { const nr = [...streakRules]; nr[i] = { ...rule, message: e.target.value }; saveStreakRules(nr); }} style={inp} placeholder="Mensagem de celebracao..." />
                  </div>
                ))}
              </div>

              {/* Milestones */}
              <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text }}>🏆 Marcos de Dias</h3>
                  <button onClick={() => saveMilestones([...milestones, { days: 10, title: "Novo marco!", message: "Parabens!", credits: 0 }])} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: T.accent + "22", color: T.accent, border: `1px solid ${T.accent}44` }}>+ Marco</button>
                </div>
                <p style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginBottom: 10 }}>Popup de celebracao quando o usuario atinge X dias totais de acesso.</p>
                {milestones.map((m, i) => (
                  <div key={"ms-" + i + "-" + milestones.length} style={{ background: T.statBg, border: `1px solid ${T.statBorder}`, borderRadius: 10, padding: 10, marginBottom: 6 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                      <input type="number" defaultValue={m.days} onBlur={(e) => { const nm = [...milestones]; nm[i] = { ...m, days: parseInt(e.target.value) || 1 }; saveMilestones(nm); }} style={{ ...inp, width: 60 }} />
                      <span style={{ fontSize: 11, color: T.textFaint }}>dias</span>
                      <input type="number" defaultValue={m.credits || 0} onBlur={(e) => { const nm = [...milestones]; nm[i] = { ...m, credits: parseInt(e.target.value) || 0 }; saveMilestones(nm); }} style={{ ...inp, width: 50 }} />
                      <span style={{ fontSize: 11, color: T.textFaint }}>cr.</span>
                      <button onClick={() => saveMilestones(milestones.filter((_, j) => j !== i))} style={{ padding: "4px 8px", borderRadius: 6, fontSize: 10, background: T.dangerBg, color: T.dangerTxt, border: `1px solid ${T.dangerBrd}` }}>✕</button>
                    </div>
                    <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                      <input defaultValue={m.title || ""} onBlur={(e) => { const nm = [...milestones]; nm[i] = { ...m, title: e.target.value }; saveMilestones(nm); }} style={{ ...inp, flex: 1 }} placeholder="Titulo (ex: 10 dias!)" />
                    </div>
                    <input defaultValue={m.message || ""} onBlur={(e) => { const nm = [...milestones]; nm[i] = { ...m, message: e.target.value }; saveMilestones(nm); }} style={inp} placeholder="Mensagem de parabens..." />
                  </div>
                ))}
              </div>

              {/* Ranking config */}
              <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 8 }}>📊 Ranking</h3>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: T.textMuted }}>Visivel para usuarios:</span>
                  <button onClick={() => db.updateConfig("rankingEnabled", config.rankingEnabled === "false" ? "true" : "false")} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: config.rankingEnabled !== "false" ? T.accent + "22" : T.dangerBg, color: config.rankingEnabled !== "false" ? T.accent : T.dangerTxt, border: `1px solid ${config.rankingEnabled !== "false" ? T.accent + "44" : T.dangerBrd}` }}>{config.rankingEnabled !== "false" ? "Ativo" : "Desativado"}</button>
                </div>
              </div>

              {/* Gamification stats */}
              <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 8 }}>📈 Estatisticas de Gamificacao</h3>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  {[
                    ["🔥", leads.filter(l => l.streakCount > 0).length, "com streak ativo"],
                    ["📖", leads.filter(l => (l.reflectionsRead || []).length > 0).length, "leram reflexoes"],
                    ["🏆", leads.reduce((best, l) => Math.max(best, l.streakBest || 0), 0), "melhor streak"],
                  ].map(([ic, val, lbl], i) => (
                    <div key={i} style={{ flex: 1, background: T.statBg, border: `1px solid ${T.statBorder}`, borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                      <span style={{ fontSize: 14 }}>{ic}</span>
                      <span style={{ display: "block", fontSize: 20, fontWeight: 800, color: T.accent, marginTop: 2 }}>{val}</span>
                      <span style={{ fontSize: 9, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>{lbl}</span>
                    </div>
                  ))}
                </div>
                {/* Top users table */}
                {(() => {
                  const ranked = leads.map(l => ({ name: l.name, streak: l.streakCount || 0, best: l.streakBest || 0, reads: (l.reflectionsRead || []).length, dls: (l.downloads || []).length, days: l.totalDays || 0 })).sort((a, b) => b.days - a.days).slice(0, 15);
                  return (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", fontSize: 11, fontFamily: "'Plus Jakarta Sans'", borderCollapse: "collapse" }}>
                        <thead><tr>{["Nome", "Streak", "Record", "Leituras", "Materiais", "Dias"].map(h => <th key={h} style={{ textAlign: "left", padding: "6px 4px", borderBottom: `1px solid ${T.inputBorder}`, color: T.textFaint, fontWeight: 600, fontSize: 10 }}>{h}</th>)}</tr></thead>
                        <tbody>{ranked.map((l, i) => <tr key={i}><td style={{ padding: "5px 4px", color: T.text, fontWeight: 600 }}>{l.name?.split(" ")[0]}</td><td style={{ padding: "5px 4px", color: T.gold }}>{l.streak}</td><td style={{ padding: "5px 4px", color: T.accent }}>{l.best}</td><td style={{ padding: "5px 4px", color: T.textMuted }}>{l.reads}</td><td style={{ padding: "5px 4px", color: T.textMuted }}>{l.dls}</td><td style={{ padding: "5px 4px", color: T.textMuted }}>{l.days}</td></tr>)}</tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })()}

        {/* QUIZZES & CREDITS */}
        {adminTab === "quizzes" && (() => {
          const allQuizzes = getQuizzes();
          const saveQuizzes = (qs) => db.updateConfig("quizzes", JSON.stringify(qs));
          const allInstaPosts = getInstaPosts();
          const saveInstaPosts = (ps) => db.updateConfig("instaPosts", JSON.stringify(ps));
          const addQuiz = () => {
            const nq = { id: String(Date.now()), title: "Novo Quiz", active: true, credits: 1, questions: [
              { question: "Pergunta 1?", options: ["A", "B", "C", "D"], correct: 0 },
              { question: "Pergunta 2?", options: ["A", "B", "C", "D"], correct: 0 },
              { question: "Pergunta 3?", options: ["A", "B", "C", "D"], correct: 0 },
            ] };
            saveQuizzes([...allQuizzes, nq]); showT("Quiz criado! ✅");
          };
          const updateQuiz = (qid, key, val) => saveQuizzes(allQuizzes.map(q => q.id === qid ? { ...q, [key]: val } : q));
          const updateQuestion = (qid, qi, key, val) => {
            saveQuizzes(allQuizzes.map(q => q.id === qid ? { ...q, questions: q.questions.map((qq, i) => i === qi ? { ...qq, [key]: val } : qq) } : q));
          };
          const addQuestion = (qid) => {
            saveQuizzes(allQuizzes.map(q => q.id === qid ? { ...q, questions: [...q.questions, { question: "Nova pergunta?", options: ["A", "B", "C", "D"], correct: 0 }] } : q));
          };
          const removeQuestion = (qid, qi) => {
            saveQuizzes(allQuizzes.map(q => q.id === qid ? { ...q, questions: q.questions.filter((_, i) => i !== qi) } : q));
          };
          const deleteQuiz = (qid) => { saveQuizzes(allQuizzes.filter(q => q.id !== qid)); showT("Quiz removido 🗑"); };
          const linkInp = { width: "100%", padding: "8px 10px", borderRadius: 8, background: T.inputBg, border: `1px solid ${T.inputBorder}`, color: T.text, fontSize: 12, fontFamily: "'Plus Jakarta Sans'" };

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Credits Config */}
              <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 10 }}>🎯 Sistema de Créditos</h3>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'" }}>Ativar sistema:</span>
                  <button onClick={() => db.updateConfig("creditsEnabled", creditsEnabled ? "false" : "true")} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: creditsEnabled ? T.accent + "22" : T.inputBg, color: creditsEnabled ? T.accent : T.textFaint, border: `1px solid ${creditsEnabled ? T.accent + "44" : T.inputBorder}` }}>{creditsEnabled ? "✅ Ativo" : "Desativado"}</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <CmsField label="Créditos iniciais (cadastro)" ck="creditsInitial" />
                  <CmsField label="Por indicação WhatsApp" ck="creditsReferral" />
                </div>
                <p style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginTop: 6 }}>Créditos por fase, quiz e post IG são configurados individualmente abaixo.</p>
                <div style={{ marginTop: 8 }}>
                  <CmsField label="Msg indicação WhatsApp ({link} = URL)" ck="creditsReferralMsg" multi />
                </div>

                <p style={{ fontSize: 10, color: T.textFaint, marginTop: 8, fontFamily: "'Plus Jakarta Sans'" }}>Créditos por fase: configure em cada fase no builder acima.</p>

                <div style={{ marginTop: 14, borderTop: `1px solid ${T.statBorder}`, paddingTop: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, marginBottom: 8 }}>Textos dos popups de créditos</p>
                  <CmsField label="Tooltip: título ({n} = saldo)" ck="creditsTooltipTitle" />
                  <CmsField label="Tooltip: descrição" ck="creditsTooltipDesc" multi />
                  <CmsField label="Tooltip: botão" ck="creditsTooltipBtn" />
                  <CmsField label="Modal: título" ck="creditsStoreTitle" />
                  <CmsField label="Modal: subtítulo das fases" ck="creditsStorePhaseSubtitle" />
                  <CmsField label="Modal: título indicação" ck="creditsStoreReferralTitle" />
                  <CmsField label="Modal: subtítulo indicação" ck="creditsStoreReferralSubtitle" />
                  <CmsField label="Modal: botão fechar" ck="creditsStoreCloseBtn" />
                </div>
              </div>

              {/* Instagram Posts */}
              <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text }}>💬 Posts Instagram ({allInstaPosts.length})</h3>
                  <button onClick={() => { const ps = [...allInstaPosts, { id: String(Date.now()), title: "Comentar no post", description: "", url: "", credits: 1, active: true }]; saveInstaPosts(ps); showT("Post adicionado!"); }} style={{ padding: "6px 14px", borderRadius: 8, background: T.accent + "22", color: T.accent, fontSize: 12, fontWeight: 600, border: `1px solid ${T.accent}44` }}>＋ Novo post</button>
                </div>
                {allInstaPosts.map(post => (
                  <div key={post.id} style={{ background: T.statBg, border: `1px solid ${T.statBorder}`, borderRadius: 10, padding: 10, marginBottom: 6 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                      <input value={post.title || ""} onChange={(e) => { saveInstaPosts(allInstaPosts.map(p => p.id === post.id ? { ...p, title: e.target.value } : p)); }} style={{ ...linkInp, flex: 1, fontWeight: 600 }} placeholder="Título (ex: Comente no post sobre Pilates)" />
                      <div style={{ display: "flex", gap: 3 }}>
                        <button onClick={() => saveInstaPosts(allInstaPosts.map(p => p.id === post.id ? { ...p, active: !p.active } : p))} style={{ padding: "4px 8px", borderRadius: 6, fontSize: 11, background: post.active ? T.accent + "22" : T.inputBg, color: post.active ? T.accent : T.textFaint, border: `1px solid ${post.active ? T.accent + "44" : T.inputBorder}` }}>{post.active ? "👁" : "👁‍🗨"}</button>
                        <button onClick={() => { saveInstaPosts(allInstaPosts.filter(p => p.id !== post.id)); showT("Post removido 🗑"); }} style={{ padding: "4px 8px", borderRadius: 6, fontSize: 11, background: T.dangerBg, color: T.dangerTxt, border: `1px solid ${T.dangerBrd}` }}>🗑</button>
                      </div>
                    </div>
                    <input value={post.url || ""} onChange={(e) => saveInstaPosts(allInstaPosts.map(p => p.id === post.id ? { ...p, url: e.target.value } : p))} style={{ ...linkInp, marginBottom: 4 }} placeholder="URL do post (https://instagram.com/p/...)" />
                    <div style={{ display: "flex", gap: 6 }}>
                      <input value={post.description || ""} onChange={(e) => saveInstaPosts(allInstaPosts.map(p => p.id === post.id ? { ...p, description: e.target.value } : p))} style={{ ...linkInp, flex: 1 }} placeholder="Descrição (opcional)" />
                      <div style={{ width: 70 }}>
                        <input type="number" value={post.credits || 1} onChange={(e) => saveInstaPosts(allInstaPosts.map(p => p.id === post.id ? { ...p, credits: parseInt(e.target.value) || 1 } : p))} style={{ ...linkInp, width: 60, textAlign: "center" }} min="1" />
                        <span style={{ fontSize: 9, color: T.textFaint }}>créditos</span>
                      </div>
                    </div>
                  </div>
                ))}
                {allInstaPosts.length === 0 && <p style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", padding: "8px 0" }}>Nenhum post. A opção de comentário não aparece para o usuário.</p>}
                <p style={{ fontSize: 10, color: T.textFaint, marginTop: 4 }}>💡 O usuário verá apenas posts que ainda não comentou. Quando comentar em todos, a seção desaparece.</p>
              </div>

              {/* Quiz List */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text }}>🧠 Quizzes ({allQuizzes.length})</h3>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input style={{ ...inp, maxWidth: 200, padding: "8px 12px" }} placeholder="🔍 Buscar quiz..." value={searchQuiz} onChange={(e) => setSearchQuiz(e.target.value)} />
                  <button onClick={addQuiz} style={{ padding: "6px 14px", borderRadius: 8, background: T.accent + "22", color: T.accent, fontSize: 12, fontWeight: 600, border: `1px solid ${T.accent}44`, whiteSpace: "nowrap" }}>＋ Novo quiz</button>
                </div>
              </div>

              {allQuizzes.filter(q => !searchQuiz.trim() || q.title.toLowerCase().includes(searchQuiz.toLowerCase())).map(q => (
                <div key={q.id} style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <input value={q.title} onChange={(e) => updateQuiz(q.id, "title", e.target.value)} style={{ ...linkInp, fontWeight: 700, fontSize: 14, flex: 1 }} placeholder="Título do quiz" />
                    <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
                      <button onClick={() => updateQuiz(q.id, "active", !q.active)} style={{ padding: "4px 8px", borderRadius: 6, fontSize: 11, background: q.active ? T.accent + "22" : T.inputBg, color: q.active ? T.accent : T.textFaint, border: `1px solid ${q.active ? T.accent + "44" : T.inputBorder}` }}>{q.active ? "👁" : "👁‍🗨"}</button>
                      <button onClick={() => deleteQuiz(q.id)} style={{ padding: "4px 8px", borderRadius: 6, fontSize: 11, background: T.dangerBg, color: T.dangerTxt, border: `1px solid ${T.dangerBrd}` }}>🗑</button>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>🎯 Créditos ao acertar:</span>
                    {[1, 2, 3, 5].map(c => (<button key={c} onClick={() => updateQuiz(q.id, "credits", c)} style={{ padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: (q.credits || 1) === c ? T.gold + "22" : T.inputBg, color: (q.credits || 1) === c ? T.gold : T.textFaint, border: `1px solid ${(q.credits || 1) === c ? T.gold + "44" : T.inputBorder}` }}>{c}</button>))}
                  </div>

                  {(q.questions || []).map((qq, qi) => (
                    <div key={qi} style={{ background: T.statBg, border: `1px solid ${T.statBorder}`, borderRadius: 10, padding: 10, marginBottom: 6 }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: T.textFaint, minWidth: 20 }}>Q{qi + 1}</span>
                        <input value={qq.question} onChange={(e) => updateQuestion(q.id, qi, "question", e.target.value)} style={{ ...linkInp, flex: 1 }} placeholder="Pergunta" />
                        {q.questions.length > 1 && <button onClick={() => removeQuestion(q.id, qi)} style={{ fontSize: 10, color: T.dangerTxt, background: "none", padding: 4 }}>✕</button>}
                      </div>
                      {(qq.options || []).map((opt, oi) => (
                        <div key={oi} style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 3 }}>
                          <button onClick={() => updateQuestion(q.id, qi, "correct", oi)} style={{ width: 22, height: 22, borderRadius: "50%", background: qq.correct === oi ? T.accent : T.inputBg, border: `2px solid ${qq.correct === oi ? T.accent : T.inputBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", flexShrink: 0 }}>{qq.correct === oi ? "✓" : ""}</button>
                          <input value={opt} onChange={(e) => { const newOpts = [...qq.options]; newOpts[oi] = e.target.value; updateQuestion(q.id, qi, "options", newOpts); }} style={{ ...linkInp, flex: 1, fontSize: 11 }} placeholder={`Opção ${String.fromCharCode(65 + oi)}`} />
                        </div>
                      ))}
                    </div>
                  ))}
                  <button onClick={() => addQuestion(q.id)} style={{ fontSize: 11, color: T.accent, background: "none", padding: "4px 0" }}>＋ Adicionar pergunta</button>
                </div>
              ))}

              {allQuizzes.length === 0 && <p style={{ fontSize: 13, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", textAlign: "center", padding: 20 }}>Nenhum quiz criado. Clique em "＋ Novo quiz" para começar.</p>}
              <p style={{ fontSize: 10, color: T.textFaint, marginTop: 4, fontFamily: "'Plus Jakarta Sans'" }}>💡 Marque o ⚪ verde na resposta correta. O usuário precisa acertar todas as perguntas para ganhar o crédito. Se errar, pode tentar novamente no dia seguinte.</p>
            </div>
          );
        })()}

        {/* REFLECTIONS CMS */}
        {adminTab === "reflections" && (() => {
          const allRefs = [...(dbReflections || [])].sort((a, b) => b.publishDate.localeCompare(a.publishDate));
          const sortedRefs = searchReflection.trim() ? allRefs.filter(r => (r.title + " " + r.body + " " + (r.quote || "")).toLowerCase().includes(searchReflection.toLowerCase())) : allRefs;
          const emptyRef = { title: "", body: "", actionText: "", quote: "", inspiration: "", publishDate: new Date(Date.now() + 86400000).toISOString().split("T")[0], active: true };
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* AI GENERATOR */}
              <div style={{ background: theme === "dark" ? "#1a1a10" : "#fffdf5", border: `1px solid ${T.gold}33`, borderRadius: 10, padding: 12 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: T.gold, marginBottom: 10 }}>🤖 Gerador de Reflexões</p>
                <textarea value={adminRefGenPrompt} onChange={e => setAdminRefGenPrompt(e.target.value)} placeholder="Tema ou palavras-chave... Ex: 'importância de cobrar o preço justo', 'como lidar com aluna que reclama do preço'" rows={2} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: T.inputBg, border: `1px solid ${T.inputBorder}`, color: T.text, fontSize: 13, fontFamily: "'Plus Jakarta Sans'", resize: "vertical" }} />
                <button disabled={adminRefGenLoading || !adminRefGenPrompt.trim()} onClick={async () => {
                  setAdminRefGenLoading(true);
                  try {
                    const prompt = `Você é Rafael Juliano, fundador da VOLL Pilates Group, a maior escola de formação em Pilates da América Latina. Escreva uma reflexão do dia curta (máximo 3 parágrafos, leitura em menos de 1 minuto) para donos de estúdio de Pilates sobre o tema: "${adminRefGenPrompt}". Use tom direto, provocativo e prático. Inclua uma ação concreta que a pessoa pode fazer HOJE. Também gere uma frase curta inspiracional (máximo 15 palavras) para a imagem do story. Responda APENAS em JSON puro sem markdown: {"title":"...","body":"...","actionText":"...","quote":"..."}`;
                    const res = await fetch('/api/generate-reflection', {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ prompt })
                    });
                    if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Erro na API"); }
                    const data = await res.json();
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
                    const clean = text.replace(/```json|```/g, "").trim();
                    const parsed = JSON.parse(clean);
                    setAdminRefGenResult(JSON.stringify(parsed));
                    setAdminRefEdit({ ...emptyRef, title: parsed.title || "", body: parsed.body || "", actionText: parsed.actionText || "", quote: parsed.quote || "" });
                    showT("Reflexão gerada! Edite e salve abaixo.");
                  } catch(e) { console.error(e); showT("Erro: " + (e.message || "Tente novamente.")); }
                  setAdminRefGenLoading(false);
                }} style={{ marginTop: 8, padding: "10px 20px", borderRadius: 10, background: adminRefGenLoading ? T.statBg : `linear-gradient(135deg, ${T.gold}, #FFD863)`, color: "#1a1a12", fontSize: 13, fontWeight: 700, border: "none", opacity: adminRefGenLoading || !adminRefGenPrompt.trim() ? 0.5 : 1 }}>
                  {adminRefGenLoading ? "Gerando..." : "✨ Gerar reflexão"}
                </button>
              </div>

              {/* ADD/EDIT FORM */}
              <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: 12 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 10 }}>{adminRefEdit?.id ? "✏️ Editar" : "➕ Nova"} Reflexão</p>
                <input value={adminRefEdit?.title || ""} onChange={e => setAdminRefEdit(p => ({ ...(p || emptyRef), title: e.target.value }))} placeholder="Título" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: T.inputBg, border: `1px solid ${T.inputBrd}`, color: T.text, fontSize: 14, fontWeight: 600, marginBottom: 8 }} />
                <textarea value={adminRefEdit?.body || ""} onChange={e => setAdminRefEdit(p => ({ ...(p || emptyRef), body: e.target.value }))} placeholder="Texto da reflexão..." rows={4} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: T.inputBg, border: `1px solid ${T.inputBrd}`, color: T.text, fontSize: 13, fontFamily: "'Plus Jakarta Sans'", resize: "vertical", marginBottom: 8 }} />
                <input value={adminRefEdit?.actionText || ""} onChange={e => setAdminRefEdit(p => ({ ...(p || emptyRef), actionText: e.target.value }))} placeholder="✨ Ação do dia (opcional)" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: T.inputBg, border: `1px solid ${T.inputBrd}`, color: T.text, fontSize: 13, marginBottom: 8 }} />
                <input value={adminRefEdit?.quote || ""} onChange={e => setAdminRefEdit(p => ({ ...(p || emptyRef), quote: e.target.value }))} placeholder="📸 Frase curta pro Instagram (ex: 'Saber se valorizar é reconhecer quem você é.')" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: T.gold + "11", border: `1px solid ${T.gold}33`, color: T.text, fontSize: 13, marginBottom: 8 }} />
                <input value={adminRefEdit?.inspiration || ""} onChange={e => setAdminRefEdit(p => ({ ...(p || emptyRef), inspiration: e.target.value }))} placeholder="💡 Inspiração/origem (só pra você)" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: T.inputBg, border: `1px solid ${T.inputBrd}`, color: T.text, fontSize: 13, marginBottom: 8 }} />
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                  <label style={{ fontSize: 12, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'" }}>📅 Data:</label>
                  <input type="date" value={adminRefEdit?.publishDate || emptyRef.publishDate} onChange={e => setAdminRefEdit(p => ({ ...(p || emptyRef), publishDate: e.target.value }))} style={{ padding: "8px 12px", borderRadius: 10, background: T.inputBg, border: `1px solid ${T.inputBrd}`, color: T.text, fontSize: 13 }} />
                  <label style={{ fontSize: 12, color: T.textMuted, marginLeft: 8 }}><input type="checkbox" checked={adminRefEdit?.active !== false} onChange={e => setAdminRefEdit(p => ({ ...(p || emptyRef), active: e.target.checked }))} /> Ativa</label>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" disabled={savingReflection} onClick={async () => {
                    const ref = adminRefEdit || emptyRef;
                    if (!ref.title || !ref.body || !ref.publishDate) { showT("Preencha título, texto e data!"); return; }
                    setSavingReflection(true);
                    try {
                      let savedId = ref.id;
                      if (ref.id) { const ok = await db.updateReflection(ref.id, ref); if (ok) showT("Reflexão atualizada! ✅"); else showT("Erro ao salvar reflexão. Tente novamente."); }
                      else { const created = await db.addReflection(ref); if (created) { savedId = created.id; showT("Reflexão programada! ✅"); } else showT("Erro ao criar reflexão. Tente novamente."); }
                      if (savedId && ref.quote) {
                        showT("Gerando imagens dos 4 estilos...");
                        const uploadOk = await generateAndUploadAllStyles(savedId, ref.quote);
                        if (uploadOk !== null) showT("Imagens salvas no Storage! 📸"); else showT("Reflexão salva, mas falha ao gerar imagens. Tente gerar de novo.");
                      }
                      setAdminRefEdit(null); addLog(ref.id ? `Editou reflexão: ${ref.title}` : `Criou reflexão: ${ref.title}`);
                    } finally { setSavingReflection(false); }
                  }} style={{ flex: 1, padding: "10px", borderRadius: 10, background: savingReflection ? T.statBg : "linear-gradient(135deg, #349980, #7DE2C7)", color: "#060a09", fontSize: 13, fontWeight: 700, border: "none", cursor: savingReflection ? "wait" : "pointer" }} aria-busy={savingReflection}>
                    {savingReflection ? "⏳ Salvando..." : (adminRefEdit?.id ? "Salvar" : "Programar") + " 💾"}
                  </button>
                  {adminRefEdit && <button onClick={() => setAdminRefEdit(null)} style={{ padding: "10px 14px", borderRadius: 10, background: T.statBg, border: `1px solid ${T.statBorder}`, color: T.textMuted, fontSize: 13 }}>Cancelar</button>}
                </div>
              </div>

              {/* LIST */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, gap: 10 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: T.textMuted }}>📋 Reflexões ({sortedRefs.length}{searchReflection ? ` de ${allRefs.length}` : ""})</p>
                <input style={{ ...inp, maxWidth: 280 }} placeholder="🔍 Buscar reflexão..." value={searchReflection} onChange={(e) => setSearchReflection(e.target.value)} />
              </div>
              {sortedRefs.map(r => {
                const isToday = r.publishDate === todayStr;
                const isPast = r.publishDate < todayStr;
                const isFuture = r.publishDate > todayStr;
                return (
                  <div key={r.id} style={{ background: T.cardBg, border: `1px solid ${isToday ? T.gold + "44" : T.cardBorder}`, borderRadius: 10, padding: "10px 12px", opacity: isPast && !isToday ? 0.6 : 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: isToday ? T.gold + "22" : isFuture ? T.accent + "22" : T.statBg, color: isToday ? T.gold : isFuture ? T.accent : T.textFaint, fontWeight: 700 }}>
                            {isToday ? "HOJE" : isPast ? "PASSADA" : "AGENDADA"}
                          </span>
                          <span style={{ fontSize: 11, color: T.textFaint }}>{r.publishDate}</span>
                          {!r.active && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "#e8443a22", color: "#e8443a", fontWeight: 700 }}>INATIVA</span>}
                        </div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{r.title}</p>
                        <p style={{ fontSize: 11, color: T.textFaint, marginTop: 2 }}>{r.body.substring(0, 80)}...</p>
                        {r.quote && <p style={{ fontSize: 10, color: T.accent, marginTop: 4 }}>📸 {r.quote}</p>}
                        {r.inspiration && <p style={{ fontSize: 10, color: T.gold, marginTop: 4 }}>💡 {r.inspiration}</p>}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                        <div style={{ display: "flex", gap: 4, fontSize: 11, color: T.textFaint }}>
                          <span>👍 {r.likes}</span>
                          <span>👎 {r.dislikes}</span>
                        </div>
                        <div style={{ display: "flex", gap: 4 }}>
                          {r.imageUrl && (() => { try { const imgs = JSON.parse(r.imageUrl); return Object.keys(imgs).length > 0 ? <button onClick={() => setRefImagePreview(imgs)} title="Ver imagens geradas" style={{ padding: "4px 10px", borderRadius: 8, background: T.accent + "22", border: `1px solid ${T.accent}44`, fontSize: 12 }}>📸</button> : null; } catch { return null; } })()}
                          <button onClick={() => setAdminRefEdit({ ...r })} style={{ padding: "4px 10px", borderRadius: 8, background: T.statBg, border: `1px solid ${T.statBorder}`, fontSize: 12 }}>✏️</button>
                          <button onClick={async () => { if (confirm("Excluir reflexão?")) { const ok = await db.deleteReflection(r.id); if (ok) { showT("Excluída! 🗑️"); addLog(`Excluiu reflexão: ${r.title}`); } else showT("Erro ao excluir. Tente novamente."); } }} style={{ padding: "4px 10px", borderRadius: 8, background: T.dangerBg, border: `1px solid ${T.dangerBrd}`, fontSize: 12 }}>🗑️</button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {sortedRefs.length === 0 && <p style={{ fontSize: 13, color: T.textFaint, textAlign: "center", padding: 20 }}>Nenhuma reflexão ainda. Use o gerador acima! ✨</p>}

              {/* IMAGE PREVIEW MODAL */}
              {refImagePreview && (
                <div onClick={() => setRefImagePreview(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
                  <div onClick={e => e.stopPropagation()} style={{ background: T.bg, borderRadius: 16, padding: 20, maxWidth: 600, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: T.text }}>📸 Imagens geradas (4 estilos)</p>
                      <button onClick={() => setRefImagePreview(null)} style={{ background: "none", border: "none", fontSize: 18, color: T.textMuted, cursor: "pointer" }}>✕</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {Object.entries(refImagePreview).map(([key, url]) => (
                        <div key={key} style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${T.cardBorder}` }}>
                          <img src={url} alt={key} style={{ width: "100%", display: "block" }} />
                          <p style={{ fontSize: 10, textAlign: "center", padding: 4, color: T.textFaint, background: T.statBg }}>
                            {key.replace("style_", "Estilo ")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* USERS (MASTER ONLY) */}
        {adminTab === "users" && isMaster && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Add new user */}
            {!showNewUser ? (
              <button onClick={() => setShowNewUser(true)} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: T.gold + "15", border: `2px dashed ${T.gold}44`, color: T.gold, fontSize: 13, fontWeight: 700 }}>＋ Criar novo Admin</button>
            ) : (
              <div style={{ background: T.statBg, border: `2px solid ${T.gold}44`, borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
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
                  const isUnique = await db.checkPinUnique(newUser.pin);
                  if (!isUnique) return showT("PIN já em uso!");
                  const created = await db.addAdminUser({ name: newUser.name, pin: newUser.pin, permissions: newUser.permissions });
                  if (!created) { showT("Erro ao criar admin. Tente novamente."); return; }
                  setNewUser({ name: "", pin: "", permissions: { materials_view: true, materials_edit: false, leads_view: true, leads_export: false, leads_whatsapp: false, textos_edit: false, users_manage: false } });
                  setShowNewUser(false); showT("Admin criado! 🎉");
                }} style={{ width: "100%", padding: "13px", borderRadius: 12, background: `linear-gradient(135deg, #c49500, #FFD863)`, color: "#1a1a12", fontSize: 14, fontWeight: 700, marginTop: 4 }}>👑 Criar Admin</button>
              </div>
            )}

            {/* MASTER card */}
            <div style={{ background: T.statBg, border: `1px solid ${T.gold}33`, borderRadius: 10, padding: 12, borderLeft: `3px solid ${T.gold}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg, #c49500, #FFD863)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>👑</div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: T.gold }}>{currentAdmin?.role === "master" ? currentAdmin.name : "MASTER"}</h3>
                  <p style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>🔒 PIN protegido · Acesso total</p>
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
                <div key={u.id} style={{ background: T.statBg, border: `1px solid ${T.statBorder}`, borderRadius: 10, padding: 12, borderLeft: `3px solid ${T.accent}`, opacity: animateIn ? 1 : 0, transform: animateIn ? "translateY(0)" : "translateY(15px)", transition: `all 0.3s ease ${i * 0.05}s` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: isEditing ? 12 : 0 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: T.avBg, border: `2px solid ${T.avBrd}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: T.accent }}>{u.name.charAt(0).toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{u.name}</h3>
                      <p style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>🔒 PIN protegido · {Object.values(u.permissions).filter(Boolean).length} permissões</p>
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

        {/* SUPORTE */}
        {adminTab === "support" && (
          <div style={{ padding: 0, maxWidth: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: T.text }}>Suporte</h2>
              <button type="button" onClick={() => db.loadSupportRequests && db.loadSupportRequests()} style={{ padding: "6px 12px", borderRadius: 8, background: T.statBg, border: `1px solid ${T.statBorder}`, color: T.accent, fontSize: 12, fontWeight: 600 }}>Atualizar</button>
            </div>
            <p style={{ fontSize: 12, color: T.textMuted, marginBottom: 8, fontFamily: "'Plus Jakarta Sans'" }}>Reportes de erro e sugestões enviados pelos usuários pelo app.</p>
            {(db.supportRequests || []).length === 0 ? (
              <div style={{ padding: 16, textAlign: "center", background: T.cardBg, borderRadius: 10, border: `1px solid ${T.cardBorder}` }}>
                <p style={{ fontSize: 13, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Nenhuma mensagem de suporte ainda.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(db.supportRequests || []).map((sr) => (
                  <div key={sr.id} style={{ background: T.cardBg, border: `1px solid ${sr.type === "error" ? T.dangerBrd + "44" : T.cardBorder}`, borderRadius: 10, padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: sr.type === "error" ? T.dangerBrd + "22" : T.accent + "22", color: sr.type === "error" ? T.dangerBrd : T.accent, fontWeight: 700 }}>{sr.type === "error" ? "Reporte de erro" : "Sugestão"}</span>
                      <span style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>{sr.created_at ? new Date(sr.created_at).toLocaleString("pt-BR") : "—"}</span>
                    </div>
                    <p style={{ fontSize: 13, color: T.text, lineHeight: 1.45, fontFamily: "'Plus Jakarta Sans'", whiteSpace: "pre-wrap", marginBottom: 6 }}>{sr.message}</p>
                    <div style={{ fontSize: 12, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>{sr.user_name || "—"} · {sr.user_whatsapp || "—"}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* LOG */}
        {adminTab === "estudantes" && (can("estudantes_view") || isMaster) && (
          <div style={{ padding: 0, maxWidth: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: T.text }}>Estudantes e Diagnóstico</h2>
            </div>
            <AdminEstudantes
              T={T}
              showT={showT}
              can={can}
              addLog={addLog}
              canEditDocs={can("estudantes_edit") || isMaster}
              canEditDiagnostico={can("diagnostico_edit") || isMaster}
              estudanteWhatsApp={config.estudanteWhatsApp || ""}
              onSaveEstudanteWhatsApp={(value) => { updCfg("estudanteWhatsApp", value); addLog("Atualizou WhatsApp Área Estudante"); }}
            />
          </div>
        )}
        {adminTab === "log" && isMaster && <AdminLog T={T} activityLog={activityLog} setActivityLog={setActivityLog} />}
        </div>
      </main>
      {showIconPicker && <IconPicker onSelect={(ic) => { if (showIconPicker === "new") setNewMat((p) => ({ ...p, icon: ic })); else updMat(showIconPicker, "icon", ic); }} onClose={() => setShowIconPicker(null)} />}
      <Toast />
    </div>
  );
}
