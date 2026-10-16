import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { NetworkProvider } from '@/context/NetworkContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import type { RolApi } from '@/shared/etiquetas';

import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { PublicFichaPage } from '@/pages/PublicFichaPage';
import { ReceptionPage } from '@/pages/RecepcionPage';
import { ProcessPage } from '@/pages/ProcessPage';
import { TracePage } from '@/pages/TracePage';
import { InventoryPage } from '@/pages/InventoryPage';
import { AuditPage } from '@/pages/AuditPage';

// Solo oculta pantallas según el rol; la autorización real la hace el servidor en cada petición.
function SoloRol({ roles, children }: { roles: RolApi[]; children: ReactNode }) {
  const { usuario } = useAuth();
  return usuario && roles.includes(usuario.role) ? <>{children}</> : <Navigate to="/recepcion" replace />;
}

function ProtectedLayout() {
  const { usuario, cargando } = useAuth();
  if (cargando) return <p className="p-6">Verificando sesión...</p>;
  if (!usuario) return <Navigate to="/login" replace />;

  return (
    <AppShell>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/recepcion" element={<ReceptionPage />} />
        <Route path="/transformacion" element={<ProcessPage />} />
        <Route path="/trazabilidad" element={<TracePage />} />
        <Route path="/inventario" element={<SoloRol roles={['admin']}><InventoryPage /></SoloRol>} />
        <Route path="/auditoria" element={<SoloRol roles={['admin']}><AuditPage /></SoloRol>} />
        <Route path="*" element={<Navigate to="/recepcion" replace />} />
      </Routes>
    </AppShell>
  );
}

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <NetworkProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/ficha-publica" element={<PublicFichaPage />} />
            <Route path="/*" element={<ProtectedLayout />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </NetworkProvider>
    </QueryClientProvider>
  );
}
