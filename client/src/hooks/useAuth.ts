import { useQuery } from "@tanstack/react-query";
import { type User } from "@shared/schema";

interface UserWithBalance extends User {
  balance?: string;
}

export function useAuth() {
  const { data: user, isLoading } = useQuery<UserWithBalance>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
