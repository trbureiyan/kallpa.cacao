import React, { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, ChevronRight } from 'lucide-react';
import { Logo } from '@/components/ui';
import { estadoConexion } from '@/components/ui/conexion';
import { IndicadorConexion } from '@/components/ui/marca';
import { useNetwork } from '@/context/NetworkContext';
import { useAuth } from '@/context/AuthContext';
import { prefetchRuta } from '@/utils/prefetch';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { isOnline } = useNetwork();
  const { iniciarSesion } = useAuth();
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);

  const entrar = (u: string, c: string) => {
    if (iniciarSesion(u, c)) navigate('/dashboard');
    else setError('No se pudo iniciar sesión. El usuario o la contraseña no coinciden. Revise los datos o use un acceso de prueba.');
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    entrar(usuario, clave);
  };

  return (
    <main className="login-shell">
      <section className="login-story" aria-label="Presentación">
        <div className="max-w-xl">
          <Logo light />
          <h1 className="display-title mt-16">Cada lote cuenta su historia.</h1>
          <p className="mt-6 text-lg">
            Registro de recepción, transformación y venta del cacao de la asociación, con origen verificable.
          </p>
        </div>
      </section>

      <section className="login-panel">
        <div className="w-full max-w-md mx-auto">
          <div className="flex items-center justify-between gap-4 mb-8">
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

            <div>
              <label className="field-label" htmlFor="clave">Contraseña</label>
              <input
                id="clave"
                className="input"
                type="password"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary w-full">
              Iniciar sesión
            </button>
          </form>

          <p className="offline-auth">
            Con conectividad limitada puede ingresar con las credenciales guardadas en este dispositivo.
          </p>

          <div className="demo-card">
            <h3 className="section-title">Acceso de prueba</h3>
            <p className="demo-note">Datos de demostración. Seleccione un perfil.</p>

            <div className="demo-actions">
              <button
                type="button"
                onClick={() => entrar('operador', 'demo-operador')}
                onMouseEnter={() => prefetchRuta('/dashboard')}
                onFocus={() => prefetchRuta('/dashboard')}
                className="btn btn-secondary"
              >
                Operador
              </button>
              <button
                type="button"
                onClick={() => entrar('admin', 'demo-admin')}
                onMouseEnter={() => prefetchRuta('/dashboard')}
                onFocus={() => prefetchRuta('/dashboard')}
                className="btn btn-secondary"
              >
                Administrador
              </button>
            </div>
          </div>

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
      </section>
    </main>
  );
};
