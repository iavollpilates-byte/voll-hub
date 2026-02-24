export const REFLECTION_STYLES = [
  { name: "Minimalista", emoji: "✨", previewBg: "#F2E6DE", previewColor: "#2A2A2A" },
  { name: "Aquarela", emoji: "🎨", previewBg: "linear-gradient(135deg,#F9F2ED,#f0ddd0)", previewColor: "#8F5C5C" },
  { name: "Post-it", emoji: "📌", previewBg: "#D0B084", previewColor: "#3E2B1D" },
  { name: "Dark", emoji: "🌙", previewBg: "linear-gradient(135deg,#1a1a2e,#16213e)", previewColor: "#fff" },
];

export function wrapCanvasText(ctx, text, maxW) {
  const words = text.split(" "); const lines = []; let line = "";
  words.forEach(w => { const t = line + (line ? " " : "") + w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
  if (line) lines.push(line); return lines;
}

export function drawReflectionCanvas(styleIndex, quote, handle) {
  const W = 1080, H = 1350;
  const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const q = quote || "";

  if (styleIndex === 0) {
    ctx.fillStyle = "#F2E6DE"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#2A2A2A"; ctx.font = `600 ${q.length > 80 ? 64 : 78}px Georgia, serif`; ctx.textAlign = "center";
    const lines = wrapCanvasText(ctx, q, W - 180);
    const totalH = lines.length * (q.length > 80 ? 82 : 98);
    const startY = (H - totalH) / 2;
    lines.forEach((l, i) => ctx.fillText(l, W/2, startY + i * (q.length > 80 ? 82 : 98)));
    ctx.font = "400 30px Helvetica, sans-serif"; ctx.fillStyle = "#2A2A2A99";
    ctx.fillText("\u2014 " + handle, W/2, startY + totalH + 50);
  }
  else if (styleIndex === 1) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#F9F2ED"); g.addColorStop(0.3, "#f0ddd0"); g.addColorStop(0.6, "#e8cfc0"); g.addColorStop(1, "#f5e6da");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.12;
    ctx.beginPath(); ctx.arc(W*0.2, H*0.2, 300, 0, Math.PI*2); ctx.fillStyle = "#f4c2c2"; ctx.fill();
    ctx.beginPath(); ctx.arc(W*0.8, H*0.8, 280, 0, Math.PI*2); ctx.fillStyle = "#c2d4f4"; ctx.fill();
    ctx.beginPath(); ctx.arc(W*0.5, H*0.5, 250, 0, Math.PI*2); ctx.fillStyle = "#d4c2f4"; ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#8F5C5C"; ctx.font = `500 ${q.length > 80 ? 62 : 76}px Georgia, serif`; ctx.textAlign = "center";
    const lines = wrapCanvasText(ctx, q, W - 180);
    const lh = q.length > 80 ? 80 : 96;
    const totalH = lines.length * lh;
    const startY = (H - totalH) / 2;
    lines.forEach((l, i) => ctx.fillText(l, W/2, startY + i * lh));
    ctx.font = "400 28px Helvetica, sans-serif"; ctx.fillStyle = "#8F5C5C88";
    ctx.fillText("\u2014 " + handle, W/2, startY + totalH + 50);
  }
  else if (styleIndex === 2) {
    ctx.fillStyle = "#D0B084"; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.15;
    for (let x = 0; x < W; x += 20) for (let y = 0; y < H; y += 20) {
      ctx.beginPath(); ctx.arc(x + Math.random()*8, y + Math.random()*8, 2, 0, Math.PI*2);
      ctx.fillStyle = Math.random() > 0.5 ? "#bc9868" : "#c4a070"; ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(W/2, H/2); ctx.rotate(-0.035);
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(-380+8, -420+12, 760, 840);
    ctx.fillStyle = "#FDF289";
    ctx.fillRect(-380, -420, 760, 840);
    ctx.fillStyle = "#eedc70";
    ctx.beginPath(); ctx.moveTo(380, 420); ctx.lineTo(380, 380); ctx.lineTo(340, 420); ctx.closePath(); ctx.fill();
    const pg = ctx.createRadialGradient(-10, -420-5, 2, 0, -420, 18);
    pg.addColorStop(0, "#ff6b6b"); pg.addColorStop(1, "#c92a2a");
    ctx.beginPath(); ctx.arc(0, -420, 18, 0, Math.PI*2); ctx.fillStyle = pg; ctx.fill();
    ctx.fillStyle = "#999"; ctx.fillRect(-2, -420+16, 4, 10);
    ctx.fillStyle = "#3E2B1D"; ctx.font = `600 ${q.length > 60 ? 48 : 58}px 'Comic Sans MS', cursive`; ctx.textAlign = "center";
    const lines = wrapCanvasText(ctx, q, 680);
    const lh = q.length > 60 ? 64 : 76;
    const totalH = lines.length * lh;
    const startY = -totalH/2 + 20;
    lines.forEach((l, i) => ctx.fillText(l, 0, startY + i * lh));
    ctx.font = "400 26px Helvetica, sans-serif"; ctx.fillStyle = "#3E2B1D88";
    ctx.fillText("\u2014 " + handle, 0, startY + totalH + 40);
    ctx.restore();
  }
  else {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#0a1f1a"); g.addColorStop(0.5, "#0d2920"); g.addColorStop(1, "#061510");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.07;
    ctx.beginPath(); ctx.arc(W*0.85, H*0.15, 300, 0, Math.PI*2); ctx.fillStyle = "#7DE2C7"; ctx.fill();
    ctx.beginPath(); ctx.arc(W*0.1, H*0.85, 250, 0, Math.PI*2); ctx.fillStyle = "#FFD863"; ctx.fill();
    ctx.globalAlpha = 1;
    const lg = ctx.createLinearGradient(80, 0, W-80, 0);
    lg.addColorStop(0, "#349980"); lg.addColorStop(1, "#7DE2C7");
    ctx.fillStyle = lg; ctx.fillRect(80, 80, W-160, 4);
    ctx.fillStyle = "#FFD863"; ctx.font = "600 28px Helvetica, sans-serif"; ctx.textAlign = "left";
    ctx.fillText("\u{1F4AD}  REFLEX\u00C3O DO DIA", 80, 150);
    ctx.fillStyle = "#7DE2C744"; ctx.font = "800 180px Georgia, serif";
    ctx.fillText("\u201C", 50, 320);
    ctx.fillStyle = "#ffffff"; ctx.font = `700 ${q.length > 80 ? 48 : 56}px Helvetica, sans-serif`; ctx.textAlign = "left";
    const lines = wrapCanvasText(ctx, q, W - 200);
    const lh = q.length > 80 ? 64 : 74;
    const totalH = lines.length * lh;
    const startY = Math.max(380, (H - totalH) / 2);
    lines.forEach((l, i) => ctx.fillText(l, 100, startY + i * lh));
    ctx.fillStyle = "#7DE2C7"; ctx.font = "600 30px Helvetica, sans-serif";
    ctx.fillText("\u2014 " + handle, 100, startY + totalH + 50);
  }
  return canvas;
}

export function getPreviewDataUrl(styleIndex, quote, handle) {
  try {
    const c = drawReflectionCanvas(styleIndex, quote, handle);
    return c.toDataURL("image/jpeg", 0.5);
  } catch(_) { return ""; }
}
