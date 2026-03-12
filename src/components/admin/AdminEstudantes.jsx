import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabaseClient";

const DIMENSIONS = ["Presença Digital", "Posicionamento", "Networking", "Comunicação", "Mentalidade"];

export default function AdminEstudantes({ T, showT, can, addLog, canEditDocs, canEditDiagnostico }) {
  const [subTab, setSubTab] = useState("dados");
  const [estudantes, setEstudantes] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [results, setResults] = useState([]);
  const [resultsWithEstudante, setResultsWithEstudante] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchEstudantes, setSearchEstudantes] = useState("");
  const [searchResults, setSearchResults] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [showNewDoc, setShowNewDoc] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: "", description: "", file_url: "", sort_order: 0, active: true });
  const [editingDocId, setEditingDocId] = useState(null);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const sInp = { width: "100%", padding: "8px 10px", borderRadius: 8, background: T.inputBg, border: `1px solid ${T.inputBorder}`, color: T.text, fontSize: 12, fontFamily: "'Plus Jakarta Sans'" };

  const loadEstudantes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("estudantes").select("*").order("created_at", { ascending: false });
    setLoading(false);
    if (error) return showT("Erro ao carregar estudantes: " + error.message);
    setEstudantes(data || []);
  }, [showT]);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("estudante_documents").select("*").order("sort_order", { ascending: true });
    setLoading(false);
    if (error) return showT("Erro ao carregar documentos: " + error.message);
    setDocuments(data || []);
  }, [showT]);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("diagnostico_questions").select("*").order("question_number", { ascending: true });
    setLoading(false);
    if (error) return showT("Erro ao carregar perguntas: " + error.message);
    setQuestions(data || []);
  }, [showT]);

  const loadResults = useCallback(async () => {
    setLoading(true);
    const { data: resData, error: resErr } = await supabase.from("diagnostico_results").select("*").order("created_at", { ascending: false });
    if (resErr) { setLoading(false); return showT("Erro ao carregar resultados: " + resErr.message); }
    const ids = [...new Set((resData || []).map((r) => r.estudante_id))];
    if (ids.length === 0) {
      setResults(resData || []);
      setResultsWithEstudante((resData || []).map((r) => ({ ...r, estudante: null })));
      setLoading(false);
      return;
    }
    const { data: estData } = await supabase.from("estudantes").select("id, name, email, phone").in("id", ids);
    const estMap = {};
    (estData || []).forEach((e) => { estMap[e.id] = e; });
    setResults(resData || []);
    setResultsWithEstudante((resData || []).map((r) => ({ ...r, estudante: estMap[r.estudante_id] || null })));
    setLoading(false);
  }, [showT]);

  useEffect(() => {
    if (subTab === "dados") loadEstudantes();
    else if (subTab === "documentos") loadDocuments();
    else if (subTab === "diagnostico") {
      loadQuestions();
      loadResults();
    }
  }, [subTab, loadEstudantes, loadDocuments, loadQuestions, loadResults]);

  const filteredEstudantes = estudantes.filter((e) => {
    const q = searchEstudantes.trim().toLowerCase();
    if (!q) return true;
    return (e.name || "").toLowerCase().includes(q) || (e.email || "").toLowerCase().includes(q) || (e.phone || "").includes(q);
  });

  const filteredResults = resultsWithEstudante.filter((r) => {
    const q = searchResults.trim().toLowerCase();
    if (q) {
      const name = (r.estudante?.name || "").toLowerCase();
      const email = (r.estudante?.email || "").toLowerCase();
      if (!name.includes(q) && !email.includes(q)) return false;
    }
    if (filterLevel && r.level !== filterLevel) return false;
    return true;
  });

  const exportEstudantesCSV = () => {
    const headers = ["Nome", "Email", "Telefone", "Data cadastro"];
    const rows = filteredEstudantes.map((e) => [
      (e.name || "").replace(/"/g, '""'),
      (e.email || "").replace(/"/g, '""'),
      (e.phone || "").replace(/"/g, '""'),
      e.created_at ? new Date(e.created_at).toLocaleString("pt-BR") : "",
    ]);
    const csv = [headers.join(";"), ...rows.map((r) => r.map((c) => `"${c}"`).join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "estudantes.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    showT("Exportado! 📥");
  };

  const exportResultsCSV = () => {
    const headers = ["Estudante", "Email", "Data", "Nota", "Nível"];
    const rows = filteredResults.map((r) => [
      (r.estudante?.name || "").replace(/"/g, '""'),
      (r.estudante?.email || "").replace(/"/g, '""'),
      r.created_at ? new Date(r.created_at).toLocaleString("pt-BR") : "",
      String(r.total_score || ""),
      (r.level || "").replace(/"/g, '""'),
    ]);
    const csv = [headers.join(";"), ...rows.map((r) => r.map((c) => `"${c}"`).join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "diagnostico-resultados.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    showT("Exportado! 📥");
  };

  const handleUploadDoc = async (file) => {
    if (!file) return;
    setUploadingFile(true);
    const ext = file.name.split(".").pop() || "pdf";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("estudante-documents").upload(path, file, { upsert: true });
    setUploadingFile(false);
    if (upErr) return showT("Erro no upload: " + upErr.message);
    const { data: pub } = supabase.storage.from("estudante-documents").getPublicUrl(path);
    setNewDoc((p) => ({ ...p, file_url: pub.publicUrl }));
    showT("Arquivo enviado! ✅");
  };

  const saveDoc = async () => {
    if (!newDoc.title.trim()) return showT("Preencha o título.");
    if (!newDoc.file_url.trim()) return showT("Informe a URL ou faça upload de um arquivo.");
    const { error } = await supabase.from("estudante_documents").insert({
      title: newDoc.title.trim(),
      description: (newDoc.description || "").trim(),
      file_url: newDoc.file_url.trim(),
      sort_order: Number(newDoc.sort_order) || 0,
      active: !!newDoc.active,
    });
    if (error) return showT("Erro ao criar: " + error.message);
    addLog?.("Criou documento estudante: " + newDoc.title);
    setNewDoc({ title: "", description: "", file_url: "", sort_order: documents.length, active: true });
    setShowNewDoc(false);
    loadDocuments();
    showT("Documento criado! ✅");
  };

  const updateDoc = async (id, field, value) => {
    const payload = {};
    if (field === "title") payload.title = value;
    if (field === "description") payload.description = value;
    if (field === "file_url") payload.file_url = value;
    if (field === "sort_order") payload.sort_order = Number(value) || 0;
    if (field === "active") payload.active = !!value;
    const { error } = await supabase.from("estudante_documents").update(payload).eq("id", id);
    if (error) return showT("Erro ao atualizar: " + error.message);
    setEditingDocId(null);
    loadDocuments();
    showT("Atualizado! ✅");
  };

  const deleteDoc = async (id) => {
    if (!window.confirm("Excluir este documento?")) return;
    const { error } = await supabase.from("estudante_documents").delete().eq("id", id);
    if (error) return showT("Erro ao excluir: " + error.message);
    addLog?.("Excluiu documento estudante id " + id);
    setEditingDocId(null);
    loadDocuments();
    showT("Excluído! 🗑️");
  };

  const updateQuestion = async (id, field, value) => {
    let payload = {};
    if (field === "question_text") payload.question_text = value;
    if (field === "options") payload.options = value;
    if (field === "dimension") payload.dimension = value;
    const { error } = await supabase.from("diagnostico_questions").update(payload).eq("id", id);
    if (error) return showT("Erro ao atualizar pergunta: " + error.message);
    setEditingQuestionId(null);
    loadQuestions();
    showT("Pergunta atualizada! ✅");
  };

  const levels = [...new Set(resultsWithEstudante.map((r) => r.level).filter(Boolean))].sort();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {["dados", "documentos", "diagnostico"].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setSubTab(t)}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              background: subTab === t ? T.tabActiveBg : T.statBg,
              border: `1px solid ${subTab === t ? T.statBorder : T.cardBorder}`,
              color: subTab === t ? T.accent : T.textFaint,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "'Plus Jakarta Sans'",
            }}
          >
            {t === "dados" && "👥 Dados dos estudantes"}
            {t === "documentos" && "📄 Documentos"}
            {t === "diagnostico" && "📊 Diagnóstico"}
          </button>
        ))}
      </div>

      {loading && <p style={{ fontSize: 12, color: T.textFaint }}>Carregando...</p>}

      {subTab === "dados" && !loading && (
        <>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              placeholder="Buscar por nome, email ou telefone..."
              value={searchEstudantes}
              onChange={(e) => setSearchEstudantes(e.target.value)}
              style={{ ...sInp, minWidth: 240, maxWidth: 320 }}
            />
            {(can("leads_export") || can("estudantes_edit") || can("estudantes_view")) && (
              <button type="button" onClick={exportEstudantesCSV} style={{ padding: "8px 14px", borderRadius: 8, background: T.accent + "22", border: `1px solid ${T.accent}44`, color: T.accent, fontSize: 12, fontWeight: 600 }}>
                Exportar CSV
              </button>
            )}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'Plus Jakarta Sans'" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${T.cardBorder}` }}>
                  <th style={{ textAlign: "left", padding: "8px 10px", color: T.textMuted, fontWeight: 700 }}>Nome</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", color: T.textMuted, fontWeight: 700 }}>Email</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", color: T.textMuted, fontWeight: 700 }}>Telefone</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", color: T.textMuted, fontWeight: 700 }}>Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {filteredEstudantes.map((e) => (
                  <tr key={e.id} style={{ borderBottom: `1px solid ${T.cardBorder}` }}>
                    <td style={{ padding: "8px 10px", color: T.text }}>{e.name || "—"}</td>
                    <td style={{ padding: "8px 10px", color: T.textMuted }}>{e.email || "—"}</td>
                    <td style={{ padding: "8px 10px", color: T.textMuted }}>{e.phone || "—"}</td>
                    <td style={{ padding: "8px 10px", color: T.textFaint, fontSize: 11 }}>{e.created_at ? new Date(e.created_at).toLocaleString("pt-BR") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredEstudantes.length === 0 && <p style={{ fontSize: 12, color: T.textFaint }}>Nenhum estudante encontrado.</p>}
        </>
      )}

      {subTab === "documentos" && !loading && (
        <>
          {canEditDocs && (
            <>
              {!showNewDoc ? (
                <button type="button" onClick={() => setShowNewDoc(true)} style={{ alignSelf: "flex-start", padding: "8px 14px", borderRadius: 10, background: T.accent + "15", border: `2px dashed ${T.accent}44`, color: T.accent, fontSize: 13, fontWeight: 700 }}>
                  ＋ Novo documento
                </button>
              ) : (
                <div style={{ background: T.statBg, border: `2px solid ${T.accent}44`, borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: T.accent }}>＋ Novo documento</h3>
                    <button type="button" onClick={() => setShowNewDoc(false)} style={{ background: "none", color: T.textFaint, fontSize: 14 }}>✕</button>
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: T.textFaint }}>Título</label>
                    <input value={newDoc.title} onChange={(e) => setNewDoc((p) => ({ ...p, title: e.target.value }))} style={sInp} placeholder="Ex: Checklist de estágio" />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: T.textFaint }}>Descrição</label>
                    <textarea value={newDoc.description} onChange={(e) => setNewDoc((p) => ({ ...p, description: e.target.value }))} style={{ ...sInp, minHeight: 50 }} placeholder="Opcional" />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: T.textFaint }}>Arquivo (upload ou URL)</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => e.target.files?.[0] && handleUploadDoc(e.target.files[0])} style={{ fontSize: 11 }} disabled={uploadingFile} />
                      {uploadingFile && <span style={{ fontSize: 11, color: T.textFaint }}>Enviando...</span>}
                    </div>
                    <input value={newDoc.file_url} onChange={(e) => setNewDoc((p) => ({ ...p, file_url: e.target.value }))} style={{ ...sInp, marginTop: 4 }} placeholder="URL do arquivo (ou use o upload acima)" />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 10, color: T.textFaint }}>Ordem</label>
                      <input type="number" value={newDoc.sort_order} onChange={(e) => setNewDoc((p) => ({ ...p, sort_order: Number(e.target.value) || 0 }))} style={sInp} />
                    </div>
                    <div style={{ flex: 1, display: "flex", alignItems: "flex-end" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.text }}>
                        <input type="checkbox" checked={newDoc.active} onChange={(e) => setNewDoc((p) => ({ ...p, active: e.target.checked }))} />
                        Ativo
                      </label>
                    </div>
                  </div>
                  <button type="button" onClick={saveDoc} style={{ padding: "10px", borderRadius: 10, background: "linear-gradient(135deg, #349980, #7DE2C7)", color: "#060a09", fontSize: 13, fontWeight: 700 }}>
                    Criar documento
                  </button>
                </div>
              )}
            </>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {documents.map((d) => (
              <div key={d.id} style={{ background: T.statBg, border: `1px solid ${T.statBorder}`, borderRadius: 10, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{d.title}</h4>
                    {d.description && <p style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>{d.description}</p>}
                    <p style={{ fontSize: 11, color: T.textFaint, marginTop: 4 }}>Ordem: {d.sort_order} · {d.active ? "Ativo" : "Inativo"}</p>
                  </div>
                  {canEditDocs && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button type="button" onClick={() => setEditingDocId(editingDocId === d.id ? null : d.id)} style={{ padding: "6px 10px", borderRadius: 8, background: T.tabBg, border: `1px solid ${T.tabBorder}`, color: T.textMuted, fontSize: 11, fontWeight: 600 }}>
                        {editingDocId === d.id ? "Fechar" : "Editar"}
                      </button>
                      <button type="button" onClick={() => deleteDoc(d.id)} style={{ padding: "6px 10px", borderRadius: 8, background: T.dangerBg, border: `1px solid ${T.dangerBrd}`, color: T.dangerTxt, fontSize: 11, fontWeight: 600 }}>
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
                {canEditDocs && editingDocId === d.id && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.cardBorder}`, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div><label style={{ fontSize: 10, color: T.textFaint }}>Título</label><input defaultValue={d.title} onBlur={(e) => updateDoc(d.id, "title", e.target.value)} style={sInp} /></div>
                    <div><label style={{ fontSize: 10, color: T.textFaint }}>Descrição</label><input defaultValue={d.description || ""} onBlur={(e) => updateDoc(d.id, "description", e.target.value)} style={sInp} /></div>
                    <div><label style={{ fontSize: 10, color: T.textFaint }}>URL do arquivo</label><input defaultValue={d.file_url || ""} onBlur={(e) => updateDoc(d.id, "file_url", e.target.value)} style={sInp} /></div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div><label style={{ fontSize: 10, color: T.textFaint }}>Ordem</label><input type="number" defaultValue={d.sort_order} onBlur={(e) => updateDoc(d.id, "sort_order", e.target.value)} style={sInp} /></div>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.text }}><input type="checkbox" defaultChecked={d.active} onChange={(e) => updateDoc(d.id, "active", e.target.checked)} />Ativo</label>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          {documents.length === 0 && <p style={{ fontSize: 12, color: T.textFaint }}>Nenhum documento cadastrado.</p>}
        </>
      )}

      {subTab === "diagnostico" && !loading && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <input placeholder="Buscar por nome ou email..." value={searchResults} onChange={(e) => setSearchResults(e.target.value)} style={{ ...sInp, minWidth: 200 }} />
            <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} style={sInp}>
              <option value="">Todos os níveis</option>
              {levels.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            {(can("leads_export") || can("diagnostico_edit") || can("estudantes_view")) && (
              <button type="button" onClick={exportResultsCSV} style={{ padding: "8px 14px", borderRadius: 8, background: T.accent + "22", border: `1px solid ${T.accent}44`, color: T.accent, fontSize: 12, fontWeight: 600 }}>
                Exportar resultados CSV
              </button>
            )}
          </div>

          {canEditDiagnostico && (
            <section style={{ background: T.statBg, border: `1px solid ${T.statBorder}`, borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: T.textMuted, marginBottom: 10 }}>Editar perguntas do diagnóstico</h3>
              {questions.map((q) => (
                <div key={q.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${T.cardBorder}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <p style={{ fontSize: 12, color: T.text, fontWeight: 600 }}>P{q.question_number} · {q.dimension}</p>
                    <button type="button" onClick={() => setEditingQuestionId(editingQuestionId === q.id ? null : q.id)} style={{ padding: "4px 10px", borderRadius: 6, background: T.tabBg, border: `1px solid ${T.tabBorder}`, color: T.textMuted, fontSize: 11 }}>
                      {editingQuestionId === q.id ? "Fechar" : "Editar"}
                    </button>
                  </div>
                  <p style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>{q.question_text}</p>
                  {editingQuestionId === q.id && (
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                      <div><label style={{ fontSize: 10, color: T.textFaint }}>Texto da pergunta</label><textarea defaultValue={q.question_text} onBlur={(e) => updateQuestion(q.id, "question_text", e.target.value)} style={{ ...sInp, minHeight: 60 }} /></div>
                      <div><label style={{ fontSize: 10, color: T.textFaint }}>Dimensão</label><select defaultValue={q.dimension} onBlur={(e) => updateQuestion(q.id, "dimension", e.target.value)} style={sInp}>{DIMENSIONS.map((dim) => <option key={dim} value={dim}>{dim}</option>)}</select></div>
                      <div><label style={{ fontSize: 10, color: T.textFaint }}>Opções (JSON: [{"text":"...","points":0}, ...])</label><textarea defaultValue={JSON.stringify(q.options || [], null, 2)} onBlur={(e) => { try { updateQuestion(q.id, "options", JSON.parse(e.target.value)); } catch (_) { showT("JSON inválido"); } }} style={{ ...sInp, minHeight: 80, fontFamily: "monospace", fontSize: 11 }} /></div>
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}

          <section style={{ background: T.statBg, border: `1px solid ${T.statBorder}`, borderRadius: 10, padding: 12 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: T.textMuted, marginBottom: 10 }}>Resultados do diagnóstico</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'Plus Jakarta Sans'" }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${T.cardBorder}` }}>
                    <th style={{ textAlign: "left", padding: "8px 10px", color: T.textMuted, fontWeight: 700 }}>Estudante</th>
                    <th style={{ textAlign: "left", padding: "8px 10px", color: T.textMuted, fontWeight: 700 }}>Email</th>
                    <th style={{ textAlign: "left", padding: "8px 10px", color: T.textMuted, fontWeight: 700 }}>Data</th>
                    <th style={{ textAlign: "right", padding: "8px 10px", color: T.textMuted, fontWeight: 700 }}>Nota</th>
                    <th style={{ textAlign: "left", padding: "8px 10px", color: T.textMuted, fontWeight: 700 }}>Nível</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map((r) => (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${T.cardBorder}` }}>
                      <td style={{ padding: "8px 10px", color: T.text }}>{r.estudante?.name || "—"}</td>
                      <td style={{ padding: "8px 10px", color: T.textMuted }}>{r.estudante?.email || "—"}</td>
                      <td style={{ padding: "8px 10px", color: T.textFaint, fontSize: 11 }}>{r.created_at ? new Date(r.created_at).toLocaleString("pt-BR") : "—"}</td>
                      <td style={{ padding: "8px 10px", color: T.accent, fontWeight: 700, textAlign: "right" }}>{r.total_score}</td>
                      <td style={{ padding: "8px 10px", color: T.text }}>{r.level || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredResults.length === 0 && <p style={{ fontSize: 12, color: T.textFaint }}>Nenhum resultado encontrado.</p>}
          </section>
        </>
      )}
    </div>
  );
}
