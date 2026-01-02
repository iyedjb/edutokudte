import { useState, useEffect, useCallback } from "react";
import { getCachedData, setCachedData, CacheKey } from "./cacheDB";

interface UseCachedDataOptions<T> {
  cacheKey: CacheKey;
  fetchFn: () => Promise<T>;
  cacheTTL?: number; // Time to live in milliseconds
  enabled?: boolean;
}

interface UseCachedDataResult<T> {
  data: T | null;
  loading: boolean;
  fromCache: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useCachedData<T>({
  cacheKey,
  fetchFn,
  cacheTTL,
  enabled = true,
}: UseCachedDataOptions<T>): UseCachedDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      setError(null);
      return;
    }

    setError(null);
    try {
      // Step 1: Try to load from cache immediately
      const cachedData = await getCachedData<T>(cacheKey);
      
      if (cachedData) {
        setData(cachedData);
        setFromCache(true);
        setLoading(false);
      }

      // Step 2: Fetch fresh data from Firebase
      const freshData = await fetchFn();
      
      // Step 3: Update cache and state
      setData(freshData);
      setFromCache(false);
      setLoading(false);
      
      // Save to cache for next time
      await setCachedData(cacheKey, freshData, cacheTTL);
    } catch (err) {
      console.error(`Error loading data for ${cacheKey}:`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    }
  }, [cacheKey, fetchFn, cacheTTL, enabled]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await loadData();
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { data, loading, fromCache, error, refresh };
}

// Helper to manually update cache (useful for optimistic updates)
export async function updateCache<T>(cacheKey: CacheKey, updateFn: (data: T | null) => T, cacheTTL?: number) {
  const currentData = await getCachedData<T>(cacheKey);
  const updatedData = updateFn(currentData);
  await setCachedData(cacheKey, updatedData, cacheTTL);
  return updatedData;
}

// Helper to invalidate cache
export { deleteCachedData as invalidateCache } from "./cacheDB";
