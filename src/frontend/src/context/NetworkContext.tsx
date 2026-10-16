import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { BASE_URL, registrarAlFallarRed } from '@/api/axiosClient';
import { crearMonitor, ESPERA_SONDEO_MS, urlSalud, type EstadoServidor } from './monitorServidor';

interface NetworkContextType {
  /** Hay red y el servidor respondió: se puede sincronizar y consultar. */
  isOnline: boolean;
  estadoServidor: EstadoServidor;
  /** Vuelve a sondear /health sin esperar el siguiente reintento. */
  comprobarServidor: () => void;
}

const NetworkContext = createContext<NetworkContextType>({ isOnline: true, estadoServidor: 'en_linea', comprobarServidor: () => {} });

async function servidorResponde(): Promise<boolean> {
  try {
    // axios directo y no axiosClient: el sondeo no lleva token ni dispara el cierre de sesión
    const r = await axios.get(urlSalud(BASE_URL), { timeout: ESPERA_SONDEO_MS });
    return r.status === 200 && (r.data as { status?: string } | null)?.status === 'ok';
  } catch {
    return false;
  }
}

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [estadoServidor, setEstado] = useState<EstadoServidor>(navigator.onLine ? 'conectando' : 'sin_red');
  const monitor = useRef<ReturnType<typeof crearMonitor> | null>(null);

  useEffect(() => {
    const m = crearMonitor({
      sondear: servidorResponde,
      navegadorEnLinea: () => navigator.onLine,
      ahora: () => Date.now(),
      alCambiar: setEstado,
    });
    monitor.current = m;
    m.iniciar();

    const alVolver = () => m.sondearYa();
    const alPerder = () => m.sinRed();
    window.addEventListener('online', alVolver);
    window.addEventListener('offline', alPerder);
    registrarAlFallarRed(() => m.sondearYa());

    return () => {
      m.detener();
      window.removeEventListener('online', alVolver);
      window.removeEventListener('offline', alPerder);
      registrarAlFallarRed(() => {});
    };
  }, []);

  return (
    <NetworkContext.Provider
      value={{ isOnline: estadoServidor === 'en_linea', estadoServidor, comprobarServidor: () => monitor.current?.sondearYa() }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useNetwork = () => useContext(NetworkContext);
