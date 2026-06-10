import { getCSS } from "../utils";

// Linktree dedicado para lançamento (rota /lancamento).
// Reaproveita o visual do linktree principal, mas com header e links próprios.
export default function LaunchTree({ T, theme, animateIn, isOffline, header, links, onLinkClick, onSecretTap }) {
  const activeLinks = (links || []).filter((l) => l.active);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 16px 40px", fontFamily: "'Outfit'", background: T.bg, position: "relative", overflow: "hidden" }}>
      <style>{getCSS(T)}</style>
      {isOffline && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, padding: "10px 16px", background: T.gold + "22", borderBottom: `1px solid ${T.gold}44`, color: T.text, fontSize: 13, fontFamily: "'Plus Jakarta Sans'", textAlign: "center", zIndex: 50 }} role="status">Você está offline</div>
      )}
      <div style={{ position: "fixed", top: "-25%", right: "-15%", width: 450, height: 450, borderRadius: "50%", background: `radial-gradient(circle, rgba(125,226,199,${T.glowOp}) 0%, transparent 70%)`, animation: "pulse 5s ease-in-out infinite", pointerEvents: "none" }} />
      <div style={{ width: "100%", maxWidth: 480, position: "relative", zIndex: 1, paddingTop: isOffline ? 44 : 0 }}>
        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "30px 0 20px", opacity: animateIn ? 1 : 0, transform: animateIn ? "translateY(0)" : "translateY(20px)", transition: "all 0.5s ease" }}>
          <div onClick={onSecretTap} style={{ cursor: onSecretTap ? "pointer" : "default" }}>
            {header.photoUrl ? (
              <img src={header.photoUrl} alt="" style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover", border: `3px solid ${T.accent}` }} />
            ) : (
              <div style={{ width: 100, height: 100, borderRadius: "50%", background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>🚀</div>
            )}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text, marginTop: 14, textAlign: "center" }}>{header.name}</h1>
          {header.line1 && <p style={{ fontSize: 13, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'", marginTop: 4, textAlign: "center", lineHeight: 1.5 }}>{header.line1}</p>}
          {header.line2 && <p style={{ fontSize: 13, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'", textAlign: "center", lineHeight: 1.5 }}>{header.line2}</p>}
        </div>

        {/* Link Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {activeLinks.map((link, i) => {
            const isHL = link.highlight;
            const hasImg = !!link.imageUrl;
            const isHero = isHL && i === 0;
            const grad = isHL ? (link.color || "linear-gradient(135deg, #1a3a30, #0d2920)") : "";
            return (
              <div key={link.id} onClick={() => onLinkClick(link)} className={`bio-card${isHero ? " bio-hero" : ""}`} style={{
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
          {activeLinks.length === 0 && (
            <div style={{ textAlign: "center", padding: "32px 20px", background: T.cardBg, borderRadius: 16, border: `1px solid ${T.cardBorder}` }}>
              <p style={{ fontSize: 28, marginBottom: 10 }}>🚀</p>
              <p style={{ fontSize: 14, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'" }}>Nenhum link publicado ainda.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
