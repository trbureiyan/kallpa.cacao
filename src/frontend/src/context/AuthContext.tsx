import React, { createContext, useContext, useState } from 'react';

export type RolUsuario = 'OPERADOR' | 'ADMINISTRADOR';

interface AuthContextType {
  rol: RolUsuario;
  setRol: (rol: RolUsuario) => void;
  nombreUsuario: string;
}

const AuthContext = createContext<AuthContextType>({
  rol: 'OPERADOR',
  setRol: () => {},
  nombreUsuario: 'Operador de Campo',
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rol, setRol] = useState<RolUsuario>('OPERADOR');

  const nombreUsuario = rol === 'OPERADOR' ? 'Operador Campo (Rivera)' : 'Administrador ASOCACAO';

  return (
    <AuthContext.Provider value={{ rol, setRol, nombreUsuario }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);