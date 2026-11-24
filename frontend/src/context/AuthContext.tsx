import React, { createContext, useContext, useState, useEffect } from "react";
import type { User } from "../types";

export const DEMO_USERS: User[] = [
  {
    id_usuario: 1,
    nombre: "Anthony Romo",
    correo: "anthony.romo@ecoraee.ec",
    id_rol: 1,
    nombre_rol: "Administrador del Sistema",
    id_organizacion: 1,
    razon_social: "Empresa Pública Metropolitana de Gestión Integral (EMGIRS-EP)",
    ruc: "1790012345001",
  },
  {
    id_usuario: 2,
    nombre: "Ing. Carlos Mendoza",
    correo: "carlos.mendoza@ecoraee.ec",
    id_rol: 3,
    nombre_rol: "Técnico Evaluador RAEE",
    id_organizacion: 1,
    razon_social: "Empresa Pública Metropolitana de Gestión Integral (EMGIRS-EP)",
    ruc: "1790012345001",
  },
  {
    id_usuario: 3,
    nombre: "Elena Valencia",
    correo: "elena.valencia@reciclaecuador.org",
    id_rol: 2,
    nombre_rol: "Operador de Centro de Acopio",
    id_organizacion: 2,
    razon_social: "Fundación Circular Verde & RAEE",
    ruc: "1791234567001",
  },
  {
    id_usuario: 4,
    nombre: "Santiago Paredes",
    correo: "santiago.paredes@logistica.ec",
    id_rol: 4,
    nombre_rol: "Coordinador Logístico de Flujo",
    id_organizacion: 3,
    razon_social: "EcoTrans Logística Especializada S.A.",
    ruc: "1798765432001",
  },
  {
    id_usuario: 5,
    nombre: "Dra. Patricia Andrade",
    correo: "patricia.andrade@recond.ec",
    id_rol: 5,
    nombre_rol: "Gestor de Reacondicionamiento y Reciclaje",
    id_organizacion: 4,
    razon_social: "ReconTech Soluciones Circulares Cía. Ltda.",
    ruc: "1795556667001",
  },
];

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  switchDemoUser: (id_usuario: number) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem("ecoraee_user");
      return savedUser ? JSON.parse(savedUser) : DEMO_USERS[0];
    } catch {
      return DEMO_USERS[0];
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem("ecoraee_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("ecoraee_user");
    }
  }, [user]);

  const login = (userData: User) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("ecoraee_user");
  };

  const switchDemoUser = (id_usuario: number) => {
    const found = DEMO_USERS.find((u) => u.id_usuario === id_usuario);
    if (found) {
      setUser(found);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        switchDemoUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
};
