import React, { createContext, useContext, useState, useEffect } from "react";
import apiClient from "../api/client";
import type { UserDTO, UUID } from "../types";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface AuthContextType {
  user: UserDTO | null;
  usersList: UserDTO[];
  login: (userData: UserDTO) => void;
  logout: () => void;
  switchUser: (id_usuario: UUID) => void;
  refreshUsers: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserDTO | null>(() => {
    try {
      const saved = localStorage.getItem("ecoraee_user");
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed.id_usuario === "string" && UUID_REGEX.test(parsed.id_usuario)) {
        return parsed as UserDTO;
      }
      localStorage.removeItem("ecoraee_user");
      return null;
    } catch {
      return null;
    }
  });

  const [usersList, setUsersList] = useState<UserDTO[]>([]);

  const refreshUsers = async () => {
    try {
      const res = await apiClient.get<UserDTO[]>("/auth/users");
      setUsersList(res.data);
      if (res.data.length > 0) {
        setUser((current) => {
          if (current && res.data.some((u) => u.id_usuario === current.id_usuario)) {
            return current;
          }
          return res.data[0];
        });
      }
    } catch (err) {
      console.error("No se pudieron cargar los usuarios desde la base de datos:", err);
    }
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem("ecoraee_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("ecoraee_user");
    }
  }, [user]);

  const login = (userData: UserDTO) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("ecoraee_user");
  };

  const switchUser = (id_usuario: UUID) => {
    const found = usersList.find((u) => u.id_usuario === id_usuario);
    if (found) {
      setUser(found);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        usersList,
        login,
        logout,
        switchUser,
        refreshUsers,
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
