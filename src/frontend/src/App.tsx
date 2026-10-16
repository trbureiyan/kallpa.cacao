import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { NetworkProvider, useNetwork } from '@/context/NetworkContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { rutasPermitidas } from '@/context/rutas';
import { AppShell } from '@/components/layout/AppShell';

// Importación del script de datos semilla (Seed Data)
import { seedDatabase } from '@/db/seed';

// Importación de Páginas
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { PublicFichaPage } from '@/pages/PublicFichaPage';
import { ReceptionPage } from '@/pages/RecepcionPage';
import { ProcessPage } from '@/pages/ProcessPage';
import { TracePage } from '@/pages/TracePage';
import { InventoryPage } from '@/pages/InventoryPage';
import { AuditPage } from '@/pages/AuditPage';

// Envoltorio de rutas autenticadas con la barra de navegación (AppShell)
function ProtectedLayout() {
  const { isOnline } = useNetwork();
  const { rol } = useAuth();
  const { pathname } = useLocation();

  // Sin sesión se vuelve al login; una ruta no permitida para el rol lleva al resumen.
  if (!rol) return <Navigate to="/login" replace />;
  if (!rutasPermitidas(rol).includes(pathname)) return <Navigate to="/dashboard" replace />;

  return (
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
  );
}

export default function App() {
  // Inicializar datos semilla en IndexedDB si la base está vacía
  useEffect(() => {
    void seedDatabase();
  }, []);

  return (
    <NetworkProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Rutas Públicas */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/ficha-publica" element={<PublicFichaPage />} />

            {/* Rutas Protegidas / Módulos de la Aplicación */}
            <Route path="/*" element={<ProtectedLayout />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </NetworkProvider>
  );
}