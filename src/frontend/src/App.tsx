import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { NetworkProvider } from '@/context/NetworkContext';
import { AuthProvider } from '@/context/AuthContext';
import { LoginPage } from '@/pages/LoginPage.tsx';
import { DashboardPage } from '@/pages/DashboardPage.tsx';
import { PublicFichaPage } from '@/pages/PublicFichaPage.tsx';

export default function App() {
  return (
    <NetworkProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/ficha-publica" element={<PublicFichaPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </NetworkProvider>
  );
}