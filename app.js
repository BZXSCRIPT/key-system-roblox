const API = 'https://key-system-roblox.onrender.com'

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
async function loadKeys() {
  try {
    const res     = await fetch(`${API}/api/keys`)
    const entries = await res.json()
    const list    = document.getElementById('keysList')
    const count   = document.getElementById('keysCount')

    count.textContent = entries.length

    if (entries.length === 0) {
      list.innerHTML = '<p class="empty-msg">Sin keys aún</p>'
      return
    }

    list.innerHTML = ''
    entries
      .sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt))
      .forEach(({ key, expiresAt, hwid }) => {
        const sc  = statusClass(expiresAt)
        const sl  = statusLabel(expiresAt)
        const exp = expiresAt.slice(0, 16)

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
          ${hwid ? `<span class="key-hwid">HWID: ${hwid}</span>` : ''}
        `
        card.querySelector('.btn-card-copy').addEventListener('click', () => copyText(key))
        card.querySelector('.btn-card-del').addEventListener('click', () => deleteKey(key))
        list.appendChild(card)
      })
  } catch {
    console.error('Error cargando keys')
  }
}

// ── Eliminar key ───────────────────────────────────────────────────────────
async function deleteKey(key) {
  try {
    await fetch(`${API}/api/keys/${encodeURIComponent(key)}`, { method: 'DELETE' })
    const card = document.getElementById('card-' + key)
    if (card) {
      card.style.transition = 'opacity .25s, transform .25s'
      card.style.opacity    = '0'
      card.style.transform  = 'translateX(30px)'
      setTimeout(() => { card.remove(); loadKeys() }, 260)
    }
    toast('🗑 Key eliminada')
  } catch {
    toast('Error al eliminar')
  }
}

// ── Generar key ────────────────────────────────────────────────────────────
document.getElementById('btnCreate').addEventListener('click', async () => {
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

  try {
    const res  = await fetch(`${API}/api/keys`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ days })
    })
    const data = await res.json()

    if (data.key) {
      document.getElementById('resultKey').textContent = data.key
      document.getElementById('resultExp').textContent = `Expira: ${data.expiresAt.slice(0, 16)}`
      document.getElementById('resultBox').style.display = 'flex'
      toast('✓ Key generada')
      loadKeys()
    } else {
      msg.textContent = data.error || 'Error al generar'
    }
  } catch {
    msg.textContent = 'Error de conexión con el servidor'
  } finally {
    txt.textContent = 'Generar Key'
  }
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

document.getElementById('btnHwidSearch').addEventListener('click', async () => {
  const key = hwidKeyInput.value.trim()
  if (!key) { showHwidMsg('Escribe una key', true); return }

  try {
    const res  = await fetch(`${API}/api/keys`)
    const list = await res.json()
    const entry = list.find(k => k.key === key)

    if (!entry) {
      showHwidMsg('Key no encontrada', true)
      hwidResult.style.display = 'none'
      return
    }

    hwidResKey.textContent = key

    if (entry.hwid) {
      hwidResVal.textContent    = entry.hwid
      hwidResStatus.textContent = 'Vinculado'
      hwidResStatus.className   = 'hwid-result-status linked'
      btnHwidReset.disabled     = false
    } else {
      hwidResVal.textContent    = 'Sin dispositivo'
      hwidResStatus.textContent = 'Libre'
      hwidResStatus.className   = 'hwid-result-status free'
      btnHwidReset.disabled     = true
    }

    hwidResult.style.display = 'flex'
  } catch {
    showHwidMsg('Error de conexión', true)
  }
})

hwidKeyInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btnHwidSearch').click()
})

btnHwidReset.addEventListener('click', async () => {
  const key = hwidKeyInput.value.trim()
  if (!key) return

  try {
    const res  = await fetch(`${API}/api/keys/${encodeURIComponent(key)}/reset-hwid`, {
      method: 'POST'
    })
    const data = await res.json()

    if (data.success) {
      hwidResVal.textContent    = 'Sin dispositivo'
      hwidResStatus.textContent = 'Libre'
      hwidResStatus.className   = 'hwid-result-status free'
      btnHwidReset.disabled     = true
      showHwidMsg('✓ HWID reseteado correctamente')
      toast('✓ HWID reseteado — key libre para otro dispositivo')
      loadKeys()
    } else {
      showHwidMsg('Error al resetear', true)
    }
  } catch {
    showHwidMsg('Error de conexión', true)
  }
})
