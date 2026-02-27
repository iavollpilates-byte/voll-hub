import { useState, useMemo } from "react";
import { getUnlockLabel } from "../../utils";

export default function AdminMaterials({
  materials, config, T, can, showT, animateIn,
  editId, setEditId, showNewForm, setShowNewForm, newMat, setNewMat,
  addMat, updMat, deleteMat, copyLink, linkCopied, confirmDeleteId, setConfirmDeleteId,
  dlCountByMat, UnlockEditor, setShowIconPicker, sInp,
}) {
  const [matFilterCategory, setMatFilterCategory] = useState("");
  const [matFilterStatus, setMatFilterStatus] = useState("all");
  const [matSortBy, setMatSortBy] = useState("downloads"); // "downloads" | "name" | "date" | "category"
  const [matSearchQuery, setMatSearchQuery] = useState("");

  const materialsWithDl = useMemo(() =>
    materials.map(m => ({ ...m, dlCount: dlCountByMat[m.id] || 0 })),
    [materials, dlCountByMat]
  );

  const rankingList = useMemo(() =>
    [...materialsWithDl].sort((a, b) => b.dlCount - a.dlCount),
    [materialsWithDl]
  );

  const categories = useMemo(() =>
    [...new Set(materials.map(m => m.category).filter(Boolean))].sort(),
    [materials]
  );

  const filteredAndSortedMaterials = useMemo(() => {
    let list = materialsWithDl.filter(m => {
      if (matFilterCategory && m.category !== matFilterCategory) return false;
      if (matFilterStatus === "active" && !m.active) return false;
      if (matFilterStatus === "inactive" && m.active) return false;
      const q = (matSearchQuery || "").trim().toLowerCase();
      if (q && !(m.title || "").toLowerCase().includes(q) && !(m.description || "").toLowerCase().includes(q)) return false;
      return true;
    });
    if (matSortBy === "downloads") list.sort((a, b) => b.dlCount - a.dlCount);
    else if (matSortBy === "name") list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    else if (matSortBy === "date") list.sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || 0) - (a.createdAt || 0));
    else if (matSortBy === "category") list.sort((a, b) => (a.category || "").localeCompare(b.category || "") || (a.title || "").localeCompare(b.title || ""));
    return list;
  }, [materialsWithDl, matFilterCategory, matFilterStatus, matSortBy, matSearchQuery]);

  const rankByDownload = useMemo(() => {
    const map = {};
    rankingList.forEach((m, i) => { map[m.id] = i + 1; });
    return map;
  }, [rankingList]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
      {can("materials_edit") && (!showNewForm ? (
        <button onClick={() => setShowNewForm(true)} style={{ alignSelf: "flex-start", padding: "8px 14px", borderRadius: 10, background: T.accent + "15", border: `2px dashed ${T.accent}44`, color: T.accent, fontSize: 13, fontWeight: 700 }}>＋ Novo Material</button>
      ) : (
        <div style={{ background: T.statBg, border: `2px solid ${T.accent}44`, borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}><h3 style={{ fontSize: 14, fontWeight: 700, color: T.accent }}>＋ Novo Material</h3><button onClick={() => setShowNewForm(false)} style={{ background: "none", color: T.textFaint, fontSize: 14 }}>✕</button></div>
          <div style={{ display: "flex", gap: 6 }}><button onClick={() => setShowIconPicker("new")} style={{ width: 40, height: 40, borderRadius: 10, background: T.inputBg, border: `1px solid ${T.inputBorder}`, fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{newMat.icon}</button><div style={{ flex: 1 }}><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Título</label><input value={newMat.title} onChange={(e) => setNewMat((p) => ({ ...p, title: e.target.value }))} style={sInp} placeholder="Nome" /></div></div>
          <div><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Descrição</label><textarea value={newMat.description} onChange={(e) => setNewMat((p) => ({ ...p, description: e.target.value }))} style={{ ...sInp, minHeight: 40, resize: "vertical" }} placeholder="Breve descrição" /></div>
          <div><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>🔗 Link do material (Canva, Drive, PDF, etc)</label><input value={newMat.downloadUrl || ""} onChange={(e) => setNewMat((p) => ({ ...p, downloadUrl: e.target.value }))} style={sInp} placeholder="https://www.canva.com/..." /></div>
          <div style={{ display: "flex", gap: 6 }}><div style={{ flex: 1 }}><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Categoria</label><input value={newMat.category} onChange={(e) => setNewMat((p) => ({ ...p, category: e.target.value }))} style={sInp} placeholder="Ex: Marketing" /></div><div style={{ flex: 1 }}><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Data</label><input value={newMat.date} onChange={(e) => setNewMat((p) => ({ ...p, date: e.target.value }))} style={sInp} placeholder="Auto" /></div></div>
          <UnlockEditor mat={newMat} onChange={(k, v) => setNewMat((p) => ({ ...p, [k]: v }))} />
          <button onClick={addMat} style={{ width: "100%", padding: "10px", borderRadius: 10, background: "linear-gradient(135deg, #349980, #7DE2C7)", color: "#060a09", fontSize: 13, fontWeight: 700, marginTop: 2 }}>✅ Criar material</button>
        </div>
      ))}

      {/* Ranking — materiais mais baixados */}
      <section style={{ background: T.statBg, border: `1px solid ${T.statBorder}`, borderRadius: 10, padding: 12 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: T.textMuted, marginBottom: 10, fontFamily: "'Plus Jakarta Sans'" }}>Ranking — materiais mais baixados</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'Plus Jakarta Sans'" }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${T.cardBorder}` }}>
                <th style={{ textAlign: "left", padding: "6px 8px", color: T.textMuted, fontWeight: 700, fontSize: 10 }}>#</th>
                <th style={{ textAlign: "left", padding: "6px 8px", color: T.textMuted, fontWeight: 700, fontSize: 10 }}>Ícone</th>
                <th style={{ textAlign: "left", padding: "6px 8px", color: T.textMuted, fontWeight: 700, fontSize: 10 }}>Título</th>
                <th style={{ textAlign: "left", padding: "6px 8px", color: T.textMuted, fontWeight: 700, fontSize: 10 }}>Categoria</th>
                <th style={{ textAlign: "right", padding: "6px 8px", color: T.textMuted, fontWeight: 700, fontSize: 10 }}>Downloads</th>
                <th style={{ padding: "6px 8px", width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {rankingList.slice(0, 15).map((m, i) => (
                <tr key={m.id} style={{ borderBottom: `1px solid ${T.cardBorder}` }}>
                  <td style={{ padding: "6px 8px", color: T.textFaint, fontWeight: 700 }}>{i + 1}</td>
                  <td style={{ padding: "6px 8px", fontSize: 16 }}>{m.icon}</td>
                  <td style={{ padding: "6px 8px", color: T.text, fontWeight: 600 }}>{m.title}</td>
                  <td style={{ padding: "6px 8px", color: T.textMuted, fontSize: 11 }}>{m.category || "—"}</td>
                  <td style={{ padding: "6px 8px", color: T.accent, fontWeight: 700, textAlign: "right" }}>{m.dlCount}</td>
                  <td style={{ padding: "6px 8px" }}>
                    <button onClick={() => copyLink(m.id)} style={{ padding: "3px 8px", borderRadius: 6, background: T.tabBg, border: `1px solid ${T.tabBorder}`, color: T.textMuted, fontSize: 10, fontWeight: 600 }}>📋 Link</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Filtros e ordenação */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <input
          placeholder="🔍 Buscar por título ou descrição..."
          value={matSearchQuery}
          onChange={(e) => setMatSearchQuery(e.target.value)}
          style={{ ...sInp, minWidth: 180, flex: "1 1 180px" }}
        />
        <select value={matFilterCategory} onChange={(e) => setMatFilterCategory(e.target.value)} style={{ ...sInp, minWidth: 120 }}>
          <option value="">Todas as categorias</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={matFilterStatus} onChange={(e) => setMatFilterStatus(e.target.value)} style={{ ...sInp, minWidth: 100 }}>
          <option value="all">Todos</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
        <select value={matSortBy} onChange={(e) => setMatSortBy(e.target.value)} style={{ ...sInp, minWidth: 140 }}>
          <option value="downloads">Mais baixados</option>
          <option value="name">Nome A–Z</option>
          <option value="date">Data (mais recente)</option>
          <option value="category">Categoria</option>
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8 }}>
        {filteredAndSortedMaterials.map((m, i) => {
          const ul = getUnlockLabel(m);
          return (
            <div key={m.id} style={{ background: T.statBg, border: `1px solid ${T.statBorder}`, borderRadius: 10, padding: 10, display: "flex", flexDirection: "column", gap: 6, borderLeft: `3px solid ${m.active ? T.accent : T.textFaint}`, opacity: animateIn ? 1 : 0, transform: animateIn ? "translateY(0)" : "translateY(15px)", transition: `all 0.3s ease ${i * 0.05}s` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>{m.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}><h3 style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{m.title}</h3><p style={{ fontSize: 12, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginTop: 2 }}>{m.category} · <span style={{ color: ul.color }}>{ul.icon} {ul.label}</span></p></div>
                {can("materials_edit") && <button onClick={() => setEditId(editId === m.id ? null : m.id)} style={{ padding: "5px 10px", borderRadius: 7, background: T.tabBg, border: `1px solid ${T.tabBorder}`, color: T.textMuted, fontSize: 11, fontWeight: 600 }}>{editId === m.id ? "Fechar" : "✏️"}</button>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: T.inputBg, borderRadius: 9, padding: "6px 10px", border: `1px solid ${T.inputBorder}` }}>
                <span style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{config.baseUrl}/?m={m.id}</span>
                <button onClick={() => copyLink(m.id)} style={{ padding: "4px 10px", borderRadius: 6, background: linkCopied === m.id ? T.successBg : T.tabBg, border: `1px solid ${linkCopied === m.id ? T.accent + "44" : T.tabBorder}`, color: linkCopied === m.id ? T.accent : T.textMuted, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", transition: "all 0.2s" }}>{linkCopied === m.id ? "✅ Copiado!" : "📋 Copiar link"}</button>
              </div>
              {can("materials_edit") && editId === m.id && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 10, borderTop: `1px solid ${T.cardBorder}` }}>
                  <div style={{ display: "flex", gap: 8 }}><button onClick={() => setShowIconPicker(m.id)} style={{ width: 48, height: 48, borderRadius: 12, background: T.inputBg, border: `1px solid ${T.inputBorder}`, fontSize: 24, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{m.icon}</button><div style={{ flex: 1 }}><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Título</label><input defaultValue={m.title} onBlur={(e) => updMat(m.id, "title", e.target.value)} key={"mt-" + m.id} style={sInp} /></div></div>
                  <div><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Descrição</label><textarea defaultValue={m.description} onBlur={(e) => updMat(m.id, "description", e.target.value)} key={"md-" + m.id} style={{ ...sInp, minHeight: 45, resize: "vertical" }} /></div>
                  <div><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>🔗 Link do material</label><input defaultValue={m.downloadUrl || ""} onBlur={(e) => updMat(m.id, "downloadUrl", e.target.value)} key={"mdu-" + m.id} style={sInp} placeholder="https://www.canva.com/..." /></div>
                  <div style={{ background: T.inputBg, borderRadius: 8, padding: 8, border: `1px solid ${T.inputBorder}` }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: T.gold, marginBottom: 6 }}>📸 Instagram do post</p>
                    <div><label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Link do post</label><input defaultValue={m.instaPostUrl || ""} onBlur={(e) => updMat(m.id, "instaPostUrl", e.target.value)} key={"mip-" + m.id} style={sInp} placeholder="https://instagram.com/p/..." /></div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <div style={{ flex: 1 }}><label style={{ fontSize: 10, color: T.textFaint }}>👁 Views</label><input type="number" defaultValue={m.instaViews || 0} onBlur={(e) => updMat(m.id, "instaViews", parseInt(e.target.value) || 0)} key={"miv-" + m.id} style={sInp} /></div>
                      <div style={{ flex: 1 }}><label style={{ fontSize: 10, color: T.textFaint }}>❤️ Curtidas</label><input type="number" defaultValue={m.instaLikes || 0} onBlur={(e) => updMat(m.id, "instaLikes", parseInt(e.target.value) || 0)} key={"mil-" + m.id} style={sInp} /></div>
                      <div style={{ flex: 1 }}><label style={{ fontSize: 10, color: T.textFaint }}>💬 Coments</label><input type="number" defaultValue={m.instaComments || 0} onBlur={(e) => updMat(m.id, "instaComments", parseInt(e.target.value) || 0)} key={"mic-" + m.id} style={sInp} /></div>
                      <div style={{ flex: 1 }}><label style={{ fontSize: 10, color: T.textFaint }}>🔖 Salvam.</label><input type="number" defaultValue={m.instaSaves || 0} onBlur={(e) => updMat(m.id, "instaSaves", parseInt(e.target.value) || 0)} key={"mis-" + m.id} style={sInp} /></div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}><div style={{ flex: 1 }}><label style={{ fontSize: 10, color: T.textFaint }}>Categoria</label><input defaultValue={m.category} onBlur={(e) => updMat(m.id, "category", e.target.value)} key={"mc-" + m.id} style={sInp} /></div><div style={{ flex: 1 }}><label style={{ fontSize: 10, color: T.textFaint }}>Data</label><input defaultValue={m.date} onBlur={(e) => updMat(m.id, "date", e.target.value)} key={"mda-" + m.id} style={sInp} /></div></div>
                  <UnlockEditor mat={m} onChange={(k, v) => updMat(m.id, k, v)} />
                  {confirmDeleteId === m.id ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "8px 10px", borderRadius: 8, background: T.dangerBg, border: `1px solid ${T.dangerBrd}` }}>
                      <span style={{ fontSize: 12, color: T.dangerTxt, flex: 1, fontFamily: "'Plus Jakarta Sans'" }}>Excluir?</span>
                      <button onClick={() => deleteMat(m.id)} style={{ padding: "5px 12px", borderRadius: 6, background: "#e84444", color: "#fff", fontSize: 12, fontWeight: 700 }}>Sim</button>
                      <button onClick={() => setConfirmDeleteId(null)} style={{ padding: "5px 12px", borderRadius: 6, background: T.inputBg, border: `1px solid ${T.inputBorder}`, color: T.textMuted, fontSize: 12, fontWeight: 600 }}>Não</button>
                    </div>
                  ) : (<button onClick={() => setConfirmDeleteId(m.id)} style={{ width: "100%", padding: "8px", borderRadius: 8, background: T.dangerBg, border: `1px solid ${T.dangerBrd}`, color: T.dangerTxt, fontSize: 12, fontWeight: 600 }}>🗑️ Excluir</button>)}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {can("materials_edit") && <button onClick={() => updMat(m.id, "active", !m.active)} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: m.active ? T.successBg : T.dangerBg, color: m.active ? T.accent : T.gold, border: `1px solid ${m.active ? T.accent + "33" : T.gold + "33"}` }}>{m.active ? "✓ Ativo" : "Inativo"}</button>}
                {(matSortBy === "downloads" && rankByDownload[m.id]) ? <span style={{ fontSize: 11, fontWeight: 700, color: T.accent, marginRight: 4 }}>#{rankByDownload[m.id]}</span> : null}
                <span style={{ fontSize: 12, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginLeft: "auto" }}>📥 {dlCountByMat[m.id] || 0}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
