import { trpc } from "../lib/trpc";

export function useAuth() {
  const { data: user, isLoading } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    enabled: !!localStorage.getItem("volko_token"),
  });
  return { user: user ?? null, isLoading };
}
