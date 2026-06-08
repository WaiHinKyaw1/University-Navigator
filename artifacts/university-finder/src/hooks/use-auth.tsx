import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe, getGetMeQueryKey, setAuthTokenGetter } from "@workspace/api-client-react";

// Wire up the custom-fetch token getter once — every API call will now
// automatically include "Authorization: Bearer <token>" when signed in.
setAuthTokenGetter(() => localStorage.getItem("token"));

export type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  grade: string | null;
  status: string;
  avatarUrl: string | null;
  createdAt: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
};

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  // Reactive token state — re-renders the provider when the token changes.
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));

  const { data: user, isLoading } = useGetMe({
    query: {
      enabled: !!token,
      queryKey: getGetMeQueryKey(),
      retry: false,
    },
  });

  const login = (newToken: string) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    queryClient.setQueryData(getGetMeQueryKey(), null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider
      value={{
        user: (user as User) || null,
        isLoading: isLoading && !!token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => React.useContext(AuthContext);
