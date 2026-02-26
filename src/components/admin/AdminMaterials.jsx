import { getUnlockLabel } from "../../utils";

export default function AdminMaterials({
  materials, config, T, can, showT, animateIn,
  editId, setEditId, showNewForm, setShowNewForm, newMat, setNewMat,
  addMat, updMat, deleteMat, copyLink, linkCopied, confirmDeleteId, setConfirmDeleteId,
  dlCountByMat, UnlockEditor, setShowIconPicker, sInp,
}) {
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8 }}>
        {materials.map((m, i) => {
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
                <span style={{ fontSize: 12, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginLeft: "auto" }}>📥 {dlCountByMat[m.id] || 0}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
