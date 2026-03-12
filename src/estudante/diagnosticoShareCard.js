export function drawDiagnosticoShareCard(result) {
  const W = 1080
  const H = 1350
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const dimOrder = ['Presença Digital', 'Posicionamento', 'Networking', 'Comunicação', 'Mentalidade']
  const dims = result.dimensionScores || {}

  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#0d1f1a')
  bg.addColorStop(0.5, '#1a2e28')
  bg.addColorStop(1, '#0d1f1a')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  ctx.fillRect(40, 40, W - 80, H - 80)

  ctx.textAlign = 'center'
  ctx.fillStyle = result.color || '#7dd3b0'
  ctx.font = 'bold 120px "Plus Jakarta Sans", sans-serif'
  ctx.fillText(`${result.totalScore}/100`, W / 2, 320)
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.font = 'bold 42px "Plus Jakarta Sans", sans-serif'
  ctx.fillText(`Seu nível: ${result.level}`, W / 2, 420)

  const barY = 520
  const barH = 32
  const barMaxW = 400
  const gap = 48
  dimOrder.forEach((name, i) => {
    const score = dims[name] != null ? dims[name] : 0
    const y = barY + i * gap
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = '16px "Plus Jakarta Sans", sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(name, 80, y + 22)
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.fillRect(W / 2 - barMaxW / 2, y, barMaxW, barH)
    ctx.fillStyle = result.color || '#349980'
    ctx.fillRect(W / 2 - barMaxW / 2, y, (score / 20) * barMaxW, barH)
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.textAlign = 'right'
    ctx.fillText(`${score}/20`, W / 2 + barMaxW / 2 + 60, y + 22)
  })

  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.font = '28px "Plus Jakarta Sans", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Diagnóstico de Carreira', W / 2, H - 80)
  ctx.fillText('@rafael.voll', W / 2, H - 40)

  return canvas
}

export function downloadDiagnosticoCard(result) {
  const canvas = drawDiagnosticoShareCard(result)
  const link = document.createElement('a')
  link.download = `diagnostico-carreira-${result.totalScore}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}
