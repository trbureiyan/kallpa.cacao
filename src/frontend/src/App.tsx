import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { NetworkProvider, useNetwork } from '@/context/NetworkContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { rutasPermitidas } from '@/context/rutas';
import { EsqueletoPagina } from '@/components/shared/EsqueletoPagina';
// Importación diferida del layout con Dexie y componentes del shell
const AppShell = lazy(() => import('@/components/layout/AppShell').then(m => ({ default: m.AppShell })));

// Code splitting por ruta: cada página se descarga solo cuando se navega a ella.
// PublicFichaPage va en su propio chunk sin Dexie ni contextos de autenticación.
// [DECISION] React.lazy + Suspense — mínimo cambio, sin herramientas externas.
// El navegador precachea todos los chunks con el service worker (vite-plugin-pwa),
// por lo que la segunda visita es siempre instantánea, incluso offline.
const LoginPage      = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const PublicFichaPage = lazy(() => import('@/pages/PublicFichaPage').then(m => ({ default: m.PublicFichaPage })));
const DashboardPage  = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ReceptionPage  = lazy(() => import('@/pages/RecepcionPage').then(m => ({ default: m.ReceptionPage })));
const ProcessPage    = lazy(() => import('@/pages/ProcessPage').then(m => ({ default: m.ProcessPage })));
const TracePage      = lazy(() => import('@/pages/TracePage').then(m => ({ default: m.TracePage })));
const InventoryPage  = lazy(() => import('@/pages/InventoryPage').then(m => ({ default: m.InventoryPage })));
const AuditPage      = lazy(() => import('@/pages/AuditPage').then(m => ({ default: m.AuditPage })));

// Envoltorio de rutas autenticadas con la barra de navegación (AppShell)
function ProtectedLayout() {
  const { isOnline } = useNetwork();
  const { rol } = useAuth();
  const { pathname } = useLocation();

  // Sin sesión se vuelve al login; una ruta no permitida para el rol lleva al resumen.
  if (!rol) return <Navigate to="/login" replace />;
  if (!rutasPermitidas(rol).includes(pathname)) return <Navigate to="/dashboard" replace />;

  return (
    <Suspense fallback={<EsqueletoPagina />}>
      <AppShell>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route
            path="/recepcion"
            element={
              <ReceptionPage
                online={isOnline}
                addPending={() => console.log('Nuevo lote pendiente agregado')}
              />
            }
          />
          <Route path="/transformacion" element={<ProcessPage />} />
          <Route path="/trazabilidad" element={<TracePage />} />
          <Route path="/inventario" element={<InventoryPage />} />
          <Route path="/auditoria" element={<AuditPage />} />
        </Routes>
      </AppShell>
    </Suspense>
  );
}

export default function App() {
  // Inicializar datos semilla en IndexedDB si la base está vacía (sin bloquear el chunk principal)
  useEffect(() => {
    void import('@/db/seed').then(m => m.seedDatabase());
  }, []);

  return (
    <NetworkProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<EsqueletoPagina />}>
            <Routes>
              {/* Rutas Públicas */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/ficha-publica" element={<PublicFichaPage />} />

              {/* Rutas Protegidas / Módulos de la Aplicación */}
              <Route path="/*" element={<ProtectedLayout />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </NetworkProvider>
  );
}