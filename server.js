const express = require('express')
const cors    = require('cors')
const fs      = require('fs')
const crypto  = require('crypto')
const path    = require('path')

const app      = express()
const KEYS_FILE = path.join(__dirname, 'keys.json')

app.use(cors())
app.use(express.json())
app.use(express.static(__dirname))

// Leer keys
function readKeys() {
  try { return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8')) }
  catch { return {} }
}

// Guardar keys
function saveKeys(keys) {
  fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2))
}

// Generar key aleatoria
function generateKey() {
  return 'HL-' + crypto.randomBytes(4).toString('hex').toUpperCase()
    + '-' + crypto.randomBytes(4).toString('hex').toUpperCase()
}

// ── API: verificar key (llamada desde Roblox) ──────────────────────────────
app.post('/api/verify-key', (req, res) => {
  const { key, hwid } = req.body
  const keys = readKeys()

  if (!key || !keys[key]) {
    return res.json({ valid: false, message: 'Key invalida' })
  }

  const entry   = keys[key]
  const now     = new Date()
  const expDate = new Date(entry.expiresAt.replace(' ', 'T'))

  if (now > expDate) {
    return res.json({ valid: false, message: 'Key expirada' })
  }

  // Guardar hwid si no tiene
  if (!entry.hwid && hwid) {
    entry.hwid = hwid
    keys[key]  = entry
    saveKeys(keys)
  }

  res.json({ valid: true, expiresAt: entry.expiresAt })
})

// ── API: obtener todas las keys (panel) ───────────────────────────────────
app.get('/api/keys', (req, res) => {
  const keys = readKeys()
  const list = Object.entries(keys).map(([k, v]) => ({
    key:       k,
    expiresAt: v.expiresAt,
    hwid:      v.hwid || null,
    createdAt: v.createdAt || null
  }))
  res.json(list)
})

// ── API: crear key ────────────────────────────────────────────────────────
app.post('/api/keys', (req, res) => {
  const { days } = req.body
  if (!days || isNaN(days) || days < 1) {
    return res.status(400).json({ error: 'Dias invalidos' })
  }

  const keys      = readKeys()
  const newKey    = generateKey()
  const now       = new Date()
  const expDate   = new Date(now.getTime() + days * 86400000)

  const pad = n => String(n).padStart(2, '0')
  const fmt = d =>
    `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`

  keys[newKey] = {
    expiresAt: fmt(expDate),
    createdAt: fmt(now),
    hwid: null
  }
  saveKeys(keys)

  res.json({ key: newKey, expiresAt: keys[newKey].expiresAt })
})

// ── API: eliminar key ─────────────────────────────────────────────────────
app.delete('/api/keys/:key', (req, res) => {
  const keys = readKeys()
  const k    = req.params.key
  if (!keys[k]) return res.status(404).json({ error: 'Key no encontrada' })
  delete keys[k]
  saveKeys(keys)
  res.json({ success: true })
})

// ── API: reset HWID ───────────────────────────────────────────────────────
app.post('/api/keys/:key/reset-hwid', (req, res) => {
  const keys = readKeys()
  const k    = req.params.key
  if (!keys[k]) return res.status(404).json({ error: 'Key no encontrada' })
  keys[k].hwid = null
  saveKeys(keys)
  res.json({ success: true })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`[KeySystem] Servidor en puerto ${PORT}`))
