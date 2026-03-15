const canvas = document.getElementById('dragonCanvas')
const ctx    = canvas.getContext('2d')

function resize() {
  canvas.width  = window.innerWidth
  canvas.height = window.innerHeight
}
resize()
window.addEventListener('resize', resize)

// ── Tiempo global ──────────────────────────────────────────────────────────
let t = 0

// ── Helpers ────────────────────────────────────────────────────────────────
function lerp(a, b, n) { return a + (b - a) * n }

// Dibuja una curva bezier con grosor variable (simula volumen)
function drawTaperedCurve(pts, maxW, color, glow) {
  if (pts.length < 2) return
  ctx.save()
  if (glow) {
    ctx.shadowColor = color
    ctx.shadowBlur  = 18
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const ratio = i / (pts.length - 1)
    const w     = maxW * (1 - ratio * 0.7)
    ctx.beginPath()
    ctx.moveTo(pts[i].x, pts[i].y)
    ctx.lineTo(pts[i+1].x, pts[i+1].y)
    ctx.strokeStyle = color
    ctx.lineWidth   = w
    ctx.lineCap     = 'round'
    ctx.stroke()
  }
  ctx.restore()
}

// ── Spine del cuerpo (cadena de segmentos) ─────────────────────────────────
const SEGS   = 22
const spine  = []
for (let i = 0; i < SEGS; i++) {
  spine.push({ x: 0, y: 0 })
}

function updateSpine(headX, headY) {
  spine[0].x = headX
  spine[0].y = headY
  const segLen = 22
  for (let i = 1; i < SEGS; i++) {
    const dx   = spine[i].x - spine[i-1].x
    const dy   = spine[i].y - spine[i-1].y
    const dist = Math.sqrt(dx*dx + dy*dy) || 1
    spine[i].x = spine[i-1].x + (dx / dist) * segLen
    spine[i].y = spine[i-1].y + (dy / dist) * segLen
  }
}

// ── Trayectoria de vuelo (figura 8 grande) ─────────────────────────────────
function flightPath(time) {
  const cx = canvas.width  * 0.5
  const cy = canvas.height * 0.5
  const rx = canvas.width  * 0.38
  const ry = canvas.height * 0.28
  // Lemniscata de Bernoulli (figura 8)
  const denom = 1 + Math.sin(time) * Math.sin(time)
  const x = cx + rx * Math.cos(time) / denom
  const y = cy + ry * Math.sin(time) * Math.cos(time) / denom
  return { x, y }
}

// ── Escamas: pequeños arcos a lo largo del cuerpo ─────────────────────────
function drawScales() {
  for (let i = 2; i < SEGS - 1; i += 2) {
    const p    = spine[i]
    const prev = spine[i-1]
    const dx   = p.x - prev.x
    const dy   = p.y - prev.y
    const ang  = Math.atan2(dy, dx)
    const w    = lerp(14, 5, i / SEGS)

    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(ang + Math.PI / 2)
    ctx.beginPath()
    ctx.ellipse(0, 0, w * 0.5, w * 0.3, 0, 0, Math.PI)
    ctx.fillStyle = `rgba(0, 120, 255, 0.18)`
    ctx.fill()
    ctx.strokeStyle = `rgba(80, 180, 255, 0.35)`
    ctx.lineWidth = 0.8
    ctx.stroke()
    ctx.restore()
  }
}

// ── Ala ────────────────────────────────────────────────────────────────────
function drawWing(baseX, baseY, angle, flapAngle, side, alpha) {
  const sign  = side === 'left' ? -1 : 1
  const span  = 130
  const chord = 70

  // 3 puntos de control para el ala
  const tipX  = baseX + Math.cos(angle + sign * flapAngle) * span
  const tipY  = baseY + Math.sin(angle + sign * flapAngle) * span
  const midX  = baseX + Math.cos(angle + sign * (flapAngle * 0.5)) * span * 0.55
  const midY  = baseY + Math.sin(angle + sign * (flapAngle * 0.5)) * span * 0.55
  const ctrlX = midX + Math.cos(angle + sign * Math.PI * 0.5) * chord * sign
  const ctrlY = midY + Math.sin(angle + sign * Math.PI * 0.5) * chord * sign

  // Membrana
  const grad = ctx.createLinearGradient(baseX, baseY, tipX, tipY)
  grad.addColorStop(0,   `rgba(10, 60, 180, ${alpha * 0.85})`)
  grad.addColorStop(0.5, `rgba(0,  100, 255, ${alpha * 0.5})`)
  grad.addColorStop(1,   `rgba(0,  160, 255, ${alpha * 0.15})`)

  ctx.save()
  ctx.shadowColor = 'rgba(0, 120, 255, 0.4)'
  ctx.shadowBlur  = 20
  ctx.beginPath()
  ctx.moveTo(baseX, baseY)
  ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY)
  ctx.quadraticCurveTo(midX - (ctrlX - midX) * 0.3, midY - (ctrlY - midY) * 0.3, baseX, baseY)
  ctx.fillStyle = grad
  ctx.fill()

  // Costillas del ala
  ctx.strokeStyle = `rgba(80, 180, 255, ${alpha * 0.6})`
  ctx.lineWidth   = 1.2
  for (let r = 0; r < 4; r++) {
    const rf  = r / 3
    const rx  = lerp(baseX, tipX, rf * 0.9)
    const ry  = lerp(baseY, tipY, rf * 0.9)
    const rcx = lerp(baseX, ctrlX, rf * 0.9)
    const rcy = lerp(baseY, ctrlY, rf * 0.9)
    ctx.beginPath()
    ctx.moveTo(baseX, baseY)
    ctx.quadraticCurveTo(rcx, rcy, rx, ry)
    ctx.stroke()
  }
  ctx.restore()
}

// ── Cabeza ─────────────────────────────────────────────────────────────────
function drawHead(x, y, angle, alpha) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)

  // Cuerpo de la cabeza
  const hg = ctx.createRadialGradient(0, 0, 2, 0, 0, 22)
  hg.addColorStop(0,   `rgba(40, 140, 255, ${alpha})`)
  hg.addColorStop(0.6, `rgba(10,  70, 200, ${alpha * 0.9})`)
  hg.addColorStop(1,   `rgba(0,   30, 120, ${alpha * 0.7})`)

  ctx.beginPath()
  ctx.ellipse(8, 0, 22, 13, 0, 0, Math.PI * 2)
  ctx.fillStyle = hg
  ctx.shadowColor = 'rgba(0, 150, 255, 0.7)'
  ctx.shadowBlur  = 22
  ctx.fill()

  // Hocico
  ctx.beginPath()
  ctx.ellipse(26, 2, 10, 7, 0.2, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(20, 100, 220, ${alpha * 0.9})`
  ctx.fill()

  // Ojo
  ctx.beginPath()
  ctx.arc(14, -4, 4, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(0, 200, 255, ${alpha})`
  ctx.shadowColor = 'rgba(0, 220, 255, 1)'
  ctx.shadowBlur  = 14
  ctx.fill()
  ctx.beginPath()
  ctx.arc(14, -4, 2, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(0, 0, 30, ${alpha})`
  ctx.fill()

  // Cuerno
  ctx.beginPath()
  ctx.moveTo(10, -12)
  ctx.lineTo(4,  -26)
  ctx.lineTo(16, -14)
  ctx.fillStyle = `rgba(80, 180, 255, ${alpha * 0.8})`
  ctx.fill()

  ctx.restore()
}

// ── Fuego ──────────────────────────────────────────────────────────────────
const fireParticles = []
function spawnFire(x, y, angle) {
  for (let i = 0; i < 3; i++) {
    fireParticles.push({
      x, y,
      vx: Math.cos(angle) * (3 + Math.random() * 4) + (Math.random() - 0.5) * 2,
      vy: Math.sin(angle) * (3 + Math.random() * 4) + (Math.random() - 0.5) * 2,
      life: 1,
      size: 4 + Math.random() * 6
    })
  }
}

function updateDrawFire() {
  for (let i = fireParticles.length - 1; i >= 0; i--) {
    const p = fireParticles[i]
    p.x    += p.vx
    p.y    += p.vy
    p.life -= 0.045
    p.size *= 0.96
    if (p.life <= 0) { fireParticles.splice(i, 1); continue }

    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2)
    g.addColorStop(0,   `rgba(180, 230, 255, ${p.life * 0.9})`)
    g.addColorStop(0.4, `rgba(0,   150, 255, ${p.life * 0.6})`)
    g.addColorStop(1,   `rgba(0,    50, 200, 0)`)

    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2)
    ctx.fillStyle = g
    ctx.fill()
  }
}

// ── Loop principal ─────────────────────────────────────────────────────────
let prevHead = null

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  t += 0.008

  // Posición de la cabeza
  const head    = flightPath(t)
  const headNext = flightPath(t + 0.01)
  const headAngle = Math.atan2(headNext.y - head.y, headNext.x - head.x)

  updateSpine(head.x, head.y)

  // Alpha basado en posición (más brillante en centro)
  const distCenter = Math.hypot(head.x - canvas.width * 0.5, head.y - canvas.height * 0.5)
  const alpha = lerp(0.95, 0.6, Math.min(distCenter / (canvas.width * 0.4), 1))

  // ── Cuerpo ──
  const bodyPts = spine.map(s => ({ x: s.x, y: s.y }))

  // Gradiente del cuerpo
  const bodyGrad = ctx.createLinearGradient(spine[0].x, spine[0].y, spine[SEGS-1].x, spine[SEGS-1].y)
  bodyGrad.addColorStop(0,   `rgba(30, 120, 255, ${alpha})`)
  bodyGrad.addColorStop(0.4, `rgba(10,  70, 200, ${alpha * 0.9})`)
  bodyGrad.addColorStop(1,   `rgba(0,   20,  80, ${alpha * 0.5})`)

  drawTaperedCurve(bodyPts, 18, `rgba(10, 70, 200, ${alpha * 0.9})`, false)
  drawTaperedCurve(bodyPts, 14, `rgba(30, 130, 255, ${alpha * 0.7})`, true)

  drawScales()

  // ── Cola con punta ──
  const tailPts = spine.slice(SEGS - 6).concat([{
    x: spine[SEGS-1].x + (spine[SEGS-1].x - spine[SEGS-2].x) * 3,
    y: spine[SEGS-1].y + (spine[SEGS-1].y - spine[SEGS-2].y) * 3
  }])
  drawTaperedCurve(tailPts, 8, `rgba(0, 100, 220, ${alpha * 0.7})`, false)

  // ── Alas (en el segmento 4) ──
  const wingBase  = spine[4]
  const wingPrev  = spine[3]
  const wingAngle = Math.atan2(wingBase.y - wingPrev.y, wingBase.x - wingPrev.x)
  const flap      = Math.sin(t * 3.5) * 0.7 + 0.3

  drawWing(wingBase.x, wingBase.y, wingAngle, Math.PI * 0.45 * flap, 'left',  alpha)
  drawWing(wingBase.x, wingBase.y, wingAngle, Math.PI * 0.45 * flap, 'right', alpha)

  // ── Cabeza ──
  drawHead(head.x, head.y, headAngle, alpha)

  // ── Fuego (cada ~4 frames) ──
  if (Math.random() < 0.35) {
    spawnFire(
      head.x + Math.cos(headAngle) * 30,
      head.y + Math.sin(headAngle) * 30,
      headAngle
    )
  }
  updateDrawFire()

  prevHead = head
  requestAnimationFrame(draw)
}

// Inicializar spine en posición de vuelo
const initPos = flightPath(0)
for (let i = 0; i < SEGS; i++) {
  spine[i].x = initPos.x - i * 22
  spine[i].y = initPos.y
}

draw()
