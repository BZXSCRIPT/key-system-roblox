// ── Storage (localStorage, sin servidor) ──────────────────────────────────
const STORAGE_KEY = 'headless_keys'

function readKeys() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
  catch { return {} }
}

function saveKeys(keys) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
}

// ── Utilidades ─────────────────────────────────────────────────────────────
function toast(msg, duration = 2200) {
  const t = document.getElementById('toast')
  t.textContent = msg
  t.classList.add('show')
  setTimeout(() => t.classList.remove('show'), duration)
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => toast('✓ Copiado al portapapeles'))
}

function generateKey() {
  const rand = () => Math.random().toString(36).substring(2, 6).toUpperCase()
  return `RBX-${rand()}${rand()}-${rand()}${rand()}`
}

function fmtDate(d) {
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function statusClass(expiresAt) {
  const diff = new Date(expiresAt.replace(' ', 'T')) - Date.now()
  if (diff <= 0)       return 'expired'
  if (diff < 86400000) return 'expiring'
  return 'active'
}

function statusLabel(expiresAt) {
  const diff = new Date(expiresAt.replace(' ', 'T')) - Date.now()
  if (diff <= 0)       return 'Expirada'
  if (diff < 86400000) return 'Expira pronto'
  return 'Activa'
}

// ── Render panel de keys ───────────────────────────────────────────────────
function loadKeys() {
  const keys  = readKeys()
  const list  = document.getElementById('keysList')
  const count = document.getElementById('keysCount')
  const entries = Object.entries(keys)

  count.textContent = entries.length

  if (entries.length === 0) {
    list.innerHTML = '<p class="empty-msg">Sin keys aún</p>'
    return
  }

  list.innerHTML = ''
  entries
    .sort((a, b) => new Date(a[1].expiresAt) - new Date(b[1].expiresAt))
    .forEach(([key, val]) => {
      const sc  = statusClass(val.expiresAt)
      const sl  = statusLabel(val.expiresAt)
      const exp = val.expiresAt.slice(0, 16)

      const card = document.createElement('div')
      card.className = 'key-card'
      card.id = 'card-' + key
      card.innerHTML = `
        <div class="key-card-top">
          <span class="key-value">${key}</span>
          <div class="key-card-actions">
            <button class="btn-card-copy" title="Copiar key">⧉</button>
            <button class="btn-card-del"  title="Eliminar">✕</button>
          </div>
        </div>
        <div class="key-meta">
          <span class="key-exp">Expira: ${exp}</span>
          <span class="key-status ${sc}">${sl}</span>
        </div>
      `
      card.querySelector('.btn-card-copy').addEventListener('click', () => copyText(key))
      card.querySelector('.btn-card-del').addEventListener('click', () => deleteKey(key))
      list.appendChild(card)
    })
}

// ── Eliminar key ───────────────────────────────────────────────────────────
function deleteKey(key) {
  const keys = readKeys()
  delete keys[key]
  saveKeys(keys)

  const card = document.getElementById('card-' + key)
  if (card) {
    card.style.transition = 'opacity .25s, transform .25s'
    card.style.opacity    = '0'
    card.style.transform  = 'translateX(30px)'
    setTimeout(() => { card.remove(); loadKeys() }, 260)
  }
  toast('🗑 Key eliminada')
}

// ── Generar key ────────────────────────────────────────────────────────────
document.getElementById('btnCreate').addEventListener('click', () => {
  const days = parseInt(document.getElementById('daysInput').value)
  const msg  = document.getElementById('statusMsg')
  const txt  = document.getElementById('btnCreateText')

  if (!days || days < 1) {
    msg.textContent = 'Escribe los días primero'
    setTimeout(() => msg.textContent = '', 2500)
    return
  }

  txt.textContent = 'Generando...'
  msg.textContent = ''

  const keys      = readKeys()
  const newKey    = generateKey()
  const expDate   = new Date(Date.now() + days * 86400000)
  const expiresAt = fmtDate(expDate)

  keys[newKey] = { expiresAt, createdAt: fmtDate(new Date()), hwid: null }
  saveKeys(keys)

  document.getElementById('resultKey').textContent = newKey
  document.getElementById('resultExp').textContent = `Expira: ${expiresAt.slice(0, 16)}`
  document.getElementById('resultBox').style.display = 'flex'

  toast('✓ Key generada')
  loadKeys()
  txt.textContent = 'Generar Key'
})

// ── Copiar key del result box ──────────────────────────────────────────────
document.getElementById('btnCopy').addEventListener('click', () => {
  const key = document.getElementById('resultKey').textContent
  if (key) copyText(key)
})

// ── Init ───────────────────────────────────────────────────────────────────
loadKeys()
setInterval(loadKeys, 30000)

// ── Panel HWID ─────────────────────────────────────────────────────────────
const hwidKeyInput  = document.getElementById('hwidKeyInput')
const hwidResult    = document.getElementById('hwidResult')
const hwidResKey    = document.getElementById('hwidResKey')
const hwidResVal    = document.getElementById('hwidResVal')
const hwidResStatus = document.getElementById('hwidResStatus')
const btnHwidReset  = document.getElementById('btnHwidReset')
const hwidMsg       = document.getElementById('hwidMsg')

function showHwidMsg(msg, isError = false) {
  hwidMsg.textContent = msg
  hwidMsg.style.color = isError ? 'var(--red)' : 'var(--green)'
  setTimeout(() => hwidMsg.textContent = '', 2800)
}

document.getElementById('btnHwidSearch').addEventListener('click', () => {
  const key  = hwidKeyInput.value.trim()
  if (!key) { showHwidMsg('Escribe una key', true); return }

  const keys = readKeys()
  if (!keys[key]) { showHwidMsg('Key no encontrada', true); hwidResult.style.display = 'none'; return }

  const entry = keys[key]
  hwidResKey.textContent = key

  if (entry.hwid) {
    hwidResVal.textContent        = entry.hwid
    hwidResStatus.textContent     = 'Vinculado'
    hwidResStatus.className       = 'hwid-result-status linked'
    btnHwidReset.disabled         = false
  } else {
    hwidResVal.textContent        = 'Sin dispositivo'
    hwidResStatus.textContent     = 'Libre'
    hwidResStatus.className       = 'hwid-result-status free'
    btnHwidReset.disabled         = true
  }

  hwidResult.style.display = 'flex'
})

// Enter en el input también busca
hwidKeyInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btnHwidSearch').click()
})

btnHwidReset.addEventListener('click', () => {
  const key  = hwidKeyInput.value.trim()
  const keys = readKeys()
  if (!keys[key]) return

  keys[key].hwid        = null
  saveKeys(keys)

  hwidResVal.textContent    = 'Sin dispositivo'
  hwidResStatus.textContent = 'Libre'
  hwidResStatus.className   = 'hwid-result-status free'
  btnHwidReset.disabled     = true

  showHwidMsg('✓ HWID reseteado correctamente')
  toast('✓ HWID reseteado — key libre para otro dispositivo')
  loadKeys() // refrescar panel de keys
})
