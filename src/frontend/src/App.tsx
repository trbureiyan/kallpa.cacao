import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Activity, ArrowDownToLine, Check, CheckCircle2, CloudOff, CloudUpload, Coffee, LoaderCircle, LockKeyhole, LogIn, MapPin, RefreshCw, ShieldCheck, Sprout, Wifi, WifiOff } from 'lucide-react'
import { fetchFarms, isHttpError, login, sendReception } from './api'
import { getFarms, getReceptions, saveFarms, saveReception, type Farm, type LocalReception, type QueueState, type ReceptionPayload } from './db'
import BusinessViews from './BusinessViews'
import WorkspaceViews from './WorkspaceViews'
import UsersView from './UsersView'

type AppPage = 'dashboard' | 'recepcion' | 'transformacion' | 'trazabilidad' | 'inventario' | 'alertas' | 'economia' | 'auditoria' | 'usuarios' | 'publico'

type Identity = { username: string; full_name: string; role: string }
type DemoSession = { identity: Identity; token: string }

const identityKey = 'cacao-offline-identity'
const tokenKey = 'cacao-api-token'

function localDateTimeValue() {
  return toLocalInput(new Date())
}

function toLocalInput(date: Date) {
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

function withLocalOffset(value: string) {
  const date = new Date(value)
  const offset = -date.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0')
  const minutes = String(Math.abs(offset) % 60).padStart(2, '0')
  return `${value}:00${sign}${hours}:${minutes}`
}

function readCachedIdentity(): Identity | null {
  try {
    const raw = localStorage.getItem(identityKey)
    return raw ? JSON.parse(raw) as Identity : null
  } catch {
    return null
  }
}

function statusLabel(state: QueueState) {
  return {
    pending: 'Pendiente',
    syncing: 'Enviando',
    synced: 'Sincronizado',
    conflict: 'Revisar',
    'needs-auth': 'Inicia sesión',
  }[state]
}

function App() {
  const [activePage, setActivePage] = useState<AppPage>(() => new URLSearchParams(window.location.search).has('producto') ? 'publico' : 'recepcion')
  const [identity, setIdentity] = useState<Identity | null>(() => readCachedIdentity())
  const [token, setToken] = useState(() => sessionStorage.getItem(tokenKey) || '')
  const [farms, setFarms] = useState<Farm[]>([])
  const [records, setRecords] = useState<LocalReception[]>([])
  const [online, setOnline] = useState(navigator.onLine)
  const [syncing, setSyncing] = useState(false)
  const syncLock = useRef(false)
  const [username, setUsername] = useState(() => readCachedIdentity()?.username || '')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [notice, setNotice] = useState('')
  const [farmId, setFarmId] = useState('')
  const [receivedAt, setReceivedAt] = useState(localDateTimeValue())
  const [quantity, setQuantity] = useState('')
  const [purchaseTotal, setPurchaseTotal] = useState('')
  const [qualityNotes, setQualityNotes] = useState('')
  const [editingConflict, setEditingConflict] = useState<string | null>(null)

  const refreshLocalData = useCallback(async () => {
    const [cachedFarms, queued] = await Promise.all([getFarms(), getReceptions()])
    setFarms(cachedFarms)
    setRecords(queued.reverse())
  }, [])

  const refreshFarmCatalog = useCallback(async (activeToken: string) => {
    const fresh = await fetchFarms(activeToken)
    await saveFarms(fresh)
    setFarms(fresh)
  }, [])

  const syncPending = useCallback(async () => {
    if (!token || !navigator.onLine || syncLock.current) return
    syncLock.current = true
    setSyncing(true)
    try {
      const pending = (await getReceptions()).filter((item) => ['pending', 'needs-auth', 'syncing'].includes(item.state))
      for (const record of pending) {
        await saveReception({ ...record, state: 'syncing', error: undefined })
        await refreshLocalData()
        try {
          const result = await sendReception(token, record.payload)
          await saveReception({ ...record, state: 'synced', server_lot_id: result.lot_id, server_lot_code: result.lot_code,
            server_reception_id: result.reception_id, error: undefined })
        } catch (error) {
          if (isHttpError(error, 401)) {
            await saveReception({ ...record, state: 'needs-auth', error: 'La sesión venció. Inicia sesión para continuar.' })
            sessionStorage.removeItem(tokenKey)
            setToken('')
            break
          }
          if (isHttpError(error, 409) || (error instanceof Error && 'status' in error && Number(error.status) >= 400 && Number(error.status) < 500)) {
            await saveReception({ ...record, state: 'conflict', error: error instanceof Error ? error.message : 'El servidor rechazó el registro.' })
            continue
          }
          await saveReception({ ...record, state: 'pending', error: 'No se pudo conectar. Se conserva para otro intento.' })
          break
        }
        await refreshLocalData()
      }
      await refreshLocalData()
    } finally {
      syncLock.current = false
      setSyncing(false)
    }
  }, [refreshLocalData, token])

  useEffect(() => {
    void refreshLocalData()
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [refreshLocalData])

  useEffect(() => {
    if (!token || !online) return
    void refreshFarmCatalog(token).catch((error: unknown) => {
      if (isHttpError(error, 401)) {
        sessionStorage.removeItem(tokenKey)
        setToken('')
      }
    })
    void syncPending()
  }, [online, refreshFarmCatalog, syncPending, token])

  useEffect(() => {
    if (!token || !online) return
    const interval = window.setInterval(() => void syncPending(), 15_000)
    return () => window.clearInterval(interval)
  }, [online, syncPending, token])

  const pendingCount = useMemo(() => records.filter((item) => item.state !== 'synced').length, [records])
  const syncedCount = records.filter((item) => item.state === 'synced').length
  const offlineReady = Boolean(identity && ['operator', 'admin'].includes(identity.role))

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoginError('')
    if (!navigator.onLine) {
      setLoginError('Para iniciar sesión por primera vez necesitas conexión. La captura local seguirá disponible si ya usaste esta app en este dispositivo.')
      return
    }
    try {
      const response = await login(username, password)
      const meResponse = await fetch(`${(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '')}/auth/me`, {
        headers: { Authorization: `Bearer ${response.access_token}` },
      })
      if (!meResponse.ok) throw new Error('No se pudo validar el perfil de usuario.')
      const user = await meResponse.json() as Identity
      if (!['operator', 'admin'].includes(user.role)) throw new Error('Tu rol no puede registrar recepciones.')
      const active: DemoSession = { token: response.access_token, identity: user }
      sessionStorage.setItem(tokenKey, active.token)
      localStorage.setItem(identityKey, JSON.stringify(active.identity))
      setToken(active.token)
      setIdentity(active.identity)
      setPassword('')
      setNotice('Sesión iniciada. Las fincas quedan disponibles para captura en campo.')
      try {
        await refreshFarmCatalog(active.token)
      } catch {
        setNotice('Sesión iniciada. No se pudo actualizar el catálogo; conservaré las fincas guardadas en el dispositivo.')
      }
      await refreshLocalData()
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'No se pudo iniciar sesión.')
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice('')
    if (!offlineReady) {
      setNotice('Inicia sesión con conexión al menos una vez en este dispositivo para habilitar la captura de campo.')
      return
    }
    if (!farms.some((farm) => farm.id === Number(farmId))) {
      setNotice('Selecciona una finca guardada en este dispositivo. Con conexión, actualiza el catálogo antes de salir a campo.')
      return
    }
    const idempotencyKey = crypto.randomUUID()
    const payload: ReceptionPayload = {
      idempotency_key: idempotencyKey,
      farm_id: Number(farmId),
      received_at: withLocalOffset(receivedAt),
      quantity_kg: quantity,
      purchase_total_cop: purchaseTotal || '0.00',
      quality_notes: qualityNotes.trim() || null,
    }
    const queued: LocalReception = {
      local_id: crypto.randomUUID(), payload, saved_at: new Date().toISOString(), state: 'pending',
    }
    await saveReception(queued)
    await refreshLocalData()
    setReceivedAt(localDateTimeValue())
    setQuantity('')
    setPurchaseTotal('')
    setQualityNotes('')
    setEditingConflict(null)
    setNotice(online ? 'Recepción guardada en este dispositivo; sincronizando con el servidor…' : 'Recepción guardada en este dispositivo. Se enviará cuando vuelva la conexión.')
    if (online) void syncPending()
  }

  async function correctConflict(record: LocalReception) {
    setFarmId(String(record.payload.farm_id))
    setReceivedAt(toLocalInput(new Date(record.payload.received_at)))
    setQuantity(record.payload.quantity_kg)
    setPurchaseTotal(record.payload.purchase_total_cop)
    setQualityNotes(record.payload.quality_notes || '')
    setEditingConflict(record.local_id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function logout() {
    sessionStorage.removeItem(tokenKey)
    setToken('')
    setNotice('Sesión cerrada. Los registros guardados en este dispositivo se conservan.')
  }

  const navigation: Array<{ id: AppPage; label: string; roles?: string[] }> = [
    { id: 'dashboard', label: 'Inicio' }, { id: 'recepcion', label: 'Recepción' },
    { id: 'transformacion', label: 'Transformación' }, { id: 'trazabilidad', label: 'Trazabilidad' },
    { id: 'inventario', label: 'Inventario' }, { id: 'alertas', label: 'Alertas', roles: ['admin'] },
    { id: 'economia', label: 'Economía', roles: ['admin'] }, { id: 'auditoria', label: 'Auditoría', roles: ['admin'] },
    { id: 'usuarios', label: 'Usuarios', roles: ['admin'] }, { id: 'publico', label: 'Ficha pública' },
  ]
  function openPage(page: AppPage) {
    if (page !== 'recepcion' && page !== 'publico' && !token) {
      setNotice('Inicia sesión con conexión para consultar esta pantalla desde el servidor.')
      return
    }
    setActivePage(page)
    setNotice('')
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" onClick={() => setActivePage('recepcion')} aria-label="Cacao en campo, inicio">
          <span className="brand-mark"><Sprout size={22} strokeWidth={2.2} /></span>
          <span><strong>cacao</strong><small>en campo</small></span>
        </a>
        <div className="topbar-actions">
          <div className={`connection-pill ${online ? 'is-online' : 'is-offline'}`} role="status">
            {online ? <Wifi size={15} /> : <WifiOff size={15} />}
            <span>{online ? 'Con conexión' : 'Sin conexión'}</span>
          </div>
          {identity && <div className="user-chip"><span className="avatar">{identity.full_name.slice(0, 1).toUpperCase()}</span><span>{identity.full_name}</span></div>}
          {identity && pendingCount > 0 && <button className="queue-pill" onClick={() => openPage('recepcion')}><CloudUpload size={14} /> {pendingCount} pendiente{pendingCount === 1 ? '' : 's'}</button>}
          {identity && token && <button className="header-sync" onClick={() => void syncPending()} disabled={!online || syncing || pendingCount === 0}>{syncing ? 'Enviando…' : 'Sincronizar'}</button>}
        </div>
      </header>

      {identity && <nav className="app-navigation" aria-label="Navegación principal">
        {navigation.filter((item) => !item.roles || item.roles.includes(identity.role)).map((item) => <button key={item.id} className={activePage === item.id ? 'app-nav-item active' : 'app-nav-item'} onClick={() => openPage(item.id)}>{item.label}</button>)}
      </nav>}
      {!online && <div className="offline-banner" role="status"><WifiOff size={16} /> Modo offline: las recepciones se guardan en este dispositivo y se sincronizan al recuperar conexión.</div>}
      {activePage === 'publico' && !identity && <button className="public-entry" type="button" onClick={() => setActivePage('recepcion')}>Volver al acceso de operador y administrador</button>}

      {(activePage === 'recepcion' || !identity) && <section className="hero" id="inicio">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> BITÁCORA DE COSECHA</div>
          <h1>El campo no<br /><em>espera señal.</em></h1>
          <p>Registra la llegada del cacao ahora. La información viaja al sistema cuando vuelve la conexión.</p>
          <div className="hero-proof"><ShieldCheck size={16} /><span>Guardado en el dispositivo antes de sincronizar</span></div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="sun" /><div className="hill hill-back" /><div className="hill hill-front" />
          <div className="cacao-pod pod-one">✳</div><div className="cacao-pod pod-two">✳</div>
          <div className="art-label"><MapPin size={13} /> Huila, Colombia</div>
        </div>
      </section>}

      {activePage !== 'publico' && (!identity || (online && identity && !token)) && (
        <section className="login-card">
          <div className="section-icon"><LockKeyhole size={19} /></div>
          <div className="login-copy"><h2>{identity ? 'Conecta para sincronizar' : 'Prepara el dispositivo'}</h2><p>{identity ? 'Vuelve a autenticarte para enviar registros. Las recepciones locales se conservan mientras tanto.' : 'Inicia sesión con conexión para descargar las fincas. Después podrás capturar recepciones sin cobertura.'}</p></div>
          <form className="login-form" onSubmit={handleLogin}>
            <label>Usuario<input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="operador" required /></label>
            <label>Contraseña<input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
            <button className="button button-dark" type="submit" disabled={!online}><LogIn size={16} /> Iniciar sesión</button>
            {loginError && <p className="form-error" role="alert">{loginError}</p>}
            <div className="demo-login"><strong>Acceso de demostración</strong><button type="button" onClick={() => { setUsername('operador'); setPassword('Operador123!') }}>Usar operador de campo</button><button type="button" onClick={() => { setUsername('admin'); setPassword('Admin123!') }}>Usar administrador</button></div>
          </form>
          <button className="public-entry" type="button" onClick={() => openPage('publico')}>¿Eres comprador? Consultar ficha pública</button>
        </section>
      )}

      {identity && activePage === 'recepcion' && (
        <div className="workspace">
          <section className="capture-card">
            <div className="section-heading">
              <div><div className="eyebrow muted">NUEVA ENTRADA</div><h2>Registrar recepción</h2></div>
              <div className="step-badge"><span>01</span> RECEPCIÓN</div>
            </div>
            {farms.length === 0 && <div className="inline-warning"><CloudOff size={17} /><span>No hay fincas guardadas todavía. Conéctate e inicia sesión para cargar el catálogo antes de salir a campo.</span></div>}
            <form className="reception-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <label className="field wide">Finca de origen
                  <select value={farmId} onChange={(event) => setFarmId(event.target.value)} required disabled={farms.length === 0}>
                    <option value="">Selecciona una finca</option>
                    {farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name} · {farm.region}</option>)}
                  </select>
                </label>
                <label className="field">Fecha y hora
                  <input type="datetime-local" value={receivedAt} onChange={(event) => setReceivedAt(event.target.value)} required />
                </label>
                <label className="field">Cantidad recibida
                  <span className="input-suffix"><input type="number" inputMode="decimal" min="0.001" step="0.001" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="0.000" required /><span>kg</span></span>
                </label>
                <label className="field">Costo de compra
                  <span className="input-prefix"><span>$</span><input type="number" inputMode="decimal" min="0" step="0.01" value={purchaseTotal} onChange={(event) => setPurchaseTotal(event.target.value)} placeholder="0" /></span>
                  <small>COP · opcional</small>
                </label>
                <label className="field wide">Notas de calidad <span className="optional">OPCIONAL</span>
                  <textarea value={qualityNotes} onChange={(event) => setQualityNotes(event.target.value)} rows={2} maxLength={1000} placeholder="Fermentación, humedad u observaciones del lote…" />
                </label>
              </div>
              {notice && <div className="notice" role="status">{notice}</div>}
              <div className="form-footer">
                <p><LockKeyhole size={14} /> Los datos quedan guardados localmente antes del envío.</p>
                <button className="button button-primary" type="submit"><Check size={17} /> {editingConflict ? 'Guardar corrección' : 'Guardar recepción'}</button>
              </div>
            </form>
          </section>

          <aside className="sync-card">
            <div className="sync-top"><div className="section-icon pale"><Activity size={18} /></div><span className={`sync-state ${online ? 'online-text' : 'offline-text'}`}>{online ? 'EN LÍNEA' : 'MODO CAMPO'}</span></div>
            <h3>{pendingCount === 0 ? 'Todo al día' : `${pendingCount} ${pendingCount === 1 ? 'registro' : 'registros'} por enviar`}</h3>
            <p>{online ? 'Los registros pendientes se envían automáticamente mientras haya conexión.' : 'Tus registros están a salvo aquí. No cierres ni borres los datos del navegador hasta sincronizar.'}</p>
            <div className="sync-progress"><span style={{ width: `${records.length ? Math.round((syncedCount / records.length) * 100) : 0}%` }} /></div>
            <div className="sync-counts"><span><i className="dot-synced" /> {syncedCount} enviados</span><span><i className="dot-pending" /> {pendingCount} pendientes</span></div>
            <button className="button button-outline" disabled={!online || !token || syncing || pendingCount === 0} onClick={() => void syncPending()}>
              {syncing ? <LoaderCircle className="spin" size={16} /> : <CloudUpload size={16} />}{syncing ? 'Sincronizando…' : 'Sincronizar ahora'}
            </button>
            {online && token && <button className="text-button" onClick={() => void refreshFarmCatalog(token).then(() => setNotice('Catálogo de fincas actualizado.'))}><RefreshCw size={13} /> Actualizar fincas</button>}
            {token && <button className="text-button subtle" onClick={logout}>Cerrar sesión en el servidor</button>}
            {!token && online && <p className="auth-hint"><LockKeyhole size={13} /> Inicia sesión para enviar los registros pendientes.</p>}
          </aside>

          <section className="records-section">
            <div className="records-heading"><div><div className="eyebrow muted">ACTIVIDAD RECIENTE</div><h2>Recepciones del dispositivo</h2></div><span className="record-total">{records.length} {records.length === 1 ? 'registro' : 'registros'}</span></div>
            {records.length === 0 ? (
              <div className="empty-state"><div className="empty-icon"><Coffee size={22} /></div><strong>Aún no hay recepciones</strong><span>Los lotes que registres aparecerán aquí, incluso antes de sincronizarse.</span></div>
            ) : (
              <div className="record-list">
                {records.map((record) => {
                  const farm = farms.find((item) => item.id === record.payload.farm_id)
                  return <article className={`record-row ${record.state === 'conflict' ? 'has-conflict' : ''}`} key={record.local_id}>
                    <div className="record-icon">{record.state === 'synced' ? <CheckCircle2 size={19} /> : record.state === 'conflict' ? <Activity size={19} /> : <ArrowDownToLine size={19} />}</div>
                    <div className="record-main"><div className="record-title"><strong>{record.server_lot_code || `Código pendiente · ${record.local_id.slice(0, 6)}`}</strong><span className={`status status-${record.state}`}>{record.state === 'syncing' && <LoaderCircle className="spin" size={12} />}{statusLabel(record.state)}</span></div>
                      <span className="record-origin"><MapPin size={12} />{farm ? `${farm.name} · ${farm.region}` : `Finca #${record.payload.farm_id}`}</span>
                      {record.error && <span className="record-error">{record.error}</span>}
                    </div>
                    <div className="record-quantity"><strong>{record.payload.quantity_kg}</strong><span>kg</span></div>
                    <time dateTime={record.saved_at}>{new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(record.saved_at))}</time>
                    {record.state === 'conflict' && <button className="fix-button" onClick={() => void correctConflict(record)}>Corregir</button>}
                  </article>
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {identity && token && activePage === 'dashboard' && <WorkspaceViews page="dashboard" token={token} role={identity.role} />}
      {identity && token && activePage === 'transformacion' && <WorkspaceViews page="transformacion" token={token} role={identity.role} />}
      {identity && token && activePage === 'trazabilidad' && <WorkspaceViews page="trazabilidad" token={token} role={identity.role} />}
      {identity && token && activePage === 'inventario' && (identity.role === 'admin'
        ? <BusinessViews token={token} initialView="inventory" />
        : <WorkspaceViews page="inventario" token={token} role={identity.role} />)}
      {identity && token && activePage === 'alertas' && identity.role === 'admin' && <WorkspaceViews page="alertas" token={token} role={identity.role} />}
      {identity && token && activePage === 'economia' && identity.role === 'admin' && <BusinessViews token={token} initialView="economics" />}
      {identity && token && activePage === 'auditoria' && identity.role === 'admin' && <BusinessViews token={token} initialView="audit" />}
      {identity && token && activePage === 'usuarios' && identity.role === 'admin' && <UsersView token={token} />}
      {activePage === 'publico' && <WorkspaceViews page="publico" token="" role="public" />}

      <footer className="footer"><span><Sprout size={15} /> Trazabilidad que nace en el territorio</span><span>Los registros pendientes viven en este dispositivo hasta sincronizar.</span></footer>
    </main>
  )
}

export default App
