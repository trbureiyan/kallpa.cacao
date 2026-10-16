import React, { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useNetwork } from '@/context/NetworkContext';
import { useAuth } from '@/context/AuthContext';
import { mensajeError } from '@/api/axiosClient';
import { Wifi, WifiOff, Sprout, ArrowRight, Eye, EyeOff, ChevronRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { isOnline } = useNetwork();
  const { usuario, entrar } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarClave, setMostrarClave] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to="/dashboard" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await entrar(username.trim(), password);
      navigate('/dashboard');
    } catch (err) {
      const status = (err as { response?: { status: number } }).response?.status;
      setError(
        status === 401
          ? 'Usuario o contraseña incorrectos. Verifique los datos e intente de nuevo.'
          : mensajeError(err),
      );
    } finally {
      setEnviando(false);
    }
  };

  const alternarVisibilidadClave = () => setMostrarClave((visible) => !visible);

  return (
    <main className="login-shell">
      <section className="login-story">
        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-2 font-black text-2xl tracking-wider text-emerald-300">
            <Sprout className="w-8 h-8" />
            <span>KALLPA.CACAO</span>
          </div>

          <div className="mt-16 mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-emerald-100 backdrop-blur">
            <span className="size-2 rounded-full bg-emerald-300 animate-pulse" />
            Tecnología para el cacao con identidad
          </div>

          <h1 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight">
            Del origen al mercado, <br />
            <span className="text-emerald-300">cada grano cuenta.</span>
          </h1>

          <p className="mt-6 text-base leading-relaxed text-emerald-50/80">
            Control agroindustrial confiable para asociaciones, operadores y compradores del departamento del Huila.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-3">
            {[
              ['Lote a lote', 'Trazable'],
              ['Recepción', 'con red limitada'],
              ['Cada cambio', 'Auditado'],
            ].map(([stat, label]) => (
              <div key={stat} className="story-stat">
                <strong className="text-lg font-black text-emerald-300">{stat}</strong>
                <span className="text-xs text-emerald-100/80">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="login-panel">
        <div className="w-full max-w-md mx-auto">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <span className="text-xs font-bold tracking-wider uppercase text-emerald-600">
                Bienvenido de nuevo
              </span>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                Inicia sesión
              </h2>
            </div>
            
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              isOnline ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              {isOnline ? 'En línea' : 'Sin conexión'}
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="usuario" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Usuario
              </label>
              <input
                id="usuario"
                className="input"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="clave" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="clave"
                  className="input pr-11"
                  type={mostrarClave ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={alternarVisibilidadClave}
                  aria-label={mostrarClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={mostrarClave}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
                >
                  {mostrarClave ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="validation danger" role="alert">
                <div>
                  <strong>No se pudo iniciar sesión</strong>
                  <span>{error}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={enviando || !isOnline}
              className="btn btn-primary w-full justify-center"
            >
              {enviando ? 'Ingresando...' : 'Iniciar sesión'} <ArrowRight size={18} />
            </button>
            {!isOnline && (
              <p className="text-xs text-amber-700">
                Para iniciar sesión se necesita conexión con el servidor. Si ya inició sesión antes en este
                dispositivo, la sesión se conserva.
              </p>
            )}
          </form>

          <button 
            type="button" 
            onClick={() => navigate('/ficha-publica')} 
            className="public-link"
          >
            <div className="flex items-center gap-2">
              <Eye size={18} className="text-slate-500" />
              <span>
                <strong>¿Eres comprador?</strong> Consulta la Ficha Pública
              </span>
            </div>
            <ChevronRight size={16} className="text-slate-400" />
          </button>
        </div>
      </section>
    </main>
  );
};