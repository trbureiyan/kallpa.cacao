import React, { createContext, useContext, useState } from 'react';
import type { RolUsuario } from '@/types/app';
import { autenticar } from './usuariosDemo';

export type { RolUsuario };

interface Sesion {
  rol: RolUsuario;
  nombre: string;
}

interface AuthContextType {
  rol: RolUsuario | null;
  nombreUsuario: string;
  iniciarSesion: (usuario: string, clave: string) => boolean;
  cerrarSesion: () => void;
}

const CLAVE_SESION = 'kallpa.sesion';

// La sesión sobrevive a recargar la pestaña; si el almacenamiento no está disponible, se pide iniciar de nuevo.
function leerSesion(): Sesion | null {
  try {
    const crudo = sessionStorage.getItem(CLAVE_SESION);
    return crudo ? (JSON.parse(crudo) as Sesion) : null;
  } catch {
    return null;
  }
}

function guardarSesion(s: Sesion | null) {
  try {
    if (s) sessionStorage.setItem(CLAVE_SESION, JSON.stringify(s));
    else sessionStorage.removeItem(CLAVE_SESION);
  } catch {
    /* sin almacenamiento: la sesión vive solo en memoria */
  }
}

const AuthContext = createContext<AuthContextType>({
  rol: null,
  nombreUsuario: '',
  iniciarSesion: () => false,
  cerrarSesion: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sesion, setSesion] = useState<Sesion | null>(leerSesion);

  const iniciarSesion = (usuario: string, clave: string): boolean => {
    const encontrada = autenticar(usuario, clave);
    if (!encontrada) return false;
    const nueva = { rol: encontrada.rol, nombre: encontrada.nombre };
    guardarSesion(nueva);
    setSesion(nueva);
    return true;
  };

  const cerrarSesion = () => {
    guardarSesion(null);
    setSesion(null);
  };

  return (
    <AuthContext.Provider
      value={{ rol: sesion?.rol ?? null, nombreUsuario: sesion?.nombre ?? '', iniciarSesion, cerrarSesion }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
