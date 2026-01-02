import { getCachedData, setCachedData, CacheKey } from "./cacheDB";
import { database, efeedDatabase, profileNotasDatabase } from "./firebase";
import { ref, get, query, orderByChild, limitToLast } from "firebase/database";

/**
 * Warm cache by pre-loading important data on app startup
 * This runs once and makes subsequent loads instant
 */
export async function warmAppCache(userId: string | undefined): Promise<void> {
  if (!userId) return;

  try {
    console.log("🔥 Warming app cache...");
    const startTime = Date.now();

    // Load in parallel for speed
    const cachePromises: Promise<any>[] = [];

    // 1. Efeed posts (most important for feed)
    cachePromises.push(
      get(ref(efeedDatabase, "efeed")).then(snapshot => {
        const data = snapshot.val() || {};
        const posts = Object.keys(data).map(id => ({ id, ...data[id] }));
        return setCachedData("efeed" as CacheKey, posts);
      }).catch(err => console.warn("Error warming efeed:", err))
    );

    // 2. Videos
    cachePromises.push(
      get(ref(database, "videos")).then(snapshot => {
        const data = snapshot.val() || {};
        const videos = Object.keys(data).map(id => ({ id, ...data[id] }));
        return setCachedData("videos" as CacheKey, videos);
      }).catch(err => console.warn("Error warming videos:", err))
    );

    // 3. Classes
    cachePromises.push(
      get(ref(profileNotasDatabase, "classes")).then(snapshot => {
        const data = snapshot.val() || {};
        const classes = Object.keys(data).map(id => ({ id, ...data[id] }));
        return setCachedData("classes" as CacheKey, classes);
      }).catch(err => console.warn("Error warming classes:", err))
    );

    // 4. Grades
    cachePromises.push(
      get(ref(profileNotasDatabase, `grades/${userId}`)).then(snapshot => {
        const data = snapshot.val() || {};
        return setCachedData("grades" as CacheKey, data);
      }).catch(err => console.warn("Error warming grades:", err))
    );

    // 5. Events
    cachePromises.push(
      get(ref(database, "events")).then(snapshot => {
        const data = snapshot.val() || {};
        const events = Object.keys(data).map(id => ({ id, ...data[id] }));
        return setCachedData("events" as CacheKey, events);
      }).catch(err => console.warn("Error warming events:", err))
    );

    // Wait for all cache warming to complete
    await Promise.all(cachePromises);

    const endTime = Date.now();
    console.log(`✅ Cache warmed in ${endTime - startTime}ms`);

    // Mark cache as warmed for this session
    localStorage.setItem("cache-warmed", "true");
  } catch (error) {
    console.error("Error warming cache:", error);
  }
}

/**
 * Check if cache is already warmed this session
 */
export function isCacheWarmed(): boolean {
  return localStorage.getItem("cache-warmed") === "true";
}

/**
 * Reset cache warming flag (for debugging)
 */
export function resetCacheWarmFlag(): void {
  localStorage.removeItem("cache-warmed");
}
