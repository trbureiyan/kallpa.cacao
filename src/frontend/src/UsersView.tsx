import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { apiRequest, type ApiUser } from './api'

const municipalities = ['Rivera', 'Campoalegre', 'Algeciras']
type UserForm = { username: string; full_name: string; password: string; role: 'operator' | 'admin'; municipality: string; active: boolean }
const emptyForm: UserForm = { username: '', full_name: '', password: '', role: 'operator', municipality: '', active: true }

export default function UsersView({ token }: { token: string }) {
  const [users, setUsers] = useState<ApiUser[]>([])
  const [form, setForm] = useState<UserForm>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try { setUsers(await apiRequest<ApiUser[]>(token, '/users')); setError('') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo consultar usuarios.') }
    finally { setLoading(false) }
  }, [token])
  useEffect(() => { void refresh() }, [refresh])

  function edit(user: ApiUser) {
    setEditingId(user.id)
    setForm({ username: user.username, full_name: user.full_name, password: '', role: user.role, municipality: user.municipality || '', active: user.active })
    setMessage('')
  }

  async function save(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage('')
    const body = { username: form.username, full_name: form.full_name, role: form.role, municipality: form.municipality || null, active: form.active, ...(form.password ? { password: form.password } : {}) }
    try {
      if (editingId === null) await apiRequest(token, '/users', { method: 'POST', body: JSON.stringify({ ...body, password: form.password }) })
      else await apiRequest(token, `/users/${editingId}`, { method: 'PATCH', body: JSON.stringify(body) })
      setForm(emptyForm); setEditingId(null); setMessage('Usuario guardado en el servidor y cambio registrado en auditoría.'); await refresh()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo guardar el usuario.') }
  }

  async function toggle(user: ApiUser) {
    setError(''); setMessage('')
    try {
      await apiRequest(token, `/users/${user.id}`, { method: 'PATCH', body: JSON.stringify({ active: !user.active }) })
      setMessage(`Cuenta ${user.active ? 'desactivada' : 'activada'} en el servidor.`); await refresh()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo cambiar el estado.') }
  }

  return <section className="workspace-page"><div className="page-title"><div><span className="eyebrow muted">ADMINISTRACIÓN</span><h1>Gestión de usuarios y permisos</h1><p>Las cuentas y roles se validan en FastAPI; esta pantalla no concede permisos por sí sola.</p></div></div>
    {error && <p className="view-error" role="alert">{error}</p>}{message && <p className="business-message" role="status">{message}</p>}
    <div className={editingId !== null ? 'user-modal-backdrop' : undefined}>
    <form className="workspace-card user-form" onSubmit={save} role={editingId !== null ? 'dialog' : undefined} aria-modal={editingId !== null ? true : undefined} aria-labelledby="user-form-title"><h2 id="user-form-title">{editingId === null ? 'Crear usuario' : 'Modificar perfil de usuario'}</h2>
      <div className="workspace-form-grid"><label>Nombre completo<input value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} minLength={2} required /></label><label>Correo<input type="email" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} required /></label><label>Contraseña {editingId !== null && <small>(opcional al editar)</small>}<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} minLength={8} required={editingId === null} autoComplete="new-password" /></label><label>Municipio asignado<select value={form.municipality} onChange={(event) => setForm({ ...form, municipality: event.target.value })}><option value="">Sin asignar</option>{municipalities.map((item) => <option key={item}>{item}</option>)}</select></label></div>
      <fieldset className="role-options"><legend>Rol</legend><label><input type="radio" name="role" checked={form.role === 'operator'} onChange={() => setForm({ ...form, role: 'operator' })} /> Operador de campo</label><label><input type="radio" name="role" checked={form.role === 'admin'} onChange={() => setForm({ ...form, role: 'admin' })} /> Administrador</label></fieldset>
      <label className="active-toggle"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Cuenta activa</label>
      <div className="form-actions"><button className="button button-primary" type="submit">{editingId === null ? 'Guardar usuario' : 'Guardar cambios'}</button><button className="button button-outline" type="button" onClick={() => { setEditingId(null); setForm(emptyForm) }}>Cancelar / limpiar</button></div>
    </form></div>
    <div className="business-table-wrap users-table"><table className="business-table"><thead><tr><th>Nombre</th><th>Correo</th><th>Municipio</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td>{user.full_name}</td><td>{user.username}</td><td>{user.municipality || '—'}</td><td><span className="business-status">{user.role === 'admin' ? 'ADMIN' : 'OPERADOR'}</span></td><td><span className={`business-status ${user.active ? 'status-released' : 'status-blocked'}`}>{user.active ? 'ACTIVO' : 'INACTIVO'}</span></td><td><div className="row-actions"><button type="button" onClick={() => edit(user)}>Editar</button><button type="button" onClick={() => void toggle(user)}>{user.active ? 'Desactivar' : 'Activar'}</button></div></td></tr>)}</tbody></table>{!loading && users.length === 0 && <p className="business-empty">No hay usuarios disponibles.</p>}</div>
  </section>
}
