import React, { createContext, useContext, useEffect, useState } from 'react';
import { registrarAlExpirar } from '@/api/axiosClient';
import { guardarToken } from '@/api/token';
import type { RolUsuario } from '@/types/app';
import { MODO_LOCAL_PERMITIDO, resolverSesion, type ModoFuente } from './fuente';

export type { RolUsuario };

interface Sesion {
  rol: RolUsuario;
  nombre: string;
  modo: ModoFuente;
}

interface AuthContextType {
  rol: RolUsuario | null;
  nombreUsuario: string;
  modo: ModoFuente;
  /** Devuelve el mensaje de error listo para mostrar, o null si entró. */
  iniciarSesion: (usuario: string, clave: string, opciones?: { forzarLocal?: boolean }) => Promise<string | null>;
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
  modo: 'api',
  iniciarSesion: async () => null,
  cerrarSesion: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sesion, setSesion] = useState<Sesion | null>(leerSesion);

  const cerrarSesion = () => {
    guardarToken(null);
    guardarSesion(null);
    setSesion(null);
  };

  // un 401 con token (sesión vencida) cierra la sesión; las recepciones pendientes viven en Dexie y no se tocan
  useEffect(() => {
    registrarAlExpirar(cerrarSesion);
    return () => registrarAlExpirar(() => {});
  }, []);

  const iniciarSesion: AuthContextType['iniciarSesion'] = async (usuario, clave, opciones) => {
    try {
      const r = await resolverSesion(usuario.trim(), clave, { permitirLocal: MODO_LOCAL_PERMITIDO, forzarLocal: opciones?.forzarLocal });
      const nueva: Sesion = { rol: r.rol, nombre: r.nombre, modo: r.modo };
      guardarSesion(nueva);
      setSesion(nueva);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'No se pudo iniciar sesión. Ocurrió un error inesperado. Intente de nuevo.';
    }
  };

  return (
    <AuthContext.Provider
      value={{ rol: sesion?.rol ?? null, nombreUsuario: sesion?.nombre ?? '', modo: sesion?.modo ?? 'api', iniciarSesion, cerrarSesion }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
