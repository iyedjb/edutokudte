import { useEffect } from "react";
import { useAuth } from "./useAuth";
import { warmAppCache, isCacheWarmed } from "./warmCache";

/**
 * Hook to warm cache when user logs in
 * Runs automatically on first login
 */
export function useCacheWarmer() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.uid) return;

    // Only warm cache once per session
    if (!isCacheWarmed()) {
      warmAppCache(user.uid).catch(err => {
        console.error("Cache warming error:", err);
      });
    }
  }, [user?.uid]);
}
