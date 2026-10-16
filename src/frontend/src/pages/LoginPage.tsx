import React, { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ChevronRight, User, Lock, Loader2, TriangleAlert, ShieldCheck, WifiOff, Route } from 'lucide-react';
import { Logo } from '@/components/ui';
import { estadoConexion } from '@/components/ui/conexion';
import { IndicadorConexion } from '@/components/ui/marca';
import { useNetwork } from '@/context/NetworkContext';
import { useAuth } from '@/context/AuthContext';
import { MODO_LOCAL_PERMITIDO } from '@/context/fuente';
import { prefetchRuta } from '@/utils/prefetch';
import portada from '@/assets/login-cacao.webp';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { isOnline } = useNetwork();
  const { iniciarSesion } = useAuth();
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [enviando, setEnviando] = useState(false);
  const [verClave, setVerClave] = useState(false);
  const [mayusculas, setMayusculas] = useState(false);

  const entrar = async (u: string, c: string, forzarLocal = false) => {
    setEnviando(true);
    const mensaje = await iniciarSesion(u, c, { forzarLocal });
    setEnviando(false);
    if (mensaje) setError(mensaje);
    else navigate('/dashboard');
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    void entrar(usuario, clave);
  };

  return (
    <main className="login-shell">
      <section className="login-story" aria-label="Presentación">
        <img className="login-story-img" src={portada} alt="" aria-hidden="true" />
        <div className="login-story-body">
          <Logo light />
          <div>
            <h1 className="display-title">Cada lote cuenta su historia.</h1>
            <p className="login-lead">
              Registro de recepción, transformación y venta del cacao de la asociación, con origen verificable.
            </p>
            <ul className="login-points">
              <li><Route size={18} aria-hidden="true" /> Trazabilidad por lote, del productor a la ficha comercial</li>
              <li><WifiOff size={18} aria-hidden="true" /> Recepción con conectividad limitada</li>
              <li><ShieldCheck size={18} aria-hidden="true" /> Cambios de estado auditados</li>
            </ul>
          </div>
          <p className="login-story-foot">Proyecto de la II Hackathon USCO. Datos simulados.</p>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="login-head">
            <h2 className="page-title">Iniciar sesión</h2>
            <IndicadorConexion estado={estadoConexion({ enLinea: isOnline, pendientes: 0, error: false })} pendientes={0} />
          </div>

          <form onSubmit={submit} className="space-y-6">
            {error && (
              <div className="validation danger" role="alert">
                <span>{error}</span>
              </div>
            )}
            <div>
              <label className="field-label" htmlFor="usuario">Usuario</label>
              <div className="input-icon">
                <User size={18} aria-hidden="true" />
                <input
                  id="usuario"
                  className="input"
                  type="text"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="field-label" htmlFor="clave">Contraseña</label>
              <div className="input-icon">
                <Lock size={18} aria-hidden="true" />
                <input
                  id="clave"
                  className="input input-con-boton"
                  type={verClave ? 'text' : 'password'}
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  onKeyUp={(e) => setMayusculas(e.getModifierState('CapsLock'))}
                  onBlur={() => setMayusculas(false)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="input-toggle"
                  onClick={() => setVerClave((v) => !v)}
                  aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={verClave}
                >
                  {verClave ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
              {mayusculas && (
                <p className="field-hint" role="status">
                  <TriangleAlert size={14} aria-hidden="true" /> Las mayúsculas están activadas.
                </p>
              )}
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={enviando}>
              {enviando ? (<><Loader2 size={18} className="spin" aria-hidden="true" /> Verificando…</>) : 'Iniciar sesión'}
            </button>
          </form>

          <p className="offline-auth">
            Con servidor disponible se valida su usuario en él. Sin conexión solo es posible entrar al modo local de demostración, si está habilitado.
          </p>

          {MODO_LOCAL_PERMITIDO && (
          <div className="demo-card">
            <h3 className="section-title">Acceso de prueba</h3>
            <p className="demo-note">Modo local sin servidor, con datos de demostración. Seleccione un perfil.</p>

            <div className="demo-actions">
              <button
                type="button"
                onClick={() => entrar('operador', 'demo-operador', true)}
                onMouseEnter={() => prefetchRuta('/dashboard')}
                onFocus={() => prefetchRuta('/dashboard')}
                className="btn btn-secondary"
              >
                Operador
              </button>
              <button
                type="button"
                onClick={() => entrar('admin', 'demo-admin', true)}
                onMouseEnter={() => prefetchRuta('/dashboard')}
                onFocus={() => prefetchRuta('/dashboard')}
                className="btn btn-secondary"
              >
                Administrador
              </button>
            </div>
          </div>
          )}

          <button
            type="button"
            onClick={() => navigate('/ficha-publica')}
            onMouseEnter={() => prefetchRuta('/ficha-publica')}
            onFocus={() => prefetchRuta('/ficha-publica')}
            className="public-link"
          >
            <Eye size={18} aria-hidden="true" />
            <span>
              <strong>¿Es comprador?</strong> Consulte la ficha pública
            </span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
        <footer className="login-foot">
          <span>KallpaCacao</span>
          <span>Trazabilidad del cacao del Huila</span>
        </footer>
      </section>
    </main>
  );
};
