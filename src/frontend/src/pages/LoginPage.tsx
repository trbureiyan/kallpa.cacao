import React, { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNetwork } from '@/context/NetworkContext';
import { useAuth } from '@/context/AuthContext';
import type { Role } from '@/types/app';
import { 
  Wifi, 
  WifiOff, 
  Sprout, 
  ArrowRight, 
  ShieldCheck, 
  Users, 
  Eye, 
  ChevronRight 
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { isOnline } = useNetwork();
  const { setRol } = useAuth();

  const handleEnter = (role: Role) => {
    setRol(role === 'admin' ? 'ADMINISTRADOR' : 'OPERADOR');
    navigate('/dashboard');
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    handleEnter('operator');
  };

  return (
    <main className="login-shell">
      <section className="login-story">
        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-2 font-black text-2xl tracking-wider text-emerald-300">
            <Sprout className="w-8 h-8" />
            <span>AGROCACAO HUILA</span>
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
              ['100%', 'Trazable'],
              ['Offline', 'First'],
              ['24/7', 'Auditable'],
            ].map(([stat, label]) => (
              <div key={stat} className="story-stat">
                <strong className="text-2xl font-black text-emerald-300">{stat}</strong>
                <span className="text-xs text-emerald-100/80">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute -bottom-10 -right-10 opacity-10 pointer-events-none">
          <Sprout size={320} />
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

          <p className="text-sm text-slate-500 mb-6">
            Plataforma de Trazabilidad y Control Agroindustrial
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Correo electrónico o usuario
              </label>
              <input
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800"
                type="text"
                placeholder="operador@agrocacao.co"
                defaultValue="operador.rivera"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Contraseña
              </label>
              <input
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800"
                type="password"
                placeholder="••••••••"
                defaultValue="12345678"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-600/20"
            >
              Iniciar Sesión <ArrowRight size={18} />
            </button>
          </form>

          <div className="offline-auth">
            <ShieldCheck size={20} className="shrink-0 text-emerald-600" />
            <span>
              <strong>Sesión offline habilitada</strong>
              <br />
              Ingreso con credenciales locales guardadas
            </span>
          </div>

          <div className="demo-card">
            <div className="flex items-center gap-2 text-amber-800 font-extrabold text-sm">
              <Users size={16} /> Acceso Rápido de Prueba
            </div>
            <div className="text-xs text-amber-700 mt-1 mb-3">
              Evaluación Jurado · Selecciona un perfil
            </div>
            
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleEnter('operator')}
                className="w-full p-2.5 bg-white border border-amber-300 rounded-lg text-amber-900 font-medium text-xs flex justify-between items-center hover:bg-amber-100/50 transition-colors"
              >
                <span>Operador</span>
                <span className="font-bold text-amber-700">Campo · Rivera</span>
              </button>

              <button
                type="button"
                onClick={() => handleEnter('admin')}
                className="w-full p-2.5 bg-amber-800 text-white rounded-lg font-medium text-xs flex justify-between items-center hover:bg-amber-900 transition-colors"
              >
                <span>Administrador</span>
                <span className="font-bold text-amber-200">ASOCACAO</span>
              </button>
            </div>
          </div>

          <button 
            type="button" 
            onClick={() => navigate('/ficha-publica')} 
            className="public-link"
          >
            <div className="flex items-center gap-2">
              <Eye size={18} className="text-slate-500" />
              <span>
                <strong>¿Eres comprador?</strong> Escanea un QR o ingresa a la Ficha Pública
              </span>
            </div>
            <ChevronRight size={16} className="text-slate-400" />
          </button>
        </div>
      </section>
    </main>
  );
};