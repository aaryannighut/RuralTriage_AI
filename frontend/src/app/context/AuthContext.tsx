import { createContext, useContext, useState, ReactNode } from "react";

export interface UserData {
  name: string;
  email: string;
  phone: string;
  role?: string;   // patient | doctor | pharmacy
  userId?: number;
}

interface AuthContextType {
  isLoggedIn: boolean;
  user: UserData;
  login: (data: UserData) => void;
  logout: () => void;
  updateProfile: (data: Partial<UserData>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const defaultUser: UserData = { name: "", email: "", phone: "", role: undefined, userId: undefined };
const STORAGE_KEY = "ruralcare_user";

function loadStored(): { user: UserData; loggedIn: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        user: {
          name: parsed.name ?? "",
          email: parsed.email ?? "",
          phone: parsed.phone ?? "",
          role: parsed.role ?? "patient",
          userId: parsed.userId ?? undefined,
        },
        loggedIn: true,
      };
    }
  } catch { /* ignore */ }
  return { user: defaultUser, loggedIn: false };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = loadStored();
  const [isLoggedIn, setIsLoggedIn] = useState(stored.loggedIn);
  const [user, setUser] = useState<UserData>(stored.user);

  const login = (data: UserData) => {
    setUser(data);
    setIsLoggedIn(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const logout = () => {
    setUser(defaultUser);
    setIsLoggedIn(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  const updateProfile = (data: Partial<UserData>) => {
    setUser((prev) => {
      const next = { ...prev, ...data };
      if (isLoggedIn) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
