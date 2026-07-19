import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMe,
  getGetMeQueryKey,
  setAuthTokenGetter,
  type User as ApiUser,
} from "@workspace/api-client-react";

// Wire up the custom-fetch token getter once — every API call will now
// automatically include "Authorization: Bearer <token>" when signed in.
setAuthTokenGetter(() => localStorage.getItem("token"));

export type User = ApiUser;

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (token: string, user?: User) => void;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
};

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
  updateUser: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("token"),
  );

  const { data: user, isLoading } = useGetMe({
    query: {
      enabled: !!token,
      queryKey: getGetMeQueryKey(),
      retry: 1,
      staleTime: 30_000,
    },
  });

  const login = (newToken: string, userData?: User) => {
    localStorage.setItem("token", newToken);
    if (userData) {
      queryClient.setQueryData(getGetMeQueryKey(), userData);
    }
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    queryClient.setQueryData(getGetMeQueryKey(), null);
    queryClient.removeQueries({ queryKey: getGetMeQueryKey() });
  };

  const updateUser = (data: Partial<User>) => {
    queryClient.setQueryData(getGetMeQueryKey(), (old: User | null) => {
      if (!old) return old;

      return {
        ...old,
        ...data,
      };
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading: !!token && isLoading && !user,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => React.useContext(AuthContext);
